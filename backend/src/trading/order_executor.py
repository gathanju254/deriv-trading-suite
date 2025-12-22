# backend/src/trading/order_executor.py
import uuid
import asyncio
import json
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
                await self._handle_buy({"error": msg.get("error")})

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

                logger.info(f"🔗 Trade {trade_id} linked to contract_id {contract_id}")

                await deriv.send({
                    "proposal_open_contract": 1,
                    "contract_id": contract_id,
                    "subscribe": 1,
                })
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

        contract = ContractRepo.find(pos["contract_id"])
        if contract:
            # Extract entry price - try multiple possible fields
            entry_price = None
            for entry_field in ["entry_tick", "entry_spot", "entry_spot_time", "current_spot", "spot"]:
                if data.get(entry_field) is not None:
                    entry_price = data.get(entry_field)
                    break
            
            # If no entry price found in data, use the stake/amount
            if entry_price is None:
                entry_price = str(stake)
            
            # Extract exit price - try multiple possible fields
            exit_price = None
            for exit_field in ["exit_tick", "current_spot", "sell_spot", "spot"]:
                if data.get(exit_field) is not None:
                    exit_price = data.get(exit_field)
                    break
            
            # If no exit price found, use the payout
            if exit_price is None:
                exit_price = str(payout) if payout > 0 else "N/A"
            
            # If both are None/empty, use default placeholders
            if not entry_price or entry_price == "":
                entry_price = str(stake)
            if not exit_price or exit_price == "":
                exit_price = str(payout) if payout > 0 else "N/A"
            
            # Clean up the values - remove any "—" characters
            entry_price = str(entry_price).strip().replace("—", "").replace("-", "")
            exit_price = str(exit_price).strip().replace("—", "").replace("-", "")
            
            # If still empty after cleaning, set to stake/payout
            if not entry_price or entry_price == "":
                entry_price = str(stake)
            if not exit_price or exit_price == "":
                exit_price = str(payout) if payout > 0 else str(stake)

            contract.entry_tick = entry_price
            contract.exit_tick = exit_price
            contract.profit = profit
            contract.is_sold = "1"
            contract.sell_time = datetime.utcnow()
            ContractRepo.update(contract)

            logger.info(f"📊 Contract {contract.id} - Entry: {entry_price}, Exit: {exit_price}, Profit: {profit}")

        if trade:
            self.risk.update_trade_outcome(result, trade.amount)

            performance.add_trade({
                "id": trade_id,
                "symbol": trade.symbol,
                "side": direction,
                "amount": trade.amount,
                "profit": profit,
                "result": result,
                "closed_at": datetime.utcnow(),
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

        TradeRepo.create(Trade(
            id=trade_id,
            symbol=symbol,
            side=user_side,
            amount=amount,
            duration=duration,
            status="PENDING",
        ))

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


# =====================================================
# SINGLETON
# =====================================================
order_executor = OrderExecutor()
