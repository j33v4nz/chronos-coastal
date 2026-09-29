"""
CHRONOS-COASTAL Power Grid Cascade Agent
Autonomous agent modeling NetworkX DAG electrical cascades and publishing critical breaker trips.
"""

from typing import Dict, Any, Optional
from app.swarm.bus import TacticalEventBus
from app.swarm.messages import SwarmMessage, Priority
from app.grid_engine import PowerGridCascadeEngine


class GridCascadeAgent:
    """
    Subscribes to flood inundation telemetry.
    Propagates ANSI 21 distance relay trips across the electrical DAG and calculates
    generator fuel depletion runway for unflooded healthcare facilities.
    """

    def __init__(self, bus: TacticalEventBus, corridor_id: str = "kochi"):
        self.bus = bus
        self.corridor_id = corridor_id
        self.engine = PowerGridCascadeEngine(corridor_id)

    def set_corridor(self, corridor_id: str):
        self.corridor_id = corridor_id
        self.engine.set_corridor(corridor_id)

    async def execute_and_publish(
        self,
        hydro_data: Dict[str, Any],
        corridor_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Evaluates power grid cascade and broadcasts alerts onto the priority event bus."""
        if corridor_id and corridor_id != self.corridor_id:
            self.set_corridor(corridor_id)

        grid_data = self.engine.evaluate_cascade(hydro_data)

        # Baseline grid telemetry
        await self.bus.publish(SwarmMessage(
            sender="GridCascadeAgent",
            topic="telemetry.grid",
            priority=Priority.NORMAL,
            payload={
                "corridor_id": self.corridor_id,
                "tripped_substation_count": grid_data["tripped_substation_count"],
                "dark_dry_nodes_count": grid_data["dark_dry_nodes_count"],
                "patients_on_dg_risk": grid_data["total_patients_on_dg_risk"],
                "patients_in_blackout": grid_data["total_blacked_out_icu_patients"]
            }
        ))

        # Critical alert if substations tripped
        if grid_data["tripped_substation_count"] > 0:
            await self.bus.publish(SwarmMessage(
                sender="GridCascadeAgent",
                topic="alert.grid_trip",
                priority=Priority.CRITICAL,
                payload={
                    "corridor_id": self.corridor_id,
                    "tripped_substations": grid_data["tripped_substations"],
                    "dark_dry_nodes": [d["name"] for d in grid_data["dark_dry_nodes"]],
                    "message": f"GRID FAILURE: {grid_data['tripped_substation_count']} substations tripped by arc-flash; {grid_data['dark_dry_nodes_count']} dry inland facilities outaged."
                }
            ))

        # Critical alert for healthcare facilities
        for h in grid_data["hospitals"]:
            if h["on_generator"]:
                await self.bus.publish(SwarmMessage(
                    sender="GridCascadeAgent",
                    topic="alert.hospital_dg",
                    priority=Priority.CRITICAL,
                    payload={
                        "hospital_id": h["id"],
                        "hospital_name": h["name"],
                        "status": h["hospital_status"],
                        "icu_patients": h["icu_patients"],
                        "runtime_hours_remaining": h["runtime_hours_remaining"],
                        "burn_rate_lph": h["burn_rate_lph"],
                        "is_dry_but_outaged": h["is_dry_but_outaged"],
                        "message": f"LIFE SUPPORT WARNING: {h['name']} lost grid mains! Backup generator active ({h['runtime_hours_remaining']}h fuel left at {h['burn_rate_lph']} L/h)."
                    }
                ))
            elif h["hospital_status"] == "CATASTROPHIC_BLACKOUT_DG_SUBMERGED":
                await self.bus.publish(SwarmMessage(
                    sender="GridCascadeAgent",
                    topic="alert.hospital_blackout",
                    priority=Priority.CRITICAL,
                    payload={
                        "hospital_id": h["id"],
                        "hospital_name": h["name"],
                        "icu_patients": h["icu_patients"],
                        "message": f"FATAL BLACKOUT: {h['name']} generator pad flooded! {h['icu_patients']} ICU patients in immediate danger."
                    }
                ))

        return grid_data
