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

        # Attach WS listener once event loop exists
        asyncio.get_event_loop().create_task(self._attach_ws_listener())

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

        contract_id = str(data.get("id") or data.get("contract_id"))
        if not contract_id:
            return

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
        elif data.get("status") == "won" or data.get("status") == "lost":
            is_sold = True
        elif data.get("current_spot") and data.get("entry_tick"):
            # Contract expired, check expiry time
            if data.get("date_expiry"):
                expiry_time = datetime.fromtimestamp(int(data.get("date_expiry")))
                if datetime.utcnow() > expiry_time:
                    is_sold = True
                    current = float(data.get("current_spot", 0))
                    entry = float(data.get("entry_tick", 0))
                    payout = 1.95 if (current > entry and data.get("contract_type") == "CALL") or (current < entry and data.get("contract_type") == "PUT") else 0

        if is_sold:
            # Get payout from various possible fields
            payout_fields = ["sell_price", "payout", "buy_price", "bid_price", "profit"]
            for field in payout_fields:
                if field in data and data[field] is not None:
                    try:
                        payout = float(data[field])
                        break
                    except (ValueError, TypeError):
                        continue
            
            # If no payout found but we know it's sold, use default
            if payout == 0 and "profit" in data and data["profit"] is not None:
                try:
                    payout = max(0, float(data["profit"]))
                except (ValueError, TypeError):
                    pass

            result = "WON" if payout > 0 else "LOST"
            
            logger.info(f"🎯 Contract {contract_id} SETTLED: result={result}, payout={payout}")

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

                    self.risk.update_trade_outcome(result, trade.amount)

                    if trade_id in self.trades:
                        consensus_data = self.trades[trade_id].get("consensus_data", {})
                        signals = consensus_data.get("signals", [])
                        logger.info(f"ML training: trade_id={trade_id}, signals={signals}, result={result}, entry_tick={data.get('entry_tick')}")
                        try:
                            self.consensus.add_training_sample(
                                signals,
                                result,
                                data.get("entry_tick") or 0
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

        # Submit BUY request
        await deriv.buy(
            symbol=symbol,
            amount=amount,
            contract_type=side.upper(),
            duration=duration,
            duration_unit=duration_unit
        )

        # internal trade record
        self.trades[trade_id] = {
            "side": side.upper(),
            "amount": amount,
            "awaiting_contract": True,
            "consensus_data": {}  # always exists
        }

        logger.info(f"Placed trade {trade_id}: {side.upper()} {amount}")
        return trade_id


# Singleton instance
order_executor = OrderExecutor()
