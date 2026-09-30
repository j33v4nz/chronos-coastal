"""Forecast inputs, geospatial evidence and reviewable incident advisories.

All provider modes are explicit. Scenarios are screening estimates, not verified
storm forecasts; dispatch is an in-app test inbox unless a webhook is configured.
"""
import asyncio
import hashlib
import io
import json
import logging
import os
import uuid
from collections import OrderedDict
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal, Optional

import httpx
from fastapi import APIRouter, HTTPException, Response
from PIL import Image
from pydantic import BaseModel, Field

from app.dataset import CORRIDORS, get_corridor
from app.hydro_engine import CompoundHydroEngine
from app.grid_engine import PowerGridCascadeEngine
from app.logistics_engine import LifeSupportLogisticsEngine
from app.swarm.apex_agent import ApexAgent
from app.swarm.bus import TacticalEventBus
from app.swarm.vision_agent import GeotechnicalVisionAgent
from app.storage import RecordStore

router = APIRouter(prefix="/api/operations", tags=["Operations"])
logger = logging.getLogger("Operations")
snapshots = OrderedDict()
advisories = OrderedDict()
deliveries = OrderedDict()
weather_cache = {}
earth_cache = {}
earth_images = {}
delivery_lock = asyncio.Lock()
DATA_DIR = Path(os.getenv("CHRONOS_DATA_DIR", "/tmp/chronos-coastal"))
records = RecordStore(DATA_DIR)


def now():
    return datetime.now(timezone.utc).isoformat()


def corridor(cid):
    if cid not in CORRIDORS:
        raise HTTPException(404, "Unknown coastal corridor")
    return get_corridor(cid)


def remember(cache, key, value):
    kind = "snapshot" if cache is snapshots else "advisory" if cache is advisories else "delivery"
    records.put(kind, key, value)
    cache[key] = value
    while len(cache) > 100:
        cache.popitem(last=False)
    return value


class ScenarioInput(BaseModel):
    corridor_id: str = "chennai"
    ocean_surge_m: float = Field(default=1.8, ge=0, le=5)
    river_inflow_m3s: float = Field(default=520, ge=50, le=2500)
    hours_to_landfall: float = Field(default=6, ge=0.5, le=24)
    rainfall_mm: float = Field(default=150, ge=0, le=1000)
    include_rainfall_runoff: bool = False


class AdvisoryInput(BaseModel):
    snapshot_id: str
    language: Literal["English", "Tamil", "Hindi"] = "English"
    inspect_image: bool = False


class AdvisoryText(BaseModel):
    title: str
    summary: str
    actions: list[str]
    public_message: str


class DispatchInput(BaseModel):
    advisory_id: str
    channel: Literal["test_inbox", "webhook"] = "test_inbox"
    recipient: str = Field(default="District emergency operations centre", min_length=3, max_length=160)


@router.get("/status")
async def status():
    return {
        "gemini_configured": bool(os.getenv("GEMINI_API_KEY")),
        "gemini_model": os.getenv("GEMINI_MODEL", "gemini-3.7-flash"),
        "earth_engine_configured": bool(os.getenv("GEE_PROJECT_ID")),
        "external_dispatch_configured": bool(os.getenv("ADVISORY_WEBHOOK_URL")),
        "model_status": "scenario_screening_unvalidated",
    }


