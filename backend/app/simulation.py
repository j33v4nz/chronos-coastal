"""
CHRONOS-COASTAL Unified Multi-Corridor Simulation Engine
Orchestrates Physics Coupling:
1. Compound Hydrodynamics (Estuarine M1 Backwater Solver)
2. Directed Acyclic Graph (DAG) Power Grid Breaker Cascade
3. Life-Support Logistics Dynamic Reachability & Departure Deadlines
"""

from typing import Dict, Any, Optional
from app.dataset import get_corridor, list_available_corridors
from app.hydro_engine import CompoundHydroEngine
from app.grid_engine import PowerGridCascadeEngine
from app.logistics_engine import LifeSupportLogisticsEngine


class ChronosSimulationEngine:
    """
    Unified Simulation Engine executing the coupled physics of:
    - Compound estuarine backwater inundation
    - Power transmission and substation trip cascades
    - Emergency life-support logistics route reachability
    Across all 4 Pan-India national testbed corridors.
    """

    def __init__(self, corridor_id: str = "kochi"):
        self.corridor_id = corridor_id
        self.hydro = CompoundHydroEngine(corridor_id)
        self.grid = PowerGridCascadeEngine(corridor_id)
        self.logistics = LifeSupportLogisticsEngine(corridor_id)

    def set_corridor(self, corridor_id: str):
        """Sets active corridor across all 3 underlying engines."""
        self.corridor_id = corridor_id
        self.hydro.set_corridor(corridor_id)
        self.grid.set_corridor(corridor_id)
        self.logistics.set_corridor(corridor_id)

    def run_simulation(
        self,
        ocean_surge_m: float = 1.85,
        river_inflow_m3s: float = 550.0,
        hours_to_landfall: float = 6.0,
        corridor_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes an end-to-end physics simulation step:
        1. Calculates hydro inundation depths and backwater head jumps.
        2. Evaluates electrical breaker trips and hospital generator lifelines.
        3. Computes convoy departure deadlines for oxygen and diesel fuel.
        """
        if corridor_id and corridor_id != self.corridor_id:
            self.set_corridor(corridor_id)

        # 1. Hydrodynamics
        hydro_res = self.hydro.simulate(
            ocean_surge_m=ocean_surge_m,
            river_inflow_m3s=river_inflow_m3s,
            hours_to_landfall=hours_to_landfall
        )

        # 2. Power Grid Cascade
        grid_res = self.grid.evaluate_cascade(hydro_res)

        # 3. Logistics Reachability
        logistics_res = self.logistics.evaluate_reachability(
            ocean_surge_m=ocean_surge_m,
            river_inflow_m3s=river_inflow_m3s,
            hours_to_landfall=hours_to_landfall
        )

        # Synthesize executive summary metrics
        corridor_meta = get_corridor(self.corridor_id)

        return {
            "success": True,
            "corridor": {
                "id": self.corridor_id,
                "name": corridor_meta["name"],
                "region": corridor_meta["region"],
                "sea_basin": corridor_meta["sea_basin"],
                "benchmark_event": corridor_meta["benchmark_event"]
            },
            "parameters": {
                "ocean_surge_m": ocean_surge_m,
                "river_inflow_m3s": river_inflow_m3s,
                "hours_to_landfall": hours_to_landfall
            },
            "hydro": hydro_res,
            "grid": grid_res,
            "logistics": logistics_res,
            "summary": {
                "damming_head_jump_m": hydro_res["estuarine_damming_jump_m"],
                "tripped_substations": grid_res["tripped_substations"],
                "tripped_substation_count": grid_res["tripped_substation_count"],
                "dark_dry_nodes_count": grid_res["dark_dry_nodes_count"],
                "hospitals_on_generator": [
                    h["id"] for h in grid_res["hospitals"] if h["on_generator"]
                ],
                "hospitals_blacked_out": [
                    h["id"] for h in grid_res["hospitals"] if not h["grid_mains_powered"] and not h["on_generator"]
                ],
                "patients_on_dg_risk": grid_res["total_patients_on_dg_risk"],
                "patients_in_blackout": grid_res["total_blacked_out_icu_patients"],
                "urgent_logistics_routes": [
                    r["corridor_id"] for r in logistics_res["routes"]
                    if r["departure_window_remaining_min"] is not None
                    and r["departure_window_remaining_min"] < 180.0
                ]
            }
        }
