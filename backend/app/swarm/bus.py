"""
CHRONOS-COASTAL Tactical Priority Event Bus
Asynchronous priority messaging system with topic routing and real-time WebSocket broadcasting.
"""

import asyncio
import logging
from typing import Dict, List, Set, Callable, Awaitable, Optional, Any
from app.swarm.messages import SwarmMessage, Priority

logger = logging.getLogger("TacticalEventBus")


class TacticalEventBus:
    """
    Priority-queued asynchronous event bus connecting all 6 autonomous agents.
    Prioritizes life-critical breaker trips and emergency logistics over standard telemetry.
    Broadcasts every event in real time to connected digital twin WebSockets.
    """

    def __init__(self, max_history: int = 150):
        # asyncio.PriorityQueue stores: (priority_int, counter, SwarmMessage)
        self._queue: asyncio.PriorityQueue = asyncio.PriorityQueue()
        self._counter: int = 0
        self._handlers: Dict[str, List[Callable[[SwarmMessage], Awaitable[None]]]] = {}
        self._active_websockets: Set[Any] = set()
        self._history: List[Dict[str, Any]] = []
        self._max_history = max_history
        self._is_running: bool = False

    async def connect_ws(self, websocket: Any):
        """Registers a new frontend WebSocket client and sends historical event backlog."""
        await websocket.accept()
        self._active_websockets.add(websocket)
        logger.info(f"WebSocket client connected. Total clients: {len(self._active_websockets)}")

        # Send last 25 historical events to bootstrap client UI
        for event in self._history[-25:]:
            try:
                await websocket.send_json(event)
            except Exception:
                break

    def disconnect_ws(self, websocket: Any):
        """Removes a disconnected WebSocket client from the pool."""
        self._active_websockets.discard(websocket)
        logger.info(f"WebSocket client disconnected. Remaining: {len(self._active_websockets)}")

    async def broadcast_ws(self, message: SwarmMessage):
        """Broadcasts a priority swarm message to all connected WebSocket clients."""
        if not self._active_websockets:
            return

        payload = message.to_broadcast_dict()
        disconnected = set()

        for ws in self._active_websockets:
            try:
                await ws.send_json(payload)
            except Exception:
                disconnected.add(ws)

        for dead_ws in disconnected:
            self._active_websockets.discard(dead_ws)

    def subscribe(self, topic_pattern: str, handler: Callable[[SwarmMessage], Awaitable[None]]):
        """Subscribes an async callback handler to a topic pattern (e.g. 'telemetry.*', '*')."""
        if topic_pattern not in self._handlers:
            self._handlers[topic_pattern] = []
        self._handlers[topic_pattern].append(handler)
        logger.debug(f"Subscribed handler to topic pattern: {topic_pattern}")

    async def publish(self, message: SwarmMessage):
        """Publishes an event to the priority queue."""
        self._counter += 1
        # Store in bounded historical buffer
        self._history.append(message.to_broadcast_dict())
        if len(self._history) > self._max_history:
            self._history.pop(0)

        # PriorityQueue entry: (priority_integer, counter_sequence, message)
        await self._queue.put((int(message.priority), self._counter, message))

    def get_history(self) -> List[Dict[str, Any]]:
        """Returns the circular event history."""
        return list(self._history)

    async def run(self):
        """Main event bus worker loop."""
        self._is_running = True
        logger.info("TacticalEventBus worker loop started.")

        try:
            while self._is_running:
                priority_int, count, message = await self._queue.get()

                # 1. Real-time WebSocket fanout
                await self.broadcast_ws(message)

                # 2. Topic pattern dispatch
                for pattern, handlers in self._handlers.items():
                    if self._matches(pattern, message.topic):
                        for handler in handlers:
                            try:
                                await handler(message)
                            except Exception as e:
                                logger.error(f"Error executing handler for {message.topic}: {e}", exc_info=True)

                self._queue.task_done()
        except asyncio.CancelledError:
            logger.info("TacticalEventBus worker loop cancelled.")
        finally:
            self._is_running = False

    def stop(self):
        """Stops the worker loop."""
        self._is_running = False

    @staticmethod
    def _matches(pattern: str, topic: str) -> bool:
        """Evaluates topic wildcard matching."""
        if pattern == "*" or pattern == topic:
            return True
        if pattern.endswith(".*"):
            prefix = pattern[:-2]
            return topic.startswith(prefix + ".")
        return False