@router.get("/weather/{cid}")
async def weather(cid: str, refresh: bool = False):
    data = corridor(cid)
    cached = weather_cache.get(cid)
    if cached and not refresh and (datetime.now(timezone.utc).timestamp() - cached["cached_at"]) < 600:
        return cached["data"]
    try:
        async with httpx.AsyncClient(timeout=12) as client:
            resp = await client.get("https://api.open-meteo.com/v1/forecast", params={
                "latitude": data["center_lat"], "longitude": data["center_lon"],
                "hourly": "precipitation,wind_speed_10m,wind_gusts_10m,pressure_msl",
                "forecast_days": 3, "timezone": "UTC", "wind_speed_unit": "kmh",
            })
            resp.raise_for_status()
            payload = resp.json()
        hourly = payload["hourly"]
        current = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:00")
        rows = [{"time": t + "Z", "rain_mm": hourly["precipitation"][i],
                 "wind_kmh": hourly["wind_speed_10m"][i],
                 "gust_kmh": hourly["wind_gusts_10m"][i],
                 "pressure_hpa": hourly["pressure_msl"][i]}
                for i, t in enumerate(hourly["time"]) if t >= current][:48]
        if not rows:
            raise ValueError("Provider returned no upcoming forecast hours")
        result = {"mode": "live_forecast", "provider": "Open-Meteo", "retrieved_at": now(),
                  "source_url": "https://open-meteo.com/en/docs", "corridor_id": cid,
                  "rainfall_next_24h_mm": round(sum(r["rain_mm"] or 0 for r in rows[:24]), 1),
                  "peak_gust_kmh": max(r["gust_kmh"] or 0 for r in rows[:24]),
                  "hourly": rows, "note": "Weather-model forecast. Does not provide cyclone track or storm surge."}
        weather_cache[cid] = {"cached_at": datetime.now(timezone.utc).timestamp(), "data": result}
        return result
    except Exception as exc:
        logger.warning("Weather provider unavailable: %s", type(exc).__name__)
        if cached:
            return {**cached["data"], "mode": "cached_forecast", "note": "Provider unavailable; displaying the last retrieved forecast."}
        return {"mode": "unavailable", "provider": "Open-Meteo", "corridor_id": cid,
                "hourly": [], "rainfall_next_24h_mm": None, "peak_gust_kmh": None,
                "note": "Forecast unavailable. Scenario inputs remain available; no live weather values are fabricated."}


def fetch_earth(cid):
    """Fetch actual same-orbit SAR change, slope composite, and map tiles."""
    import ee
    ee.Initialize(project=os.environ["GEE_PROJECT_ID"])
    data = corridor(cid)
    lat, lon = data["center_lat"], data["center_lon"]
    roi = ee.Geometry.Rectangle([lon - .18, lat - .18, lon + .18, lat + .18])
    end = ee.Date(datetime.now(timezone.utc).strftime("%Y-%m-%d"))
    series = (ee.ImageCollection("COPERNICUS/S1_GRD").filterBounds(roi)
              .filterDate(end.advance(-90, "day"), end)
              .filter(ee.Filter.eq("instrumentMode", "IW"))
              .filter(ee.Filter.listContains("transmitterReceiverPolarisation", "VV")))
    if series.size().getInfo() == 0:
        raise ValueError("No Sentinel-1 acquisitions in the selected region")
    latest = ee.Image(series.sort("system:time_start", False).first())
    orbit = latest.get("relativeOrbitNumber_start")
    stamp = ee.Date(latest.get("system:time_start"))
    baseline_series = series.filter(ee.Filter.eq("relativeOrbitNumber_start", orbit)).filterDate(stamp.advance(-60, "day"), stamp.advance(-6, "day"))
    if baseline_series.size().getInfo() == 0:
        raise ValueError("No matching-orbit baseline available")
    baseline = baseline_series.select("VV").median()
    delta = latest.select("VV").subtract(baseline).rename("change_db")
    dem_collection = ee.ImageCollection("COPERNICUS/DEM/GLO30_2024_1").filterBounds(roi).select("DEM")
    dem = dem_collection.mosaic().setDefaultProjection(dem_collection.first().projection())
    slope = ee.Terrain.slope(dem)
    permanent = ee.Image("JRC/GSW1_4/GlobalSurfaceWater").select("occurrence").gte(80)
    candidate = delta.lt(-3.5).And(slope.lt(5)).And(permanent.Not()).rename("candidate_water").clip(roi)
    totals = ee.Image.cat(candidate.multiply(ee.Image.pixelArea()).rename("wet_area"), ee.Image.pixelArea().rename("total_area")).reduceRegion(ee.Reducer.sum(), roi, 100, maxPixels=2e7).getInfo()
    area_fraction = (totals.get("wet_area") or 0) / max(1, totals.get("total_area") or 1)
    imerg = (ee.ImageCollection("NASA/GPM_L3/IMERG_V07").filterBounds(roi)
             .filterDate(end.advance(-14, "day"), end).select("precipitation"))
    rain_observation = None
    if imerg.size().getInfo() > 0:
        rain_stamp = ee.Date(ee.Image(imerg.sort("system:time_start", False).first()).get("system:time_start"))
        # IMERG precipitation is a rate in mm/h and its images are half-hourly.
        rain_image = imerg.filterDate(rain_stamp.advance(-24, "hour"), rain_stamp.advance(1, "minute")).sum().multiply(.5)
        rain_mm = rain_image.reduceRegion(ee.Reducer.mean(), roi, 11132, maxPixels=2e7).get("precipitation").getInfo()
        rain_observation = {"rainfall_24h_mm": round(rain_mm, 1) if rain_mm is not None else None,
                            "ending_at": rain_stamp.format("YYYY-MM-dd'T'HH:mm:ss").getInfo() + "Z",
                            "source": "NASA/GPM_L3/IMERG_V07", "type": "satellite_estimate_not_forecast"}
    tile = candidate.selfMask().getMapId({"palette": ["4ba7ff"]})
    demtile = dem.getMapId({"min": 0, "max": 40, "palette": ["143329", "4d8b6c", "dce7b0"]})
    rgb = ee.Image.cat(slope.divide(35).clamp(0, 1), delta.multiply(-1).divide(8).clamp(0, 1), dem.divide(40).clamp(0, 1)).rename(["red", "green", "blue"]).clip(roi)
    thumb = rgb.getThumbURL({"region": roi, "dimensions": 700, "min": 0, "max": 1, "format": "png"})
    with httpx.Client(timeout=30) as client:
        image = client.get(thumb)
        image.raise_for_status()
        earth_images[cid] = image.content
    result = {"mode": "earth_engine", "corridor_id": cid, "retrieved_at": now(),
              "acquired_at": stamp.format("YYYY-MM-dd'T'HH:mm:ss").getInfo() + "Z",
              "scene_id": latest.get("system:index").getInfo(),
              "candidate_water_fraction": round(area_fraction, 4),
              "tile_url": tile["tile_fetcher"].url_format,
              "terrain_tile_url": demtile["tile_fetcher"].url_format,
              "image_url": f"/api/operations/earth/{cid}/image",
              "bands": "Red: terrain slope; green: SAR backscatter decrease; blue: surface elevation",
              "imerg": rain_observation,
              "collections": ["COPERNICUS/S1_GRD", "COPERNICUS/DEM/GLO30_2024_1", "NASA/GPM_L3/IMERG_V07", "JRC/GSW1_4/GlobalSurfaceWater"],
              "note": "Observed change candidates, not a validated flood map. Urban radar effects and scene age limit interpretation."}
    earth_cache[cid] = result
    return result


