# backend/src/trading/bot.py
import asyncio
import time
from typing import Dict
from datetime import datetime

from src.core.deriv_api import deriv
from src.utils.logger import logger

# Strategies
from src.strategies.mean_reversion import MeanReversionStrategy
from src.strategies.momentum import MomentumStrategy
from src.strategies.breakout import BreakoutStrategy

# Core logic
from src.core.market_analyzer import market_analyzer
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
        self.market_analyzer = market_analyzer
        
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

        # SINGLE SOURCE OF TRUTH for consensus
        self.consensus = SignalConsensus()
        self.risk = risk_manager
        self.performance = performance

        self.running = False
        self._last_tick_time = 0
        self.min_tick_interval = 0.05
        self.last_trade_time = 0
        self.min_trade_interval = 15
        self.latest_price = None

        self.strategy_performance = {
            strat.name: {"rise": 0, "fall": 0, "success": 0}
            for strat in self.strategies
        }

        self.signal_history = []
        self.signal_counter = 0
        self.session_open = None

    # ===============================================================
    # 📡 TICK HANDLER
    # ===============================================================
    async def _tick_handler(self, msg: Dict):
        """Unified tick handler with proper signal processing"""
        try:
            # ======== ADD TICK THROTTLE HERE ========
            current_time = time.time()
            if current_time - self._last_tick_time < self.min_tick_interval:
                return  # Skip this tick, too soon
            self._last_tick_time = current_time
            # ========================================
            
            tick = msg.get("tick") if isinstance(msg, dict) and "tick" in msg else msg
            
            symbol = tick.get("symbol") if isinstance(tick, dict) else None
            price_raw = None
            for k in ("quote", "price", "ask", "bid"):
                if isinstance(tick, dict) and tick.get(k) is not None:
                    price_raw = tick.get(k)
                    break

            try:
                price = float(price_raw)
            except Exception:
                price = 0.0
                
            if price <= 0:
                logger.debug(f"Skipping tick with non-positive price: {price_raw}")
                return

            self.latest_price = price

            if self.session_open is None:
                self.session_open = price
                logger.info(f"Session open set to: {self.session_open}")

            # 1. MARKET ANALYZER
            market_status = self.market_analyzer.analyze_market(price)
            logger.debug(f"📊 Market Analysis: tradable={market_status['tradable']}, regime={market_status.get('regime')}, volatility={market_status.get('volatility', 0):.6f}, trend_strength={market_status.get('trend_strength', 0):.6f}")
            
            if not market_status["tradable"]:
                logger.info(f"⛔ Market not tradable → {market_status['reason']} | Regime: {market_status.get('regime', 'UNKNOWN')}")
                return

            # 2. TIME FILTER
            if time.time() - self.last_trade_time < self.min_trade_interval:
                return

            # 3. STRATEGY SIGNAL EXTRACTION
            signals = []
            for strat in self.strategies:
                try:
                    sig = strat.on_tick({"quote": price, "symbol": settings.SYMBOL, "epoch": tick.get("epoch", int(time.time()))})
                    if sig:
                        # Normalize signal format for consensus
                        normalized_signal = {
                            "side": sig.get("side", "").upper(),  # Ensure uppercase
                            "score": float(sig.get("score", 0)),
                            "meta": sig.get("meta", {})
                        }
                        signals.append(normalized_signal)
                except Exception as e:
                    logger.debug(f"[{strat.name}] Signal error: {e}")
        
            if signals:
                if len(self.signal_history) > 1000:
                    self.signal_history = self.signal_history[-1000:]

                logger.info(f"📊 Got {len(signals)} signals from strategies")

                # STORE AND BROADCAST SIGNALS
                for sig in signals:
                    signal_data = {
                        "id": f"sig_{self.signal_counter}_{int(time.time())}",
                        "direction": sig.get("side") or "UNKNOWN",
                        "confidence": float(sig.get("score", 0)),
                        "price": price,
                        "symbol": symbol,
                        "timestamp": tick.get("epoch", int(time.time())),
                        "strategy": sig.get("meta", {}).get("strategy", "unknown"),
                        "message": f"{sig.get('side', 'UNKNOWN')} signal from {sig.get('meta', {}).get('strategy', 'unknown')}",
                        "score": sig.get("score", 0)
                    }

                    try:
                        self.signal_history.append(signal_data)
                        self.signal_counter += 1
                    except Exception as e:
                        logger.warning(f"Failed to append to signal history: {e}")

                    try:
                        from src.api.websocket import ws_manager
                        await ws_manager.broadcast_signal(signal_data)
                    except Exception as e:
                        logger.exception(f"Failed to broadcast signal: {e}")
            else:
                logger.info("📡 No signals from strategies")

            # 4. CONSENSUS (USING SINGLE CONSENSUS INSTANCE)
            consensus = self.consensus.aggregate(signals, price, self.session_open)

            logger.debug(f"Signals count: {len(signals)}")
            logger.debug(f"Consensus score: {consensus.get('score', 0) if consensus else 'No consensus'}")

            if consensus:
                logger.info(f"✅ CONSENSUS PASSED → {consensus['side']}")
            else:
                logger.info(f"❌ CONSENSUS FAILED - No consensus from {len(signals)} signals")
                return

            if consensus.get("sources", 0) < 1:
                return
            
            min_consensus_score = 0.60
            if consensus["score"] < min_consensus_score:
                logger.info(f"❌ Consensus score too low: {consensus['score']} < {min_consensus_score}")
                return

            market_regime = market_status.get('regime')
            threshold = 0.65 if market_regime == "RANGING" else 0.60
            if consensus["score"] < threshold:
                logger.info(f"❌ Consensus threshold not met for regime {market_regime}: {consensus['score']} < {threshold}")
                return

            logger.info(f"✅ CONSENSUS OK → {consensus['side']} | Market Regime: {market_status.get('regime')}")

            # 5. RISK MANAGER CHECKS
            try:
                balance = await deriv.get_balance()
            except Exception:
                logger.exception("Failed to get balance")
                return

            if balance <= 0:
                logger.info("❌ Insufficient balance ($0 or less) - skipping trade logic")
                return

            trade_amount = self.risk.get_next_trade_amount()
            recovery_metrics = self.risk.get_recovery_metrics()
            
            if settings.RECOVERY_ENABLED and recovery_metrics["recovery_streak"] > 0:
                logger.info(f"🟡 Recovery active: using recovery amount ${trade_amount:.2f}")
            else:
                logger.info(f"🟢 Normal mode: using base trade amount ${trade_amount:.2f}")

            if not self.risk.allow_trade(position_manager.get_open_count(), balance):
                logger.info("⛔ RiskManager blocked trade")
                return

            # 6. PRICE STABILITY CHECK
            signal_generated_price = price
            await asyncio.sleep(0.1)

            if self.latest_price and abs(self.latest_price - signal_generated_price) / signal_generated_price > 0.001:
                price_move_pct = ((self.latest_price - signal_generated_price) / signal_generated_price * 100)
                logger.info(f"⚠️ Price moved {price_move_pct:.2f}%, skipping trade")
                return

            # 7. EXECUTE TRADE
            side = consensus["side"]  # RISE or FALL
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

                # Store consensus data for ML training
                order_executor.trades[trade_id]["consensus_data"] = {
                    "method": consensus.get("method"),
                    "signals_count": len(signals),
                    "traditional_score": consensus.get("traditional_score", 0),
                    "ml_score": consensus.get("ml_score", 0),
                    "strategy_breakdown": {s.name: 0 for s in self.strategies},
                    "signals": signals,  # Store normalized signals for ML
                    "market_regime": market_status.get("regime"),
                    "volatility": market_status.get("volatility"),
                    "trend_strength": market_status.get("trend_strength"),
                    "recovery_data": recovery_metrics if settings.RECOVERY_ENABLED else None,
                    "side": consensus["side"],
                    "session_open": self.session_open,
                    "price_at_signal": price  # Store actual price for ML training
                }

                for sig in signals:
                    strat_name = sig.get("meta", {}).get("strategy")
                    if strat_name in order_executor.trades[trade_id]["consensus_data"]["strategy_breakdown"]:
                        order_executor.trades[trade_id]["consensus_data"]["strategy_breakdown"][strat_name] += 1

                self.last_trade_time = time.time()
                logger.info(f"✅ Trade placed: {trade_id}")

            except Exception as e:
                logger.exception(f"❌ Trade execution failed: {e}")
        
        except Exception as e:
            logger.error(f"Error in _tick_handler: {e}")

    # ===============================================================
    # MAIN BOT LOOP
    # ===============================================================
    async def run(self):
        if self.running:
            return

        self.running = True
        logger.info("🚀 Starting TradingBot with Enhanced Market Analyzer...")
        logger.info("📊 Collecting initial market data (20 ticks required)...")
        
        if settings.RECOVERY_ENABLED:
            logger.info("🔧 RECOVERY SYSTEM ENABLED")
            logger.info(f"   Mode: {settings.RECOVERY_MODE}")
            logger.info(f"   Multiplier: {settings.RECOVERY_MULTIPLIER}")
            logger.info(f"   Max Streak: {settings.MAX_RECOVERY_STREAK}")
            logger.info(f"   Smart Recovery: {settings.SMART_RECOVERY}")
            logger.info(f"   Reset on Win: {settings.RESET_ON_WIN}")

        try:
            await deriv.connect()
            ok = await deriv.authorize()
            if not ok:
                logger.error("❌ Authorization failed")
                return
        except Exception:
            logger.exception("Connection/authorization failed")
            return

        try:
            if hasattr(order_executor, 'start'):
                await order_executor.start()
            else:
                logger.debug("Order executor listener should be auto-attached")
        except Exception:
            logger.exception("Failed to start order executor listener")

        try:
            balance = await deriv.get_balance()
            self.risk.start_session(balance)
            self.risk.reset_streak()
            logger.info(f"✅ Risk manager session started with balance: {balance:.2f}")
        except Exception as e:
            logger.error(f"Failed to start risk session: {e}")

        await deriv.add_listener(self._tick_handler)
        await deriv.subscribe_ticks(settings.SYMBOL)
        logger.info(f"📡 Subscribed to ticks: {settings.SYMBOL}")

        monitor_interval = 300
        last_monitor_time = 0
        cleanup_interval = 60
        last_cleanup = 0

        while self.running:
            now = asyncio.get_event_loop().time()

            if now - last_monitor_time > monitor_interval:
                await self._report_performance()
                last_monitor_time = now

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
            cutoff = datetime.utcnow() - timedelta(minutes=3)

            expired = db.query(Trade).filter(
                Trade.status == "ACTIVE",
                Trade.created_at < cutoff
            ).all()

            for trade in expired:
                logger.warning(f"Trade {trade.id} expired (created at {trade.created_at}) - marking as LOST")
                trade.status = "LOST"
                self.risk.update_trade_outcome("LOST", trade.amount)

            db.commit()
            db.close()

            if expired:
                logger.info(f"Cleaned up {len(expired)} expired trades")

        except Exception as e:
            logger.error(f"Error in cleanup: {e}")

    async def _report_performance(self):
        try:
            metrics = self.performance.get_performance_metrics()
            risk = self.risk.get_risk_metrics()
            market_metrics = self.market_analyzer.get_market_metrics()

            if self.risk.start_day_balance:
                logger.info(f"📊 Session started with balance: ${self.risk.start_day_balance:.2f}")
                logger.info(f"🎯 Daily Target: ${self.risk.start_day_balance * (settings.DAILY_PROFIT_LIMIT_PCT/100):.2f}")

            logger.info("========== ENHANCED PERFORMANCE REPORT ==========")
            logger.info(f"Total Trades     : {metrics['total_trades']}")
            logger.info(f"Win Rate         : {metrics['win_rate']}%")
            logger.info(f"Total Profit     : {metrics['total_profit']:.2f}")
            logger.info(f"Cons. Wins       : {risk['consecutive_wins']}")
            logger.info(f"Cons. Losses     : {risk['consecutive_losses']}")
            logger.info(f"Next Trade Amount: ${risk['next_trade_amount']:.2f}")
            
            if settings.RECOVERY_ENABLED:
                recovery_metrics = self.risk.get_recovery_metrics()
                logger.info(f"Recovery Streak  : {recovery_metrics['recovery_streak']}/{settings.MAX_RECOVERY_STREAK}")
                
                actual_total_losses = abs(self.risk.total_losses)
                recovery_target = actual_total_losses / 0.82 if actual_total_losses > 0 else 0
                
                logger.info(f"Total Losses     : ${actual_total_losses:.2f}")
                logger.info(f"Recovery Target  : ${recovery_target:.2f}")
                logger.info(f"Recovery Mode    : {recovery_metrics['recovery_mode']}")
                if recovery_metrics['recovery_streak'] > 0:
                    logger.info(f"🔁 IN RECOVERY MODE | Attempt {recovery_metrics['recovery_streak']}")
            
            logger.info(f"Market Regime    : {market_metrics['regime']}")
            logger.info(f"Market Volatility: {market_metrics['volatility']:.4f}")
            logger.info(f"Trend Strength   : {market_metrics['trend_strength']:.4f}")
            logger.info(f"Consec. Rejects  : {market_metrics['consecutive_rejects']}")
            
            if settings.RECOVERY_ENABLED and recovery_metrics.get('recovery_history_count', 0) > 0:
                successful_recoveries = sum(1 for h in self.risk.recovery_history if h.get('recovered', False))
                recovery_rate = (successful_recoveries / recovery_metrics['recovery_history_count']) * 100 if recovery_metrics['recovery_history_count'] > 0 else 0
                logger.info(f"Recovery Success : {recovery_rate:.1f}% ({successful_recoveries}/{recovery_metrics['recovery_history_count']})")
            
            lock_status = "UNLOCKED"
            if risk.get('state') == 'locked':
                lock_status = "LOCKED"
                if risk.get('locked_until'):
                    lock_time_left = max(0, risk['locked_until'] - time.time())
                    lock_status += f" (auto-unlock in {lock_time_left:.0f}s)"
            
            logger.info(f"Lock Status      : {lock_status}")
            logger.info(f"Daily Profit     : ${risk.get('daily_profit', 0):.2f}")
            logger.info(f"Daily Loss       : ${risk.get('daily_loss', 0):.2f}")
            
            logger.info("=================================================")

        except Exception:
            logger.exception("Performance reporting error")

    def get_bot_metrics(self) -> Dict:
        """Get current bot performance metrics - SINGLE METHOD"""
        try:
            from src.db.repositories.trade_history_repo import TradeHistoryRepo
            from src.trading.performance import performance
            
            stats = TradeHistoryRepo.get_trading_stats()
            perf_data = performance.get_performance_summary()
            
            base_metrics = {
                "running": self.running,
                "symbol": settings.SYMBOL,
                "total_trades": stats.get("total_trades", 0),
                "won_trades": stats.get("won_trades", 0),
                "lost_trades": stats.get("lost_trades", 0),
                "win_rate": stats.get("win_rate", 0),
                "total_profit": stats.get("total_profit", 0),
                "pnl": stats.get("total_profit", 0),
                "sharpe_ratio": perf_data.get("sharpe_ratio", 0),
                "max_drawdown": perf_data.get("max_drawdown", 0),
                "volatility": perf_data.get("volatility", 0),
                "active_trades": position_manager.get_open_count(),
                "daily_pnl": perf_data.get("daily_pnl", 0),
                "monthly_pnl": perf_data.get("monthly_pnl", 0),
                "avg_profit": perf_data.get("avg_profit", 0),
                "completed_trades": stats.get("total_trades", 0),
                "winning_trades": stats.get("won_trades", 0),
                "avg_trade_duration": perf_data.get("avg_trade_duration", 0),
                "profit_factor": perf_data.get("profit_factor"),
                "best_day": perf_data.get("best_day"),
                "worst_day": perf_data.get("worst_day"),
                "risk_metrics": self.risk.get_risk_metrics(),
                "market_metrics": self.market_analyzer.get_market_metrics(),
                "strategy_performance": self.strategy_performance,
                "consensus_method": "ML" if settings.ML_CONSENSUS_ENABLED else "Traditional"
            }
            
            if settings.RECOVERY_ENABLED:
                base_metrics["recovery_metrics"] = self.risk.get_recovery_metrics()
                
                recovery_history = self.risk.recovery_history
                if recovery_history:
                    successful_recoveries = sum(1 for h in recovery_history if h.get('recovered', False))
                    base_metrics["recovery_stats"] = {
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
                elif hasattr(obj, 'item'):
                    return obj.item()
                elif isinstance(obj, (np.float32, np.float64, np.int32, np.int64)):
                    return float(obj) if isinstance(obj, (np.float32, np.float64)) else int(obj)
                else:
                    return obj
            
            return convert_to_serializable(base_metrics)
            
        except Exception as e:
            logger.error(f"Error getting bot metrics: {e}")
            return {
                "running": self.running,
                "total_trades": 0,
                "win_rate": 0,
                "pnl": 0,
                "sharpe_ratio": 0,
                "profit_factor": None,
                "best_day": None,
                "worst_day": None
            }

    # ===============================================================
    # RECOVERY SYSTEM CONTROL METHODS
    # ===============================================================
    def reset_recovery_system(self):
        self.risk.reset_streak()
        logger.info("Recovery system reset")
    
    def get_recovery_status(self) -> Dict:
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

    def get_recent_signals(self, limit: int = 10):
        return self.signal_history[-limit:] if self.signal_history else []
    

# Singleton bot instance
trading_bot = TradingBot()