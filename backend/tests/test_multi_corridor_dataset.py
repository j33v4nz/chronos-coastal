"""
Tests for Multi-Corridor Dataset (Sub-task 1.1)
Verifies all 4 national testbeds: Kochi, Chennai, Mumbai, Odisha
"""

import pytest
from app.dataset import CORRIDORS, get_corridor, list_available_corridors


def test_all_four_corridors_exist():
    expected_corridors = {"kochi", "chennai", "mumbai", "odisha"}
    assert set(CORRIDORS.keys()) == expected_corridors
    available = list_available_corridors()
    assert len(available) == 4
    corridor_ids = {c["id"] for c in available}
    assert corridor_ids == expected_corridors


@pytest.mark.parametrize("corridor_id", ["kochi", "chennai", "mumbai", "odisha"])
def test_corridor_schema_and_hydrologic_params(corridor_id):
    c = get_corridor(corridor_id)
    assert "id" in c
    assert "name" in c
    assert "hydrologic_params" in c
    params = c["hydrologic_params"]
    assert params["inlet_throat_area_m2"] > 0
    assert 0 < params["inlet_discharge_coeff"] <= 1.0
    assert params["backwater_length_km"] > 0
    assert params["surge_decay_coeff"] > 0


@pytest.mark.parametrize("corridor_id", ["kochi", "chennai", "mumbai", "odisha"])
def test_corridor_assets_and_edges(corridor_id):
    c = get_corridor(corridor_id)
    assets = c["assets"]
    edges = c["power_grid_edges"]
    routes = c["logistics_corridors"]

    assert len(assets) >= 7
    assert len(edges) >= 5
    assert len(routes) >= 2

    asset_ids = {a["id"] for a in assets}

    # Verify edge endpoints are valid assets
    for src, dst in edges:
        assert src in asset_ids, f"Edge source {src} not in assets"
        assert dst in asset_ids, f"Edge target {dst} not in assets"

    # Verify at least one grid source and at least one hospital
    has_source = any(a.get("is_source") for a in assets)
    has_hospital = any(a.get("type") == "hospital" for a in assets)
    assert has_source, f"Corridor {corridor_id} has no grid source"
    assert has_hospital, f"Corridor {corridor_id} has no hospital"


def test_invalid_corridor_raises_key_error():
    with pytest.raises(KeyError):
        get_corridor("invalid_corridor_xyz")