@router.get("/earth/{cid}")
async def earth(cid: str, refresh: bool = False):
    corridor(cid)
    if cid in earth_cache and not refresh:
        return earth_cache[cid]
    if not os.getenv("GEE_PROJECT_ID"):
        return {"mode": "not_configured", "corridor_id": cid, "note": "Set GEE_PROJECT_ID and authenticate Earth Engine to load satellite observations.", "collections": ["COPERNICUS/S1_GRD", "COPERNICUS/DEM/GLO30_2024_1", "NASA/GPM_L3/IMERG_V07"]}
    try:
        return await asyncio.wait_for(asyncio.to_thread(fetch_earth, cid), timeout=65)
    except Exception as exc:
        logger.warning("Earth Engine unavailable: %s", type(exc).__name__)
        return {"mode": "unavailable", "corridor_id": cid, "note": "Earth Engine could not load observations. Check project access, authentication and scene availability."}


@router.get("/earth/{cid}/image")
async def earth_image(cid: str):
    corridor(cid)
    if cid not in earth_images:
        raise HTTPException(404, "No satellite composite loaded for this corridor")
    return Response(earth_images[cid], media_type="image/png")


@router.post("/simulate")
async def simulate(req: ScenarioInput):
    data = corridor(req.corridor_id)
    # Explicit screening assumptions, exposed to the user. Not a calibrated basin model.
    catchment_km2, runoff_coefficient, duration_hours = 120, .45, 24
    rainfall_runoff = req.rainfall_mm * 1e-3 * catchment_km2 * 1e6 * runoff_coefficient / (duration_hours * 3600) if req.include_rainfall_runoff else 0
    inflow = req.river_inflow_m3s + rainfall_runoff
    hydro = CompoundHydroEngine(req.corridor_id).simulate(req.ocean_surge_m, inflow, req.hours_to_landfall)
    grid = PowerGridCascadeEngine(req.corridor_id).evaluate_cascade(hydro)
    logistics = LifeSupportLogisticsEngine(req.corridor_id).evaluate_reachability(req.ocean_surge_m, inflow, req.hours_to_landfall)
    event_bus = TacticalEventBus()
    apex = await ApexAgent(event_bus, req.corridor_id).synthesize_iap(hydro, grid, logistics)
    variants = []
    for label, factor in [("Lower stress", .8), ("Selected scenario", 1), ("Higher stress", 1.2)]:
        h = CompoundHydroEngine(req.corridor_id).simulate(req.ocean_surge_m * factor, inflow * factor, req.hours_to_landfall)
        g = PowerGridCascadeEngine(req.corridor_id).evaluate_cascade(h)
        variants.append({"label": label, "factor": factor, "flooded_assets": h["flooded_asset_count"], "tripped_substations": g["tripped_substation_count"], "patients_at_risk": g["total_patients_on_dg_risk"] + g["total_blacked_out_icu_patients"]})
    ident = "RUN-" + uuid.uuid4().hex[:10].upper()
    result = {"success": True, "snapshot_id": ident, "created_at": now(), **req.model_dump(),
              "effective_inflow_m3s": round(inflow, 1), "hydro": hydro, "grid": grid,
              "logistics": logistics, "apex": apex.model_dump(), "sensitivity": variants,
              "provenance": {"mode": "scenario_screening", "infrastructure": "Curated demonstration assets and assumed grid dependencies",
                             "hydrology": "Simplified surge/backwater approximation; not field validated",
                             "rainfall_runoff": {"enabled": req.include_rainfall_runoff, "additional_inflow_m3s": round(rainfall_runoff, 1), "catchment_km2": catchment_km2, "runoff_coefficient": runoff_coefficient, "duration_hours": duration_hours},
                             "satellite": earth_cache.get(req.corridor_id, {}).get("mode", "not_loaded")}}
    return remember(snapshots, ident, result)


