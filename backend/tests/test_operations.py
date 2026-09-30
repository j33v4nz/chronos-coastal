"""Exercise the advisory flow when a modeled route has no closure deadline."""

import asyncio

import httpx

from app.main import app


def test_advisory_accepts_routes_without_deadlines(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "")
    monkeypatch.setenv("GEE_PROJECT_ID", "")

    async def run():
        async with app.router.lifespan_context(app):
            async with httpx.AsyncClient(
                transport=httpx.ASGITransport(app=app), base_url="http://test"
            ) as client:
                scenario = await client.post("/api/operations/simulate", json={
                    "corridor_id": "chennai",
                    "ocean_surge_m": 0.0,
                    "river_inflow_m3s": 50.0,
                    "hours_to_landfall": 0.5,
                    "rainfall_mm": 0.0,
                    "include_rainfall_runoff": False,
                })
                assert scenario.status_code == 200
                data = scenario.json()
                assert any(
                    route["departure_window_remaining_min"] is None
                    for route in data["logistics"]["routes"]
                )

                advisory = await client.post("/api/operations/advisories", json={
                    "snapshot_id": data["snapshot_id"], "inspect_image": False
                })
                assert advisory.status_code == 200
                assert advisory.json()["engine_mode"] == "rule_based_draft"

    asyncio.run(run())
