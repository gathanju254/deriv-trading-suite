# backend/src/core/deriv_api.py
import json
import asyncio
import websockets
import time
import os
from typing import Callable, Any, Dict, Optional
from src.config.settings import settings
from src.utils.logger import logger

# Add import for the new helper
from src.utils.helpers import Helpers

class DerivAPIClient:
    def __init__(self):
        self.app_id = settings.DERIV_APP_ID
        self.base_url = f"wss://ws.derivws.com/websockets/v3"
        
        # For single-user mode (backward compatibility)
        self.single_user_url = f"{self.base_url}?app_id={self.app_id}"
        self.ws = None
        self.authorized = False
        self._recv_lock = asyncio.Lock()
        self._send_lock = asyncio.Lock()
        self._listeners = []
        self._reader_task = None
        self._balance = 0.0
        self._connection_lock = asyncio.Lock()
        self._authorize_event = asyncio.Event()
        self._connect_timeout = 30
        
        # For multi-user mode
        self.user_connections: Dict[str, UserConnection] = {}
        self.user_connections_lock = asyncio.Lock()
        
        # OAuth and markup settings
        self.app_markup_percentage = float(os.getenv("APP_MARKUP_PERCENTAGE", 0.5))  # 0.5% default markup
        self.oauth_client_id = os.getenv("DERIV_OAUTH_CLIENT_ID", "")
        self.oauth_redirect_uri = os.getenv("DERIV_OAUTH_REDIRECT_URI", "http://localhost:8000/auth/callback")
        
        logger.info(f"Deriv API initialized with markup: {self.app_markup_percentage}%")

    # =============================================
    # SINGLE-USER MODE (BACKWARD COMPATIBLE)
    # =============================================
    
    async def connect(self):
        """Connect in single-user mode (for admin/bot)"""
        async with self._connection_lock:
            if self.ws and not getattr(self.ws, "closed", False):
                return
            
            logger.info("Connecting to Deriv WebSocket (single-user mode)...")
            try:
                self.ws = await asyncio.wait_for(
                    websockets.connect(
                        self.single_user_url, 
                        ping_interval=30, 
                        ping_timeout=10,
                        close_timeout=1
                    ),
                    timeout=self._connect_timeout
                )
                
                self.authorized = False
                self._authorize_event.clear()
                
                if self._reader_task is None or self._reader_task.done():
                    self._reader_task = asyncio.create_task(self._reader())
                    
                logger.info("✅ Single-user WebSocket connection established")
                
            except asyncio.TimeoutError:
                logger.error(f"Connection timeout after {self._connect_timeout}s")
                raise
            except Exception as e:
                logger.error(f"Connection failed: {e}")
                raise
    
    async def close(self):
        """Close single-user connection"""
        if self.ws:
            await self.ws.close()
            self.authorized = False
            self._authorize_event.clear()

    async def send(self, payload: Dict[str, Any]):
        """Send in single-user mode"""
        await self.connect()
        async with self._send_lock:
            logger.debug(f"Deriv SEND → {json.dumps(payload)}")
            await self.ws.send(json.dumps(payload))

    async def _recv(self):
        async with self._recv_lock:
            text = await self.ws.recv()
            return json.loads(text)

    async def _reader(self):
        """Reader for single-user connection"""
        try:
            while True:
                msg = await self._recv()
                for cb in list(self._listeners):
                    try:
                        await cb(msg)
                    except Exception:
                        logger.exception("Listener raised")
                try:
                    await self.handle_incoming(msg)
                except Exception:
                    logger.exception("handle_incoming raised an exception")
        except websockets.ConnectionClosed:
            logger.warning("Deriv WebSocket closed")
            self.authorized = False
            await asyncio.sleep(1)
            try:
                await self.connect()
            except Exception:
                logger.exception("Reconnect failed")

    async def add_listener(self, callback: Callable[[dict], Any]):
        """Add listener for single-user mode"""
        if callback not in self._listeners:
            self._listeners.append(callback)

    async def remove_listener(self, callback: Callable[[dict], Any]):
        """Remove listener for single-user mode"""
        if callback in self._listeners:
            self._listeners.remove(callback)

    async def authorize(self) -> bool:
        """Authorize single-user connection"""
        if self.authorized:
            return True
        
        await self.connect()
        self._authorize_event.clear()
        
        await self.send({"authorize": settings.DERIV_API_TOKEN})
        logger.debug("Authorization request sent")
        
        try:
            await asyncio.wait_for(self._authorize_event.wait(), timeout=10.0)
            return self.authorized
        except asyncio.TimeoutError:
            logger.error("Authorization timeout")
            return False

    async def handle_incoming(self, msg: dict):
        """Handle incoming messages for single-user mode"""
        try:
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
                            logger.info(f"Balance updated: {self._balance}")
                        except Exception:
                            logger.exception("Failed to parse balance")
                self._authorize_event.set()
            
            if "buy" in msg:
                bal = msg["buy"].get("balance_after")
                if bal is not None:
                    try:
                        self._balance = float(bal)
                    except Exception:
                        pass
        except Exception as e:
            logger.error(f"Error in message handler: {e}")

    # =============================================
    # MULTI-USER MODE
    # =============================================
    
    async def get_user_connection(self, user_id: str, oauth_token: Optional[str] = None) -> 'UserConnection':
        """Get or create a WebSocket connection for a specific user"""
        async with self.user_connections_lock:
            if user_id not in self.user_connections:
                self.user_connections[user_id] = UserConnection(
                    user_id=user_id,
                    app_id=self.app_id,
                    markup_percentage=self.app_markup_percentage,
                    base_url=self.base_url
                )
                logger.info(f"Created new connection for user {user_id}")
            
            conn = self.user_connections[user_id]
            if not conn.connected:
                await conn.connect(oauth_token)
            
            return conn

    async def authorize_user(self, user_id: str, oauth_token: str) -> bool:
        """Authorize a user using OAuth token"""
        try:
            conn = await self.get_user_connection(user_id, oauth_token)
            authorized = await conn.authorize()
            
            if authorized:
                logger.info(f"User {user_id} authorized successfully")
                # Calculate and track commission from this user's future trades
                logger.info(f"Markup {self.app_markup_percentage}% will be applied to user {user_id}'s trades")
            
            return authorized
        except Exception as e:
            logger.error(f"Failed to authorize user {user_id}: {e}")
            return False

    async def place_trade_for_user(
        self,
        user_id: str,
        symbol: str,
        amount: float,
        contract_type: str,
        duration: int = 1,
        duration_unit: str = "t"
    ) -> Dict[str, Any]:
        """Place a trade for a specific user with markup applied"""
        try:
            conn = await self.get_user_connection(user_id)
            
            if not conn.authorized:
                raise Exception(f"User {user_id} not authorized")
            
            logger.info(f"Placing trade for user {user_id}: {contract_type} ${amount} on {symbol}")
            
            result = await conn.buy(
                symbol=symbol,
                amount=amount,
                contract_type=contract_type,
                duration=duration,
                duration_unit=duration_unit
            )
            
            # Track commission if trade successful
            if result and "buy" in result and "error" not in result.get("buy", {}):
                payout = result.get("buy", {}).get("payout", 0)
                commission_amount = (self.app_markup_percentage / 100) * payout
                
                logger.info(f"Commission earned from user {user_id}: ${commission_amount:.2f}")
                # Log to database (implement in Commission model)
                await self._log_commission(user_id, commission_amount)
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to place trade for user {user_id}: {e}")
            raise

    async def _log_commission(self, user_id: str, amount: float):
        """Log commission earned (store in database)"""
        try:
            from src.db.session import SessionLocal
            from src.db.models.user import Commission
            from datetime import datetime
            
            db = SessionLocal()
            commission = Commission(
                user_id=user_id,
                amount=amount,
                markup_percentage=self.app_markup_percentage,
                created_at=datetime.utcnow()
            )
            db.add(commission)
            db.commit()
            db.close()
        except Exception as e:
            logger.error(f"Failed to log commission: {e}")

    async def get_user_balance(self, user_id: str) -> Optional[float]:
        """Get balance for a specific user"""
        try:
            conn = await self.get_user_connection(user_id)
            return await conn.get_balance()
        except Exception as e:
            logger.error(f"Failed to get balance for user {user_id}: {e}")
            return None

    async def disconnect_user(self, user_id: str):
        """Disconnect a user's WebSocket"""
        async with self.user_connections_lock:
            if user_id in self.user_connections:
                await self.user_connections[user_id].close()
                del self.user_connections[user_id]
                logger.info(f"Disconnected user {user_id}")

    # =============================================
    # COMMON METHODS (WORK FOR BOTH MODES)
    # =============================================
    
    async def get_balance(self) -> float:
        """Get balance for single-user mode"""
        return self._balance

    async def subscribe_ticks(self, symbol: str):
        """Subscribe to ticks in single-user mode"""
        await self.send({"ticks": symbol, "subscribe": 1})

    async def subscribe_ticks_for_user(self, user_id: str, symbol: str):
        """Subscribe to ticks for a specific user"""
        try:
            conn = await self.get_user_connection(user_id)
            await conn.subscribe_ticks(symbol)
        except Exception as e:
            logger.error(f"Failed to subscribe to ticks for user {user_id}: {e}")

    async def buy(
        self,
        symbol: str,
        amount: float,
        contract_type: str,
        duration: int = 1,
        duration_unit: str = "t"
    ):
        """Buy in single-user mode"""
        start_time = time.time()
        req = {
            "buy": 1,
            "price": Helpers.format_deriv_price(amount),  # Updated to use helper
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

        ev = asyncio.Event()
        response_container = {"msg": None}

        async def _one_shot_listener(msg):
            try:
                if "buy" in msg:
                    response_container["msg"] = msg.get("buy")
                    ev.set()
                elif "proposal" in msg:
                    response_container["msg"] = msg.get("proposal")
                    ev.set()
                elif "proposal_open_contract" in msg:
                    response_container["msg"] = msg.get("proposal_open_contract")
                    ev.set()
                elif msg.get("msg_type") == "buy" and "error" in msg:
                    response_container["msg"] = {"error": msg.get("error"), "echo_req": msg.get("echo_req")}
                    ev.set()
            except Exception:
                logger.exception("one-shot buy listener failed")

        await self.add_listener(_one_shot_listener)
        try:
            await self.send(req)
            try:
                await asyncio.wait_for(ev.wait(), timeout=10.0)
            except asyncio.TimeoutError:
                logger.debug("No immediate buy/proposal response")
        finally:
            await self.remove_listener(_one_shot_listener)

        logger.debug(f"Buy request latency: {time.time() - start_time:.3f}s")
        return response_container["msg"]

    # =============================================
    # UTILITY METHODS
    # =============================================
    
    def get_markup_info(self) -> Dict[str, Any]:
        """Get markup information for display"""
        return {
            "app_markup_percentage": self.app_markup_percentage,
            "description": f"Markup of {self.app_markup_percentage}% applied to all user trades",
            "earnings_example": f"On a $10 trade: ${(self.app_markup_percentage/100)*10:.2f} commission"
        }
    
    def get_oauth_url(self, state: str = "") -> str:
        """Generate OAuth URL for user authorization"""
        # This URL should be used to redirect users to Deriv for authentication
        params = {
            "app_id": self.app_id,
            "redirect_uri": self.oauth_redirect_uri,
        }
        if state:
            params["state"] = state
        
        # This is a simplified version - actual OAuth flow may differ
        query_string = "&".join([f"{k}={v}" for k, v in params.items()])
        return f"https://oauth.deriv.com/oauth2/authorize?{query_string}"


class UserConnection:
    """Individual user WebSocket connection"""
    
    def __init__(self, user_id: str, app_id: str, markup_percentage: float, base_url: str):
        self.user_id = user_id
        self.app_id = app_id
        self.markup_percentage = markup_percentage
        self.base_url = base_url
        self.ws = None
        self.authorized = False
        self._recv_lock = asyncio.Lock()
        self._send_lock = asyncio.Lock()
        self._listeners = []
        self._reader_task = None
        self._balance = 0.0
        self.connected = False
        self._connection_lock = asyncio.Lock()
    
    async def connect(self, oauth_token: Optional[str] = None):
        """Connect to Deriv WebSocket for this user"""
        async with self._connection_lock:
            if self.connected and self.ws and not getattr(self.ws, "closed", False):
                return
            
            # Build connection URL
            url = f"{self.base_url}?app_id={self.app_id}"
            if oauth_token:
                # For OAuth authorization during connection
                url += f"&authorize={oauth_token}"
            
            try:
                self.ws = await websockets.connect(
                    url,
                    ping_interval=30,
                    ping_timeout=10,
                    close_timeout=1
                )
                self.connected = True
                
                # Start reader task
                self._reader_task = asyncio.create_task(self._reader())
                
                logger.info(f"Connected for user {self.user_id}")
                
            except Exception as e:
                logger.error(f"Connection failed for user {self.user_id}: {e}")
                self.connected = False
                raise
    
    async def close(self):
        """Close this user's connection"""
        if self.ws:
            await self.ws.close()
        self.connected = False
        self.authorized = False
    
    async def authorize(self) -> bool:
        """Check if user is authorized"""
        # For OAuth, if we have a connection, we're authorized
        return self.connected
    
    async def buy(self, **kwargs) -> Dict[str, Any]:
        """Place a buy order for this user with markup applied"""
        if not self.authorized:
            raise Exception(f"User {self.user_id} not authorized")
        
        start_time = time.time()
        req = {
            "buy": 1,
            "price": f"{kwargs['amount']:.2f}",
            "parameters": {
                "amount": kwargs["amount"],
                "basis": "stake",
                "contract_type": kwargs["contract_type"],
                "currency": "USD",
                "duration": kwargs.get("duration", 1),
                "duration_unit": kwargs.get("duration_unit", "t"),
                "symbol": kwargs["symbol"]
            }
        }

        ev = asyncio.Event()
        response_container = {"msg": None}

        async def _one_shot_listener(msg):
            try:
                if "buy" in msg:
                    response_container["msg"] = msg.get("buy")
                    ev.set()
                elif msg.get("msg_type") == "buy" and "error" in msg:
                    response_container["msg"] = {"error": msg.get("error")}
                    ev.set()
            except Exception:
                logger.exception(f"Buy listener failed for user {self.user_id}")

        await self.add_listener(_one_shot_listener)
        try:
            await self.send(req)
            try:
                await asyncio.wait_for(ev.wait(), timeout=10.0)
            except asyncio.TimeoutError:
                logger.debug("No immediate buy/proposal response")
        finally:
            await self.remove_listener(_one_shot_listener)

        logger.debug(f"Buy request latency: {time.time() - start_time:.3f}s")
        return response_container["msg"]
    
    async def send(self, payload: Dict[str, Any]):
        """Send message for this user"""
        async with self._send_lock:
            if not self.ws:
                raise Exception(f"User {self.user_id} not connected")
            await self.ws.send(json.dumps(payload))
    
    async def _recv(self):
        """Receive message for this user"""
        async with self._recv_lock:
            if not self.ws:
                raise Exception(f"User {self.user_id} not connected")
            text = await self.ws.recv()
            return json.loads(text)
    
    async def _reader(self):
        """Reader for this user's connection"""
        try:
            while True:
                msg = await self._recv()
                # Update balance if present
                if "authorize" in msg:
                    auth_data = msg["authorize"]
                    if "error" not in auth_data:
                        self.authorized = True
                        bal = auth_data.get("balance")
                        if bal is not None:
                            try:
                                self._balance = float(bal)
                            except:
                                pass
                elif "buy" in msg:
                    bal = msg["buy"].get("balance_after")
                    if bal is not None:
                        try:
                            self._balance = float(bal)
                        except:
                            pass
                
                # Forward to listeners
                for cb in list(self._listeners):
                    try:
                        await cb(msg)
                    except Exception:
                        logger.exception(f"Listener failed for user {self.user_id}")
        except websockets.ConnectionClosed:
            logger.warning(f"Connection closed for user {self.user_id}")
            self.connected = False
            self.authorized = False
    
    async def add_listener(self, callback: Callable[[dict], Any]):
        """Add listener for this user"""
        if callback not in self._listeners:
            self._listeners.append(callback)
    
    async def remove_listener(self, callback: Callable[[dict], Any]):
        """Remove listener for this user"""
        if callback in self._listeners:
            self._listeners.remove(callback)
    
    async def get_balance(self) -> float:
        """Get this user's balance"""
        return self._balance
    
    async def subscribe_ticks(self, symbol: str):
        """Subscribe to ticks for this user"""
        await self.send({"ticks": symbol, "subscribe": 1})


# =============================================
# SINGLETON INSTANCE
# =============================================

deriv = DerivAPIClient()

# Internal hook for single-user mode
async def _internal_hook(msg):
    await deriv.handle_incoming(msg)

# Register internal hook
async def _ensure_internal():
    try:
        await deriv.remove_listener(_internal_hook)
        await deriv.add_listener(_internal_hook)
        logger.debug("Internal authorization hook registered")
    except Exception:
        logger.exception("Failed to attach internal hook")

# Schedule hook registration
try:
    asyncio.get_event_loop().create_task(_ensure_internal())
except RuntimeError:
    # No running event loop yet
    pass