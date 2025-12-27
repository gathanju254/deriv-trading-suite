# backend/src/trading/bot.py
import asyncio
import time
from typing import Dict
from datetime import datetime
import uuid  # Add this import at the top

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
from src.config.settings import settings

# WebSocket broadcasting
from src.api.websocket import (
    broadcast_balance_update,
    broadcast_performance_update,
    broadcast_trade_update,
    broadcast_signal
)

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
        self._bot_task = None  # Add this to track the bot task
        self._last_tick_time = 0
        self.min_tick_interval = 0.05
        self.last_trade_time = 0
        self.min_trade_interval = 15
        self.latest_price = None

        # CHANGED: Uses RISE/FALL instead of CALL/PUT
        self.strategy_performance = {
            strat.name: {"rise": 0, "fall": 0, "success": 0}
            for strat in self.strategies
        }

        self.signal_history = []
        self.signal_counter = 0
        self.session_open = None

    # ===============================================================  
    # 📡 TICK HANDLER WITH WEBSOCKET BROADCASTING
    # ===============================================================  
    async def _tick_handler(self, msg: Dict):
        """Unified tick handler with proper signal processing - USING RISE/FALL"""
        try:
            if not self.running:
                logger.debug("Bot not running, skipping tick processing")
                return
            
            # ======== TICK THROTTLE ========
            current_time = time.time()
            if current_time - self._last_tick_time < self.min_tick_interval:
                return
            self._last_tick_time = current_time
            # ================================
            
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

            # 3. STRATEGY SIGNAL EXTRACTION - CONVERTING TO RISE/FALL
            signals = []
            for strat in self.strategies:
                try:
                    sig = strat.on_tick({"quote": price, "symbol": settings.SYMBOL, "epoch": tick.get("epoch", int(time.time()))})
                    if sig:
                        # CHANGED: Convert CALL/PUT to RISE/FALL
                        original_side = sig.get("side", "").upper()
                        if original_side == "CALL":
                            converted_side = "RISE"
                        elif original_side == "PUT":
                            converted_side = "FALL"
                        else:
                            converted_side = original_side
                        
                        # Normalize signal format for consensus
                        normalized_signal = {
                            "side": converted_side,  # USING RISE/FALL
                            "score": float(sig.get("score", 0)),
                            "meta": sig.get("meta", {}),
                            "strategy": strat.name
                        }
                        signals.append(normalized_signal)
                except Exception as e:
                    logger.debug(f"[{strat.name}] Signal error: {e}")
        
            if signals:
                if len(self.signal_history) > 1000:
                    self.signal_history = self.signal_history[-1000:]

                logger.info(f"📊 Got {len(signals)} signals from strategies")

                # STORE AND BROADCAST SIGNALS - USING RISE/FALL
                for sig in signals:
                    signal_data = {
                        "id": str(uuid.uuid4()),  # Use UUID for guaranteed uniqueness instead of counter + timestamp
                        "direction": sig.get("side") or "UNKNOWN",  # RISE/FALL
                        "confidence": float(sig.get("score", 0)),
                        "price": price,
                        "symbol": symbol,
                        "timestamp": tick.get("epoch", int(time.time())),
                        "strategy": sig.get("strategy", "unknown"),
                        "message": f"{sig.get('side', 'UNKNOWN')} signal from {sig.get('strategy', 'unknown')}",
                        "score": sig.get("score", 0)
                    }

                    try:
                        self.signal_history.append(signal_data)
                        self.signal_counter += 1
                        
                        # Track strategy performance
                        strat_name = sig.get("strategy")
                        if strat_name in self.strategy_performance:
                            if sig["side"] == "RISE":
                                self.strategy_performance[strat_name]["rise"] += 1
                            elif sig["side"] == "FALL":
                                self.strategy_performance[strat_name]["fall"] += 1
                                

                        # BROADCAST SIGNAL VIA WEBSOCKET
                        await broadcast_signal(signal_data)
                        logger.debug(f"📡 Signal broadcasted: {signal_data['direction']} from {strat_name}")
                                

                    except Exception as e:
                        logger.warning(f"Failed to process signal: {e}")

            else:
                logger.info("📡 No signals from strategies")

            # 4. CONSENSUS (USING SINGLE CONSENSUS INSTANCE) - NOW USING RISE/FALL
            consensus = self.consensus.aggregate(signals, price, self.session_open)

            logger.debug(f"Signals count: {len(signals)}")
            logger.debug(f"Consensus score: {consensus.get('score', 0) if consensus else 'No consensus'}")

            if consensus:
                # CHANGED: Convert consensus side from CALL/PUT to RISE/FALL
                consensus_side = consensus["side"]
                if consensus_side == "CALL":
                    consensus["side"] = "RISE"
                elif consensus_side == "PUT":
                    consensus["side"] = "FALL"
                    
                logger.info(f"✅ CONSENSUS PASSED → {consensus['side']}")
            else:
                logger.info(f"❌ CONSENSUS FAILED - No consensus from {len(signals)} signals")
                return

            if consensus.get("sources", 0) < 1:
                return
            
            # ======== MARKET REGIME-AWARE CONSENSUS THRESHOLDS ========
            market_regime = market_status.get('regime')

            # Check if this is a single trusted signal (already validated by consensus)
            if consensus.get("method") == "single_trusted_signal":
                # Single trusted signal is always acceptable regardless of regime
                logger.info(f"✅ Accepting single trusted signal from {consensus.get('strategies', ['unknown'])[0]}")
                min_consensus_score = consensus.get("score", 0)  # Use the signal's own score
            elif market_regime == "RANGING":
                # In ranging markets, require at least 1 strong signal
                min_consensus_score = 0.70
                if consensus.get("sources", 0) < 1:
                    logger.info(f"❌ Need at least 1 strong signal in RANGING market, got {consensus.get('sources', 0)}")
                    return
            elif market_regime == "TRENDING":
                # In trending markets, require 2+ signals
                min_consensus_score = 0.60
                if consensus.get("sources", 0) < 2:
                    logger.info(f"❌ Need at least 2 signals in TRENDING market, got {consensus.get('sources', 0)}")
                    return
            else:
                # Default: require 2+ signals
                min_consensus_score = 0.65
                if consensus.get("sources", 0) < 2:
                    logger.info(f"❌ Need at least 2 signals, got {consensus.get('sources', 0)}")
                    return
            # ===========================================================
            
            if consensus["score"] < min_consensus_score:
                logger.info(f"❌ Consensus score too low for regime {market_regime}: {consensus['score']} < {min_consensus_score}")
                return

            logger.info(f"✅ CONSENSUS OK → {consensus['side']} | Market Regime: {market_regime}, Score: {consensus['score']:.2f}")

            # 5. RISK MANAGER CHECKS
            try:
                balance = await deriv.get_balance()
                # BROADCAST BALANCE UPDATE
                await broadcast_balance_update(balance)
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

            # 7. EXECUTE TRADE - USING RISE/FALL
            side = consensus["side"]  # RISE or FALL
            logger.info(
                f"🚀 EXECUTING TRADE: side={side}, amount={trade_amount}, "
                f"method={consensus.get('method')}, regime={market_regime}"
            )

            try:
                # CHANGED: Convert RISE/FALL back to CALL/PUT for order execution
                # Some broker APIs use CALL/PUT terminology
                order_side = "CALL" if side == "RISE" else "PUT"
                
                trade_id = await order_executor.place_trade(
                    side=order_side,  # Using CALL/PUT for API
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
                    "market_regime": market_regime,
                    "volatility": market_status.get("volatility"),
                    "trend_strength": market_status.get("trend_strength"),
                    "recovery_data": recovery_metrics if settings.RECOVERY_ENABLED else None,
                    "side": side,  # Store RISE/FALL
                    "order_side": order_side,  # Store CALL/PUT used for order
                    "session_open": self.session_open,
                    "price_at_signal": price,  # Store actual price for ML training
                    "consensus_score": consensus["score"],
                    "min_required_score": min_consensus_score
                }

                for sig in signals:
                    strat_name = sig.get("strategy")
                    if strat_name in order_executor.trades[trade_id]["consensus_data"]["strategy_breakdown"]:
                        order_executor.trades[trade_id]["consensus_data"]["strategy_breakdown"][strat_name] += 1

                self.last_trade_time = time.time()
                logger.info(f"✅ Trade placed: {trade_id}")
                
                # BROADCAST TRADE UPDATE
                trade_data = {
                    "trade_id": trade_id,
                    "side": side,
                    "amount": trade_amount,
                    "symbol": settings.SYMBOL,
                    "status": "PENDING",
                    "timestamp": time.time(),
                    "consensus_score": consensus["score"]
                }
                await broadcast_trade_update(trade_data)
                logger.debug(f"📤 Trade broadcasted: {trade_id}")

            except Exception as e:
                logger.exception(f"❌ Trade execution failed: {e}")
        
        except Exception as e:
            logger.error(f"Error in _tick_handler: {e}")

    # ===============================================================  
    # MAIN BOT LOOP
    # ===============================================================  
    async def run(self):
        # Prevent multiple instances
        if self.running:
            logger.warning("Bot is already running")
            return
            
        self.running = True
        logger.info("🚀 Starting TradingBot (RISE/FALL version)...")
        logger.info("📊 Collecting initial market data (20 ticks required)...")
        
        if settings.RECOVERY_ENABLED:
            logger.info("🔧 RECOVERY SYSTEM ENABLED")
            logger.info(f"   Mode: {settings.RECOVERY_MODE}")
            logger.info(f"   Multiplier: {settings.RECOVERY_MULTIPLIER}")
            logger.info(f"   Max Streak: {settings.MAX_RECOVERY_STREAK}")
            logger.info(f"   Smart Recovery: {settings.SMART_RECOVERY}")
            logger.info(f"   Reset on Win: {settings.RESET_ON_WIN}")

        # Add connection retry logic
        max_retries = 3
        for attempt in range(max_retries):
            try:
                logger.info(f"Connection attempt {attempt + 1}/{max_retries}")
                
                # Connect to Deriv
                await deriv.connect()
                
                # Authorize with retry
                ok = await deriv.authorize()
                if not ok:
                    if attempt < max_retries - 1:
                        logger.warning(f"Authorization failed, retrying in {2**attempt} seconds...")
                        await asyncio.sleep(2**attempt)  # Exponential backoff
                        continue
                    else:
                        logger.error("❌ Authorization failed after all retries")
                        self.running = False
                        return
                        
                # Authorization successful, break retry loop
                break
                
            except Exception as e:
                logger.error(f"Connection attempt {attempt + 1} failed: {e}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(2**attempt)
                else:
                    logger.error("❌ All connection attempts failed")
                    self.running = False
                    return
        
        logger.info("✅ Connected and authorized to Deriv API")
        
        # Rest of your existing code...
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
            
            # BROADCAST INITIAL BALANCE
            await broadcast_balance_update(balance)
        except Exception as e:
            logger.error(f"Failed to start risk session: {e}")

        # Remove any existing tick handler first to prevent duplicates
        try:
            await deriv.remove_listener(self._tick_handler)
        except:
            pass  # It's okay if it doesn't exist yet

        # Then add it
        await deriv.add_listener(self._tick_handler)
        await deriv.subscribe_ticks(settings.SYMBOL)
        logger.info(f"📡 Subscribed to ticks: {settings.SYMBOL}")

        monitor_interval = 300
        last_monitor_time = 0
        cleanup_interval = 60
        last_cleanup = 0
        last_performance_broadcast = 0

        while self.running:
            now = asyncio.get_event_loop().time()

            if now - last_monitor_time > monitor_interval:
                await self._report_performance()
                last_monitor_time = now

            # Broadcast performance every 30 seconds
            if now - last_performance_broadcast > 30:
                await self._broadcast_performance_metrics()
                last_performance_broadcast = now

            if now - last_cleanup > cleanup_interval:
                await self._cleanup_expired_trades()
                last_cleanup = now

            # Health check: verify connection is still active
            if not deriv.authorized:
                logger.warning("⚠️ Connection lost, attempting to reconnect...")
                try:
                    await deriv.connect()
                    ok = await deriv.authorize()
                    if ok:
                        await deriv.subscribe_ticks(settings.SYMBOL)
                        logger.info("✅ Reconnected to Deriv API")
                    else:
                        logger.error("❌ Reauthorization failed")
                        await asyncio.sleep(5)
                        continue
                except Exception as e:
                    logger.error(f"Reconnection failed: {e}")
                    await asyncio.sleep(5)
                    continue

            await asyncio.sleep(1)

    async def stop(self):
        """Properly stop the bot"""
        if not self.running:
            logger.debug("Bot is already stopped")
            return
        
        logger.info("🛑 Stopping Trading Bot...")
        
        # Remove the listener FIRST to prevent any new tick processing
        try:
            await deriv.remove_listener(self._tick_handler)
            logger.debug("Tick handler listener removed")
        except Exception as e:
            logger.error(f"Error removing tick handler: {e}")
        
        # Then set running to False and cancel the task
        self.running = False
        
        if self._bot_task and not self._bot_task.done():
            self._bot_task.cancel()
            try:
                await self._bot_task
            except asyncio.CancelledError:
                pass
    
        logger.info("✅ Trading Bot stopped")

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
                
                # BROADCAST TRADE CLOSURE
                trade_data = {
                    "trade_id": trade.id,
                    "status": "LOST",
                    "profit": -trade.amount,
                    "timestamp": time.time()
                }
                await broadcast_trade_update(trade_data)

            db.commit()
            db.close()

            if expired:
                logger.info(f"Cleaned up {len(expired)} expired trades")
                # BROADCAST PERFORMANCE UPDATE AFTER CLEANUP
                await self._broadcast_performance_metrics()

        except Exception as e:
            logger.error(f"Error in cleanup: {e}")

    async def _broadcast_performance_metrics(self):
        """Broadcast performance metrics via WebSocket"""
        try:
            metrics = self.performance.get_performance_metrics()
            
            perf_data = {
                "win_rate": metrics.get('win_rate', 0),
                "pnl": metrics.get('total_profit', 0),
                "total_profit": metrics.get('total_profit', 0),
                "total_trades": metrics.get('total_trades', 0),
                "sharpe_ratio": metrics.get('sharpe_ratio', 0),
                "max_drawdown": metrics.get('max_drawdown', 0),
                "volatility": metrics.get('volatility', 0),
                "daily_pnl": metrics.get('daily_pnl', 0),
                "monthly_pnl": metrics.get('monthly_pnl', 0),
                "avg_profit": metrics.get('avg_profit', 0),
                "completed_trades": metrics.get('total_trades', 0),
                "winning_trades": metrics.get('winning_trades', 0),
                "profit_factor": metrics.get('profit_factor'),
                "best_day": metrics.get('best_day'),
                "worst_day": metrics.get('worst_day'),
                "timestamp": time.time()
            }
            
            await broadcast_performance_update(perf_data)
            logger.debug("📊 Performance metrics broadcasted via WebSocket")
            
        except Exception as e:
            logger.error(f"Failed to broadcast performance: {e}")

    async def _report_performance(self):
        """Report and broadcast performance metrics"""
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
            
            # Get net daily P&L
            net_daily_pnl = self.risk.get_net_daily_pnl()
            
            logger.info(f"Daily Profit     : ${net_daily_pnl['daily_profit']:.2f}")
            logger.info(f"Daily Loss       : ${net_daily_pnl['daily_loss']:.2f}")
            logger.info(f"Net Daily P&L    : ${net_daily_pnl['net_daily_pnl']:.2f} ({net_daily_pnl['net_daily_pnl_pct']:.1f}%)")
            
            # Add strategy performance summary
            logger.info("--- Strategy Performance (RISE/FALL) ---")
            for strat_name, perf in self.strategy_performance.items():
                total_signals = perf["rise"] + perf["fall"]
                if total_signals > 0:
                    rise_pct = (perf["rise"] / total_signals) * 100
                    fall_pct = (perf["fall"] / total_signals) * 100
                    logger.info(f"  {strat_name}: RISE={perf['rise']} ({rise_pct:.1f}%), FALL={perf['fall']} ({fall_pct:.1f}%)")
            
            logger.info("=================================================")

            # BROADCAST PERFORMANCE UPDATE
            await self._broadcast_performance_metrics()

        except Exception:
            logger.exception("Performance reporting error")

    def get_bot_metrics(self) -> Dict:
        """Get current bot performance metrics - SINGLE METHOD"""
        try:
            from src.db.repositories.trade_history_repo import TradeHistoryRepo
            from src.trading.performance import performance
            
            stats = TradeHistoryRepo.get_trading_stats()
            perf_data = performance.get_performance_summary()
            
            # Calculate rise/fall counts from signal history
            rise_count = sum(1 for sig in self.signal_history if sig.get("direction") == "RISE")
            fall_count = sum(1 for sig in self.signal_history if sig.get("direction") == "FALL")
            
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
                "consensus_method": "ML" if settings.ML_CONSENSUS_ENABLED else "Traditional",
                "signal_stats": {
                    "total_signals": len(self.signal_history),
                    "rise_signals": rise_count,
                    "fall_signals": fall_count,
                    "rise_percentage": (rise_count / len(self.signal_history) * 100) if self.signal_history else 0,
                    "fall_percentage": (fall_count / len(self.signal_history) * 100) if self.signal_history else 0
                }
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
        """Return the most recent signals from history"""
        return self.signal_history[-limit:] if self.signal_history else []
    
    # ===============================================================  
    # NEW: UPDATE STRATEGY PERFORMANCE
    # ===============================================================  
    def update_strategy_performance(self, trade_result: str, strategy_name: str, side: str):
        """Update strategy performance tracking"""
        if strategy_name in self.strategy_performance:
            if trade_result == "WON":
                self.strategy_performance[strategy_name]["success"] += 1
            # Note: We track rise/fall counts in _tick_handler


# Singleton bot instance
trading_bot = TradingBot()