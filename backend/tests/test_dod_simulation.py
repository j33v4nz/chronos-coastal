"""
Explicit Definition of Done (DoD) Verification Test Suite
Prompt Requirement:
"Running the simulation with surge=1.85m, inflow=550m³/s proves that coastal substations trip,
dry inland hospitals lose grid power and ignite generators, and oxygen convoy windows close
earlier than fuel convoys."
"""

import pytest
from app.simulation import ChronosSimulationEngine


def test_dod_simulation_kochi():
    """
    Direct verification of DoD requirements on primary calibrated benchmark (Kochi):
    1. Coastal substations trip (water depth >= 0.40m).
    2. Dry inland hospital (VPS Lakeshore) loses grid power and ignites generator (burn rate = 112.5 L/h).
    3. Oxygen convoy window closes earlier than fuel convoy window.
    """
    sim = ChronosSimulationEngine("kochi")
    results = sim.run_simulation(
        ocean_surge_m=1.85,
        river_inflow_m3s=550.0,
        hours_to_landfall=6.0
    )

    assert results["success"] is True

    # -------------------------------------------------------------
    # 1. Coastal Substations Trip
    # -------------------------------------------------------------
    tripped_substations = results["summary"]["tripped_substations"]
    assert len(tripped_substations) > 0, "At least one substation must trip at 0.4m water depth"
    # Specifically Nettoor 33kV (S6_Nettoor) or Cheranallur (S5_Cheranallur)
    assert "S6_Nettoor" in tripped_substations or "S5_Cheranallur" in tripped_substations

    # -------------------------------------------------------------
    # 2. Dry Inland Hospital Loses Grid Power & Ignites Generator
    # -------------------------------------------------------------
    hospitals = results["grid"]["hospitals"]
    lakeshore = next(h for h in hospitals if h["id"] == "H1_Lakeshore")

    # Prove hospital is physically DRY
    assert lakeshore["water_depth_m"] == 0.0, f"Expected 0.0m flood at Lakeshore, got {lakeshore['water_depth_m']}"

    # Prove hospital lost grid power
    assert lakeshore["grid_mains_powered"] is False, "Lakeshore must lose grid power due to upstream trip"

    # Prove backup generator ignited
    assert lakeshore["on_generator"] is True, "Lakeshore ATS must engage backup diesel generator"
    assert lakeshore["hospital_status"] == "ON_GENERATOR_AUTONOMY_RUNNING"

    # Prove generator burn rate is 112.5 L/h and runtime is counting down
    assert lakeshore["burn_rate_lph"] == 112.5, "Fuel burn rate must be 112.5 L/h"
    assert lakeshore["runtime_hours_remaining"] > 0.0, "Generator must have remaining fuel autonomy hours"

    # Prove marked as is_dry_but_outaged
    assert lakeshore["is_dry_but_outaged"] is True

    # -------------------------------------------------------------
    # 3. Oxygen Convoy Window Closes Earlier than Fuel Convoy
    # -------------------------------------------------------------
    routes = {r["cargo_type"]: r for r in results["logistics"]["routes"]}
    assert "LIQUID_MEDICAL_OXYGEN" in routes
    assert "DIESEL_FUEL" in routes

    lmo = routes["LIQUID_MEDICAL_OXYGEN"]
    fuel = routes["DIESEL_FUEL"]

    # Critical clearance depth differential
    assert lmo["critical_clearance_depth_m"] == 0.20
    assert fuel["critical_clearance_depth_m"] == 0.45

    # Time-to-Submersion differential
    assert lmo["time_to_submersion_min"] < fuel["time_to_submersion_min"], (
        f"LMO TTS ({lmo['time_to_submersion_min']} min) must be less than Fuel TTS ({fuel['time_to_submersion_min']} min)"
    )

    # Departure window differential
    assert lmo["departure_window_remaining_min"] < fuel["departure_window_remaining_min"], (
        f"LMO Window ({lmo['departure_window_remaining_min']} min) must close earlier than Fuel Window ({fuel['departure_window_remaining_min']} min)"
    )


@pytest.mark.parametrize("corridor_id", ["kochi", "chennai", "mumbai", "odisha"])
def test_dod_simulation_runs_across_all_corridors(corridor_id):
    """Verifies that the unified simulation executes cleanly across all 4 Pan-India corridors."""
    sim = ChronosSimulationEngine(corridor_id)
    results = sim.run_simulation(
        ocean_surge_m=1.85,
        river_inflow_m3s=550.0,
        hours_to_landfall=6.0
    )
    assert results["success"] is True
    assert "hydro" in results
    assert "grid" in results
    assert "logistics" in results
    assert "summary" in results
    assert results["hydro"]["estuarine_damming_jump_m"] > 0
