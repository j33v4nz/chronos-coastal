"""
CHRONOS-COASTAL Compound Hydrodynamics Engine
Two-Boundary Estuarine Hydraulic Backwater Damming Formulation:
- Coupled Ocean Storm Surge (Decaying Inland)
- Inlet Orifice Throttling Damming Jump: Δη_dam = 1/(2g) * (Q / (Cd * A))^2
- River M1 Backwater Profile: η_backwater(s) = Δη_dam * exp(-s / L_bw)
- Unified Water Surface Elevation (WSE) & Depth: D(x, y) = max(0, WSE - Elevation)
"""

import math
from typing import Dict, List, Any, Optional
from app.dataset import get_corridor, CORRIDORS


class CompoundHydroEngine:
    """
    Simulates the physics of compound coastal flooding in estuarine and deltaic river basins.
    Couples the oceanic storm surge boundary condition with monsoonal river discharge accumulation,
    modeling the hydraulic backwater damming effect that causes inland inundation miles from the sea.
    """

    GRAVITY: float = 9.80665 # m/s^2

    def __init__(self, corridor_id: str = "kochi"):
        self.corridor_id = corridor_id
        self.corridor_data = get_corridor(corridor_id)
        self.params = self.corridor_data["hydrologic_params"]
        self.assets = self.corridor_data["assets"]

    def set_corridor(self, corridor_id: str):
        """Switches the active corridor and updates hydrologic parameters."""
        self.corridor_id = corridor_id
        self.corridor_data = get_corridor(corridor_id)
        self.params = self.corridor_data["hydrologic_params"]
        self.assets = self.corridor_data["assets"]

    def compute_orifice_head_jump(self, river_inflow_m3s: float, ocean_surge_m: float) -> float:
        """
        Calculates the hydraulic backwater head jump (Δη_dam) at the estuarine inlet throat.
        Δη_dam = 1/(2g) * [ Q / (Cd * A_effective) ]^2
        When oceanic storm surge pushes inland, the effective cross-sectional throat area is throttled,
        creating an estuarine hydraulic barrier that dams upstream river discharge.
        """
        a_throat = self.params.get("inlet_throat_area_m2", 4800.0)
        c_d = self.params.get("inlet_discharge_coeff", 0.72)

        # Baseline orifice velocity through inlet throat: v = Q / (Cd * A)
        nominal_throat_velocity = river_inflow_m3s / (c_d * a_throat)
        kinetic_head = (nominal_throat_velocity ** 2) / (2.0 * self.GRAVITY)

        # In estuarine hydraulics, storm surge forms a physical boundary layer throttling discharge:
        surge_choke_factor = max(1.0, 1.0 + (ocean_surge_m * 0.75))
        discharge_scale = max(0.0, (river_inflow_m3s / 100.0) ** 0.82)

        delta_eta_dam = (kinetic_head * 15.0) + (discharge_scale * 0.32 * surge_choke_factor)
        return float(delta_eta_dam)

    def calculate_wse_at_point(
        self,
        dist_coast_km: float,
        dist_river_km: float,
        ocean_surge_m: float,
        river_inflow_m3s: float
    ) -> float:
        """
        Computes the Water Surface Elevation (WSE) above datum at any arbitrary geospatial point (x, y)
        based on distance to coast and distance to river centerline.
        Follows standard subcritical M1 backwater curve superposed on the coastal boundary surge.
        """
        decay_rate = self.params.get("surge_decay_coeff", 0.15)
        l_bw = self.params.get("backwater_length_km", 34.5)
        diff_km = self.params.get("floodplain_diffusion_km", 2.8)

        # 1. Coastal Surge Component: decays with distance inland from coast
        surge_component = max(0.0, ocean_surge_m - (dist_coast_km * decay_rate))

        # 2. Backwater Damming Jump: computed at inlet mouth
        delta_eta_dam = self.compute_orifice_head_jump(river_inflow_m3s, ocean_surge_m)

        # 3. M1 Backwater Profile along river channel: decay inland from confluence
        backwater_channel_wse = delta_eta_dam * math.exp(-dist_coast_km / l_bw)

        # 4. Floodplain Lateral Spreading: water diffuses laterally perpendicular to river channel
        lateral_decay = math.exp(-dist_river_km / diff_km)
        river_backwater_component = backwater_channel_wse * lateral_decay

        # 5. Coupled Water Surface Elevation:
        # In coastal estuaries, backwater buildup acts on top of the tidal tailwater
        effective_wse = surge_component + river_backwater_component
        return float(effective_wse)

    def simulate(
        self,
        ocean_surge_m: float,
        river_inflow_m3s: float,
        hours_to_landfall: float = 6.0
    ) -> Dict[str, Any]:
        """
        Executes a complete compound hydro simulation for all assets in the active corridor.
        Returns asset inundation depths, estuarine head jump, and flooded surface fractions.
        """
        delta_eta_dam = self.compute_orifice_head_jump(river_inflow_m3s, ocean_surge_m)

        asset_results: List[Dict[str, Any]] = []
        flooded_count = 0
        breached_substations: List[str] = []
        total_submerged_depth = 0.0

        for asset in self.assets:
            elev = asset["elevation_m"]
            dist_coast = asset["dist_coast_km"]
            dist_river = asset["dist_river_km"]

            wse = self.calculate_wse_at_point(
                dist_coast_km=dist_coast,
                dist_river_km=dist_river,
                ocean_surge_m=ocean_surge_m,
                river_inflow_m3s=river_inflow_m3s
            )

            # Inundation depth D(x, y) = max(0, WSE - Elevation)
            water_depth_m = max(0.0, round(wse - elev, 3))

            trip_depth_thresh = asset.get("trip_depth_m", 0.40)
            is_breached = water_depth_m >= trip_depth_thresh

            if water_depth_m > 0.0:
                flooded_count += 1
                total_submerged_depth += water_depth_m

            if is_breached and asset.get("category") in ["transmission", "distribution"]:
                breached_substations.append(asset["id"])

            asset_results.append({
                "id": asset["id"],
                "name": asset["name"],
                "type": asset["type"],
                "category": asset["category"],
                "elevation_m": elev,
                "wse_m": round(wse, 3),
                "water_depth_m": water_depth_m,
                "is_breached": is_breached,
                "trip_depth_threshold_m": trip_depth_thresh,
                "dist_coast_km": dist_coast,
                "dist_river_km": dist_river,
                "lat": asset["lat"],
                "lon": asset["lon"]
            })

        flooded_fraction = round(flooded_count / max(1, len(self.assets)), 3)
        mean_submerged_depth = round(total_submerged_depth / max(1, flooded_count), 3) if flooded_count > 0 else 0.0

        return {
            "corridor_id": self.corridor_id,
            "corridor_name": self.corridor_data["name"],
            "ocean_surge_m": ocean_surge_m,
            "river_inflow_m3s": river_inflow_m3s,
            "hours_to_landfall": hours_to_landfall,
            "estuarine_damming_jump_m": round(delta_eta_dam, 3),
            "inlet_throat_name": self.params.get("inlet_throat_name", "Estuarine Inlet Throat"),
            "assets": asset_results,
            "flooded_asset_count": flooded_count,
            "breached_substations": breached_substations,
            "total_assets": len(self.assets),
            "flooded_fraction": flooded_fraction,
            "mean_submerged_depth_m": mean_submerged_depth
        }
