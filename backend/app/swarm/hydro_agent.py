"""
CHRONOS-COASTAL Hydrodynamics Agent
Autonomous agent computing compound estuarine backwater inundation and publishing priority telemetry.
"""

from typing import Dict, Any, Optional
from app.swarm.bus import TacticalEventBus
from app.swarm.messages import SwarmMessage, Priority
from app.hydro_engine import CompoundHydroEngine


class HydroAgent:
    """
    Solves compound estuarine backwater equations.
    Publishes real-time water surface elevation profiles and triggers high-priority alerts
    when low-lying coastal switchgear plinths are breached.
    """

    def __init__(self, bus: TacticalEventBus, corridor_id: str = "kochi"):
        self.bus = bus
        self.corridor_id = corridor_id
        self.engine = CompoundHydroEngine(corridor_id)

    def set_corridor(self, corridor_id: str):
        self.corridor_id = corridor_id
        self.engine.set_corridor(corridor_id)

    async def execute_and_publish(
        self,
        ocean_surge_m: float,
        river_inflow_m3s: float,
        hours_to_landfall: float = 6.0,
        corridor_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Runs the hydro calculation and broadcasts telemetry onto the event bus."""
        if corridor_id and corridor_id != self.corridor_id:
            self.set_corridor(corridor_id)

        hydro_data = self.engine.simulate(ocean_surge_m, river_inflow_m3s, hours_to_landfall)

        # Baseline telemetry broadcast
        await self.bus.publish(SwarmMessage(
            sender="HydroAgent",
            topic="telemetry.hydro",
            priority=Priority.NORMAL,
            payload={
                "corridor_id": self.corridor_id,
                "ocean_surge_m": ocean_surge_m,
                "river_inflow_m3s": river_inflow_m3s,
                "hours_to_landfall": hours_to_landfall,
                "estuarine_damming_jump_m": hydro_data["estuarine_damming_jump_m"],
                "flooded_fraction": hydro_data["flooded_fraction"],
                "mean_submerged_depth_m": hydro_data["mean_submerged_depth_m"],
                "flooded_asset_count": hydro_data["flooded_asset_count"],
                "breached_substations": hydro_data["breached_substations"]
            }
        ))

        # High priority alert if substations breach 0.4m plinth threshold
        if hydro_data["breached_substations"]:
            await self.bus.publish(SwarmMessage(
                sender="HydroAgent",
                topic="alert.hydro_breach",
                priority=Priority.HIGH,
                payload={
                    "corridor_id": self.corridor_id,
                    "breached_substations": hydro_data["breached_substations"],
                    "damming_jump_m": hydro_data["estuarine_damming_jump_m"],
                    "message": f"CRITICAL: {len(hydro_data['breached_substations'])} substations breached by estuarine backwater flood."
                }
            ))

        return hydro_data
