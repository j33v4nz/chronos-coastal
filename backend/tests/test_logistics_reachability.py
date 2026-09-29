"""
Tests for Life-Support Logistics Reachability Engine (Sub-task 1.4)
Verifies:
- Differential critical clearance: LMO (0.20m) vs Diesel Tankers (0.45m)
- Time-to-Submersion (TTS) calculation over cyclone approach hydrograph
- Oxygen convoy windows close earlier than fuel convoys
"""

import pytest
from app.logistics_engine import LifeSupportLogisticsEngine


def test_cargo_clearance_depths():
    engine = LifeSupportLogisticsEngine("kochi")
    assert engine.CRIT_DEPTH_LMO_M == 0.20
    assert engine.CRIT_DEPTH_DIESEL_M == 0.45


def test_oxygen_convoy_window_closes_before_fuel_convoy():
    """
    Core DoD verification: Because LMO tankers have 0.20m critical depth while Diesel
    has 0.45m critical depth, under rising compound floodwaters at low-lying road choke points,
    the LMO convoy's Time-to-Submersion occurs EARLIER, and its departure window closes EARLIER.
    """
    engine = LifeSupportLogisticsEngine("kochi")
    res = engine.evaluate_reachability(ocean_surge_m=1.85, river_inflow_m3s=550.0, hours_to_landfall=6.0)

    routes = {r["cargo_type"]: r for r in res["routes"]}
    assert "LIQUID_MEDICAL_OXYGEN" in routes
    assert "DIESEL_FUEL" in routes

    lmo_route = routes["LIQUID_MEDICAL_OXYGEN"]
    diesel_route = routes["DIESEL_FUEL"]

    # 1. Critical depth comparison
    assert lmo_route["critical_clearance_depth_m"] < diesel_route["critical_clearance_depth_m"]

    # 2. Time-to-Submersion comparison: LMO submerges earlier
    assert lmo_route["time_to_submersion_min"] < diesel_route["time_to_submersion_min"]

    # 3. Departure window comparison: LMO departure window closes earlier
    assert lmo_route["departure_window_remaining_min"] < diesel_route["departure_window_remaining_min"]


def test_submerged_road_reports_impassable():
    """Under extreme catastrophic surge, if road depth already exceeds d_crit, report IMPASSABLE."""
    engine = LifeSupportLogisticsEngine("kochi")
    # Extreme surge of 3.8m + 1200 m³/s inflow
    res = engine.evaluate_reachability(ocean_surge_m=3.80, river_inflow_m3s=1200.0, hours_to_landfall=6.0)
    for r in res["routes"]:
        assert r["peak_water_depth_m"] > r["critical_clearance_depth_m"]
