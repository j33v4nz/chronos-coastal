"""
CHRONOS-COASTAL Life-Support Logistics Reachability Engine
Kinematic Cargo Clearance & Time-to-Submersion (TTS) Formulation:
- Liquid Medical Oxygen (LMO): d_crit = 0.20m (cryogenic valve thermal shock & icing hazard)
- Heavy Diesel Fuel Tanker: d_crit = 0.45m (engine bow-wave air intake & lateral buoyancy sliding)
- Non-linear cyclone approach hydrograph: WSE(t) = WSE_base + (WSE_peak - WSE_base) * (t / T_landfall)^p
- Dynamic Departure Deadlines: T_departure = TTS - T_transit
"""

import math
from typing import Dict, List, Any, Optional
from app.dataset import get_corridor
from app.hydro_engine import CompoundHydroEngine


class LifeSupportLogisticsEngine:
    """
    Evaluates dynamic route reachability and departure countdown windows for emergency supply convoys
    under rising floodwaters. Accounts for differential critical depth thresholds between cryogenic oxygen
    and diesel tankers before low-lying bridge approaches and arterial road choke points become impassable.
    """

    CRIT_DEPTH_LMO_M: float = 0.20     # Low-slung cryogenic valves and vaporizers
    CRIT_DEPTH_DIESEL_M: float = 0.45  # Diesel engine snorkel intake / vehicle sliding limit

    def __init__(self, corridor_id: str = "kochi"):
        self.corridor_id = corridor_id
        self.corridor_data = get_corridor(corridor_id)
        self.hydro_engine = CompoundHydroEngine(corridor_id)
        self.routes = self.corridor_data["logistics_corridors"]

    def set_corridor(self, corridor_id: str):
        """Switches the active corridor and updates logistics routes."""
        self.corridor_id = corridor_id
        self.corridor_data = get_corridor(corridor_id)
        self.hydro_engine.set_corridor(corridor_id)
        self.routes = self.corridor_data["logistics_corridors"]

    def calculate_choke_point_hydrograph(
        self,
        choke_dist_coast_km: float,
        choke_dist_river_km: float,
        choke_elevation_m: float,
        peak_ocean_surge_m: float,
        peak_river_inflow_m3s: float,
        hours_to_landfall: float,
        time_steps: int = 120
    ) -> List[Dict[str, float]]:
        """
        Generates a fine-grained temporal time-series (every ~3 minutes) of rising water levels
        at the specified road choke point as the cyclone approaches landfall.
        """
        # Peak WSE at the choke point under maximum compound conditions
        peak_wse = self.hydro_engine.calculate_wse_at_point(
            dist_coast_km=choke_dist_coast_km,
            dist_river_km=choke_dist_river_km,
            ocean_surge_m=peak_ocean_surge_m,
            river_inflow_m3s=peak_river_inflow_m3s
        )

        # Baseline WSE prior to cyclonic approach
        baseline_wse = self.hydro_engine.calculate_wse_at_point(
            dist_coast_km=choke_dist_coast_km,
            dist_river_km=choke_dist_river_km,
            ocean_surge_m=0.30,
            river_inflow_m3s=180.0
        )

        # Temporal profile: storm surge and river backwater follow non-linear cyclonic intensification
        hydrograph = []
        dt = hours_to_landfall / max(1, time_steps)

        for i in range(time_steps + 1):
            t_elapsed_hours = i * dt
            # Normalized progression from 0 (now) to 1 (peak landfall)
            norm_progress = min(1.0, t_elapsed_hours / max(0.1, hours_to_landfall))
            curve_factor = norm_progress ** 1.35 # Non-linear steepening as cyclone nears coast

            current_wse = baseline_wse + (peak_wse - baseline_wse) * curve_factor
            current_water_depth = max(0.0, current_wse - choke_elevation_m)

            hydrograph.append({
                "time_elapsed_hours": round(t_elapsed_hours, 3),
                "time_elapsed_min": round(t_elapsed_hours * 60.0, 1),
                "wse_m": round(current_wse, 3),
                "water_depth_m": round(current_water_depth, 3)
            })

        return hydrograph

    def evaluate_reachability(
        self,
        ocean_surge_m: float,
        river_inflow_m3s: float,
        hours_to_landfall: float = 6.0
    ) -> Dict[str, Any]:
        """
        Evaluates Time-to-Submersion (TTS) and departure countdowns for all logistics corridors.
        Identifies whether roads are passable, closing soon, or completely impassable.
        """
        corridor_assessments: List[Dict[str, Any]] = []

        for route in self.routes:
            cargo = route.get("cargo_type", "DIESEL_FUEL")
            choke_elev = route.get("choke_elevation_m", 1.8)
            choke_dist_coast = route.get("choke_dist_coast_km", 6.0)
            choke_dist_river = route.get("choke_dist_river_km", 0.5)
            choke_name = route.get("choke_point_name", "Critical Road Causeway")
            transit_time_min = route.get("nominal_travel_time_min", 30.0)

            # Assign cargo critical clearance depth threshold
            if cargo == "LIQUID_MEDICAL_OXYGEN":
                crit_depth_m = route.get("critical_clearance_depth_m", self.CRIT_DEPTH_LMO_M)
            else:
                crit_depth_m = route.get("critical_clearance_depth_m", self.CRIT_DEPTH_DIESEL_M)

            # Compute fine-grained temporal rise
            hydrograph = self.calculate_choke_point_hydrograph(
                choke_dist_coast_km=choke_dist_coast,
                choke_dist_river_km=choke_dist_river,
                choke_elevation_m=choke_elev,
                peak_ocean_surge_m=ocean_surge_m,
                peak_river_inflow_m3s=river_inflow_m3s,
                hours_to_landfall=hours_to_landfall,
                time_steps=180
            )

            # Peak conditions at landfall
            peak_wse = hydrograph[-1]["wse_m"]
            peak_water_depth = hydrograph[-1]["water_depth_m"]
            current_water_depth = hydrograph[0]["water_depth_m"]

            # Search for Time-to-Submersion (TTS): moment when water depth >= crit_depth_m
            tts_hours: Optional[float] = None
            for step in hydrograph:
                if step["water_depth_m"] >= crit_depth_m:
                    tts_hours = step["time_elapsed_hours"]
                    break

            transit_time_hours = transit_time_min / 60.0

            if tts_hours is None:
                # Water depth never breaches critical threshold during the simulation window
                status = "CLEAR_PASSABLE"
                tts_minutes = hours_to_landfall * 60.0
                departure_window_min = tts_minutes - transit_time_min
                is_submerged = False
                urgency = "LOW"
            elif tts_hours <= 0.0 or current_water_depth >= crit_depth_m:
                # Road is already submerged past critical clearance
                status = "IMPASSABLE_SUBMERGED"
                tts_minutes = 0.0
                departure_window_min = 0.0
                is_submerged = True
                urgency = "CRITICAL_BLOCKED"
            else:
                tts_minutes = round(tts_hours * 60.0, 1)
                departure_window_min = max(0.0, round(tts_minutes - transit_time_min, 1))
                is_submerged = False

                if departure_window_min <= 0.0:
                    status = "CLOSING_INSUFFICIENT_TRANSIT_TIME"
                    urgency = "CRITICAL_WINDOW_SHUT"
                elif departure_window_min <= 60.0:
                    status = "RAPIDLY_CLOSING_URGENT_DISPATCH"
                    urgency = "HIGH_DISPATCH_NOW"
                else:
                    status = "OPEN_DEPARTURE_WINDOW_AVAILABLE"
                    urgency = "MODERATE"

            corridor_assessments.append({
                "corridor_id": route["id"],
                "name": route["name"],
                "cargo_type": cargo,
                "origin_id": route["origin_id"],
                "destination_id": route["destination_id"],
                "choke_point_name": choke_name,
                "choke_elevation_m": choke_elev,
                "critical_clearance_depth_m": crit_depth_m,
                "current_water_depth_m": current_water_depth,
                "peak_water_depth_m": peak_water_depth,
                "peak_wse_m": peak_wse,
                "nominal_travel_time_min": transit_time_min,
                "time_to_submersion_hours": round(tts_hours, 2) if tts_hours is not None else None,
                "time_to_submersion_min": tts_minutes,
                "departure_window_remaining_min": departure_window_min,
                "is_currently_submerged": is_submerged,
                "operational_status": status,
                "urgency_level": urgency
            })

        # Sort assessments by shortest departure window
        corridor_assessments.sort(key=lambda x: x["departure_window_remaining_min"])

        return {
            "corridor_id": self.corridor_id,
            "corridor_name": self.corridor_data["name"],
            "hours_to_landfall": hours_to_landfall,
            "routes": corridor_assessments,
            "total_routes": len(corridor_assessments),
            "shortest_departure_window_min": corridor_assessments[0]["departure_window_remaining_min"] if corridor_assessments else 0.0
        }
