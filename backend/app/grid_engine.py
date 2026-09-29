"""
CHRONOS-COASTAL Electrical Power Grid Cascading Cascade Engine
Directed Acyclic Graph (DAG) Protection Relay Simulation:
- Switchgear plinth breach & arc-flash dielectric breakdown at 0.40m flood depth
- Upstream ANSI 21 distance relay trips and automated line isolation
- Cascading blackouts to downstream dry, unflooded hospitals
- Automatic Transfer Switch (ATS) activation, ICU diesel generator burn rates (112.5 L/h), and runtime depletion
"""

from typing import Dict, List, Any, Set, Tuple, Optional
import networkx as nx
from app.dataset import get_corridor


class PowerGridCascadeEngine:
    """
    Simulates high-voltage power transmission and distribution cascading failures.
    Constructs a directed electrical dependency graph (DAG) and propagates automated breaker trips
    when low-lying substations experience floodwater ingress at plinth/basement level (0.4m).
    """

    DEFAULT_TRIP_DEPTH_M: float = 0.40
    NOMINAL_ICU_BURN_RATE_LPH: float = 112.5 # Liters per hour for standard 450kW hospital ICU load

    def __init__(self, corridor_id: str = "kochi"):
        self.corridor_id = corridor_id
        self.corridor_data = get_corridor(corridor_id)
        self.graph = nx.DiGraph()
        self._build_graph()

    def set_corridor(self, corridor_id: str):
        """Switches the active corridor and rebuilds the power grid DAG."""
        self.corridor_id = corridor_id
        self.corridor_data = get_corridor(corridor_id)
        self._build_graph()

    def _build_graph(self):
        """Constructs the NetworkX DiGraph from corridor assets and edges."""
        self.graph.clear()
        assets = self.corridor_data["assets"]
        edges = self.corridor_data["power_grid_edges"]

        for asset in assets:
            self.graph.add_node(
                asset["id"],
                name=asset["name"],
                type=asset["type"],
                category=asset["category"],
                elevation_m=asset["elevation_m"],
                trip_depth_m=asset.get("trip_depth_m", self.DEFAULT_TRIP_DEPTH_M),
                is_source=asset.get("is_source", False),
                lat=asset["lat"],
                lon=asset["lon"],
                icu_beds=asset.get("icu_beds", 0),
                generator_kw=asset.get("generator_kw", 0.0),
                diesel_fuel_liters=asset.get("diesel_fuel_liters", 0.0),
                burn_rate_lph=asset.get("burn_rate_lph", self.NOMINAL_ICU_BURN_RATE_LPH),
                dg_pad_elevation_m=asset.get("dg_pad_elevation_m", asset["elevation_m"] + 0.3)
            )

        for src, dst in edges:
            self.graph.add_edge(src, dst)

    def evaluate_cascade(self, hydro_results: Dict[str, Any]) -> Dict[str, Any]:
        """
        Takes compound hydrodynamics results, identifies flooded substations,
        and computes graph-theoretic reachability from energized transmission sources.
        """
        # Map asset inundation depths
        depth_map: Dict[str, float] = {
            a["id"]: a["water_depth_m"] for a in hydro_results.get("assets", [])
        }

        # 1. Identify directly breached substations (water depth >= trip_depth_m)
        tripped_substations: Set[str] = set()
        substation_status: Dict[str, Dict[str, Any]] = {}

        for node_id, data in self.graph.nodes(data=True):
            water_depth = depth_map.get(node_id, 0.0)
            threshold = data.get("trip_depth_m", self.DEFAULT_TRIP_DEPTH_M)
            is_flooded = water_depth >= threshold

            if is_flooded and data.get("type") in ["substation", "grid_source", "fuel_terminal"]:
                tripped_substations.add(node_id)
                status_code = "TRIPPED_ANSI_21_ARC_FLASH"
            elif is_flooded:
                status_code = "FLOODED_INUNDATED"
            else:
                status_code = "PHYSICALLY_DRY"

            substation_status[node_id] = {
                "id": node_id,
                "name": data["name"],
                "type": data["type"],
                "water_depth_m": water_depth,
                "threshold_m": threshold,
                "is_flooded": is_flooded,
                "physical_status": status_code
            }

        # 2. Build active operational subgraph (excluding tripped/disabled nodes)
        operational_nodes = [
            n for n in self.graph.nodes() if n not in tripped_substations
        ]
        active_subgraph = self.graph.subgraph(operational_nodes)

        # 3. Determine power grid sources that remain energized
        energized_sources = [
            n for n, d in self.graph.nodes(data=True)
            if d.get("is_source", False) and n not in tripped_substations
        ]

        # 4. Compute reachability from any energized source to all nodes
        energized_nodes: Set[str] = set()
        for source in energized_sources:
            reachable = nx.descendants(active_subgraph, source)
            energized_nodes.add(source)
            energized_nodes.update(reachable)

        # 5. Classify Dark Dry Nodes & Hospital Generator Lifelines
        dark_dry_nodes: List[Dict[str, Any]] = []
        hospital_reports: List[Dict[str, Any]] = []
        total_icu_patients_at_risk = 0
        total_blackout_icu_patients = 0

        for node_id, data in self.graph.nodes(data=True):
            water_depth = depth_map.get(node_id, 0.0)
            has_mains = node_id in energized_nodes
            is_node_tripped = node_id in tripped_substations

            # Dark Dry Node: completely dry on ground (water_depth == 0.0) or below plinth,
            # but lost grid power due to upstream breaker trips!
            if not has_mains and not is_node_tripped and water_depth < data.get("trip_depth_m", self.DEFAULT_TRIP_DEPTH_M):
                dark_dry_nodes.append({
                    "id": node_id,
                    "name": data["name"],
                    "type": data["type"],
                    "elevation_m": data["elevation_m"],
                    "water_depth_m": water_depth,
                    "reason": "Upstream transmission protection breaker tripped (ANSI 21/87). Zero grid power reaching node."
                })

            # Hospital Specific Life-Support Assessment
            if data.get("type") == "hospital":
                icu_beds = data.get("icu_beds", 0)
                fuel_liters = data.get("diesel_fuel_liters", 0.0)
                burn_rate = data.get("burn_rate_lph", self.NOMINAL_ICU_BURN_RATE_LPH)
                dg_pad_elev = data.get("dg_pad_elevation_m", data["elevation_m"] + 0.3)

                # DG alternator breach check: water surface elevation relative to generator pad
                # If water depth on hospital grounds reaches pad elevation above grade:
                pad_height_above_grade = dg_pad_elev - data["elevation_m"]
                dg_flooded = water_depth >= pad_height_above_grade and water_depth > 0.0

                if has_mains:
                    hospital_status = "GRID_MAINS_ENERGIZED"
                    on_generator = False
                    runtime_hours = round(fuel_liters / max(1.0, burn_rate), 1)
                    risk_level = "NOMINAL"
                elif dg_flooded:
                    hospital_status = "CATASTROPHIC_BLACKOUT_DG_SUBMERGED"
                    on_generator = False
                    runtime_hours = 0.0
                    risk_level = "CRITICAL_FATAL"
                    total_blackout_icu_patients += icu_beds
                else:
                    hospital_status = "ON_GENERATOR_AUTONOMY_RUNNING"
                    on_generator = True
                    runtime_hours = round(fuel_liters / max(1.0, burn_rate), 1)
                    risk_level = "HIGH_DG_RUNWAY"
                    total_icu_patients_at_risk += icu_beds

                hospital_reports.append({
                    "id": node_id,
                    "name": data["name"],
                    "elevation_m": data["elevation_m"],
                    "water_depth_m": water_depth,
                    "grid_mains_powered": has_mains,
                    "on_generator": on_generator,
                    "hospital_status": hospital_status,
                    "risk_level": risk_level,
                    "icu_patients": icu_beds,
                    "diesel_reserve_liters": fuel_liters,
                    "burn_rate_lph": burn_rate,
                    "runtime_hours_remaining": runtime_hours,
                    "dg_pad_elevation_m": dg_pad_elev,
                    "is_dry_but_outaged": (water_depth == 0.0 and not has_mains)
                })

        # 6. Edge Statuses (for UI transmission line rendering)
        edge_statuses: List[Dict[str, Any]] = []
        for src, dst in self.graph.edges():
            src_ok = src in energized_nodes
            dst_ok = dst in energized_nodes and (src, dst) in active_subgraph.edges()
            is_active = src_ok and dst_ok
            edge_statuses.append({
                "source": src,
                "target": dst,
                "is_energized": is_active,
                "status": "ENERGIZED" if is_active else "DE_ENERGIZED_TRIPPED"
            })

        return {
            "corridor_id": self.corridor_id,
            "corridor_name": self.corridor_data["name"],
            "total_substations": len([n for n, d in self.graph.nodes(data=True) if d.get("type") in ["substation", "grid_source"]]),
            "tripped_substation_count": len(tripped_substations),
            "tripped_substations": sorted(list(tripped_substations)),
            "dark_dry_nodes_count": len(dark_dry_nodes),
            "dark_dry_nodes": dark_dry_nodes,
            "hospitals": hospital_reports,
            "total_patients_on_dg_risk": total_icu_patients_at_risk,
            "total_blacked_out_icu_patients": total_blackout_icu_patients,
            "edge_statuses": edge_statuses
        }
