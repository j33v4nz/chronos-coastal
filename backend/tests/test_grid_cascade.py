"""
Tests for Power Grid Cascade Engine (Sub-task 1.3)
Verifies:
- NetworkX DAG construction and traversal
- Arc-flash tripping at 0.40m water depth
- Cascading blackouts to downstream dry hospitals (Dark Dry Nodes)
- Hospital generator activation, diesel burn rate (112.5 L/h), and remaining runtime
"""

import pytest
from app.hydro_engine import CompoundHydroEngine
from app.grid_engine import PowerGridCascadeEngine


def test_grid_dag_construction():
    grid = PowerGridCascadeEngine("kochi")
    assert grid.graph.number_of_nodes() >= 10
    assert grid.graph.number_of_edges() >= 8
    # Must be a Directed Acyclic Graph (DAG)
    import networkx as nx
    assert nx.is_directed_acyclic_graph(grid.graph)


def test_dry_hospital_outaged_by_upstream_breaker_trip():
    """
    Substation S6_Nettoor reaches 0.4m water depth and trips.
    Hospital H1_Lakeshore is dry (0.0m flood), but loses mains power due to S6 tripping.
    Automatic Transfer Switch (ATS) engages backup generator with 112.5 L/h fuel burn rate.
    """
    hydro = CompoundHydroEngine("kochi").simulate(1.85, 550.0)
    grid = PowerGridCascadeEngine("kochi").evaluate_cascade(hydro)

    # Confirm S6_Nettoor tripped
    assert "S6_Nettoor" in grid["tripped_substations"]

    # Confirm H1_Lakeshore is among dark dry nodes
    dark_dry_ids = [d["id"] for d in grid["dark_dry_nodes"]]
    assert "H1_Lakeshore" in dark_dry_ids

    # Confirm hospital status
    lakeshore_report = next(h for h in grid["hospitals"] if h["id"] == "H1_Lakeshore")
    assert lakeshore_report["grid_mains_powered"] is False
    assert lakeshore_report["on_generator"] is True
    assert lakeshore_report["hospital_status"] == "ON_GENERATOR_AUTONOMY_RUNNING"
    assert lakeshore_report["burn_rate_lph"] == 112.5
    assert lakeshore_report["runtime_hours_remaining"] > 40.0
    assert lakeshore_report["is_dry_but_outaged"] is True


def test_low_lying_hospital_dg_submerged_blackout():
    """
    Aster Medcity (H2_Aster) has low elevation (2.0m) and generator pad at 2.4m.
    Under 1.85m surge + 550 m³/s inflow, floodwater breaches generator pad -> CATASTROPHIC BLACKOUT!
    """
    hydro = CompoundHydroEngine("kochi").simulate(1.85, 550.0)
    grid = PowerGridCascadeEngine("kochi").evaluate_cascade(hydro)

    aster_report = next(h for h in grid["hospitals"] if h["id"] == "H2_Aster")
    assert aster_report["grid_mains_powered"] is False
    assert aster_report["on_generator"] is False
    assert aster_report["hospital_status"] == "CATASTROPHIC_BLACKOUT_DG_SUBMERGED"
    assert aster_report["runtime_hours_remaining"] == 0.0
    assert grid["total_blacked_out_icu_patients"] >= aster_report["icu_patients"]
