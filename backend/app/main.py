"""
CHRONOS-COASTAL FastAPI Application
Autonomous Multi-Agent Swarm Orchestrator & Digital Twin Gateway
"""

import os
import json
import asyncio
import logging
from contextlib import asynccontextmanager, suppress
from typing import Optional, Dict, Any, List
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Response, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env", override=False)

from app.dataset import CORRIDORS, get_corridor, list_available_corridors
from app.map_generator import SpatialMapGenerator
from app.swarm.bus import TacticalEventBus
from app.swarm.hydro_agent import HydroAgent
from app.swarm.grid_agent import GridCascadeAgent
from app.swarm.vision_agent import GeotechnicalVisionAgent
from app.swarm.logistics_agent import LifeSupportLogisticsAgent
from app.swarm.oracle_agent import ParametricOracleAgent
from app.hydro_engine import CompoundHydroEngine
from app.swarm.apex_agent import ApexAgent
from app.simulation import ChronosSimulationEngine
from app.evals.runner import ChronosEvaluationRunner, RESULTS_FILE, FINETUNE_FILE

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("ChronosMain")

# Global Swarm Singleton Instances
bus = TacticalEventBus()
hydro_agent = HydroAgent(bus, "kochi")
grid_agent = GridCascadeAgent(bus, "kochi")
vision_agent = GeotechnicalVisionAgent(bus, "kochi")
logistics_agent = LifeSupportLogisticsAgent(bus, "kochi")
oracle_agent = ParametricOracleAgent(bus, "kochi")
apex_agent = ApexAgent(bus, "kochi")
map_generator = SpatialMapGenerator(width=700, height=700)
simulation_engine = ChronosSimulationEngine("kochi")

