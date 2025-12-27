# backend/src/core/deriv_api.py
import json
import asyncio
import websockets
import time
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
        self._connection_lock = asyncio.Lock()  # Prevent multiple simultaneous connections
        self._authorize_event = asyncio.Event()  # Synchronize authorization
        self._connect_timeout = 30  # Increased timeout for connection

    async def connect(self):
        # Use lock to prevent multiple simultaneous connections
        async with self._connection_lock:
            if self.ws and not getattr(self.ws, "closed", False):
                return
            
            logger.info("Connecting to Deriv WebSocket...")
            try:
                # Increase timeout and add better error handling
                self.ws = await asyncio.wait_for(
                    websockets.connect(
                        self.url, 
                        ping_interval=30, 
                        ping_timeout=10,
                        close_timeout=1
                    ),
                    timeout=self._connect_timeout
                )
                
                # Reset authorization state on new connection
                self.authorized = False
                self._authorize_event.clear()
                
                # Start reader if not already running
                if self._reader_task is None or self._reader_task.done():
                    self._reader_task = asyncio.create_task(self._reader())
                    
                logger.info("✅ WebSocket connection established")
                
            except asyncio.TimeoutError:
                logger.error(f"Connection timeout after {self._connect_timeout}s")
                raise
            except Exception as e:
                logger.error(f"Connection failed: {e}")
                raise
    
    async def close(self):
        if self.ws:
            await self.ws.close()
            self.authorized = False
            self._authorize_event.clear()

    async def send(self, payload: Dict[str, Any]):
        await self.connect()
        async with self._send_lock:
            logger.debug(f"Deriv SEND → {json.dumps(payload)}")  # <-- Add debug logging for outgoing payloads
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
        # Check if already authorized
        if self.authorized:
            return True
        
        # Ensure connected
        await self.connect()
        
        # Clear previous authorization state
        self._authorize_event.clear()
        
        # Send authorization request
        await self.send({"authorize": settings.DERIV_API_TOKEN})
        logger.debug("Authorization request sent")
        
        # Wait for authorization response with timeout
        try:
            await asyncio.wait_for(self._authorize_event.wait(), timeout=10.0)
            return self.authorized
        except asyncio.TimeoutError:
            logger.error("Authorization timeout - no response from Deriv")
            
            # Try direct read as fallback
            try:
                # Give it one more quick try
                for _ in range(3):
                    try:
                        msg = await asyncio.wait_for(self._recv(), timeout=1.0)
                        if "authorize" in msg:
                            await self.handle_incoming(msg)
                            if self.authorized:
                                return True
                    except asyncio.TimeoutError:
                        continue
            except Exception as e:
                logger.debug(f"Fallback authorization failed: {e}")
            
            return False

    async def handle_incoming(self, msg: dict):
        """
        Update authorization / balance ONLY.
        Contract lifecycle messages are handled by OrderExecutor.
        WebSocket broadcasting is handled by websocket.py.
        """
        try:
            # ONLY handle authorization and balance updates
            if "authorize" in msg:
                auth_data = msg["authorize"]
                if "error" in auth_data:
                    logger.error(f"Authorization error: {auth_data['error']}")
                    self.authorized = False
                else:
                    self.authorized = True
                    bal = auth_data.get("balance")
                    if bal is not None:
                        try:
                            self._balance = float(bal)
                            # Log only once at INFO level
                            logger.info(f"Balance updated from authorize: {self._balance}")
                        except Exception:
                            logger.exception("Failed to parse balance from authorize")
                self._authorize_event.set()  # Signal authorization complete
            
            # ONLY update cached balance from buy responses (no logging)
            if "buy" in msg:
                bal = msg["buy"].get("balance_after")
                if bal is not None:
                    try:
                        self._balance = float(bal)
                        # Balance updates are logged by websocket.py
                    except Exception:
                        # Silently fail for balance parsing errors
                        pass
                        
            # DO NOT handle or log any other messages here
            # (ticks, signals, contracts, etc. are handled by other listeners)
                
        except Exception as e:
            logger.error(f"Error in internal message handler: {e}")
    
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
        start_time = time.time()
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

        # One-shot listener to capture the immediate buy response (non-blocking for other listeners)
        ev = asyncio.Event()
        response_container = {"msg": None}

        async def _one_shot_listener(msg):
            try:
                # Capture multiple possible immediate responses: 'buy', 'proposal', or 'proposal_open_contract'
                if "buy" in msg:
                    response_container["msg"] = msg.get("buy")
                    ev.set()
                elif "proposal" in msg:
                    # some brokers send proposal/proposal_open_contract before buy
                    response_container["msg"] = msg.get("proposal")
                    ev.set()
                elif "proposal_open_contract" in msg:
                    response_container["msg"] = msg.get("proposal_open_contract")
                    ev.set()
                # Capture explicit error payloads related to buy attempts (echo_req/msg_type==buy)
                elif msg.get("msg_type") == "buy" and "error" in msg:
                    # Return the whole message so caller can inspect error.code/message
                    response_container["msg"] = {"error": msg.get("error"), "echo_req": msg.get("echo_req")}
                    ev.set()
            except Exception:
                logger.exception("one-shot buy listener failed")

        await self.add_listener(_one_shot_listener)
        try:
            await self.send(req)
            # wait briefly for the broker response (best-effort)
            try:
                await asyncio.wait_for(ev.wait(), timeout=10.0)  # Increased from 5.0, or remove timeout entirely
            except asyncio.TimeoutError:
                logger.debug("No immediate buy/proposal response received within timeout")
        finally:
            # ensure we remove our one-shot listener
            await self.remove_listener(_one_shot_listener)

        logger.debug(f"Buy request latency: {time.time() - start_time:.3f}s")
        return response_container["msg"]  # Could be None if no immediate response arrived

# single shared client
deriv = DerivAPIClient()

# internal hook for authorization and balance updates
async def _internal_hook(msg):
    await deriv.handle_incoming(msg)

# automatically attach internal hook when module imported
async def _ensure_internal():
    """Register minimal internal hook for authorization/balance only."""
    try:
        # Remove any existing internal hook first
        await deriv.remove_listener(_internal_hook)
        await deriv.add_listener(_internal_hook)
        logger.debug("Internal authorization hook registered")
    except Exception:
        logger.exception("Failed to attach internal hook")

# schedule ensure (non-blocking)
# Note: use existing event loop to schedule ensure
try:
    asyncio.get_event_loop().create_task(_ensure_internal())
except RuntimeError:
    # if there's no running loop at import-time, ignore — the bot will add listeners on startup
    pass
