import asyncio

from fastapi.testclient import TestClient

from app.main import app, bus
from app.swarm.bus import TacticalEventBus
from app.swarm.messages import SwarmMessage, Priority


def test_disconnecting_client_does_not_interrupt_other_broadcasts():
    async def run():
        bus = TacticalEventBus()
        messages = []
        class Receiver:
            async def send_json(self, value):
                messages.append(value)
        class Disconnecting:
            async def send_json(self, value):
                bus.disconnect_ws(self)
                raise RuntimeError('Disconnected')
        bus._active_websockets.update([Receiver(), Disconnecting()])
        event = SwarmMessage(sender='HydroAgent', topic='telemetry.hydro', priority=Priority.HIGH, payload={'test': True})
        await bus.broadcast_ws(event)
        assert len(messages) == 1
        assert len(bus._active_websockets) == 1
    asyncio.run(run())


def test_event_bus_processes_new_events_after_application_restart():
    # The singleton bus must not retain a queue bound to an earlier event loop.
    for _ in range(2):
        with TestClient(app) as client:
            client.portal.call(bus._queue.join)
            baseline = bus.get_history()
            with client.websocket_connect('/ws/tactical-feed') as websocket:
                for _ in baseline[-25:]:
                    websocket.receive_json()
                response = client.post('/api/simulate', json={'corridor_id': 'chennai'})
                assert response.status_code == 200
                previous_ids = {event['id'] for event in baseline}
                expected = {event['id'] for event in bus.get_history() if event['id'] not in previous_ids}
                events = [websocket.receive_json() for _ in expected]
                assert {event['id'] for event in events} == expected
                assert any(event['payload'].get('corridor_id') == 'chennai' for event in events)