# Cached last simulation state
last_simulation_state = {
    "corridor_id": "kochi",
    "ocean_surge_m": 1.85,
    "river_inflow_m3s": 550.0,
    "hours_to_landfall": 6.0,
    "hydro": None,
    "grid": None,
    "logistics": None,
    "oracle": None,
    "apex": None
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Launch priority event bus worker
    bus.prepare()
    bus_task = asyncio.create_task(bus.run())
    logger.info("Chronos Tactical Event Bus task launched.")

    # Initialize baseline simulation
    try:
        init_hydro = await hydro_agent.execute_and_publish(1.85, 550.0, 6.0)
        init_grid = await grid_agent.execute_and_publish(init_hydro)
        init_logistics = await logistics_agent.execute_and_publish(1.85, 550.0, 6.0)
        init_oracle = await oracle_agent.execute_and_publish(1.85, 550.0, init_hydro)
        init_apex = await apex_agent.synthesize_iap(init_hydro, init_grid, init_logistics, oracle_voucher=init_oracle.model_dump())

        last_simulation_state["hydro"] = init_hydro
        last_simulation_state["grid"] = init_grid
        last_simulation_state["logistics"] = init_logistics
        last_simulation_state["oracle"] = init_oracle.model_dump()
        last_simulation_state["apex"] = init_apex.model_dump()
        logger.info("Chronos Swarm baseline state initialized across all 6 agents.")
    except Exception as e:
        logger.error(f"Error during baseline simulation initialization: {e}", exc_info=True)

    yield

    # Shutdown
    bus.stop()
    bus_task.cancel()
    with suppress(asyncio.CancelledError):
        await bus_task
    logger.info("Chronos Tactical Event Bus task terminated.")


app = FastAPI(
    title="CHRONOS-COASTAL Autonomous Swarm API",
    description="Physics-Coupled Compound Inundation & Critical Infrastructure Triaging Engine",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request Models
class SimulationRequest(BaseModel):
    corridor_id: str = Field(default="kochi", description="kochi, chennai, mumbai, or odisha")
    ocean_surge_m: float = Field(default=1.85, ge=0.0, le=5.0)
    river_inflow_m3s: float = Field(default=550.0, ge=50.0, le=2500.0)
    hours_to_landfall: float = Field(default=6.0, ge=0.5, le=24.0)


class GeotechnicalInspectionRequest(BaseModel):
    corridor_id: str = Field(default="kochi")
    water_depth_m: float = Field(default=0.50, ge=0.0, le=5.0)
    surge_m: float = Field(default=1.85, ge=0.0, le=5.0)
    target_facility: Optional[str] = None


# -------------------------------------------------------------
# REST Endpoints
# -------------------------------------------------------------

@app.get("/api/health")
async def health_check():
    """Returns real-time status of the multi-agent swarm and active API mode."""
    return {
        "status": "healthy",
        "system": "CHRONOS-COASTAL Autonomous Swarm",
        "active_corridor": last_simulation_state["corridor_id"],
        "active_agents": 6,
        "connected_ws_clients": len(bus._active_websockets),
        "gemini_mode": "google_genai_live" if vision_agent.client else "synthetic_resilient_fallback",
        "version": "1.0.0"
    }


@app.get("/api/corridors")
async def get_corridors_list():
    """Lists all available Pan-India national testbed corridors."""
    return list_available_corridors()


@app.get("/api/corridors/{corridor_id}")
async def get_corridor_details(corridor_id: str):
    """Retrieves full telemetry, assets, and grid topology for a specific corridor."""
    try:
        return get_corridor(corridor_id)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Corridor '{corridor_id}' not found.")


@app.post("/api/simulate")
async def run_simulation_step(req: SimulationRequest):
    """
    Executes a multi-agent simulation step across Hydro, Grid, Logistics, Oracle, and Apex agents.
    Broadcasts results in real time over the priority event bus to all connected clients.
    """
    cid = req.corridor_id.lower().strip()
    if cid not in CORRIDORS:
        raise HTTPException(status_code=400, detail=f"Invalid corridor '{cid}'. Available: {list(CORRIDORS.keys())}")

    # Set active corridor across agents
    hydro_agent.set_corridor(cid)
    grid_agent.set_corridor(cid)
    logistics_agent.set_corridor(cid)
    oracle_agent.set_corridor(cid)
    apex_agent.set_corridor(cid)

    # 1. Execute Hydro Agent
    hydro_res = await hydro_agent.execute_and_publish(
        ocean_surge_m=req.ocean_surge_m,
        river_inflow_m3s=req.river_inflow_m3s,
        hours_to_landfall=req.hours_to_landfall,
        corridor_id=cid
    )

    # 2. Execute Grid Cascade Agent
    grid_res = await grid_agent.execute_and_publish(hydro_res, corridor_id=cid)

    # 3. Execute Life-Support Logistics Agent
    logistics_res = await logistics_agent.execute_and_publish(
        ocean_surge_m=req.ocean_surge_m,
        river_inflow_m3s=req.river_inflow_m3s,
        hours_to_landfall=req.hours_to_landfall,
        corridor_id=cid
    )

    # 4. Execute Parametric Oracle Agent
    oracle_res = await oracle_agent.execute_and_publish(
        ocean_surge_m=req.ocean_surge_m,
        river_inflow_m3s=req.river_inflow_m3s,
        hydro_data=hydro_res,
        corridor_id=cid
    )

    # 5. Execute Apex Incident Commander Agent
    apex_res = await apex_agent.synthesize_iap(
        hydro_data=hydro_res,
        grid_data=grid_res,
        logistics_data=logistics_res,
        oracle_voucher=oracle_res.model_dump(),
        corridor_id=cid
    )

    # Cache last state
    last_simulation_state["corridor_id"] = cid
    last_simulation_state["ocean_surge_m"] = req.ocean_surge_m
    last_simulation_state["river_inflow_m3s"] = req.river_inflow_m3s
    last_simulation_state["hours_to_landfall"] = req.hours_to_landfall
    last_simulation_state["hydro"] = hydro_res
    last_simulation_state["grid"] = grid_res
    last_simulation_state["logistics"] = logistics_res
    last_simulation_state["oracle"] = oracle_res.model_dump()
    last_simulation_state["apex"] = apex_res.model_dump()

    return {
        "success": True,
        "corridor_id": cid,
        "ocean_surge_m": req.ocean_surge_m,
        "river_inflow_m3s": req.river_inflow_m3s,
        "hours_to_landfall": req.hours_to_landfall,
        "hydro": hydro_res,
        "grid": grid_res,
        "logistics": logistics_res,
        "oracle": oracle_res.model_dump(),
        "apex": apex_res.model_dump()
    }


@app.post("/api/gemini/inspect")
async def inspect_geotechnical_tile(req: GeotechnicalInspectionRequest):
    """
    Passes a synthesized 3-band false-color GIS tile directly to Gemini 3.7 Flash.
    Returns normalized 2D bounding boxes and slope failure risks.
    """
    cid = req.corridor_id.lower().strip()
    if cid not in CORRIDORS:
        raise HTTPException(status_code=400, detail=f"Invalid corridor '{cid}'.")
    report = await vision_agent.inspect_tile(
        water_depth_m=req.water_depth_m,
        surge_m=req.surge_m,
        target_facility=req.target_facility,
        corridor_id=cid
    )
    return report.model_dump()


@app.get("/api/tile/preview")
async def preview_tile(
    corridor_id: str = Query(default="kochi"),
    depth: float = Query(default=0.5),
    surge: float = Query(default=1.85)
):
    """Returns the uncompressed 3-band composite false-color GIS JPEG image."""
    try:
        jpeg_bytes = map_generator.get_composite_jpeg_bytes(
            corridor_id=corridor_id,
            water_depth_m=depth,
            surge_m=surge
        )
        return Response(content=jpeg_bytes, media_type="image/jpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/oracle/verify")
async def verify_parametric_oracle(req: Optional[SimulationRequest] = None):
    """Manually triggers the Parametric Proof Oracle validation."""
    cid = req.corridor_id if req else last_simulation_state["corridor_id"]
    surge = req.ocean_surge_m if req else last_simulation_state["ocean_surge_m"]
    inflow = req.river_inflow_m3s if req else last_simulation_state["river_inflow_m3s"]

    if cid not in CORRIDORS:
        raise HTTPException(status_code=400, detail=f"Invalid corridor '{cid}'.")
    cached = last_simulation_state
    same_scenario = (
        cached["corridor_id"] == cid
        and cached["ocean_surge_m"] == surge
        and cached["river_inflow_m3s"] == inflow
    )
    hydro = cached["hydro"] if same_scenario else None
    if hydro is None:
        hydro = CompoundHydroEngine(cid).simulate(surge, inflow)
    voucher = await oracle_agent.execute_and_publish(surge, inflow, hydro, corridor_id=cid)
    return voucher.model_dump()


# -------------------------------------------------------------
# Evaluation & Calibration Benchmark Endpoints
# -------------------------------------------------------------
@app.get("/api/evals/results")
async def get_evaluation_results():
    """Returns reference-scenario diagnostics without a field-validity score."""
    if os.path.exists(RESULTS_FILE):
        try:
            with open(RESULTS_FILE, "r", encoding="utf-8") as f:
                cached = json.load(f)
            if cached.get("evaluation_version") == 2:
                return cached
        except (OSError, ValueError):
            pass
    return await ChronosEvaluationRunner().run_full_evaluation()


@app.post("/api/evals/run")
async def execute_evals_benchmark():
    """Executes a fresh evaluation run across all 4 corridors and updates scorecard."""
    runner = ChronosEvaluationRunner()
    results = await runner.run_full_evaluation()
    return results


@app.get("/api/evals/finetune-dataset")
async def get_finetune_dataset(sample_limit: int = Query(default=5, ge=1, le=50)):
    """Returns metadata and preview samples of synthetic example records."""
    if not os.path.exists(FINETUNE_FILE):
        runner = ChronosEvaluationRunner()
        await runner.run_full_evaluation()

    samples = []
    total_lines = 0
    with open(FINETUNE_FILE, "r", encoding="utf-8") as f:
        for idx, line in enumerate(f):
            total_lines += 1
            if idx < sample_limit:
                samples.append(json.loads(line))

    return {
        "status": "READY",
        "file_path": FINETUNE_FILE,
        "format": "JSONL synthetic example records",
        "target_model": "unvalidated-examples",
        "total_records": total_lines,
        "sample_records": samples
    }


# -------------------------------------------------------------
# WebSocket Feed
# -------------------------------------------------------------
@app.websocket("/ws/tactical-feed")
async def websocket_tactical_feed(websocket: WebSocket):
    """
    Real-time bidirectional WebSocket stream.
    Broadcasts all inter-agent messages, breaker trips, and IAP orders.
    """
    await bus.connect_ws(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            logger.debug(f"Received client command: {data}")
    except WebSocketDisconnect:
        bus.disconnect_ws(websocket)


# -------------------------------------------------------------
# Frontend Static Asset Mounting
# -------------------------------------------------------------
from app.operations import router as operations_router
app.include_router(operations_router)

frontend_dist = str(Path(__file__).resolve().parents[2] / "frontend" / "dist")
if os.path.exists(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")
    logger.info(f"Mounted frontend static assets from {frontend_dist}")
