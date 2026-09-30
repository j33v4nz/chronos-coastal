import asyncio
import hashlib
import json

import httpx
import pytest

from app.main import app
from app import operations
from app.storage import RecordStore


@pytest.fixture
def isolated_records(tmp_path, monkeypatch):
    monkeypatch.setattr(operations, "records", RecordStore(tmp_path))
    monkeypatch.setenv("GEMINI_API_KEY", "")
    monkeypatch.setenv("GEE_PROJECT_ID", "")
    monkeypatch.setenv("ADVISORY_WEBHOOK_URL", "")
    operations.snapshots.clear()
    operations.advisories.clear()
    operations.deliveries.clear()
    return tmp_path


def test_draft_export_and_idempotent_delivery_survive_restart(isolated_records):
    async def run():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            scenario = (await client.post("/api/operations/simulate", json={"corridor_id": "kochi"})).json()
            operations.snapshots.clear()  # Restart empties the memory cache.
            response = await client.post("/api/operations/advisories", json={"snapshot_id": scenario["snapshot_id"]})
            assert response.status_code == 200
            draft = response.json()
            signed = {key: value for key, value in draft.items() if key != "sha256"}
            assert draft["sha256"] == hashlib.sha256(json.dumps(signed, sort_keys=True).encode()).hexdigest()
            operations.advisories.clear()
            payload = {"advisory_id": draft["advisory_id"], "recipient": "Demo operations team"}
            receipt = await client.post("/api/operations/dispatch", json=payload)
            assert receipt.status_code == 200
            operations.deliveries.clear()
            operations.records = RecordStore(isolated_records)
            repeated = await client.post("/api/operations/dispatch", json=payload)
            assert repeated.json() == receipt.json()
            inbox = (await client.get("/api/operations/deliveries")).json()
            assert len(inbox) == 1
            assert inbox[0]["status"] == "delivered_to_test_inbox"
            exported = await client.get(f"/api/operations/advisories/{draft['advisory_id']}/export")
            assert exported.status_code == 200
            assert draft["sha256"] in exported.text
            assert operations.records.get("advisory", draft["advisory_id"])["status"] == "draft"
    asyncio.run(run())


def test_failed_external_dispatch_creates_no_receipt(isolated_records):
    async def run():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            scenario = (await client.post("/api/operations/simulate", json={})).json()
            draft = (await client.post("/api/operations/advisories", json={"snapshot_id": scenario["snapshot_id"]})).json()
            result = await client.post("/api/operations/dispatch", json={"advisory_id": draft["advisory_id"], "channel": "webhook"})
            assert result.status_code == 409
            assert (await client.get("/api/operations/deliveries")).json() == []
    asyncio.run(run())


@pytest.mark.parametrize("payload", [{"corridor_id": "unknown"}, {"ocean_surge_m": 6}, {"hours_to_landfall": 0}, {"river_inflow_m3s": -1}])
def test_invalid_inputs_are_rejected(isolated_records, payload):
    async def run():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post("/api/operations/simulate", json=payload)
            assert response.status_code in (404, 422)
            assert operations.records.recent("snapshot") == []
    asyncio.run(run())
