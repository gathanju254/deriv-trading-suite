# backend/src/strategies/momentum.py
from .base_strategy import BaseStrategy
from src.indicators.technical import rsi, ema, macd
from typing import Dict, List
import numpy as np
from src.utils.logger import logger

class MomentumStrategy(BaseStrategy):
    name = "momentum"

    def __init__(self, rsi_period=14, overbought=75, oversold=25, macd_fast=12, macd_slow=26, macd_signal=9, optimize=True):
        self.rsi_period = rsi_period
        self.overbought = overbought
        self.oversold = oversold
        self.macd_fast = macd_fast
        self.macd_slow = macd_slow
        self.macd_signal = macd_signal
        self.optimize = optimize
        
        self.prices: List[float] = []
        self.performance_history = []
        self.signal_history = []
        self.parameter_history = []
        
        # Adaptive thresholds - BALANCED
        self.dynamic_overbought = 72  # Reasonable threshold
        self.dynamic_oversold = 28    # Reasonable threshold
        
        if optimize:
            self._optimize_parameters()

    def _optimize_parameters(self):
        """Optimize RSI parameters based on recent performance"""
        if len(self.performance_history) < 15:
            return
            
        try:
            # Simple optimization: adjust thresholds based on win rate
            recent_performance = self.performance_history[-15:]
            win_rate = sum(1 for p in recent_performance if p > 0) / len(recent_performance)
            
            if win_rate < 0.35:
                # If losing, tighten thresholds moderately
                self.dynamic_overbought = max(68, self.dynamic_overbought - 3)
                self.dynamic_oversold = min(32, self.dynamic_oversold + 3)
                logger.info(f"Momentum: Adjusted thresholds to {self.dynamic_overbought}/{self.dynamic_oversold}")
            elif win_rate > 0.65:
                # If winning, widen thresholds moderately
                self.dynamic_overbought = min(78, self.dynamic_overbought + 3)
                self.dynamic_oversold = max(22, self.dynamic_oversold - 3)
                logger.info(f"Momentum: Adjusted thresholds to {self.dynamic_overbought}/{self.dynamic_oversold}")
            else:
                # Reset to balanced defaults
                self.dynamic_overbought = 72
                self.dynamic_oversold = 28
                
        except Exception as e:
            logger.error(f"Momentum optimization error: {e}")

    def _calculate_macd_signal(self, prices: List[float]) -> float:
        """Calculate MACD signal for additional confirmation"""
        if len(prices) < self.macd_slow + 10:
            return 0
            
        macd_result = macd(prices, self.macd_fast, self.macd_slow, self.macd_signal)
        if not macd_result:
            return 0
            
        # Return MACD line value (difference between fast and slow EMA)
        return macd_result[-1][0]  # macd_line value

    def on_tick(self, tick: Dict):
        price = float(tick["quote"])
        self.prices.append(price)
        
        # Keep only recent data for efficiency
        if len(self.prices) > 120:
            self.prices = self.prices[-120:]
        
        if len(self.prices) < self.rsi_period + 1:
            return None
        
        # Calculate RSI with debug logging
        rsivals = rsi(self.prices, self.rsi_period)
        if not rsivals:
            logger.debug(f"Momentum: Not enough data for RSI calculation")
            return None
            
        latest_rsi = rsivals[-1]
        
        # ADD DEBUG LOGGING:
        logger.debug(f"Momentum RSI: {latest_rsi:.2f}, Prices: {self.prices[-5:]}")
        
        # Calculate MACD for confirmation
        macd_signal = self._calculate_macd_signal(self.prices)
        
        # Enhanced momentum logic with multiple conditions
        signal_strength = 0.0
        side = None
        
        # RSI overbought + MACD negative = Strong FALL signal
        if latest_rsi > self.dynamic_overbought and macd_signal < 0:
            signal_strength = 0.85  # Reduced from 0.9
            side = "FALL"
            logger.debug(f"Momentum: Strong FALL signal - RSI:{latest_rsi:.2f} > {self.dynamic_overbought}, MACD:{macd_signal:.4f} < 0")
            
        # RSI oversold + MACD positive = Strong RISE signal  
        elif latest_rsi < self.dynamic_oversold and macd_signal > 0:
            signal_strength = 0.85  # Reduced from 0.9
            side = "RISE"
            logger.debug(f"Momentum: Strong RISE signal - RSI:{latest_rsi:.2f} < {self.dynamic_oversold}, MACD:{macd_signal:.4f} > 0")
            
        # Standard RSI signals
        elif latest_rsi > self.dynamic_overbought:
            signal_strength = 0.7
            side = "FALL"
            logger.debug(f"Momentum: Standard FALL signal - RSI:{latest_rsi:.2f} > {self.dynamic_overbought}")
            
        elif latest_rsi < self.dynamic_oversold:
            signal_strength = 0.7
            side = "RISE"
            logger.debug(f"Momentum: Standard RISE signal - RSI:{latest_rsi:.2f} < {self.dynamic_oversold}")
            
        # RSI divergence detection with reasonable thresholds
        elif len(rsivals) >= 5:
            # Check for bearish divergence (price higher, RSI lower) → FALL signal
            if (price > self.prices[-2] and latest_rsi < rsivals[-2] and 
                latest_rsi > 62 and price > np.mean(self.prices[-5:])):
                signal_strength = 0.65  # Increased from 0.6
                side = "FALL"
                logger.debug(f"Momentum: Bearish divergence - Price up, RSI down")
                
            # Check for bullish divergence (price lower, RSI higher) → RISE signal
            elif (price < self.prices[-2] and latest_rsi > rsivals[-2] and 
                  latest_rsi < 38 and price < np.mean(self.prices[-5:])):
                signal_strength = 0.65  # Increased from 0.6
                side = "RISE"
                logger.debug(f"Momentum: Bullish divergence - Price down, RSI up")
        
        if side:
            # Store signal for performance tracking
            self.signal_history.append({
                "timestamp": tick.get("epoch"),
                "side": side,
                "score": signal_strength,
                "rsi": latest_rsi,
                "macd": macd_signal,
                "price": price
            })
            
            logger.info(f"Momentum signal generated: {side} @ {signal_strength:.2f}, RSI:{latest_rsi:.2f}")
            
            return {
                "side": side, 
                "score": signal_strength, 
                "meta": {
                    "rsi": latest_rsi,
                    "macd": macd_signal,
                    "dynamic_thresholds": f"{self.dynamic_overbought}/{self.dynamic_oversold}",
                    "strategy": self.name
                }
            }
        
        return None

    def update_performance(self, trade_result: str, profit: float):
        """Update strategy performance for optimization"""
        self.performance_history.append(profit)
        
        if self.optimize and len(self.performance_history) % 8 == 0:  # Less frequent optimization
            self._optimize_parameters()

    def get_strategy_metrics(self) -> Dict:
        """Get strategy performance metrics"""
        if not self.performance_history:
            return {}
            
        wins = sum(1 for p in self.performance_history if p > 0)
        losses = sum(1 for p in self.performance_history if p < 0)
        total_trades = len(self.performance_history)
        win_rate = wins / total_trades if total_trades > 0 else 0
        
        # Calculate MACD success rate
        macd_correct = 0
        macd_total = 0
        for signal in self.signal_history[-50:]:
            rsi_val = signal.get("rsi", 0)
            macd_val = signal.get("macd", 0)
            if rsi_val > self.dynamic_overbought and macd_val < 0:
                macd_total += 1
            elif rsi_val < self.dynamic_oversold and macd_val > 0:
                macd_total += 1
        
        return {
            "total_signals": len(self.signal_history),
            "total_trades": total_trades,
            "win_rate": round(win_rate, 3),
            "current_thresholds": f"{self.dynamic_overbought}/{self.dynamic_oversold}",
            "avg_profit": round(np.mean(self.performance_history) if self.performance_history else 0, 4),
            "recent_performance": self.performance_history[-10:] if len(self.performance_history) >= 10 else self.performance_history,
            "macd_confirmation_rate": f"{macd_correct}/{macd_total}" if macd_total > 0 else "N/A"
        }