@router.post("/advisories")
async def generate_advisory(req: AdvisoryInput):
    state = snapshots.get(req.snapshot_id) or records.get("snapshot", req.snapshot_id)
    if state is None:
        raise HTTPException(404, "Scenario expired; run a new simulation")
    cid = state["corridor_id"]
    plan = state["apex"]
    routes = sorted(
        state["logistics"]["routes"],
        key=lambda r: float("inf") if r["departure_window_remaining_min"] is None
        else r["departure_window_remaining_min"],
    )
    actions = [d["details"] for d in sorted(plan["tactical_directives"], key=lambda d: d["priority"])][:6]
    risk = plan["critical_patients_at_risk"]
    text = AdvisoryText(title=f"{get_corridor(cid)['name']} — preparedness advisory",
        summary=f"Scenario screening identifies {state['hydro']['flooded_asset_count']} exposed assets, {state['grid']['tripped_substation_count']} interrupted substations and {risk} ICU beds dependent on threatened services.",
        actions=actions,
        public_message="Preparedness exercise: monitor official weather bulletins, avoid flooded roads, and follow instructions from local emergency authorities. This scenario is not an official warning.")
    mode = "rule_based_draft"
    vision = None
    error = None
    if req.inspect_image:
        agent = GeotechnicalVisionAgent(TacticalEventBus(), cid)
        depth = max((a["water_depth_m"] for a in state["hydro"]["assets"]), default=0)
        if cid in earth_images and agent.client:
            try:
                # Same structured report; actual satellite composite replaces synthetic fixture.
                agent.SYSTEM_PROMPT = "Inspect an actual GEE satellite composite. Red is DEM slope, green is SAR backscatter decrease, blue is surface elevation. Infrastructure locations are not encoded. Do not invent facility footprints or treat radar change as confirmed flooding. Report candidate hazards and limitations. Box coordinates are 0-1000. Risk scores are uncalibrated model judgments."
                image = Image.open(io.BytesIO(earth_images[cid])).convert("RGB")
                vision = (await agent._call_gemini_vision(image, depth, state["ocean_surge_m"], None)).model_dump()
                vision["image_source"] = "earth_engine"
            except Exception:
                error = "Satellite inspection unavailable; advisory uses simulation evidence."
        else:
            # Honest offline artifact; no claim of satellite observation or live inference.
            vision = agent._synthetic_geotechnical_fallback(depth, state["ocean_surge_m"], None).model_dump()
            vision["image_source"] = "synthetic_fixture"
    if os.getenv("GEMINI_API_KEY"):
        try:
            from google import genai
            from google.genai import types
            client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
            evidence = {"inputs": {k: state[k] for k in ["ocean_surge_m", "effective_inflow_m3s", "hours_to_landfall", "rainfall_mm"]}, "plan": plan, "routes": routes, "vision": vision,
                        "weather": weather_cache.get(cid, {}).get("data"), "provenance": state["provenance"]}
            response = await asyncio.wait_for(client.aio.models.generate_content(
                model=os.getenv("GEMINI_MODEL", "gemini-3.7-flash"),
                contents="Write a concise municipal preparedness DRAFT in " + req.language + ". Use only provided evidence. Never invent observations, evacuation routes, confirmed damage, payouts or delivery. Forecast weather and simulated surge are different inputs. Suggest actions for authority review, not medical orders. Mention scenario limitations. " + json.dumps(evidence),
                config=types.GenerateContentConfig(response_mime_type="application/json", response_schema=AdvisoryText, temperature=.2)), timeout=35)
            text = AdvisoryText.model_validate_json(response.text)
            mode = "gemini_live"
        except Exception as exc:
            logger.warning("Advisory inference unavailable: %s", type(exc).__name__)
            error = "Gemini unavailable; using an English rule-based draft."
    ident = "ADV-" + uuid.uuid4().hex[:10].upper()
    record = {"advisory_id": ident, "snapshot_id": req.snapshot_id, "corridor_id": cid,
              "created_at": now(), "language": req.language if mode == "gemini_live" else "English",
              "engine_mode": mode, "model": os.getenv("GEMINI_MODEL", "gemini-3.7-flash") if mode == "gemini_live" else None,
              "status": "draft", **text.model_dump(), "vision": vision, "notice": error,
              "evidence": {"scenario": state["provenance"], "satellite": earth_cache.get(cid), "weather": weather_cache.get(cid, {}).get("data", {}).get("mode", "not_loaded")}}
    record["sha256"] = hashlib.sha256(json.dumps(record, sort_keys=True).encode()).hexdigest()
    return remember(advisories, ident, record)


