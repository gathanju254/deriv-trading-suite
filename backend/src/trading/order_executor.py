# backend/src/trading/order_executor.py
import uuid
import asyncio
import json
import time
from datetime import datetime
from typing import Dict, Any

from src.core.deriv_api import deriv
from src.trading.position_manager import position_manager
from src.utils.logger import logger

# Database models
from src.db.models.trade import Trade
from src.db.models.proposal import Proposal
from src.db.models.contract import Contract

from src.db.repositories.trade_repo import TradeRepo
from src.db.repositories.proposal_repo import ProposalRepo
from src.db.repositories.contract_repo import ContractRepo

# Trading systems
from src.trading.performance import performance
from src.core.risk_manager import risk_manager
from src.core.signal_consensus import SignalConsensus
from src.config.settings import settings

# WebSocket broadcasting
from src.api.websocket import (
    broadcast_trade_update,
    broadcast_performance_update,
    broadcast_balance_update
)


class OrderExecutor:
    def __init__(self):
        # trade_id → metadata
        self.trades: Dict[str, Dict[str, Any]] = {}

        self.risk = risk_manager
        self.consensus = SignalConsensus()

        self._listener_registered = False

    # =====================================================
    # DERIV WS LISTENER
    # =====================================================
    async def _ws_listener(self, msg: Dict[str, Any]):
        try:
            if "tick" not in msg:
                logger.debug(f"📨 Deriv message: {json.dumps(msg)[:700]}")

            if "buy" in msg:
                await self._handle_buy(msg["buy"])

            elif msg.get("msg_type") == "buy" and "error" in msg:
                await self._handle_buy_error(msg.get("error"))

            if msg.get("proposal_open_contract"):
                await self._handle_contract_update(msg["proposal_open_contract"])

            if msg.get("contract"):
                await self._handle_contract_update(msg["contract"])

            if msg.get("sell"):
                await self._handle_contract_update(msg["sell"])

        except Exception:
            logger.exception("❌ OrderExecutor WS listener failed")

    async def start(self):
        if self._listener_registered:
            return
        await deriv.add_listener(self._ws_listener)
        self._listener_registered = True
        logger.info("✅ OrderExecutor listener registered with Deriv WS")

    # =====================================================
    # BUY HANDLER
    # =====================================================
    async def _handle_buy(self, buy_data: Dict[str, Any]):
        logger.info(f"🛒 BUY response: {buy_data}")

        # BUY ERROR
        if buy_data.get("error"):
            for trade_id, meta in list(self.trades.items()):
                if meta.get("awaiting_contract"):
                    trade = TradeRepo.get(trade_id)
                    if trade:
                        trade.status = "REJECTED"
                        TradeRepo.update(trade)
                    meta["awaiting_contract"] = False
                    
                    # BROADCAST TRADE REJECTION
                    await self._broadcast_trade_update({
                        "trade_id": trade_id,
                        "status": "REJECTED",
                        "error": buy_data['error'],
                        "timestamp": time.time(),
                        "type": "trade_rejected"
                    })
                    
                    logger.error(f"❌ BUY rejected for trade {trade_id}: {buy_data['error']}")
                    return

        proposal_id = buy_data.get("proposal_id")
        contract_id = buy_data.get("contract_id")

        for trade_id, meta in list(self.trades.items()):
            if not meta.get("awaiting_contract"):
                continue

            # Save proposal
            if proposal_id:
                ProposalRepo.save(Proposal(
                    id=str(proposal_id),
                    trade_id=trade_id,
                    price=meta["amount"],
                    payout=buy_data.get("payout"),
                ))

            # BUY SUCCESS
            if contract_id:
                trade = TradeRepo.get(trade_id)
                if trade:
                    trade.status = "ACTIVE"
                    TradeRepo.update(trade)

                position_manager.add_position(
                    trade_id=trade_id,
                    contract_id=str(contract_id),
                    side=meta["side"],  # RISE / FALL
                    entry_price=float(meta["amount"]),
                )

                meta["contract_id"] = str(contract_id)
                meta["awaiting_contract"] = False

                # New contract instance
                contract = Contract(
                    id=str(contract_id),
                    trade_id=trade_id,
                    entry_tick=None,  # Will be updated later
                    exit_tick=None,   # Will be updated later
                    profit=0.0,
                    is_sold=False
                )
                ContractRepo.save(contract)

                logger.info(f"🔗 Trade {trade_id} linked to contract_id {contract_id}")

                # BROADCAST TRADE ACTIVE
                await self._broadcast_trade_update({
                    "trade_id": trade_id,
                    "contract_id": str(contract_id),
                    "direction": meta["side"],
                    "status": "ACTIVE",
                    "amount": meta["amount"],
                    "timestamp": time.time(),
                    "type": "trade_active"
                })

                await deriv.send({
                    "proposal_open_contract": 1,
                    "contract_id": contract_id,
                    "subscribe": 1,
                })
            break

    async def _handle_buy_error(self, error_data: Dict[str, Any]):
        """Handle buy errors specifically"""
        for trade_id, meta in list(self.trades.items()):
            if meta.get("awaiting_contract"):
                trade = TradeRepo.get(trade_id)
                if trade:
                    trade.status = "REJECTED"
                    TradeRepo.update(trade)
                meta["awaiting_contract"] = False
                
                # BROADCAST TRADE REJECTION
                await self._broadcast_trade_update({
                    "trade_id": trade_id,
                    "status": "REJECTED",
                    "error": error_data.get('message', 'Unknown error'),
                    "error_code": error_data.get('code'),
                    "timestamp": time.time(),
                    "type": "trade_rejected"
                })
                
                logger.error(f"❌ BUY error for trade {trade_id}: {error_data}")
                break

    # =====================================================
    # CONTRACT TYPE MAPPING
    # =====================================================
    def _map_to_deriv_contract_type(self, side: str) -> str:
        side = side.upper()
        if side == "RISE":
            return "CALL"
        if side == "FALL":
            return "PUT"
        if side in ("CALL", "PUT"):
            return side
        logger.warning(f"Unknown side '{side}', defaulting to CALL")
        return "CALL"

    def _map_from_deriv_contract_type(self, deriv_side: str) -> str:
        deriv_side = deriv_side.upper()
        if deriv_side == "CALL":
            return "RISE"
        if deriv_side == "PUT":
            return "FALL"
        return deriv_side

    # =====================================================
    # CONTRACT UPDATE HANDLER (FULL & SAFE)
    # =====================================================
    async def _handle_contract_update(self, data: Dict[str, Any]):
        logger.debug(f"📡 Contract update: {data}")

        contract_uuid = data.get("id")
        contract_id = str(data.get("contract_id")) if data.get("contract_id") else None

        if position_manager.is_cleaned(contract_uuid) or position_manager.is_cleaned(contract_id):
            return

        pos = position_manager.get_position(contract_uuid) or position_manager.get_position(contract_id)
        if not pos:
            return

        if contract_uuid and not pos.get("uuid"):
            position_manager.update_contract_uuid(pos["contract_id"], contract_uuid)

        is_sold = (
            data.get("is_sold") in (True, 1, "1")
            or data.get("status") in ("sold", "won", "lost")
            or data.get("is_expired") in (True, 1)
        )
        if not is_sold:
            # Broadcast position update (price changes)
            await self._broadcast_position_update(pos, data)
            return

        stake = float(pos["entry_price"])
        payout = 0.0

        # Extract payout from various possible fields
        for field in ("sell_price", "bid_price", "payout", "buy_price"):
            if data.get(field) is not None:
                payout = float(data[field])
                break

        if payout == 0.0 and data.get("profit") is not None:
            payout = stake + float(data["profit"])

        profit = payout - stake
        result = "WON" if profit > 0 else "LOST"

        trade_id = pos["trade_id"]
        trade = TradeRepo.get(trade_id)

        contract_type = data.get("contract_type", "UNKNOWN")
        direction = self._map_from_deriv_contract_type(contract_type)

        logger.info(
            f"🎯 SETTLED | trade={trade_id} direction={direction} "
            f"result={result} payout={payout:.2f} profit={profit:.2f}"
        )

        if trade:
            trade.status = result
            trade.side = direction
            TradeRepo.update(trade)

        # Get sell_time from Deriv API response or use current time
        sell_time = None
        for time_field in ["sell_time", "settlement_time", "expiry_time", "date_end"]:
            if data.get(time_field):
                try:
                    # Try to parse different time formats from Deriv API
                    if isinstance(data[time_field], (int, float)):
                        # Unix timestamp
                        sell_time = datetime.fromtimestamp(data[time_field])
                    elif isinstance(data[time_field], str):
                        # ISO string
                        sell_time = datetime.fromisoformat(data[time_field].replace('Z', '+00:00'))
                    else:
                        sell_time = datetime.utcnow()
                    break
                except (ValueError, TypeError):
                    continue
        
        if not sell_time:
            sell_time = datetime.utcnow()  # Fallback to current time

        contract = ContractRepo.find(pos["contract_id"])
        if contract:
            # Extract entry price - try multiple possible fields, ensure float
            entry_price = None
            for entry_field in ["entry_tick", "entry_spot", "entry_spot_time", "current_spot", "spot"]:
                val = data.get(entry_field)
                if val is not None:
                    try:
                        entry_price = float(val)
                        break
                    except (ValueError, TypeError):
                        continue  # Skip invalid values

            if entry_price is None:
                entry_price = stake  # stake is already a float

            # Extract exit price - try multiple possible fields, ensure float
            exit_price = None
            for exit_field in ["exit_tick", "current_spot", "sell_spot", "spot"]:
                val = data.get(exit_field)
                if val is not None:
                    try:
                        exit_price = float(val)
                        break
                    except (ValueError, TypeError):
                        continue

            if exit_price is None:
                exit_price = payout if payout > 0 else stake  # Default to payout or stake as float

            # Update contract with float values (or None if still invalid)
            if contract:
                if entry_price is not None:
                    contract.entry_tick = entry_price
                if exit_price is not None:
                    contract.exit_tick = exit_price
                contract.profit = profit
                contract.is_sold = True if result in ["WON", "LOST"] else False  # This is always True when contract is sold
                contract.sell_time = sell_time  # Now defined!
                
                # New: Save audit_details for tick history
                if data.get("audit_details"):
                    contract.audit_details = json.dumps(data["audit_details"])
                
                ContractRepo.update(contract)

                logger.info(f"📊 Contract {contract.id} - Entry: {entry_price}, Exit: {exit_price}, Profit: {profit}")

        if trade:
            # Pass ACTUAL profit to risk manager, not the stake amount
            actual_profit = profit  # This is already calculated as payout - stake
            self.risk.update_trade_outcome(result, trade.amount, actual_profit)

            await performance.add_trade({
                "id": trade_id,
                "symbol": trade.symbol,
                "side": direction,
                "amount": trade.amount,
                "profit": profit,
                "result": result,
                "closed_at": sell_time,  # Use the same sell_time
                "consensus_data": self.trades.get(trade_id, {}).get("consensus_data", {}),
            })

        meta = self.trades.get(trade_id, {})
        try:
            consensus_data = meta.get("consensus_data", {})
            price_for_ml = consensus_data.get("price_at_signal", data.get("entry_spot", 0))

            normalized_signals = []
            for sig in consensus_data.get("signals", []):
                sig_side = sig.get("side", "").upper()
                if sig_side in ("CALL", "BUY"):
                    sig_side = "RISE"
                elif sig_side in ("PUT", "SELL"):
                    sig_side = "FALL"

                normalized_signals.append({
                    "side": sig_side,
                    "score": float(sig.get("score", 0)),
                    "meta": sig.get("meta", {}),
                })

            self.consensus.add_training_sample(
                normalized_signals,
                result,
                price_for_ml,
                direction,
                consensus_data.get("session_open"),
            )
        except Exception as e:
            logger.error(f"ML training failed: {e}")

        position_manager.mark_closed(contract_uuid or contract_id, result, payout)

        # BROADCAST TRADE CLOSURE
        await self._broadcast_trade_closed(trade_id, pos, direction, result, profit, payout, stake)

    async def _broadcast_position_update(self, position: Dict, data: Dict):
        """Broadcast position updates (price changes)"""
        try:
            current_price = None
            for price_field in ["current_spot", "spot", "bid_price", "ask_price"]:
                if data.get(price_field) is not None:
                    current_price = float(data[price_field])
                    break
            
            if current_price is not None:
                await broadcast_trade_update({
                    "trade_id": position["trade_id"],
                    "contract_id": position.get("contract_id"),
                    "direction": position.get("side"),
                    "status": "ACTIVE",
                    "current_price": current_price,
                    "timestamp": time.time(),
                    "type": "position_update"
                })
        except Exception as e:
            logger.error(f"Failed to broadcast position update: {e}")

    async def _broadcast_trade_closed(self, trade_id: str, position: Dict, direction: str, 
                                     result: str, profit: float, payout: float, stake: float):
        """Broadcast trade closure with all related updates"""
        try:
            # Get current balance
            current_balance = await deriv.get_balance()
            
            # Broadcast trade closure
            await self._broadcast_trade_update({
                "trade_id": trade_id,
                "contract_id": position.get("contract_id"),
                "direction": direction,
                "status": result,
                "profit": profit,
                "payout": payout,
                "stake": stake,
                "timestamp": time.time(),
                "type": "trade_closed"
            })
            
            # Broadcast performance update
            try:
                perf_data = await performance.calculate_metrics()
                await broadcast_performance_update(perf_data)
            except Exception as e:
                logger.error(f"Failed to calculate/broadcast performance: {e}")
            
            # Broadcast balance update
            await broadcast_balance_update(current_balance)
            
            logger.debug(f"📡 Trade {trade_id} closure broadcasted via WebSocket")
            
        except Exception as e:
            logger.error(f"Failed to broadcast trade closure: {e}")

    async def _broadcast_trade_update(self, data: Dict[str, Any]):
        """Helper to broadcast trade updates"""
        try:
            await broadcast_trade_update(data)
        except Exception as e:
            logger.error(f"Failed to broadcast trade update: {e}")

    # =====================================================
    # PLACE TRADE
    # =====================================================
    async def place_trade(
        self,
        side: str,
        amount: float,
        symbol: str,
        duration: int = settings.CONTRACT_DURATION,
        duration_unit: str = "t",
    ):
        trade_id = str(uuid.uuid4())

        side = side.upper()
        deriv_type = self._map_to_deriv_contract_type(side)
        user_side = self._map_from_deriv_contract_type(deriv_type)

        # Create trade in database
        TradeRepo.create(Trade(
            id=trade_id,
            symbol=symbol,
            side=user_side,
            amount=amount,
            duration=duration,
            status="PENDING",
        ))

        # BROADCAST TRADE PLACEMENT
        await self._broadcast_trade_update({
            "trade_id": trade_id,
            "direction": user_side,
            "amount": amount,
            "symbol": symbol,
            "status": "PENDING",
            "timestamp": time.time(),
            "type": "trade_placed"
        })

        # Send buy request to Deriv
        await deriv.send({
            "buy": 1,
            "price": f"{amount:.2f}",
            "parameters": {
                "amount": amount,
                "basis": "stake",
                "contract_type": deriv_type,
                "currency": settings.BASE_CURRENCY,
                "duration": duration,
                "duration_unit": duration_unit,
                "symbol": symbol,
            },
        })

        self.trades[trade_id] = {
            "side": user_side,
            "deriv_side": deriv_type,
            "amount": amount,
            "awaiting_contract": True,
            "consensus_data": {},
        }

        logger.info(f"🚀 Placed {user_side} trade {trade_id} ({deriv_type}) ${amount}")
        return trade_id

    # =====================================================
    # HELPERS
    # =====================================================
    async def place_rise_fall_trade(self, direction: str, **kwargs):
        if direction.upper() not in ("RISE", "FALL"):
            raise ValueError("Direction must be RISE or FALL")
        return await self.place_trade(side=direction.upper(), **kwargs)

    def get_trade_direction(self, trade_id: str) -> str:
        return self.trades.get(trade_id, {}).get("side", "UNKNOWN")

    def get_active_trades(self) -> Dict[str, Dict]:
        """Get all active trades"""
        return {k: v for k, v in self.trades.items() if v.get("awaiting_contract") or v.get("contract_id")}

    async def broadcast_performance_metrics(self):
        """Broadcast current performance metrics"""
        try:
            perf_data = await performance.calculate_metrics()
            await broadcast_performance_update(perf_data)
            logger.debug("📊 Performance metrics broadcasted via WebSocket")
        except Exception as e:
            logger.error(f"Failed to broadcast performance metrics: {e}")


# =====================================================
# SINGLETON
# =====================================================
order_executor = OrderExecutor()