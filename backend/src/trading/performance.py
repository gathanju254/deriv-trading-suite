# backend/src/trading/performance.py
from typing import List, Dict
from datetime import datetime, timedelta
import statistics
from src.utils.logger import logger

# Import database models and repos
from src.db.models.trade import Trade
from src.db.models.contract import Contract
from src.db.repositories.trade_repo import TradeRepo
from src.db.repositories.contract_repo import ContractRepo
from src.db.session import SessionLocal


class PerformanceTracker:
    def __init__(self):
        self.trades: List[Dict] = []
        
        # Time-bucketed PnL
        self.daily_pnl: Dict[str, float] = {}
        self.weekly_pnl: Dict[str, float] = {}
        self.monthly_pnl: Dict[str, float] = {}
        
        # Remove this line: self._load_existing_trades()

    def initialize_after_db(self):
        """Load existing trades after database is created."""
        self._load_existing_trades()

    def _load_existing_trades(self):
        """Load existing completed trades from database on startup"""
        try:
            db = SessionLocal()
            completed_trades = db.query(Trade).filter(
                Trade.status.in_(["WON", "LOST"])
            ).order_by(Trade.created_at.desc()).all()
            
            for trade in completed_trades:
                # Get contract profit
                contract = db.query(Contract).filter(Contract.trade_id == trade.id).first()
                profit = 0.0
                if contract and contract.profit is not None:
                    profit = contract.profit
                else:
                    # Estimate profit based on status
                    profit = trade.amount * 0.95 if trade.status == "WON" else -trade.amount
                
                self.trades.append({
                    "id": trade.id,
                    "symbol": trade.symbol,
                    "side": trade.side,
                    "amount": trade.amount,
                    "profit": profit,
                    "result": trade.status,
                    "closed_at": trade.created_at  # Use created_at for now
                })
            
            db.close()
            logger.info(f"Loaded {len(completed_trades)} existing trades from database")
        except Exception as e:
            logger.error(f"Failed to load existing trades: {e}")

    def add_trade(self, trade: Dict):
        """Add a completed trade with PnL data and save to database"""
        try:
            # Add to memory
            self.trades.append(trade)
            self._update_pnl_metrics(trade)
            
            # Also update the trade in database
            self._update_trade_in_database(trade)
            
        except Exception:
            logger.exception("Failed to add trade to performance tracker")

    def _update_trade_in_database(self, trade: Dict):
        """Update trade and contract records in database"""
        try:
            db = SessionLocal()
            
            # Update trade status
            trade_record = db.query(Trade).filter(Trade.id == trade["id"]).first()
            if trade_record:
                trade_record.status = trade["result"]
                # Add an updated_at field if you have one, or use created_at
            
            # Update or create contract record
            contract = db.query(Contract).filter(Contract.trade_id == trade["id"]).first()
            if contract:
                # Update existing contract
                contract.profit = trade.get("profit", 0.0)
                contract.is_sold = "1" if trade["result"] in ["WON", "LOST"] else "0"
                contract.sell_time = datetime.utcnow()
                if not contract.exit_tick:
                    # Try to get exit tick from market data if available
                    from src.core.deriv_api import deriv
                    # You might need to track this differently
                    pass
            else:
                # Create new contract record
                contract = Contract(
                    id=trade.get("contract_id", f"contract_{trade['id']}"),
                    trade_id=trade["id"],
                    profit=trade.get("profit", 0.0),
                    is_sold="1" if trade["result"] in ["WON", "LOST"] else "0",
                    sell_time=datetime.utcnow()
                )
                db.add(contract)
            
            db.commit()
            db.close()
            
        except Exception as e:
            logger.error(f"Failed to update trade in database: {e}")

    def _update_pnl_metrics(self, trade: Dict):
        """Update PnL metrics by time period"""
        try:
            profit = trade.get("profit")
            if profit is None:
                return

            trade_time = trade.get("closed_at") or datetime.utcnow()
            date_key = trade_time.strftime("%Y-%m-%d")
            week_key = trade_time.strftime("%Y-%W")
            month_key = trade_time.strftime("%Y-%m")

            self.daily_pnl[date_key] = self.daily_pnl.get(date_key, 0) + profit
            self.weekly_pnl[week_key] = self.weekly_pnl.get(week_key, 0) + profit
            self.monthly_pnl[month_key] = self.monthly_pnl.get(month_key, 0) + profit

        except Exception:
            logger.exception("Failed to update PnL metrics")

    def get_performance_metrics(self) -> Dict:
        """Return complete metrics dict with guaranteed keys."""
        try:
            # Use trades from memory (which should match database)
            completed = [t for t in self.trades if t.get("profit") is not None]

            # Guarantee default values
            if not completed:
                return {
                    "total_trades": 0,
                    "winning_trades": 0,
                    "losing_trades": 0,
                    "win_rate": 0.0,
                    "total_profit": 0.0,
                    "average_profit": 0.0,
                    "average_loss": 0.0,
                    "profit_factor": 0.0,
                    "sharpe_ratio": 0.0,
                    "max_drawdown": 0.0,
                    "daily_pnl": self.daily_pnl,
                    "weekly_pnl": self.weekly_pnl,
                    "monthly_pnl": self.monthly_pnl,
                    "best_day": 0.0,  # NEW
                    "worst_day": 0.0,  # NEW
                    "avg_trade_duration": 0.0,  # NEW
                    "volatility": 0.0  # NEW
                }

            profits = [t["profit"] for t in completed]
            wins = [p for p in profits if p > 0]
            losses = [p for p in profits if p < 0]

            total_profit = sum(profits)
            total_trades = len(completed)
            win_rate = (len(wins) / total_trades) * 100 if total_trades else 0.0

            avg_win = statistics.mean(wins) if wins else 0.0
            avg_loss = statistics.mean(losses) if losses else 0.0

            profit_factor = (
                abs(sum(wins) / sum(losses)) if losses else float("inf")
            )

            avg_ret = statistics.mean(profits) if profits else 0.0
            std_ret = statistics.stdev(profits) if len(profits) > 1 else 0.0
            sharpe_ratio = avg_ret / std_ret if std_ret > 0 else 0.0

            running = 0
            peak = 0
            max_drawdown = 0
            for p in profits:
                running += p
                peak = max(peak, running)
                max_drawdown = max(max_drawdown, peak - running)

            # NEW: Calculate best and worst day
            best_day = max(self.daily_pnl.values()) if self.daily_pnl else 0.0
            worst_day = min(self.daily_pnl.values()) if self.daily_pnl else 0.0
            
            # NEW: Calculate average trade duration (simplified - use 5 ticks as default)
            avg_trade_duration = 5.0  # Default for binary options contracts
            
            # NEW: Calculate volatility (std of daily returns)
            daily_returns = list(self.daily_pnl.values())
            volatility = statistics.stdev(daily_returns) if len(daily_returns) > 1 else 0.0

            return {
                "total_trades": total_trades,
                "winning_trades": len(wins),
                "losing_trades": len(losses),
                "win_rate": round(win_rate, 2),
                "total_profit": round(total_profit, 2),
                "average_profit": round(avg_win, 2),
                "average_loss": round(avg_loss, 2),
                "profit_factor": round(profit_factor, 2) if profit_factor != float("inf") else 0.0,
                "sharpe_ratio": round(sharpe_ratio, 2),
                "max_drawdown": round(max_drawdown, 2),
                "daily_pnl": self.daily_pnl,
                "weekly_pnl": self.weekly_pnl,
                "monthly_pnl": self.monthly_pnl,
                "best_day": round(best_day, 2),  # NEW
                "worst_day": round(worst_day, 2),  # NEW
                "avg_trade_duration": round(avg_trade_duration, 2),  # NEW
                "volatility": round(volatility, 4)  # NEW
            }

        except Exception:
            logger.exception("Performance calculation crashed — returning safe defaults")
            return {
                "total_trades": 0,
                "winning_trades": 0,
                "losing_trades": 0,
                "win_rate": 0.0,
                "total_profit": 0.0,
                "average_profit": 0.0,
                "average_loss": 0.0,
                "profit_factor": 0.0,
                "sharpe_ratio": 0.0,
                "max_drawdown": 0.0,
                "daily_pnl": self.daily_pnl,
                "weekly_pnl": self.weekly_pnl,
                "monthly_pnl": self.monthly_pnl,
                "best_day": 0.0,  # NEW
                "worst_day": 0.0,  # NEW
                "avg_trade_duration": 0.0,  # NEW
                "volatility": 0.0  # NEW
            }

    def get_performance_summary(self) -> Dict:
        """Get a summary of performance metrics for the bot metrics endpoint"""
        try:
            metrics = self.get_performance_metrics()
            
            # Calculate daily P&L (most recent day)
            daily_pnl = 0.0
            if self.daily_pnl:
                # Get today's key
                today_key = datetime.utcnow().strftime("%Y-%m-%d")
                daily_pnl = self.daily_pnl.get(today_key, 0.0)
            
            # Calculate monthly P&L (current month)
            monthly_pnl = 0.0
            if self.monthly_pnl:
                current_month_key = datetime.utcnow().strftime("%Y-%m")
                monthly_pnl = self.monthly_pnl.get(current_month_key, 0.0)
            
            return {
                "sharpe_ratio": metrics.get("sharpe_ratio", 0.0),
                "max_drawdown": metrics.get("max_drawdown", 0.0),
                "volatility": metrics.get("volatility", 0.0),
                "daily_pnl": round(daily_pnl, 2),
                "monthly_pnl": round(monthly_pnl, 2),
                "avg_profit": metrics.get("average_profit", 0.0),
                "avg_trade_duration": metrics.get("avg_trade_duration", 0.0),
                "profit_factor": metrics.get("profit_factor", None),  # Can be None if no losses
                "best_day": metrics.get("best_day", None),  # Can be None if no trades
                "worst_day": metrics.get("worst_day", None)  # Can be None if no trades
            }
            
        except Exception as e:
            logger.error(f"Error getting performance summary: {e}")
            return {
                "sharpe_ratio": 0.0,
                "max_drawdown": 0.0,
                "volatility": 0.0,
                "daily_pnl": 0.0,
                "monthly_pnl": 0.0,
                "avg_profit": 0.0,
                "avg_trade_duration": 0.0,
                "profit_factor": None,
                "best_day": None,
                "worst_day": None
            }

    def get_recent_performance(self, days: int = 7) -> Dict:
        """Get performance for last X days"""
        try:
            cutoff = datetime.utcnow() - timedelta(days=days)
            recent = [
                t for t in self.trades
                if t.get("closed_at") and t["closed_at"] >= cutoff
            ]

            profits = [t.get("profit", 0) for t in recent]

            return {
                "period_days": days,
                "trades_count": len(recent),
                "total_profit": sum(profits),
                "average_profit": statistics.mean(profits) if profits else 0.0,
            }

        except Exception:
            logger.exception("Failed recent performance calculation")
            return {
                "period_days": days,
                "trades_count": 0,
                "total_profit": 0.0,
                "average_profit": 0.0,
            }


# Singleton instance
performance = PerformanceTracker()