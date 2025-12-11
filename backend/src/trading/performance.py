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
        self.daily_pnl = {}
        self.weekly_pnl = {}
        self.monthly_pnl = {}
        
        # Load existing trades from database on startup
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

            return {
                "total_trades": total_trades,
                "winning_trades": len(wins),
                "losing_trades": len(losses),
                "win_rate": round(win_rate, 2),
                "total_profit": round(total_profit, 2),
                "average_profit": round(avg_win, 2),
                "average_loss": round(avg_loss, 2),
                "profit_factor": round(profit_factor, 2),
                "sharpe_ratio": round(sharpe_ratio, 2),
                "max_drawdown": round(max_drawdown, 2),
                "daily_pnl": self.daily_pnl,
                "weekly_pnl": self.weekly_pnl,
                "monthly_pnl": self.monthly_pnl,
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

    def get_performance_summary(self) -> Dict:
        """Get summary performance metrics"""
        if not self.trades:
            return {
                "sharpe_ratio": 0,
                "max_drawdown": 0,
                "volatility": 0,
                "daily_pnl": 0,
                "monthly_pnl": 0,
                "avg_profit": 0,
                "avg_trade_duration": 0
            }
        
        try:
            profits = [t.get("profit", 0) for t in self.trades if t.get("profit") is not None]
            
            if not profits:
                return {
                    "sharpe_ratio": 0,
                    "max_drawdown": 0,
                    "volatility": 0,
                    "daily_pnl": 0,
                    "monthly_pnl": 0,
                    "avg_profit": 0,
                    "avg_trade_duration": 0
                }
            
            total_profit = sum(profits)
            avg_profit = total_profit / len(profits) if profits else 0
            
            # Calculate Sharpe Ratio (simplified)
            import statistics
            if len(profits) > 1:
                std_dev = statistics.stdev(profits)
                sharpe = (avg_profit / std_dev * 252 ** 0.5) if std_dev > 0 else 0
            else:
                sharpe = 0
                std_dev = 0
            
            # Calculate max drawdown
            cumulative = 0
            peak = 0
            max_dd = 0
            for profit in profits:
                cumulative += profit
                if cumulative > peak:
                    peak = cumulative
                drawdown = peak - cumulative
                if drawdown > max_dd:
                    max_dd = drawdown
            
            max_dd_percent = (max_dd / peak * 100) if peak > 0 else 0
            
            # Calculate daily/monthly PnL - SIMPLIFIED (no date parsing)
            # Just use most recent trades for daily/monthly
            recent_trades = self.trades[-20:] if len(self.trades) > 20 else self.trades
            daily_pnl = sum(t.get("profit", 0) for t in recent_trades)
            monthly_pnl = sum(t.get("profit", 0) for t in self.trades[-100:])
            
            # Average trade duration - skip if no closed_at available
            avg_duration = 0  # Default to 0 since we don't track timing in simple mode
            
            return {
                "sharpe_ratio": round(sharpe, 2),
                "max_drawdown": round(max_dd_percent, 2),
                "volatility": round(std_dev * 100 if 'std_dev' in locals() else 0, 2),
                "daily_pnl": round(daily_pnl, 2),
                "monthly_pnl": round(monthly_pnl, 2),
                "avg_profit": round(avg_profit, 2),
                "avg_trade_duration": round(avg_duration, 1)
            }
        except Exception as e:
            logger.error(f"Error calculating performance summary: {e}")
            return {
                "sharpe_ratio": 0,
                "max_drawdown": 0,
                "volatility": 0,
                "daily_pnl": 0,
                "monthly_pnl": 0,
                "avg_profit": 0,
                "avg_trade_duration": 0
            }


# Singleton instance
performance = PerformanceTracker()