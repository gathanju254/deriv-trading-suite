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

    # -------------------------------------------------------
    # WS LISTENER
    # -------------------------------------------------------
    async def _ws_listener(self, msg):
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

    # -------------------------------------------------------
    # BUY HANDLER
    # -------------------------------------------------------
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
                    side=meta["side"],
                    entry_price=float(meta["amount"]),
                )

                meta["contract_id"] = str(contract_id)
                meta["awaiting_contract"] = False

                logger.info(f"🔗 Trade {trade_id} linked to contract_id {contract_id}")

                # Subscribe to contract updates
                await deriv.send({
                    "proposal_open_contract": 1,
                    "contract_id": contract_id,
                    "subscribe": 1,
                })

            break

    # -------------------------------------------------------
    # CONTRACT UPDATE HANDLER (UUID + ID SAFE)
    # -------------------------------------------------------
    async def _handle_contract_update(self, data: Dict[str, Any]):
        logger.debug(f"📡 Contract update: {data}")

        contract_uuid = data.get("id")               # UUID (string)
        contract_id_int = str(data.get("contract_id")) if data.get("contract_id") else None

        # Skip already-cleaned contracts
        if (contract_uuid and position_manager.is_cleaned(contract_uuid)) or \
           (contract_id_int and position_manager.is_cleaned(contract_id_int)):
            logger.debug("🧹 Contract already cleaned, skipping update")
            return

        # Resolve position
        pos = None
        if contract_uuid:
            pos = position_manager.get_position(contract_uuid)
        if not pos and contract_id_int:
            pos = position_manager.get_position(contract_id_int)

        if not pos:
            logger.warning(f"⚠️ Update for unknown contract {contract_uuid or contract_id_int}")
            return

        # Backfill UUID if missing
        if contract_uuid and not pos.get("uuid"):
            position_manager.update_contract_uuid(pos["contract_id"], contract_uuid)

        # Settlement detection
        is_sold = (
            data.get("is_sold") in (True, 1, "1") or
            data.get("status") in {"sold", "won", "lost"} or
            data.get("is_expired") in (True, 1)
        )

        if not is_sold:
            return

        # Extract payout
        payout = 0.0
        for field in ("sell_price", "bid_price", "payout", "buy_price"):
            if data.get(field) is not None:
                try:
                    payout = float(data[field])
                    break
                except Exception:
                    pass

        profit = float(data.get("profit", payout - pos["entry_price"]))
        result = "WON" if profit > 0 else "LOST"

        trade_id = pos["trade_id"]
        trade = TradeRepo.get(trade_id)

        logger.info(
            f"🎯 CONTRACT SETTLED | trade={trade_id} result={result} payout={payout}"
        )

        # Update DB trade
        if trade:
            trade.status = result
            TradeRepo.update(trade)

        # Update Contract DB
        contract = ContractRepo.find(pos["contract_id"])
        if contract:
            contract.exit_tick = data.get("exit_tick")
            contract.profit = payout
            contract.is_sold = "1"
            contract.sell_time = datetime.utcnow()
            ContractRepo.update(contract)

        # Risk + performance
        if trade:
            self.risk.update_trade_outcome(result, trade.amount)

            performance.add_trade({
                "id": trade_id,
                "symbol": trade.symbol,
                "side": trade.side,
                "amount": trade.amount,
                "profit": payout - trade.amount,
                "result": result,
                "closed_at": datetime.utcnow(),
                "consensus_data": self.trades.get(trade_id, {}).get("consensus_data", {}),
            })

        # ML training hook (unchanged logic)
        if trade_id in self.trades:
            consensus_data = self.trades[trade_id].get("consensus_data", {})
            try:
                self.consensus.add_training_sample(
                    consensus_data.get("signals", []),
                    result,
                    data.get("entry_tick") or 0,
                    consensus_data.get("side", "UNKNOWN"),
                    consensus_data.get("session_open"),
                )
            except Exception:
                logger.exception("ML training sample failed")

        position_manager.mark_closed(
            contract_uuid or contract_id_int,
            result,
            payout,
        )

        logger.info(f"[CLOSED] Trade {trade_id} → {result} | Profit {payout - trade.amount:.2f}")

    # -------------------------------------------------------
    # PLACE TRADE
    # -------------------------------------------------------
    async def place_trade(
        self,
        side: str,
        amount: float,
        symbol: str,
        duration: int = settings.CONTRACT_DURATION,
        duration_unit: str = "t",
    ):
        trade_id = str(uuid.uuid4())

        TradeRepo.create(Trade(
            id=trade_id,
            symbol=symbol,
            side=side.upper(),
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
                "contract_type": side.upper(),
                "currency": settings.BASE_CURRENCY,
                "duration": duration,
                "duration_unit": duration_unit,
                "symbol": symbol,
            },
        })

        self.trades[trade_id] = {
            "side": side.upper(),
            "amount": amount,
            "awaiting_contract": True,
            "consensus_data": {},
        }

        logger.info(f"🚀 Placed trade {trade_id}: {side.upper()} {amount}")
        return trade_id


# -------------------------------------------------------
# SINGLETON
# -------------------------------------------------------
order_executor = OrderExecutor()
