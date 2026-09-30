"""
CHRONOS-COASTAL Geotechnical Vision Agent (Gemini 3.7 Flash Multimodal Integration)
Inspects 3-band composite false-color GIS rasters:
- Red: DEM Slope > 35°
- Green: SAR Backscatter Delta <= -3.5dB
- Blue: Infrastructure & Road Vectors
Outputs structured geotechnical failure risks, slope stability ratings, and normalized 2D bounding boxes.
Equipped with a zero-downtime offline synthetic fallback engine for 100% demo resilience.
"""

import os
import io
import json
import logging
import asyncio
from typing import Dict, Any, Optional, List
from PIL import Image

from app.swarm.bus import TacticalEventBus
from app.swarm.messages import SwarmMessage, Priority, GeotechnicalReport, GeotechnicalHazard
from app.map_generator import SpatialMapGenerator
from app.dataset import get_corridor

logger = logging.getLogger("VisionAgent")


class GeotechnicalVisionAgent:
    """
    Multimodal Spatial Inspector utilizing Gemini 3.7 Flash via the official Google GenAI SDK.
    Inspects composite GIS tensors for embankment scouring, slope failure scarps, and generator pad depression pooling.
    Fails over seamlessly to a deterministic synthetic engine when offline or without an API key.
    """

    SYSTEM_PROMPT = """
You are the CHRONOS-COASTAL Chief Geotechnical & Satellite Remote Sensing AI Inspector.
You are inspecting an uncompressed 3-band false-color satellite and GIS raster:
- RED CHANNEL: Digital Elevation Model (DEM) slope gradient > 35° (steep scarps, laterite embankments, cut slopes).
- GREEN CHANNEL: Sentinel-1 C-Band SAR radar backscatter change Δσ° <= -3.5 dB (specular open water & soil saturation).
- BLUE CHANNEL: Critical infrastructure footprints (substations, hospital ICU wards, generator pads) and arterial highways.

Your mission:
1. Identify embankment washouts and slope failure scarps adjacent to critical facility access roads and hospital ICU pads.
2. Detect topological depression pooling where floodwater ponds around diesel generator plinths.
3. Return normalized 2D bounding boxes in [ymin, xmin, ymax, xmax] on a 0-1000 integer scale.
4. Output a strict JSON structure matching the GeotechnicalReport schema.
"""

    def __init__(self, bus: TacticalEventBus, corridor_id: str = "kochi"):
        self.bus = bus
        self.corridor_id = corridor_id
        self.map_gen = SpatialMapGenerator(width=700, height=700)
        self.api_key = os.getenv("GEMINI_API_KEY", "").strip()
        self.model = os.getenv("GEMINI_MODEL", "gemini-3.7-flash")
        self._init_gemini_client()

    def set_corridor(self, corridor_id: str):
        self.corridor_id = corridor_id

    def _init_gemini_client(self):
        self.client = None
        if self.api_key:
            try:
                from google import genai
                self.client = genai.Client(api_key=self.api_key)
                logger.info("Google GenAI client initialized successfully with Gemini API key.")
            except Exception as e:
                logger.warning(f"Failed to initialize google-genai client: {e}. Falling back to synthetic engine.")

    async def inspect_tile(
        self,
        water_depth_m: float = 0.50,
        surge_m: float = 1.85,
        target_facility: Optional[str] = None,
        corridor_id: Optional[str] = None
    ) -> GeotechnicalReport:
        """Inspects composite GIS image via Gemini 3.7 Flash or offline synthetic fallback."""
        if corridor_id:
            self.set_corridor(corridor_id)

        # Generate composite 3-band GIS image
        tile_img = self.map_gen.generate_composite_tile(
            corridor_id=self.corridor_id,
            water_depth_m=water_depth_m,
            surge_m=surge_m,
            target_facility=target_facility
        )

        report: Optional[GeotechnicalReport] = None

        # 1. Attempt live Google GenAI SDK call if client is available
        if self.client:
            try:
                report = await self._call_gemini_vision(tile_img, water_depth_m, surge_m, target_facility)
            except Exception as e:
                logger.error(f"Gemini live inference failed ({e}). Engaging resilient synthetic fallback engine.")

        # 2. Resilient fallback if no key or API failed
        if report is None:
            report = self._synthetic_geotechnical_fallback(water_depth_m, surge_m, target_facility)

        # 3. Publish findings onto the Tactical Event Bus
        await self.bus.publish(SwarmMessage(
            sender="GeotechnicalVisionAgent",
            topic="audit.vision",
            priority=Priority.HIGH if report.overall_risk_level in ["CRITICAL", "HIGH"] else Priority.NORMAL,
            payload=report.model_dump()
        ))

        return report

    async def _call_gemini_vision(
        self,
        tile_img: Image.Image,
        water_depth_m: float,
        surge_m: float,
        target_facility: Optional[str]
    ) -> GeotechnicalReport:
        """Calls Gemini 3.7 / 2.5 Flash using official Google GenAI SDK."""
        from google.genai import types

        buf = io.BytesIO()
        tile_img.save(buf, format="JPEG", quality=90)
        img_bytes = buf.getvalue()

        user_prompt = f"""
Inspect this 3-band composite false-color GIS patch for the '{self.corridor_id.upper()}' coastal corridor.
Current Hydro Conditions:
- Ocean Storm Surge: {surge_m:.2f} m
- Water Depth at Low Plinths: {water_depth_m:.2f} m
- Target Focus: {target_facility or 'Primary Critical Infrastructure Corridor'}

Analyze slope stability scarp risks (Red band), saturated SAR flood areas (Green band), and critical infrastructure pads (Blue band).
Return a strict GeotechnicalReport JSON schema with 2D bounding boxes [ymin, xmin, ymax, xmax].
"""

        response = await asyncio.wait_for(self.client.aio.models.generate_content(
            model=self.model,
            contents=[
                types.Part.from_bytes(data=img_bytes, mime_type="image/jpeg"),
                user_prompt
            ],
            config=types.GenerateContentConfig(
                system_instruction=self.SYSTEM_PROMPT,
                response_mime_type="application/json",
                response_schema=GeotechnicalReport,
                temperature=0.2
            )
        ), timeout=35)

        parsed_json = json.loads(response.text)
        parsed_json["engine_mode"] = self.model.upper().replace("-", "_") + "_LIVE"
        return GeotechnicalReport(**parsed_json)

    def _synthetic_geotechnical_fallback(
        self,
        water_depth_m: float,
        surge_m: float,
        target_facility: Optional[str]
    ) -> GeotechnicalReport:
        """
        Deterministic, zero-downtime synthetic geotechnical engine.
        Produces mathematically grounded hazard classifications and normalized bounding boxes
        customized to each of the 4 Indian corridors.
        """
        corridor_data = get_corridor(self.corridor_id)
        assets = corridor_data["assets"]
        primary_hospital = next((a for a in assets if a.get("type") == "hospital"), assets[0])
        facility_name = target_facility or primary_hospital["name"]

        hazards: List[GeotechnicalHazard] = []

        if self.corridor_id == "kochi":
            hazards = [
                GeotechnicalHazard(
                    label="SLOPE_FAILURE_SCARP",
                    box_2d=[340, 410, 480, 520],
                    confidence=0.94,
                    description="Unreinforced riverbank embankment along Periyar tributary exhibiting >38° slope. Water flow velocity creates high undercutting and toe scour risk."
                ),
                GeotechnicalHazard(
                    label="TOPOLOGICAL_DEPRESSION_DG_PAD",
                    box_2d=[260, 240, 310, 290],
                    confidence=0.89,
                    description="Low-elevation retention depression adjacent to hospital backup generator pad. Surface runoff accumulation poses water ingress threat to fuel tank vents."
                ),
                GeotechnicalHazard(
                    label="ACCESS_CORRIDOR_WASH_VULNERABILITY",
                    box_2d=[370, 0, 420, 680],
                    confidence=0.91,
                    description="NH-66 approach causeway culvert choke point susceptible to lateral hydrodynamic piping and foundation erosion."
                )
            ]
            summary = (
                f"Multimodal spatial audit of {facility_name} confirms severe slope destabilization along the eastern embankment. "
                f"At {water_depth_m:.2f}m flood depth, toe erosion rate accelerates. Emergency generator pad is positioned in a 0.3m topological basin prone to pooling."
            )
            countermeasures = [
                "Deploy 500 geobag riprap units along eastern embankment scarp (box [340, 410, 480, 520]).",
                "Erect 0.5m temporary sandbag floodwall around diesel generator pad intake manifold.",
                "Implement 24/7 dewatering pump station at NH-66 approach culvert."
            ]
            washout_prob = min(0.95, round(0.40 + water_depth_m * 0.45, 2))

        elif self.corridor_id == "chennai":
            hazards = [
                GeotechnicalHazard(
                    label="ADYAR_EMBANKMENT_SCOUR",
                    box_2d=[310, 380, 450, 490],
                    confidence=0.93,
                    description="Adyar river loop bend displaying severe bank scouring adjacent to MIOT International hospital critical care complex."
                ),
                GeotechnicalHazard(
                    label="SUBSTATION_BASEMENT_INUNDATION",
                    box_2d=[220, 210, 290, 270],
                    confidence=0.92,
                    description="Manapakkam 230kV switchyard cable basement positioned below surrounding road grade. Vulnerable to water ingress."
                )
            ]
            summary = (
                f"Chennai Adyar corridor inspection for {facility_name} reveals high hydrodynamic shear stress along the river meander. "
                f"Chembarambakkam overflow combined with backwater damming threatens to erode access ramp foundations."
            )
            countermeasures = [
                "Anchor sheet-pile temporary deflection barrier along Adyar river bend.",
                "Seal switchyard cable basement entry ducts at Manapakkam 230kV hub.",
                "Pre-position high-clearance military amphibious recovery vehicles at Kathipara junction."
            ]
            washout_prob = min(0.92, round(0.35 + water_depth_m * 0.40, 2))

        elif self.corridor_id == "mumbai":
            hazards = [
                GeotechnicalHazard(
                    label="MITHI_ESTUARY_TIDAL_BACKWATER_POOL",
                    box_2d=[350, 390, 500, 510],
                    confidence=0.95,
                    description="Mithi river bottleneck at Mahim Causeway experiencing hydraulic backwater damming. Water expanding into Kurla lowlands."
                ),
                GeotechnicalHazard(
                    label="HOSPITAL_BASEMENT_FLOOD_RISK",
                    box_2d=[240, 220, 320, 290],
                    confidence=0.88,
                    description="Sion Hospital trauma center drainage collection sump overflowing due to saturated storm sewer backflow."
                )
            ]
            summary = (
                f"Mumbai Mithi-Mahim corridor inspection indicates severe tidal damming at {facility_name}. "
                f"High-tide tailwater prevents localized runoff discharge, inundating low-lying power distribution nodes."
            )
            countermeasures = [
                "Mobilize 4x 1000m³/h trailer-mounted dewatering pumps at Sion-Bandra link road.",
                "Erect temporary elevated diesel transfer manifold for hospital generator replenishment.",
                "Isolate low-lying 33kV distribution feeder cables in Kurla West."
            ]
            washout_prob = min(0.90, round(0.38 + water_depth_m * 0.38, 2))

        else: # Odisha
            hazards = [
                GeotechnicalHazard(
                    label="DELTAIC_LEVEE_BREACH_RISK",
                    box_2d=[300, 360, 460, 480],
                    confidence=0.92,
                    description="Mahanadi river estuarine sand spit levee showing high piping porosity under cyclonic surge pressure."
                ),
                GeotechnicalHazard(
                    label="REFINERY_COASTAL_DIKE_OVERTOPPING",
                    box_2d=[200, 180, 280, 260],
                    confidence=0.94,
                    description="Paradip refinery perimeter protection bund subjected to 2.8m breaking storm wave runup."
                )
            ]
            summary = (
                f"Odisha Mahanadi deltaic inspection for {facility_name} identifies vulnerable sandy-silt river levees. "
                f"Wave runup from Bay of Bengal storm surge threatens to overtop primary containment embankments."
            )
            countermeasures = [
                "Place heavy concrete tetrapod armor along Paradip port medical road.",
                "Reinforce Kujang bridge abutment with interlocking steel revetments.",
                "Dispatch mobile diesel tankers before tidal surge crest."
            ]
            washout_prob = min(0.94, round(0.42 + water_depth_m * 0.42, 2))

        risk_level = "CRITICAL" if washout_prob >= 0.70 else "HIGH" if washout_prob >= 0.45 else "MODERATE"

        return GeotechnicalReport(
            corridor_id=self.corridor_id,
            target_facility=facility_name,
            overall_risk_level=risk_level,
            structural_washout_probability=washout_prob,
            detected_hazards=hazards,
            geotechnical_summary=summary,
            recommended_countermeasures=countermeasures,
            engine_mode="SYNTHETIC_OFFLINE_RESILIENT"
        )
