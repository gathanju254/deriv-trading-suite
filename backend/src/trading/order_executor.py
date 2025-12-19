import uuid
import asyncio
from datetime import datetime
from typing import Dict, Any
import json

from src.core.deriv_api import deriv
from src.trading.position_manager import position_manager
from src.utils.logger import logger

# Database models and repositories
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

        # listener state
        self._listener_registered = False
        self._listener = self._ws_listener  # keep a reference to avoid re-wrapping

        # DO NOT attach listener at import-time anymore
        # asyncio.get_event_loop().create_task(self._attach_ws_listener())

    # -------------------------------------------------------
    # REGISTER AS DERIV WS LISTENER
    # -------------------------------------------------------
    async def _attach_ws_listener(self):
        """Attach unified message handler to Deriv WS."""
        async def listener(msg):
            try:
                # DEBUG: Log ALL messages to see what Deriv sends
                if "tick" not in msg:  # Don't log tick messages (too noisy)
                    logger.debug(f"📨 Deriv message: {json.dumps(msg)[:500]}")
                
                # Check for contract settlement
                if "proposal_open_contract" in msg:
                    contract_data = msg["proposal_open_contract"]
                    logger.info(f"📊 Contract update: ID={contract_data.get('id')}, is_sold={contract_data.get('is_sold')}, status={contract_data.get('status')}")
                    if contract_data.get("is_sold") or contract_data.get("status") == "sold":
                        logger.info(f"🎯 CONTRACT SETTLED: {contract_data}")
                        
                elif "sell" in msg:
                    logger.info(f"💰 Sell response: {msg['sell']}")
                
                # Process messages
                if "buy" in msg:
                    await self._handle_buy(msg["buy"])
                elif msg.get("msg_type") == "buy" and "error" in msg:
                    await self._handle_buy({"error": msg.get("error"), "echo_req": msg.get("echo_req")})

                if msg.get("proposal_open_contract"):
                    await self._handle_contract_update(msg["proposal_open_contract"])

                if msg.get("contract"):
                    await self._handle_contract_update(msg["contract"])

                if msg.get("sell"):
                    await self._handle_contract_update(msg["sell"])
            except Exception:
                logger.exception("OrderExecutor WS listener failed")

        await deriv.add_listener(listener)
        logger.info("OrderExecutor listener registered with Deriv WS.")

    # -------------------------------------------------------
    # HANDLE BUY RESPONSE
    # -------------------------------------------------------
    async def _handle_buy(self, buy_data):
        logger.info("BUY response: %s", buy_data)

        # If this payload is an error (msg_type == 'buy' error), mark the awaiting trade as REJECTED
        if buy_data and isinstance(buy_data, dict) and buy_data.get("error"):
            err = buy_data.get("error")
            # find first trade awaiting contract and mark rejected
            for trade_id, meta in list(self.trades.items()):
                if meta.get("awaiting_contract"):
                    trade = TradeRepo.get(trade_id)
                    if trade:
                        trade.status = "REJECTED"
                        TradeRepo.update(trade)
                    meta["awaiting_contract"] = False
                    meta["error"] = err
                    logger.error(f"Immediate BUY error for trade {trade_id} via WS error: {err}")
                    return

        proposal_id = buy_data.get("proposal_id")
        contract_id = buy_data.get("contract_id")

        # Match to first awaiting trade
        for trade_id, meta in list(self.trades.items()):
            if not meta.get("awaiting_contract"):
                continue

            # Save proposal
            if proposal_id:
                ProposalRepo.save(Proposal(
                    id=str(proposal_id),
                    trade_id=trade_id,
                    price=meta["amount"],
                    payout=buy_data.get("payout")
                ))

            # If BUY attaches contract immediately
            if contract_id:
                trade = TradeRepo.get(trade_id)
                if trade:
                    trade.status = "ACTIVE"
                    TradeRepo.update(trade)

                # Store both contract_id (int) and contract_uuid (to be filled later)
                position_manager.add_position(
                    trade_id=trade_id,
                    contract_id=str(contract_id),
                    side=meta["side"],
                    entry_price=float(meta["amount"])
                )
                meta["contract_id"] = str(contract_id)
                meta["awaiting_contract"] = False

                logger.info(f"BUY linked contract {contract_id} → trade {trade_id}")

                # Subscribe to contract updates for this contract
                await deriv.send({
                    "proposal_open_contract": 1,
                    "contract_id": contract_id,
                    "subscribe": 1
                })

            break

    # -------------------------------------------------------
    # HANDLE CONTRACT UPDATES
    # -------------------------------------------------------

    async def _handle_contract_update(self, data):
        logger.debug(f"Received contract update: {data}")

        # Extract contract ID from multiple possible fields
        contract_id = str(data.get("id") or data.get("contract_id"))
        if not contract_id:
            logger.warning(f"No contract ID in update: {data}")
            return

        # If position_manager provides an 'is_cleaned' helper, skip duplicates
        is_cleaned_fn = getattr(position_manager, "is_cleaned", None)
        if callable(is_cleaned_fn):
            try:
                if position_manager.is_cleaned(contract_id):
                    logger.debug(f"Contract {contract_id} already cleaned, skipping")
                    return
            except Exception:
                logger.exception("position_manager.is_cleaned check failed")

        # Try to find position by UUID or integer contract_id
        pos = position_manager.active_positions.get(contract_id)
        if not pos:
            # Try to match by integer contract_id (from buy response)
            for key, value in position_manager.active_positions.items():
                if value.get("contract_id") == str(data.get("contract_id")):
                    pos = value
                    contract_id = key
                    break
            # Try to match by trade_id if available
            if not pos and "trade_id" in data:
                for key, value in position_manager.active_positions.items():
                    if value.get("trade_id") == data["trade_id"]:
                        pos = value
                        contract_id = key
                        break

        logger.info(f"📋 Contract update for {contract_id}: is_sold={data.get('is_sold')}, status={data.get('status')}")

        # More robust settlement detection
        is_sold = False
        payout = 0.0
        
        # Check various settlement indicators
        if data.get("is_sold") == 1 or data.get("is_sold") is True:
            is_sold = True
        elif data.get("is_sold") == "1":
            is_sold = True
        elif data.get("status") == "sold":
            is_sold = True
        # IMPORTANT: Check for expired contracts (not just sold)
        elif data.get("is_expired") == 1 or data.get("is_expired") is True:
            is_sold = True
            logger.info(f"🎯 CONTRACT EXPIRED: {contract_id}")
        elif data.get("status") == "won" or data.get("status") == "lost":
            is_sold = True
        elif data.get("current_spot") and data.get("entry_tick") and data.get("date_expiry"):
            # Contract expired, check expiry time
            try:
                expiry_time = datetime.fromtimestamp(int(data.get("date_expiry")))
                if datetime.utcnow() >= expiry_time:
                    is_sold = True
                    logger.info(f"🎯 CONTRACT EXPIRED (time check): {contract_id}")
            except Exception:
                pass

        if is_sold:
            # Get payout from various possible fields - PRIORITIZE ACTUAL RECEIVED PAYOUT
            payout_fields = ["sell_price", "bid_price", "payout", "buy_price"]  # Moved sell_price/bid_price first
            payout = 0.0
            for field in payout_fields:
                if field in data and data[field] is not None:
                    try:
                        val = float(data[field])
                        payout = val
                        break
                    except (ValueError, TypeError):
                        continue
        
            # Determine result based on profit - USE DIRECTLY WHEN AVAILABLE
            profit = data.get("profit", 0)
            try:
                profit = float(profit)
            except (ValueError, TypeError):
                profit = 0
            
            # For expired contracts without profit field, assume LOSS
            if "profit" not in data and data.get("is_expired"):
                profit = -trade.amount if trade else 0
                payout = 0.0
                result = "LOST"
            else:
                result = "WON" if profit > 0 else "LOST"
            
            logger.info(f"🎯 Contract {contract_id} SETTLED: result={result}, payout={payout}, profit={profit}")

            # Update contract DB record
            contract = ContractRepo.find(contract_id)
            if contract:
                contract.exit_tick = data.get("exit_tick")
                contract.profit = payout
                contract.is_sold = "1"
                contract.sell_time = datetime.utcnow()
                ContractRepo.update(contract)

            pos = position_manager.active_positions.get(contract_id)
            if not pos:
                for tid, meta in self.trades.items():
                    if meta.get("contract_id") == contract_id:
                        pos = {"trade_id": tid}
                        break

            if pos:
                trade_id = pos["trade_id"]
                trade = TradeRepo.get(trade_id)

                if trade:
                    trade.status = result
                    TradeRepo.update(trade)

                    profit = payout - trade.amount

                    consensus_data = self.trades.get(trade_id, {}).get("consensus_data", {})
                    logger.info(f"Trade closure: trade_id={trade_id}, result={result}, profit={profit}, consensus_data={consensus_data}")

                    # Update risk manager and performance (KEEP ONLY THIS CALL)
                    order_executor.risk.update_trade_outcome(result, trade.amount)
                    profit = payout - trade.amount if payout is not None else -trade.amount
                    performance.add_trade({
                        "id": trade_id,
                        "symbol": trade.symbol,
                        "side": trade.side,
                        "amount": trade.amount,
                        "profit": profit,
                        "result": result,
                        "closed_at": datetime.utcnow(),
                        "consensus_data": consensus_data
                    })

                    if trade_id in self.trades:
                        consensus_data = self.trades[trade_id].get("consensus_data", {})
                        signals = consensus_data.get("signals", [])
                        logger.info(f"ML training: trade_id={trade_id}, signals={signals}, result={result}, entry_tick={data.get('entry_tick')}")
                        try:
                            # Updated: Pass traded_side and session_open to match new signature
                            self.consensus.add_training_sample(
                                signals,
                                result,
                                data.get("entry_tick") or 0,
                                consensus_data.get("side", "UNKNOWN"),  # traded_side from consensus
                                consensus_data.get("session_open")      # session_open from bot
                            )
                        except Exception:
                            logger.exception("ML training sample failed")

                    logger.info(f"[CLOSED] Trade {trade_id} → {result} | Profit: {profit:.2f}")

                position_manager.mark_closed(contract_id, result, payout)
            else:
                logger.warning(f"No position found for sold contract {contract_id}")

            # --- FORCE RECOVERY TRADE IMMEDIATELY AFTER LOSS ---
            # REMOVE or COMMENT OUT this block to delay recovery until next signal
            # if result == "LOST" and self.risk.recovery_enabled and self.risk.recovery_streak > 0:
            #     recovery_amount = self.risk.get_next_trade_amount()
            #     recovery_side = trade.side if trade else None
            #     recovery_symbol = trade.symbol if trade else settings.SYMBOL
            #     if recovery_side and self.risk.recovery_streak <= self.risk.max_recovery_streak:
            #         logger.info(f"🚨 FORCING RECOVERY TRADE: side={recovery_side}, amount={recovery_amount}, streak={self.risk.recovery_streak}")
            #         await self.place_trade(
            #             side=recovery_side,
            #             amount=recovery_amount,
            #             symbol=recovery_symbol
            #         )

    # -------------------------------------------------------
    # PLACE TRADE
    # -------------------------------------------------------
    async def place_trade(
        self,
        side: str,
        amount: float,
        symbol: str,
        duration: int = settings.CONTRACT_DURATION,  # <-- use settings
        duration_unit: str = "t"
    ):
        trade_id = str(uuid.uuid4())

        # DB create
        trade = Trade(
            id=trade_id,
            symbol=symbol,
            side=side.upper(),
            amount=amount,
            duration=duration,
            status="PENDING"
        )
        TradeRepo.create(trade)

        # Submit BUY request and wait for immediate buy response (best-effort)
        buy_resp = await deriv.buy(
            symbol=symbol,
            amount=amount,
            contract_type=side.upper(),
            duration=duration,
            duration_unit=duration_unit
        )

        # Log buy response for debugging (helps correlate proposal_id/contract_id)
        if buy_resp:
            logger.info(f"BUY response received for trade {trade_id}: {json.dumps(buy_resp)}")
        else:
            logger.debug(f"No immediate BUY response for trade {trade_id} (will rely on WS updates)")

        # If the buy response contains an immediate error, mark trade as rejected and update DB
        if buy_resp and isinstance(buy_resp, dict) and buy_resp.get("error"):
            err = buy_resp.get("error")
            logger.error(f"Immediate BUY error for trade {trade_id}: {err}")
            # Update DB trade status to REJECTED (or FAILED)
            trade.status = "REJECTED"
            TradeRepo.update(trade)
            # update internal record to avoid awaiting contract
            self.trades[trade_id] = {
                "side": side.upper(),
                "amount": amount,
                "awaiting_contract": False,
                "consensus_data": {},
                "error": err
            }
            return trade_id

        # internal trade record
        self.trades[trade_id] = {
            "side": side.upper(),
            "amount": amount,
            "awaiting_contract": True,
            "consensus_data": {}  # always exists
        }

        logger.info(f"Placed trade {trade_id}: {side.upper()} {amount}")
        return trade_id

    async def _ws_listener(self, msg):
        try:
            # DEBUG: Log ALL messages to see what Deriv sends
            if "tick" not in msg:  # Don't log tick messages (too noisy)
                logger.debug(f"📨 Deriv message: {json.dumps(msg)[:500]}")
            
            # Check for contract settlement
            if "proposal_open_contract" in msg:
                contract_data = msg["proposal_open_contract"]
                logger.info(f"📊 Contract update: ID={contract_data.get('id')}, is_sold={contract_data.get('is_sold')}, status={contract_data.get('status')}")
                if contract_data.get("is_sold") or contract_data.get("status") == "sold":
                    logger.info(f"🎯 CONTRACT SETTLED: {contract_data}")
                    
            elif "sell" in msg:
                logger.info(f"💰 Sell response: {msg['sell']}")
            
            # Process messages
            if "buy" in msg:
                await self._handle_buy(msg["buy"])
            elif msg.get("msg_type") == "buy" and "error" in msg:
                await self._handle_buy({"error": msg.get("error"), "echo_req": msg.get("echo_req")})

            if msg.get("proposal_open_contract"):
                await self._handle_contract_update(msg["proposal_open_contract"])

            if msg.get("contract"):
                await self._handle_contract_update(msg["contract"])

            if msg.get("sell"):
                await self._handle_contract_update(msg["sell"])
        except Exception:
            logger.exception("OrderExecutor WS listener failed")

    async def start(self):
        """Register the order executor listener with the Deriv client (idempotent)."""
        if self._listener_registered:
            return
        try:
            await deriv.add_listener(self._listener)
            self._listener_registered = True
            logger.info("OrderExecutor listener registered with Deriv WS.")
        except Exception:
            logger.exception("Failed to register OrderExecutor listener")

# -------------------------------------------------------
# SINGLETON INSTANCE (export for imports)
# -------------------------------------------------------
order_executor = OrderExecutor()
