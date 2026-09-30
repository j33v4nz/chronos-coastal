"""
Tests for Multi-Agent Swarm, Vision Inspector, Oracle, and FastAPI Endpoints
(Tasks 2 & 3 Verification)
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.swarm.messages import SwarmMessage, Priority, GeotechnicalReport, ParametricLiquidityVoucher
from app.hydro_engine import CompoundHydroEngine
from app.logistics_engine import LifeSupportLogisticsEngine


def test_api_health_endpoint():
    with TestClient(app) as client:
        r = client.get("/api/health")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "healthy"
        assert data["active_agents"] == 6
        assert data["version"] == "1.0.0"


def test_api_corridors_list():
    with TestClient(app) as client:
        r = client.get("/api/corridors")
        assert r.status_code == 200
        corridors = r.json()
        assert len(corridors) == 4
        ids = {c["id"] for c in corridors}
        assert ids == {"kochi", "chennai", "mumbai", "odisha"}


@pytest.mark.parametrize("cid", ["kochi", "chennai", "mumbai", "odisha"])
def test_api_simulate_all_corridors(cid):
    with TestClient(app) as client:
        payload = {
            "corridor_id": cid,
            "ocean_surge_m": 1.85,
            "river_inflow_m3s": 550.0,
            "hours_to_landfall": 6.0
        }
        r = client.post("/api/simulate", json=payload)
        assert r.status_code == 200
        data = r.json()
        assert data["success"] is True
        assert data["corridor_id"] == cid
        assert "hydro" in data
        assert "grid" in data
        assert "logistics" in data
        assert "apex" in data
        assert len(data["apex"]["tactical_directives"]) > 0


def test_api_gemini_inspect():
    with TestClient(app) as client:
        payload = {
            "corridor_id": "kochi",
            "water_depth_m": 0.50,
            "surge_m": 1.85
        }
        r = client.post("/api/gemini/inspect", json=payload)
        assert r.status_code == 200
        data = r.json()
        assert data["overall_risk_level"] in ["CRITICAL", "HIGH", "MODERATE", "LOW"]
        assert len(data["detected_hazards"]) > 0
        first_hazard = data["detected_hazards"][0]
        assert len(first_hazard["box_2d"]) == 4
        # Normalized bounding box coordinates must be within 0-1000
        for coord in first_hazard["box_2d"]:
            assert 0 <= coord <= 1000


def test_api_tile_preview():
    with TestClient(app) as client:
        r = client.get("/api/tile/preview?corridor_id=kochi&depth=0.5&surge=1.85")
        assert r.status_code == 200
        assert r.headers["content-type"] == "image/jpeg"
        assert len(r.content) > 10000 # Valid JPEG image


def test_api_oracle_verify():
    with TestClient(app) as client:
        r = client.post("/api/oracle/verify", json={
            "corridor_id": "kochi",
            "ocean_surge_m": 1.85,
            "river_inflow_m3s": 550.0,
            "hours_to_landfall": 6.0
        })
        assert r.status_code == 200
        data = r.json()
        assert "voucher_id" in data
        assert "sha256_cryptographic_seal" in data
        assert len(data["sha256_cryptographic_seal"]) == 64
        assert data["threshold_exceeded"] is True
        assert data["payout_amount_usd"] == 5000000.0


def test_oracle_verification_uses_requested_scenario():
    """A request for another corridor must not reuse the last simulation's hydro state."""
    with TestClient(app) as client:
        client.post("/api/simulate", json={
            "corridor_id": "kochi", "ocean_surge_m": 1.85,
            "river_inflow_m3s": 550.0, "hours_to_landfall": 6.0
        })
        response = client.post("/api/oracle/verify", json={
            "corridor_id": "chennai", "ocean_surge_m": 0.4,
            "river_inflow_m3s": 100.0, "hours_to_landfall": 6.0
        })
        assert response.status_code == 200
        expected = CompoundHydroEngine("chennai").simulate(0.4, 100.0)
        assert response.json()["corridor_id"] == "chennai"
        assert response.json()["flooded_area_fraction"] == expected["flooded_fraction"]


def test_route_without_breach_has_no_departure_deadline(monkeypatch):
    """A route that never reaches its clearance limit remains open through the horizon."""
    engine = LifeSupportLogisticsEngine("kochi")
    monkeypatch.setattr(engine, "calculate_choke_point_hydrograph", lambda **kwargs: [
        {"time_elapsed_hours": 0.0, "wse_m": 0.0, "water_depth_m": 0.0},
        {"time_elapsed_hours": 0.5, "wse_m": 0.0, "water_depth_m": 0.0},
    ])
    result = engine.evaluate_reachability(0.0, 100.0, hours_to_landfall=0.5)
    assert all(route["operational_status"] == "CLEAR_PASSABLE" for route in result["routes"])
    assert all(route["departure_window_remaining_min"] is None for route in result["routes"])
    assert result["shortest_departure_window_min"] is None
