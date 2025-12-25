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
#           SPECIALIZED BROADCAST FUNCTIONS
# ==================================================
async def broadcast_balance_update(balance: float):
    """Broadcast balance updates to all clients"""
    try:
        await ws_manager.broadcast({
            "type": "balance",
            "data": {
                "balance": balance,
                "timestamp": time.time()
            }
        })
        logger.debug(f"Broadcast balance update: {balance}")
    except Exception as e:
        logger.error(f"Error broadcasting balance: {e}")


async def broadcast_performance_update(performance_data: dict):
    """Broadcast performance updates to all clients"""
    try:
        await ws_manager.broadcast({
            "type": "performance",
            "data": performance_data
        })
        logger.debug(f"Broadcast performance update: {performance_data}")
    except Exception as e:
        logger.error(f"Error broadcasting performance: {e}")


async def broadcast_trade_update(trade_data: dict):
    """Broadcast trade updates to all clients"""
    try:
        await ws_manager.broadcast({
            "type": "trade",
            "data": trade_data
        })
        logger.debug(f"Broadcast trade update: {trade_data}")
    except Exception as e:
        logger.error(f"Error broadcasting trade: {e}")


# ==================================================
#           DERIV MESSAGE FORWARDER
# ==================================================
async def broadcast_deriv_messages(msg: dict):
    """Forward Deriv API messages to clients (with filtering & throttling)."""

    try:
        # ------------- BALANCE UPDATES ----------------
        if "authorize" in msg and "balance" in msg.get("authorize", {}):
            balance = msg["authorize"]["balance"]
            await broadcast_balance_update(balance)
        
        if "buy" in msg and "balance_after" in msg.get("buy", {}):
            balance = msg["buy"]["balance_after"]
            await broadcast_balance_update(balance)
        
        if "sell" in msg and "balance_after" in msg.get("sell", {}):
            balance = msg["sell"]["balance_after"]
            await broadcast_balance_update(balance)

        # ------------- CONTRACT CLOSURE ----------------
        if "proposal_open_contract" in msg:
            contract = msg["proposal_open_contract"]
            if contract.get("is_sold") == "1" or contract.get("status") == "sold":
                logger.info(f"Contract closed: {contract.get('contract_id')}")
                
                # When a contract closes, update performance and trades
                try:
                    from src.trading.performance import performance
                    
                    # Get updated performance metrics
                    perf_data = await performance.calculate_metrics()
                    await broadcast_performance_update(perf_data)
                    
                    # Broadcast trade update
                    await broadcast_trade_update({
                        "contract_id": contract.get("contract_id"),
                        "status": contract.get("status", "sold"),
                        "profit": contract.get("profit"),
                        "symbol": contract.get("symbol"),
                        "buy_price": contract.get("buy_price"),
                        "sell_price": contract.get("sell_price"),
                        "timestamp": time.time(),
                        "is_sold": contract.get("is_sold"),
                        "type": "contract_closed"
                    })
                except Exception as e:
                    logger.error(f"Error processing contract closure: {e}")

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
        if "buy" in msg:
            buy_data = msg.get("buy", {})
            await broadcast_trade_update({
                "type": "buy",
                "contract_id": buy_data.get("contract_id"),
                "balance_after": buy_data.get("balance_after"),
                "amount": buy_data.get("amount"),
                "symbol": buy_data.get("symbol"),
                "timestamp": time.time()
            })
            return
        
        if "sell" in msg:
            sell_data = msg.get("sell", {})
            await broadcast_trade_update({
                "type": "sell",
                "contract_id": sell_data.get("contract_id"),
                "balance_after": sell_data.get("balance_after"),
                "profit": sell_data.get("profit"),
                "timestamp": time.time()
            })
            return

        # ------------- SIGNAL MESSAGES ----------------
        # You can also handle signal messages from Deriv if needed
        # Example: if "signal" in msg:
        #     await ws_manager.broadcast_signal(msg["signal"])

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


# ==================================================
#     PUBLIC FUNCTIONS FOR OTHER MODULES TO USE
# ==================================================
async def broadcast_balance(balance: float):
    """Public function for other modules to broadcast balance updates"""
    await broadcast_balance_update(balance)


async def broadcast_performance(performance_data: dict):
    """Public function for other modules to broadcast performance updates"""
    await broadcast_performance_update(performance_data)


async def broadcast_trade(trade_data: dict):
    """Public function for other modules to broadcast trade updates"""
    await broadcast_trade_update(trade_data)


async def broadcast_signal(signal_data: dict):
    """Public function for other modules to broadcast signals"""
    await ws_manager.broadcast_signal(signal_data)


# ==================================================
#     REGISTER BROADCASTER ON APP STARTUP
# ==================================================
# IMPORTANT: Register the broadcaster only when the event loop is ready.
# FastAPI lifespan event triggers registration safely.
asyncio.get_event_loop().call_soon_threadsafe(
    lambda: asyncio.create_task(register_ws_broadcaster())
)