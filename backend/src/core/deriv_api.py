# backend/src/core/deriv_api.py
import json
import asyncio
import websockets
from typing import Callable, Any, Dict
from src.config.settings import settings
from src.utils.logger import logger

class DerivAPIClient:
    def __init__(self):
        self.url = f"wss://ws.derivws.com/websockets/v3?app_id={settings.DERIV_APP_ID}"
        self.ws = None
        self.authorized = False
        self._recv_lock = asyncio.Lock()
        self._send_lock = asyncio.Lock()
        self._listeners = []  # callback functions(msg)
        self._reader_task = None
        self._balance = 0.0  # cache latest balance

    async def connect(self):
        if self.ws and not getattr(self.ws, "closed", False):
            return
        logger.info("Connecting to Deriv WebSocket...")
        self.ws = await websockets.connect(self.url, ping_interval=30, ping_timeout=10)
        # start background reader
        if self._reader_task is None or self._reader_task.done():
            self._reader_task = asyncio.create_task(self._reader())

    async def close(self):
        if self.ws:
            await self.ws.close()

    async def send(self, payload: Dict[str, Any]):
        await self.connect()
        async with self._send_lock:
            await self.ws.send(json.dumps(payload))

    async def _recv(self):
        async with self._recv_lock:
            text = await self.ws.recv()
            return json.loads(text)

    async def _reader(self):
        try:
            while True:
                msg = await self._recv()
                # dispatch to listeners (external callbacks, e.g. bot tick handler, order executor)
                for cb in list(self._listeners):
                    try:
                        await cb(msg)
                    except Exception:
                        logger.exception("Listener raised")

                # internal handling (balance/authorization/contract routing)
                try:
                    await self.handle_incoming(msg)
                except Exception:
                    # keep reader alive even if internal handler fails
                    logger.exception("handle_incoming raised an exception")
        except websockets.ConnectionClosed:
            logger.warning("Deriv WebSocket closed")
            self.authorized = False
            # try reconnecting gracefully
            await asyncio.sleep(1)
            try:
                await self.connect()
            except Exception:
                logger.exception("Reconnect failed")

    async def add_listener(self, callback: Callable[[dict], Any]):
        if callback not in self._listeners:
            self._listeners.append(callback)

    async def remove_listener(self, callback: Callable[[dict], Any]):
        if callback in self._listeners:
            self._listeners.remove(callback)

    async def authorize(self) -> bool:
        if self.authorized:
            return True
        await self.send({"authorize": settings.DERIV_API_TOKEN})
        # quick wait loop for authorize to set by incoming msg handler
        for _ in range(10):
            await asyncio.sleep(0.2)
            if self.authorized:
                return True
        # fallback - try to read a message (non-blocking best-effort)
        try:
            msg = await self._recv()
            if msg.get("authorize") or not msg.get("error"):
                self.authorized = True
                return True
        except Exception:
            logger.exception("authorize fallback failed")
        return False

    async def handle_incoming(self, msg: dict):
        """
        Update authorization / balance and process contract lifecycle messages.
        Only update cached balance and authorization here. Contract closure and trade status updates are handled by OrderExecutor.
        """
        # Update authorization status + cached balance from authorize message
        try:
            if "authorize" in msg:
                self.authorized = True
                bal = msg["authorize"].get("balance")
                if bal is not None:
                    try:
                        self._balance = float(bal)
                        logger.info("Updated balance from authorize: %s", self._balance)
                    except Exception:
                        logger.exception("Failed to parse balance from authorize")
        except Exception:
            logger.exception("Error handling authorize message")

        # Update cached balance from buy responses
        try:
            if "buy" in msg:
                bal = msg["buy"].get("balance_after")
                if bal is not None:
                    try:
                        self._balance = float(bal)
                        logger.info("Updated balance from buy: %s", self._balance)
                    except Exception:
                        logger.exception("Failed to parse balance from buy")
        except Exception:
            logger.exception("Error handling buy message")

        # Do NOT update contract/trade status here. This is now handled by OrderExecutor's listener.

    async def get_balance(self) -> float:
        """Return latest known balance (cached)"""
        return self._balance

    async def subscribe_ticks(self, symbol: str):
        await self.send({"ticks": symbol, "subscribe": 1})

    async def buy(
        self,
        symbol: str,
        amount: float,
        contract_type: str,
        duration: int = 1,
        duration_unit: str = "t"
    ):
        req = {
            "buy": 1,
            "price": "{:.2f}".format(amount),
            "parameters": {
                "amount": amount,
                "basis": "stake",
                "contract_type": contract_type,
                "currency": settings.BASE_CURRENCY,
                "duration": duration,
                "duration_unit": duration_unit,
                "symbol": symbol
            }
        }
        await self.send(req)
        return True  # request sent

# single shared client
deriv = DerivAPIClient()

# internal hook for authorization and balance updates
async def _internal_hook(msg):
    await deriv.handle_incoming(msg)

# automatically attach internal hook when module imported
async def _ensure_internal():
    try:
        await deriv.add_listener(_internal_hook)
    except Exception:
        logger.exception("Failed to attach internal hook")

# schedule ensure (non-blocking)
# Note: use existing event loop to schedule ensure
try:
    asyncio.get_event_loop().create_task(_ensure_internal())
except RuntimeError:
    # if there's no running loop at import-time, ignore — the bot will add listeners on startup
    pass
