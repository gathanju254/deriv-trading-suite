# backend/src/api/websocket.py

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from src.core.deriv_api import deriv
from src.utils.logger import logger
import asyncio
import json
import time
from typing import Dict

ws_router = APIRouter()


# ==================================================
#           WEBSOCKET CONNECTION MANAGER
# ==================================================
class WSManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []
        self.last_tick_sent = 0  # For throttling tick spam
        self.tick_interval = 0.3  # Send a tick every 300ms max

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(
            f"WebSocket connected | Total clients: {len(self.active_connections)}"
        )

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(
            f"WebSocket disconnected | Total clients: {len(self.active_connections)}"
        )

    async def broadcast(self, message: dict):
        """Send JSON to all clients, removing any dead connections."""
        disconnected = []
        for ws in self.active_connections:
            try:
                await ws.send_json(message)
            except Exception:
                disconnected.append(ws)

        for ws in disconnected:
            self.disconnect(ws)

    async def broadcast_signal(self, signal: Dict):
        """Broadcast new signal to all connected clients"""
        try:
            message = {
                "type": "signal",
                "data": signal
            }

            for connection in self.active_connections:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.warning(f"Failed to send signal to client: {e}")
        except Exception as e:
            logger.error(f"Error broadcasting signal: {e}")


ws_manager = WSManager()


# ==================================================
#              WEBSOCKET ENDPOINT
# ==================================================
@ws_router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)

    # Send confirmation message
    await websocket.send_json({
        "type": "connection",
        "data": {
            "status": "connected",
            "message": "WebSocket connected successfully."
        }
    })

    try:
        while True:
            try:
                # Receive incoming message (ignored but keeps ws alive)
                data = await websocket.receive_text()

                # Log only valid JSON
                try:
                    parsed = json.loads(data)
                    logger.debug(f"Client WS message: {parsed}")
                except:
                    pass

            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error(f"WebSocket error: {e}")
                break

    finally:
        ws_manager.disconnect(websocket)


# ==================================================
#           DERIV MESSAGE FORWARDER
# ==================================================
async def broadcast_deriv_messages(msg: dict):
    """Forward Deriv API messages to clients (with filtering & throttling)."""

    try:
        # ------------- TICK THROTTLING ----------------
        if "tick" in msg:
            now = time.time()
            if now - ws_manager.last_tick_sent < ws_manager.tick_interval:
                return  # Skip to reduce flood
            ws_manager.last_tick_sent = now

            tick = msg.get("tick", {})
            await ws_manager.broadcast({
                "type": "tick",
                "data": {
                    "symbol": tick.get("symbol"),
                    "quote": tick.get("quote"),
                    "epoch": tick.get("epoch")
                }
            })
            return

        # ------------- TRADE MESSAGES ----------------
        if "buy" in msg or "sell" in msg or "proposal_open_contract" in msg:
            await ws_manager.broadcast({
                "type": "trade",
                "data": msg
            })
            return

        # Other messages (optional)
        # logger.debug(f"WS ignored Deriv message: {msg}")

    except Exception as e:
        logger.error(f"WebSocket broadcast error: {e}")


# ==================================================
#     REGISTER WS BROADCASTER AFTER APP STARTS
# ==================================================
async def register_ws_broadcaster():
    """Register the WebSocket broadcaster with Deriv API."""
    try:
        await deriv.add_listener(broadcast_deriv_messages)
        logger.info("WS broadcaster successfully registered with Deriv API")
    except Exception as e:
        logger.error(f"Failed to register WS broadcaster: {e}")


# IMPORTANT:
# Register the broadcaster only when the event loop is ready.
# FastAPI lifespan event triggers registration safely.
asyncio.get_event_loop().call_soon_threadsafe(
    lambda: asyncio.create_task(register_ws_broadcaster())
)
