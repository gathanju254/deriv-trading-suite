# backend/src/db/repositories/trade_history_repo.py
import json
import logging
from typing import List, Dict, Optional
from datetime import datetime

from sqlalchemy import desc, func
from sqlalchemy.orm import joinedload

from src.db.session import SessionLocal
from src.db.models.trade import Trade
from src.db.models.contract import Contract
from src.db.models.proposal import Proposal

logger = logging.getLogger(__name__)


class TradeHistoryRepo:

    # ==========================================================
    #                    CORE QUERIES
    # ==========================================================

    @staticmethod
    def get_all_trades(limit: int = 100, offset: int = 0) -> List[Dict]:
        """Get all trades with related contract and proposal data"""
        db = SessionLocal()
        try:
            trades = (
                db.query(Trade)
                .options(
                    joinedload(Trade.contract),
                    joinedload(Trade.proposal)
                )
                .order_by(desc(Trade.created_at))
                .offset(offset)
                .limit(limit)
                .all()
            )

            result = []

            for trade in trades:
                trade_data = {
                    "id": trade.id,
                    "symbol": trade.symbol,
                    "side": trade.side,
                    "duration": trade.duration,
                    "stake_amount": trade.stake_amount,
                    "status": trade.status,
                    "created_at": trade.created_at.isoformat() if trade.created_at else None,
                    "settled_at": trade.settled_at.isoformat() if trade.settled_at else None,
                }

                # ---------------- CONTRACT ----------------
                if trade.contract:
                    trade_data["contract"] = {
                        "id": trade.contract.id,
                        "entry_tick": trade.contract.entry_tick,
                        "exit_tick": trade.contract.exit_tick,
                        "gross_profit": trade.contract.gross_profit,
                        "markup_profit": trade.contract.markup_profit,
                        "net_profit": trade.contract.net_profit,
                        "is_sold": trade.contract.is_sold,
                        "sell_time": trade.contract.sell_time.isoformat()
                        if trade.contract.sell_time else None,
                    }
                else:
                    trade_data["contract"] = None

                # ---------------- PROPOSAL ----------------
                if trade.proposal:
                    trade_data["proposal"] = {
                        "id": trade.proposal.id,
                        "price": trade.proposal.price,
                        "payout": trade.proposal.payout,
                    }
                else:
                    trade_data["proposal"] = None

                result.append(trade_data)

            return result
        finally:
            db.close()

    # Backward compatibility
    @staticmethod
    def get_trades(limit: int = 100, offset: int = 0):
        """Alias for get_all_trades"""
        return TradeHistoryRepo.get_all_trades(limit=limit, offset=offset)

    # ==========================================================
    #                  SINGLE TRADE
    # ==========================================================

    @staticmethod
    def get_trade_by_id(trade_id: str) -> Optional[Dict]:
        db = SessionLocal()
        try:
            trade = (
                db.query(Trade)
                .options(
                    joinedload(Trade.contract),
                    joinedload(Trade.proposal)
                )
                .filter(Trade.id == trade_id)
                .first()
            )

            if not trade:
                return None

            return {
                "id": trade.id,
                "symbol": trade.symbol,
                "side": trade.side,
                "duration": trade.duration,
                "stake_amount": trade.stake_amount,
                "status": trade.status,
                "created_at": trade.created_at.isoformat() if trade.created_at else None,
                "contract": {
                    "id": trade.contract.id,
                    "entry_tick": trade.contract.entry_tick,
                    "exit_tick": trade.contract.exit_tick,
                    "gross_profit": trade.contract.gross_profit,
                    "markup_profit": trade.contract.markup_profit,
                    "net_profit": trade.contract.net_profit,
                    "is_sold": trade.contract.is_sold,
                    "sell_time": trade.contract.sell_time.isoformat()
                    if trade.contract.sell_time else None,
                } if trade.contract else None,
                "proposal": {
                    "id": trade.proposal.id,
                    "price": trade.proposal.price,
                    "payout": trade.proposal.payout,
                } if trade.proposal else None,
            }
        finally:
            db.close()

    # ==========================================================
    #                 FILTERS & REPORTS
    # ==========================================================

    @staticmethod
    def get_trades_by_status(status: str, limit: int = 100) -> List[Dict]:
        db = SessionLocal()
        try:
            trades = (
                db.query(Trade)
                .filter(Trade.status == status)
                .order_by(desc(Trade.created_at))
                .limit(limit)
                .all()
            )

            return [
                {
                    "id": t.id,
                    "symbol": t.symbol,
                    "side": t.side,
                    "stake_amount": t.stake_amount,
                    "status": t.status,
                    "created_at": t.created_at.isoformat() if t.created_at else None,
                }
                for t in trades
            ]
        finally:
            db.close()

    @staticmethod
    def get_recent_trades(limit: int = 10) -> List[Dict]:
        return TradeHistoryRepo.get_all_trades(limit=limit)

    @staticmethod
    def get_trades_by_date_range(start_date: str, end_date: str) -> List[Dict]:
        db = SessionLocal()
        try:
            start = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
            end = datetime.fromisoformat(end_date.replace("Z", "+00:00"))

            trades = (
                db.query(Trade)
                .filter(
                    Trade.created_at >= start,
                    Trade.created_at <= end,
                )
                .order_by(desc(Trade.created_at))
                .all()
            )

            return [
                {
                    "id": t.id,
                    "symbol": t.symbol,
                    "side": t.side,
                    "stake_amount": t.stake_amount,
                    "status": t.status,
                    "created_at": t.created_at.isoformat() if t.created_at else None,
                }
                for t in trades
            ]
        finally:
            db.close()

    # ==========================================================
    #                  GLOBAL STATISTICS
    # ==========================================================

    @staticmethod
    def get_trading_stats() -> Dict:
        """System-wide trading statistics (net-profit based)"""
        db = SessionLocal()
        try:
            total_trades = db.query(Trade).count()
            won_trades = db.query(Trade).filter(Trade.status == "WON").count()
            lost_trades = db.query(Trade).filter(Trade.status == "LOST").count()
            active_trades = db.query(Trade).filter(Trade.status == "ACTIVE").count()
            pending_trades = db.query(Trade).filter(Trade.status == "PENDING").count()

            win_rate = (
                (won_trades / (won_trades + lost_trades)) * 100
                if (won_trades + lost_trades) > 0 else 0
            )

            # ✅ Net profit only (after markup)
            total_profit = (
                db.query(func.sum(func.coalesce(Contract.net_profit, 0.0)))
                .scalar()
                or 0.0
            )

            total_invested = (
                db.query(func.sum(Trade.stake_amount))
                .scalar()
                or 0.0
            )

            roi = (
                (total_profit / total_invested) * 100
                if total_invested > 0 else 0
            )

            return {
                "total_trades": total_trades,
                "won_trades": won_trades,
                "lost_trades": lost_trades,
                "active_trades": active_trades,
                "pending_trades": pending_trades,
                "win_rate": round(win_rate, 2),
                "total_profit": round(total_profit, 2),
                "total_invested": round(total_invested, 2),
                "roi_percentage": round(roi, 2),
            }

        except Exception as e:
            logger.error(f"Error calculating trading stats: {e}")
            return {
                "total_trades": 0,
                "won_trades": 0,
                "lost_trades": 0,
                "active_trades": 0,
                "pending_trades": 0,
                "win_rate": 0.0,
                "total_profit": 0.0,
                "total_invested": 0.0,
                "roi_percentage": 0.0,
            }
        finally:
            db.close()