@router.post("/dispatch")
async def dispatch(req: DispatchInput):
    advisory = advisories.get(req.advisory_id) or records.get("advisory", req.advisory_id)
    if advisory is None:
        raise HTTPException(404, "Advisory expired; generate a new draft")
    async with delivery_lock:
        existing = next((d for d in records.recent("delivery", 1000) if d["advisory_id"] == req.advisory_id and d["channel"] == req.channel and d["recipient"] == req.recipient), None)
        if existing:
            return existing
        record = {"delivery_id": "DEL-" + uuid.uuid4().hex[:10].upper(), **req.model_dump(), "timestamp": now()}
        if req.channel == "webhook":
            url = os.getenv("ADVISORY_WEBHOOK_URL")
            if not url:
                raise HTTPException(409, "No external delivery destination configured. Use the test inbox.")
            try:
                async with httpx.AsyncClient(timeout=12) as client:
                    response = await client.post(url, json={"delivery": record, "advisory": advisory}, headers={"Idempotency-Key": req.advisory_id})
                    response.raise_for_status()
                record["status"] = "webhook_accepted"
            except Exception:
                raise HTTPException(502, "Destination did not confirm receipt; advisory remains a draft")
        else:
            record["status"] = "delivered_to_test_inbox"
        # Keep the signed draft immutable; receipts track delivery independently.
        return remember(deliveries, record["delivery_id"], record)


@router.get("/deliveries")
async def inbox():
    return records.recent("delivery")


@router.get("/advisories/{ident}/export")
async def export(ident: str):
    item = advisories.get(ident) or records.get("advisory", ident)
    if item is None:
        raise HTTPException(404, "Advisory not found")
    body = f"CHRONOS COASTAL | PREPAREDNESS DRAFT\n{item['title']}\n{item['created_at']}\n\n{item['summary']}\n\n" + "\n".join(f"{i+1}. {a}" for i, a in enumerate(item["actions"])) + f"\n\nPUBLIC MESSAGE\n{item['public_message']}\n\nEvidence: {item['snapshot_id']} | Mode: {item['engine_mode']}\nScenario screening; not an official forecast.\nSHA-256: {item['sha256']}\n"
    return Response(body, media_type="text/plain", headers={"Content-Disposition": f'attachment; filename="{ident}.txt"'})
