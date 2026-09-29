"""
CHRONOS-COASTAL Life-Support Logistics Agent
Autonomous agent computing dynamic departure windows and issuing dispatch directives before road drowning.
"""

from typing import Dict, Any, Optional
from app.swarm.bus import TacticalEventBus
from app.swarm.messages import SwarmMessage, Priority
from app.logistics_engine import LifeSupportLogisticsEngine


class LifeSupportLogisticsAgent:
    """
    Subscribes to grid outages and rising flood hydrographs.
    Solves time-constrained reachability windows for liquid oxygen and diesel supply convoys,
    issuing high-priority departure alerts before causeways and low-lying bridge approaches drown.
    """

    def __init__(self, bus: TacticalEventBus, corridor_id: str = "kochi"):
        self.bus = bus
        self.corridor_id = corridor_id
        self.engine = LifeSupportLogisticsEngine(corridor_id)

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
        """Calculates convoy reachability and broadcasts emergency dispatch directives."""
        if corridor_id and corridor_id != self.corridor_id:
            self.set_corridor(corridor_id)

        logistics_data = self.engine.evaluate_reachability(ocean_surge_m, river_inflow_m3s, hours_to_landfall)

        # Baseline logistics telemetry
        await self.bus.publish(SwarmMessage(
            sender="LifeSupportLogisticsAgent",
            topic="telemetry.logistics",
            priority=Priority.NORMAL,
            payload={
                "corridor_id": self.corridor_id,
                "total_routes": logistics_data["total_routes"],
                "shortest_departure_window_min": logistics_data["shortest_departure_window_min"]
            }
        ))

        # Check for urgent or closing departure windows
        for r in logistics_data["routes"]:
            dep_min = r["departure_window_remaining_min"]
            cargo = r["cargo_type"]
            choke = r["choke_point_name"]

            if dep_min <= 0.0 or r["is_currently_submerged"]:
                await self.bus.publish(SwarmMessage(
                    sender="LifeSupportLogisticsAgent",
                    topic="alert.corridor_severed",
                    priority=Priority.CRITICAL,
                    payload={
                        "route_id": r["corridor_id"],
                        "cargo_type": cargo,
                        "choke_point": choke,
                        "status": "IMPASSABLE",
                        "message": f"CORRIDOR SEVERED: {choke} submerged past {r['critical_clearance_depth_m']}m. {cargo} convoy route blocked!"
                    }
                ))
            elif dep_min <= 60.0:
                await self.bus.publish(SwarmMessage(
                    sender="LifeSupportLogisticsAgent",
                    topic="directive.urgent_dispatch",
                    priority=Priority.CRITICAL,
                    payload={
                        "route_id": r["corridor_id"],
                        "cargo_type": cargo,
                        "choke_point": choke,
                        "departure_window_remaining_min": dep_min,
                        "message": f"CRITICAL DISPATCH ORDER: {cargo} convoy departure window closing in {dep_min} min! Dispatch heavy convoy across {choke} NOW."
                    }
                ))
            else:
                await self.bus.publish(SwarmMessage(
                    sender="LifeSupportLogisticsAgent",
                    topic="telemetry.logistics_route",
                    priority=Priority.NORMAL,
                    payload={
                        "route_id": r["corridor_id"],
                        "cargo_type": cargo,
                        "choke_point": choke,
                        "departure_window_remaining_min": dep_min,
                        "status": r["operational_status"]
                    }
                ))

        return logistics_data
