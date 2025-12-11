import asyncio
import time
from typing import Dict

from src.core.deriv_api import deriv
from src.utils.logger import logger

# Strategies
from src.strategies.mean_reversion import MeanReversionStrategy
from src.strategies.momentum import MomentumStrategy
from src.strategies.breakout import BreakoutStrategy

# Core logic - IMPORT THE ENHANCED MARKET ANALYZER
from src.core.market_analyzer import market_analyzer  # <-- IMPORT HERE
from src.core.signal_consensus import SignalConsensus
from src.core.risk_manager import risk_manager

# Executors + managers
from src.trading.order_executor import order_executor
from src.trading.position_manager import position_manager
from src.trading.performance import performance
import numpy as np

from src.config.settings import settings


class TradingBot:
    def __init__(self):
        """Initialize strategies, ML consensus, risk model, performance tracker"""

        # Use the enhanced MarketAnalyzer from core module
        self.market_analyzer = market_analyzer  # <-- USE THE IMPORTED INSTANCE

        # Strategies
        self.strategies = [
            MeanReversionStrategy(
                ema_short=5, ema_long=20,
                optimize=settings.STRATEGY_OPTIMIZATION_ENABLED
            ),
            MomentumStrategy(
                rsi_period=14, overbought=70, oversold=30,
                optimize=settings.STRATEGY_OPTIMIZATION_ENABLED
            ),
            BreakoutStrategy(
                window=20, threshold=0.001,
                optimize=settings.STRATEGY_OPTIMIZATION_ENABLED
            )
        ]

        self.consensus = SignalConsensus()
        self.risk = risk_manager
        self.performance = performance

        self.running = False

        # Tick throttle
        self._last_tick_time = 0
        self.min_tick_interval = 0.10

        # Prevent rapid consecutive trades
        self.last_trade_time = 0
        self.min_trade_interval = 30  # seconds

        # Strategy performance stats
        self.strategy_performance = {
            strat.name: {"calls": 0, "puts": 0, "success": 0}
            for strat in self.strategies
        }

    # ===============================================================
    # 📡 TICK HANDLER
    # ===============================================================
    async def _tick_handler(self, msg: Dict):
        if "tick" not in msg:
            return

        # ---- Tick Throttle ----
        now = asyncio.get_event_loop().time()
        if now - self._last_tick_time < self.min_tick_interval:
            return
        self._last_tick_time = now

        tick = msg["tick"]
        price = float(tick["quote"])

        # ===========================================================
        # 1. ENHANCED MARKET ANALYZER (avoid bad conditions)
        # ===========================================================
        market_status = self.market_analyzer.analyze_market(price)
        if not market_status["tradable"]:
            logger.info(f"⛔ Market not tradable → {market_status['reason']} | Regime: {market_status.get('regime', 'UNKNOWN')}")
            return

        # ===========================================================
        # 2. TIME FILTER — avoid back-to-back trades
        # ===========================================================
        if time.time() - self.last_trade_time < self.min_trade_interval:
            return

        # ===========================================================
        # 3. STRATEGY SIGNAL EXTRACTION
        # ===========================================================
        signals = []
        for strat in self.strategies:
            try:
                sig = strat.on_tick(tick)
                if sig:
                    sig["meta"]["strategy"] = strat.name
                    signals.append(sig)

                    if sig["side"] == "CALL":
                        self.strategy_performance[strat.name]["calls"] += 1
                    else:
                        self.strategy_performance[strat.name]["puts"] += 1

            except Exception:
                logger.exception(f"Strategy error in {strat.name}")

        # ===========================================================
        # DEBUG: Log extracted signals
        # ===========================================================
        if signals:
            logger.info(f"📡 {len(signals)} SIGNALS DETECTED:")
            for i, sig in enumerate(signals):
                logger.info(f"   {i+1}. {sig['side']} @ {sig['score']:.3f} from {sig['meta']['strategy']}")
        else:
            logger.info("📡 No signals from strategies")

        # ===========================================================
        # 4. CONSENSUS (ML + Traditional)
        # ===========================================================
        consensus = self.consensus.aggregate(signals, price)

        # ===========================================================
        # DEBUG: Log consensus results
        # ===========================================================
        if consensus:
            logger.info(f"✅ CONSENSUS PASSED → {consensus}")
        else:
            logger.info(f"❌ CONSENSUS FAILED - No consensus from {len(signals)} signals")
            if signals:
                logger.info("Signal details:")
                for sig in signals:
                    logger.info(f"   - {sig['side']} @ {sig['score']} from {sig['meta']['strategy']}")
            return

        # Require strong consensus
        if consensus.get("sources", 0) < 1:
            return
        if consensus["score"] < 0.65:  # HIGHER THRESHOLD = fewer, safer trades
            return

        logger.info(f"✅ CONSENSUS OK → {consensus} | Market Regime: {market_status.get('regime')}")

        # ===========================================================
        # 5. RISK MANAGER CHECKS
        # ===========================================================
        try:
            balance = await deriv.get_balance()
        except Exception:
            logger.exception("Failed to get balance")
            return

        trade_amount = self.risk.get_next_trade_amount()

        # Get recovery status for logging
        recovery_metrics = self.risk.get_recovery_metrics()
        
        # Log recovery status if active
        if settings.RECOVERY_ENABLED and recovery_metrics["recovery_streak"] > 0:
            logger.info(f"🟡 Recovery active: using recovery amount ${trade_amount:.2f}")
        else:
            logger.info(f"🟢 Normal mode: using base trade amount ${trade_amount:.2f}")

        if not self.risk.allow_trade(position_manager.get_open_count(), balance):
            logger.info("⛔ RiskManager blocked trade")
            return

        # ===========================================================
        # 6. EXECUTE TRADE
        # ===========================================================
        side = consensus["side"]
        logger.info(
            f"🚀 EXECUTING TRADE: side={side}, amount={trade_amount}, "
            f"method={consensus.get('method')}, regime={market_status.get('regime')}"
        )

        try:
            trade_id = await order_executor.place_trade(
                side=side,
                amount=trade_amount,
                symbol=settings.SYMBOL
            )

            # Save consensus snapshot with market context
            order_executor.trades[trade_id]["consensus_data"] = {
                "method": consensus.get("method"),
                "signals_count": len(signals),
                "traditional_score": consensus.get("traditional_score", 0),
                "ml_score": consensus.get("ml_score", 0),
                "strategy_breakdown": {s.name: 0 for s in self.strategies},
                "signals": signals,
                "market_regime": market_status.get("regime"),
                "volatility": market_status.get("volatility"),
                "trend_strength": market_status.get("trend_strength"),
                "recovery_data": recovery_metrics if settings.RECOVERY_ENABLED else None
            }

            for sig in signals:
                order_executor.trades[trade_id]["consensus_data"]["strategy_breakdown"][sig["meta"]["strategy"]] += 1

            self.last_trade_time = time.time()

            logger.info(f"✅ Trade placed: {trade_id}")

        except Exception:
            logger.exception("❌ Trade execution failed")

    # ===============================================================
    # MAIN BOT LOOP
    # ===============================================================
    async def run(self):
        if self.running:
            return

        self.running = True
        logger.info("🚀 Starting TradingBot with Enhanced Market Analyzer...")

        logger.info("📊 Collecting initial market data (20 ticks required)...")
        
        # Log recovery system status
        if settings.RECOVERY_ENABLED:
            logger.info("🔧 RECOVERY SYSTEM ENABLED")
            logger.info(f"   Mode: {settings.RECOVERY_MODE}")
            logger.info(f"   Multiplier: {settings.RECOVERY_MULTIPLIER}")
            logger.info(f"   Max Streak: {settings.MAX_RECOVERY_STREAK}")
            logger.info(f"   Smart Recovery: {settings.SMART_RECOVERY}")
            logger.info(f"   Reset on Win: {settings.RESET_ON_WIN}")

        # Connect + authorize
        try:
            await deriv.connect()
            ok = await deriv.authorize()
            if not ok:
                logger.error("❌ Authorization failed")
                return
        except Exception:
            logger.exception("Connection/authorization failed")
            return

        await deriv.add_listener(self._tick_handler)
        await deriv.subscribe_ticks(settings.SYMBOL)
        logger.info(f"📡 Subscribed to ticks: {settings.SYMBOL}")

        # Monitoring loop
        monitor_interval = 300
        last_monitor_time = 0

        # Add periodic cleanup
        cleanup_interval = 60  # 1 minute
        last_cleanup = 0

        while True:
            now = asyncio.get_event_loop().time()

            # Performance reporting
            if now - last_monitor_time > monitor_interval:
                await self._report_performance()
                last_monitor_time = now

            # Auto-cleanup expired trades
            if now - last_cleanup > cleanup_interval:
                await self._cleanup_expired_trades()
                last_cleanup = now

            if not deriv.authorized:
                logger.warning("⚠ WebSocket disconnected — retrying...")
                try:
                    await deriv.connect()
                    await deriv.authorize()
                    await deriv.subscribe_ticks(settings.SYMBOL)
                except Exception:
                    logger.exception("Reconnect failed")
                await asyncio.sleep(1)
                continue

            await asyncio.sleep(1)

    async def _cleanup_expired_trades(self):
        """Clean up trades that should have expired"""
        try:
            from src.db.session import SessionLocal
            from src.db.models.trade import Trade
            from datetime import datetime, timedelta

            db = SessionLocal()
            cutoff = datetime.utcnow() - timedelta(minutes=3)  # 3 minutes for 5-tick trades

            expired = db.query(Trade).filter(
                Trade.status == "ACTIVE",
                Trade.created_at < cutoff
            ).all()

            for trade in expired:
                logger.warning(f"Trade {trade.id} expired (created at {trade.created_at}) - marking as LOST")
                trade.status = "LOST"

                # Update risk manager
                self.risk.update_trade_outcome("LOST", trade.amount)

            db.commit()
            db.close()

            if expired:
                logger.info(f"Cleaned up {len(expired)} expired trades")

        except Exception as e:
            logger.error(f"Error in cleanup: {e}")

    # ===============================================================
    # ENHANCED PERFORMANCE REPORT WITH RECOVERY INFO
    # ===============================================================
    async def _report_performance(self):
        try:
            metrics = self.performance.get_performance_metrics()
            risk = self.risk.get_risk_metrics()
            market_metrics = self.market_analyzer.get_market_metrics()

            logger.info("========== ENHANCED PERFORMANCE REPORT ==========")
            logger.info(f"Total Trades     : {metrics['total_trades']}")
            logger.info(f"Win Rate         : {metrics['win_rate']}%")
            logger.info(f"Total Profit     : {metrics['total_profit']:.2f}")
            logger.info(f"Cons. Wins       : {risk['consecutive_wins']}")
            logger.info(f"Cons. Losses     : {risk['consecutive_losses']}")
            logger.info(f"Next Trade Amount: ${risk['next_trade_amount']:.2f}")
            
            # Add recovery info if enabled
            if settings.RECOVERY_ENABLED:
                recovery_metrics = self.risk.get_recovery_metrics()
                logger.info(f"Recovery Streak  : {recovery_metrics['recovery_streak']}/{settings.MAX_RECOVERY_STREAK}")
                logger.info(f"Total Losses     : ${recovery_metrics['total_losses']:.2f}")
                logger.info(f"Recovery Target  : ${recovery_metrics['recovery_target']:.2f}")
                logger.info(f"Recovery Mode    : {recovery_metrics['recovery_mode']}")
                if recovery_metrics['recovery_streak'] > 0:
                    logger.info(f"🔁 IN RECOVERY MODE | Attempt {recovery_metrics['recovery_streak']}")
            
            logger.info(f"Market Regime    : {market_metrics['regime']}")
            logger.info(f"Market Volatility: {market_metrics['volatility']:.4f}")
            logger.info(f"Trend Strength   : {market_metrics['trend_strength']:.4f}")
            logger.info(f"Consec. Rejects  : {market_metrics['consecutive_rejects']}")
            
            # Calculate recovery effectiveness
            if settings.RECOVERY_ENABLED and recovery_metrics['recovery_history_count'] > 0:
                successful_recoveries = sum(1 for h in self.risk.recovery_history if h.get('recovered', False))
                recovery_rate = (successful_recoveries / recovery_metrics['recovery_history_count']) * 100 if recovery_metrics['recovery_history_count'] > 0 else 0
                logger.info(f"Recovery Success : {recovery_rate:.1f}% ({successful_recoveries}/{recovery_metrics['recovery_history_count']})")
            
            logger.info("=================================================")

        except Exception:
            logger.exception("Performance reporting error")

    # ===============================================================
    # ENHANCED BOT METRICS WITH RECOVERY DATA
    # ===============================================================
    def get_bot_metrics(self) -> Dict:
        metrics = {
            "running": self.running,
            "performance": self.performance.get_performance_metrics(),
            "risk_metrics": self.risk.get_risk_metrics(),
            "market_metrics": self.market_analyzer.get_market_metrics(),
            "strategy_performance": self.strategy_performance,
            "open_positions": position_manager.get_open_count(),
            "consensus_method": (
                "ML" if settings.ML_CONSENSUS_ENABLED else "Traditional"
            )
        }
        
        # Add recovery metrics if enabled
        if settings.RECOVERY_ENABLED:
            metrics["recovery_metrics"] = self.risk.get_recovery_metrics()
            
            # Calculate recovery statistics
            recovery_history = self.risk.recovery_history
            if recovery_history:
                successful_recoveries = sum(1 for h in recovery_history if h.get('recovered', False))
                metrics["recovery_stats"] = {
                    "total_attempts": len(recovery_history),
                    "successful_recoveries": successful_recoveries,
                    "recovery_rate": round((successful_recoveries / len(recovery_history)) * 100, 1) if len(recovery_history) > 0 else 0,
                    "avg_streak_length": round(sum(h.get('streak', 0) for h in recovery_history) / len(recovery_history), 1) if len(recovery_history) > 0 else 0
                }
        
        # Convert numpy types to Python native types for JSON serialization
        def convert_to_serializable(obj):
            if isinstance(obj, dict):
                return {key: convert_to_serializable(value) for key, value in obj.items()}
            elif isinstance(obj, list):
                return [convert_to_serializable(item) for item in obj]
            elif hasattr(obj, 'item'):  # numpy scalar
                return obj.item()
            elif isinstance(obj, (np.float32, np.float64, np.int32, np.int64)):
                return float(obj) if isinstance(obj, (np.float32, np.float64)) else int(obj)
            else:
                return obj
        
        return convert_to_serializable(metrics)

    # ===============================================================
    # RECOVERY SYSTEM CONTROL METHODS
    # ===============================================================
    def reset_recovery_system(self):
        """Reset the recovery system"""
        self.risk.reset_streak()
        logger.info("Recovery system reset")
    
    def get_recovery_status(self) -> Dict:
        """Get detailed recovery status"""
        if not settings.RECOVERY_ENABLED:
            return {"recovery_enabled": False}
        
        status = self.risk.get_recovery_metrics()
        status["settings"] = {
            "recovery_mode": settings.RECOVERY_MODE,
            "recovery_multiplier": settings.RECOVERY_MULTIPLIER,
            "max_recovery_streak": settings.MAX_RECOVERY_STREAK,
            "smart_recovery": settings.SMART_RECOVERY,
            "reset_on_win": settings.RESET_ON_WIN,
            "max_recovery_amount_multiplier": settings.MAX_RECOVERY_AMOUNT_MULTIPLIER
        }
        return status
    
    def simulate_recovery(self, initial_loss: float = 10.0, max_streak: int = 3) -> Dict:
        """Simulate a recovery sequence"""
        sequence = self.risk.simulate_recovery_sequence(initial_loss, max_streak)
        return {
            "simulation": sequence,
            "settings": {
                "recovery_mode": settings.RECOVERY_MODE,
                "multiplier": settings.RECOVERY_MULTIPLIER,
                "max_streak": settings.MAX_RECOVERY_STREAK,
                "smart_recovery": settings.SMART_RECOVERY,
                "initial_loss": initial_loss
            }
        }
    
    def configure_recovery(self, **kwargs):
        """Configure recovery system parameters"""
        # Note: This only changes runtime settings, not saved settings
        if "enabled" in kwargs:
            self.risk.recovery_enabled = kwargs["enabled"]
        if "multiplier" in kwargs and 1.0 <= kwargs["multiplier"] <= 5.0:
            self.risk.recovery_multiplier = kwargs["multiplier"]
        if "max_streak" in kwargs and 1 <= kwargs["max_streak"] <= 10:
            self.risk.max_recovery_streak = kwargs["max_streak"]
        if "smart" in kwargs:
            self.risk.smart_recovery = kwargs["smart"]
        if "mode" in kwargs and kwargs["mode"] in ["MARTINGALE", "FIBONACCI"]:
            self.risk.recovery_mode = kwargs["mode"]
        
        logger.info(f"Recovery system reconfigured: {self.risk.get_recovery_metrics()}")
        return self.risk.get_recovery_metrics()

    # ===============================================================
    # ADDED METHOD FOR BOT METRICS
    # ===============================================================
    async def get_bot_metrics(self) -> Dict:
        """Get current bot performance metrics"""
        try:
            from src.db.repositories.trade_history_repo import TradeHistoryRepo
            from src.trading.performance import performance
            
            # Get trading stats from database
            stats = TradeHistoryRepo.get_trading_stats()
            
            # Get performance tracker data
            perf_data = performance.get_performance_summary()
            
            return {
                "running": self.running,
                "symbol": settings.SYMBOL,
                "total_trades": stats.get("total_trades", 0),
                "won_trades": stats.get("won_trades", 0),
                "lost_trades": stats.get("lost_trades", 0),
                "win_rate": stats.get("win_rate", 0),
                "total_profit": stats.get("total_profit", 0),
                "pnl": stats.get("total_profit", 0),  # Alias for frontend
                "sharpe_ratio": perf_data.get("sharpe_ratio", 0),
                "max_drawdown": perf_data.get("max_drawdown", 0),
                "volatility": perf_data.get("volatility", 0),
                "active_trades": position_manager.get_open_count(),
                "daily_pnl": perf_data.get("daily_pnl", 0),
                "monthly_pnl": perf_data.get("monthly_pnl", 0),
                "avg_profit": perf_data.get("avg_profit", 0),
                "completed_trades": stats.get("total_trades", 0),
                "winning_trades": stats.get("won_trades", 0),
                "avg_trade_duration": perf_data.get("avg_trade_duration", 0)
            }
        except Exception as e:
            logger.error(f"Error getting bot metrics: {e}")
            return {
                "running": self.running,
                "total_trades": 0,
                "win_rate": 0,
                "pnl": 0,
                "sharpe_ratio": 0
            }


# Singleton bot instance
trading_bot = TradingBot()