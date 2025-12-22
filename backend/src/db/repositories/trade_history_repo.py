# backend/src/db/repositories/trade_history_repo.py
# backend/src/db/repositories/trade_history_repo.py
import logging
from sqlalchemy import desc, func, case
from src.db.session import SessionLocal
from src.db.models.trade import Trade
from src.db.models.contract import Contract
from src.db.models.proposal import Proposal
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

class TradeHistoryRepo:
    
    @staticmethod
    def get_all_trades(limit: int = 100, offset: int = 0) -> List[Dict]:
        """Get all trades with related contract and proposal data"""
        db = SessionLocal()
        try:
            trades = db.query(Trade).order_by(desc(Trade.created_at)).offset(offset).limit(limit).all()
            
            result = []
            for trade in trades:
                trade_data = {
                    "id": trade.id,
                    "symbol": trade.symbol,
                    "side": trade.side,  # This should be "RISE" or "FALL"
                    "amount": trade.amount,
                    "duration": trade.duration,
                    "status": trade.status,
                    "created_at": trade.created_at.isoformat() if trade.created_at else None
                }
                
                # Add contract data if exists
                if trade.contract:
                    # Ensure entry_tick and exit_tick have proper values
                    entry_tick = trade.contract.entry_tick
                    exit_tick = trade.contract.exit_tick
                    
                    # Clean up the tick values
                    if entry_tick in ["—", "-", "", None]:
                        entry_tick = "N/A"
                    if exit_tick in ["—", "-", "", None]:
                        exit_tick = "N/A"
                    
                    trade_data["contract"] = {
                        "id": trade.contract.id,
                        "entry_tick": entry_tick,
                        "exit_tick": exit_tick,
                        "profit": trade.contract.profit,
                        "is_sold": trade.contract.is_sold,
                        "sell_time": trade.contract.sell_time.isoformat() if trade.contract.sell_time else None
                    }
                else:
                    # Add empty contract structure if no contract exists
                    trade_data["contract"] = {
                        "entry_tick": "N/A",
                        "exit_tick": "N/A",
                        "profit": 0.0,
                        "is_sold": "0"
                    }
                
                result.append(trade_data)
            
            return result
        finally:
            db.close()
    
    @staticmethod
    def get_trade_by_id(trade_id: str) -> Optional[Dict]:
        """Get specific trade by ID"""
        db = SessionLocal()
        try:
            trade = db.query(Trade).filter(Trade.id == trade_id).first()
            if not trade:
                return None
            
            trade_data = {
                "id": trade.id,
                "symbol": trade.symbol,
                "side": trade.side,
                "amount": trade.amount,
                "duration": trade.duration,
                "status": trade.status,
                "created_at": trade.created_at.isoformat() if trade.created_at else None
            }
            
            if trade.contract:
                trade_data["contract"] = {
                    "id": trade.contract.id,
                    "entry_tick": trade.contract.entry_tick,
                    "exit_tick": trade.contract.exit_tick,
                    "profit": trade.contract.profit,
                    "is_sold": trade.contract.is_sold,
                    "sell_time": trade.contract.sell_time.isoformat() if trade.contract.sell_time else None
                }
            
            if trade.proposal:
                trade_data["proposal"] = {
                    "id": trade.proposal.id,
                    "price": trade.proposal.price,
                    "payout": trade.proposal.payout
                }
            
            return trade_data
        finally:
            db.close()
    
    @staticmethod
    def get_trades_by_status(status: str, limit: int = 100) -> List[Dict]:
        """Get trades by status (PENDING, ACTIVE, WON, LOST, ERROR)"""
        db = SessionLocal()
        try:
            trades = db.query(Trade).filter(Trade.status == status).order_by(desc(Trade.created_at)).limit(limit).all()
            return [
                {
                    "id": trade.id,
                    "symbol": trade.symbol,
                    "side": trade.side,
                    "amount": trade.amount,
                    "status": trade.status,
                    "created_at": trade.created_at.isoformat() if trade.created_at else None
                }
                for trade in trades
            ]
        finally:
            db.close()
    
    @staticmethod
    def get_trading_stats() -> Dict:
        """Get trading statistics"""
        db = SessionLocal()
        try:
            total_trades = db.query(Trade).count()
            won_trades = db.query(Trade).filter(Trade.status == "WON").count()
            lost_trades = db.query(Trade).filter(Trade.status == "LOST").count()
            active_trades = db.query(Trade).filter(Trade.status == "ACTIVE").count()
            pending_trades = db.query(Trade).filter(Trade.status == "PENDING").count()
            
            # Calculate win rate
            win_rate = (won_trades / (won_trades + lost_trades)) * 100 if (won_trades + lost_trades) > 0 else 0
            
            # Simplified and robust profit calculation:
            # Sum contract.profit (use COALESCE to treat NULL as 0)
            total_profit_result = db.query(func.sum(func.coalesce(Contract.profit, 0.0))).scalar()
            total_profit = total_profit_result or 0.0
            
            # Calculate total invested amount
            total_invested_result = db.query(func.sum(Trade.amount)).scalar()
            total_invested = total_invested_result or 0.0
            
            # Calculate ROI
            roi = ((total_profit / total_invested) * 100) if total_invested > 0 else 0
            
            return {
                "total_trades": total_trades,
                "won_trades": won_trades,
                "lost_trades": lost_trades,
                "active_trades": active_trades,
                "pending_trades": pending_trades,
                "win_rate": round(win_rate, 2),
                "total_profit": round(total_profit, 2),
                "total_invested": round(total_invested, 2),
                "roi_percentage": round(roi, 2)
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
                "roi_percentage": 0.0
            }
        finally:
            db.close()
    
    @staticmethod
    def get_recent_trades(limit: int = 10) -> List[Dict]:
        """Get most recent trades"""
        return TradeHistoryRepo.get_all_trades(limit=limit)
    
    @staticmethod
    def get_trades_by_date_range(start_date: str, end_date: str) -> List[Dict]:
        """Get trades within a date range"""
        db = SessionLocal()
        try:
            from datetime import datetime
            start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            
            trades = db.query(Trade).filter(
                Trade.created_at >= start,
                Trade.created_at <= end
            ).order_by(desc(Trade.created_at)).all()
            
            return [
                {
                    "id": trade.id,
                    "symbol": trade.symbol,
                    "side": trade.side,
                    "amount": trade.amount,
                    "status": trade.status,
                    "created_at": trade.created_at.isoformat() if trade.created_at else None
                }
                for trade in trades
            ]
        finally:
            db.close()