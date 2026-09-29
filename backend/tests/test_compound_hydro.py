"""
Tests for Compound Hydrodynamics Engine (Sub-task 1.2)
Verifies:
- Two-boundary M1 backwater formulation
- Orifice head jump Δη_dam scaling with inflow and surge
- Asset elevation vs inundation depth D(x, y) = max(0, WSE - Elevation)
"""

import pytest
from app.hydro_engine import CompoundHydroEngine


def test_orifice_head_jump_increases_with_discharge():
    engine = CompoundHydroEngine("kochi")
    jump_low = engine.compute_orifice_head_jump(river_inflow_m3s=200.0, ocean_surge_m=1.0)
    jump_high = engine.compute_orifice_head_jump(river_inflow_m3s=800.0, ocean_surge_m=1.0)
    assert jump_high > jump_low, "Head jump must increase monotonically with river discharge"


def test_orifice_head_jump_amplified_by_ocean_surge():
    engine = CompoundHydroEngine("kochi")
    jump_no_surge = engine.compute_orifice_head_jump(river_inflow_m3s=500.0, ocean_surge_m=0.0)
    jump_with_surge = engine.compute_orifice_head_jump(river_inflow_m3s=500.0, ocean_surge_m=2.0)
    assert jump_with_surge > jump_no_surge, "Ocean surge must amplify backwater damming head jump"


def test_elevated_inland_assets_remain_dry():
    engine = CompoundHydroEngine("kochi")
    res = engine.simulate(ocean_surge_m=1.85, river_inflow_m3s=550.0)
    asset_depths = {a["id"]: a["water_depth_m"] for a in res["assets"]}

    # PGCIL Pallikkara is at 25m elevation -> completely dry
    assert asset_depths["G1_Pallikkara"] == 0.0
    # Kalamassery 220kV Hub is at 15m elevation -> completely dry
    assert asset_depths["S1_Kalamassery"] == 0.0


def test_low_lying_estuarine_substation_breaches_trip_threshold():
    engine = CompoundHydroEngine("kochi")
    res = engine.simulate(ocean_surge_m=1.85, river_inflow_m3s=550.0)
    asset_map = {a["id"]: a for a in res["assets"]}

    # Nettoor 33kV (elev 2.5m) and Cheranallur 33kV (elev 2.2m)
    assert asset_map["S6_Nettoor"]["water_depth_m"] >= 0.40
    assert asset_map["S6_Nettoor"]["is_breached"] is True

    assert asset_map["S5_Cheranallur"]["water_depth_m"] >= 0.40
    assert asset_map["S5_Cheranallur"]["is_breached"] is True


def test_lakeshore_hospital_remains_physically_dry():
    """
    Critical scientific grounding: VPS Lakeshore Hospital is on 3.0m terrace fill.
    Under 1.85m surge + 550 m³/s inflow, WSE < 3.0m, so water depth is 0.0m.
    """
    engine = CompoundHydroEngine("kochi")
    res = engine.simulate(ocean_surge_m=1.85, river_inflow_m3s=550.0)
    lakeshore = next(a for a in res["assets"] if a["id"] == "H1_Lakeshore")
    assert lakeshore["water_depth_m"] == 0.0
    assert lakeshore["is_breached"] is False
