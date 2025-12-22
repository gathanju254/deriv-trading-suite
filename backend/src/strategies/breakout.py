# backend/src/strategies/breakout.py
from .base_strategy import BaseStrategy
from typing import Dict, List
import numpy as np
from src.utils.logger import logger
from src.indicators.technical import atr, ema

class BreakoutStrategy(BaseStrategy):
    name = "breakout"

    def __init__(self, window=20, threshold=0.001, atr_period=14, confirmation_bars=2, optimize=True):
        self.window = window
        self.base_threshold = threshold
        self.atr_period = atr_period
        self.confirmation_bars = confirmation_bars
        self.optimize = optimize
        
        self.prices: List[float] = []
        self.highs: List[float] = []
        self.lows: List[float] = []
        self.performance_history = []
        self.signal_history = []
        
        # Adaptive parameters - BALANCED
        self.dynamic_threshold = threshold
        self.breakout_strength = 1.0
        self.recent_breakouts = []
        
        if optimize:
            self._optimize_parameters()

    def _optimize_parameters(self):
        """Optimize breakout parameters based on market volatility and performance"""
        if len(self.prices) < 25 or len(self.performance_history) < 3:
            return
            
        try:
            # Calculate market volatility using ATR
            if len(self.prices) >= self.atr_period:
                atr_values = atr(self.highs, self.lows, self.prices, self.atr_period)
                if atr_values:
                    current_atr = atr_values[-1]
                    avg_price = np.mean(self.prices[-10:])
                    
                    # Adjust threshold based on volatility (ATR as % of price) - BALANCED
                    atr_percentage = current_atr / avg_price if avg_price > 0 else 0.001
                    # More sensitive thresholds for synthetic indices
                    self.dynamic_threshold = max(0.0006, min(0.004, atr_percentage * 1.8))
            
            # Performance-based optimization
            if self.performance_history:
                recent_performance = self.performance_history[-8:]
                if recent_performance:
                    win_rate = sum(1 for p in recent_performance if p > 0) / len(recent_performance)
                    
                    if win_rate < 0.35:  # More lenient than 0.3
                        # Slightly increase threshold
                        self.dynamic_threshold *= 1.2  # Reduced from 1.3
                        logger.info(f"Breakout: Increased threshold to {self.dynamic_threshold:.6f}")
                    elif win_rate > 0.65:  # More lenient than 0.7
                        # Slightly decrease threshold
                        self.dynamic_threshold *= 0.85  # Reduced from 0.8
                        logger.info(f"Breakout: Decreased threshold to {self.dynamic_threshold:.6f}")
            
            # Analyze recent breakout success
            if self.recent_breakouts:
                successful_breakouts = sum(1 for b in self.recent_breakouts if b)
                success_rate = successful_breakouts / len(self.recent_breakouts) if self.recent_breakouts else 0
                
                # Adjust breakout strength based on success rate
                if success_rate > 0:
                    self.breakout_strength = max(0.6, min(1.8, success_rate * 1.5))  # Less extreme
                
        except Exception as e:
            logger.error(f"Breakout optimization error: {e}")

    def _calculate_volume_confirmation(self, current_high: float, current_low: float) -> float:
        """Calculate volume/price confirmation for breakouts"""
        if len(self.prices) < 8:
            return 1.0
            
        # Simple momentum confirmation (price acceleration)
        recent_returns = [self.prices[i] / self.prices[i-1] - 1 for i in range(-4, 0) if i < -1]
        if not recent_returns:
            return 1.0
            
        momentum = np.mean(recent_returns)
        volatility = np.std(recent_returns) if len(recent_returns) > 1 else 0.001
        
        # Strong momentum with low volatility = better breakout
        if abs(momentum) > volatility * 1.8:  # Reduced from 2.0
            return 1.15  # Reduced boost
        elif abs(momentum) < volatility * 0.6:  # Increased from 0.5
            return 0.85  # Reduced penalty
            
        return 1.0

    def _is_fake_breakout(self, price: float, breakout_type: str) -> bool:
        """Detect potential fake breakouts - more permissive"""
        if len(self.prices) < 8:
            return False
            
        # Check if price quickly reverses after breakout
        if breakout_type == "up":
            # For upward breakout, check if price falls back below recent high
            recent_high = max(self.prices[-5:-1])
            return price < recent_high * 0.998  # More permissive (0.998 vs 0.999)
        else:
            # For downward breakout, check if price rises back above recent low
            recent_low = min(self.prices[-5:-1])
            return price > recent_low * 1.002  # More permissive (1.002 vs 1.001)

    def on_tick(self, tick: Dict):
        price = float(tick["quote"])
        self.prices.append(price)
        
        # Track highs and lows (simplified - using same as price for now)
        self.highs.append(price)
        self.lows.append(price)
        
        # Maintain reasonable data size
        if len(self.prices) > 150:
            self.prices = self.prices[-150:]
            self.highs = self.highs[-150:]
            self.lows = self.lows[-150:]
        
        if len(self.prices) < self.window:
            return None
            
        window_vals = self.prices[-self.window:]
        current_high = max(window_vals)
        current_low = min(window_vals)
        
        # Calculate confirmation strength
        confirmation_strength = self._calculate_volume_confirmation(current_high, current_low)
        
        signals = []
        
        # Upward breakout with confirmation → RISE signal
        if price >= current_high * (1 + self.dynamic_threshold):
            if not self._is_fake_breakout(price, "up"):
                base_score = 0.75 * self.breakout_strength * confirmation_strength  # Increased from 0.7
                final_score = min(0.92, base_score)  # Reduced from 0.95
                signals.append(("RISE", final_score, "up_breakout"))
        
        # Downward breakout with confirmation → FALL signal
        if price <= current_low * (1 - self.dynamic_threshold):
            if not self._is_fake_breakout(price, "down"):
                base_score = 0.75 * self.breakout_strength * confirmation_strength  # Increased from 0.7
                final_score = min(0.92, base_score)  # Reduced from 0.95
                signals.append(("FALL", final_score, "down_breakout"))
        
        # Multi-timeframe confirmation (if we have enough data)
        if len(self.prices) >= self.window * 1.5:  # Reduced from 2
            larger_window = self.prices[-int(self.window*1.5):-self.window]
            if larger_window:
                larger_high = max(larger_window)
                larger_low = min(larger_window)
                
                # Breakout from larger timeframe resistance → RISE signal
                if price >= larger_high * (1 + self.dynamic_threshold * 0.6):  # Increased from 0.5
                    signals.append(("RISE", 0.75, "larger_tf_breakout"))  # Reduced from 0.8
                    
                # Breakout from larger timeframe support → FALL signal
                if price <= larger_low * (1 - self.dynamic_threshold * 0.6):  # Increased from 0.5
                    signals.append(("FALL", 0.75, "larger_tf_breakout"))  # Reduced from 0.8
        
        # Take the strongest signal
        if signals:
            signals.sort(key=lambda x: x[1], reverse=True)
            side, strength, breakout_type = signals[0]
            
            # Store signal for tracking
            self.signal_history.append({
                "timestamp": tick.get("epoch"),
                "side": side,
                "score": strength,
                "breakout_type": breakout_type,
                "threshold_used": self.dynamic_threshold,
                "price": price
            })
            
            # Track this breakout for optimization
            self.recent_breakouts.append(True)
            if len(self.recent_breakouts) > 15:  # Reduced from 20
                self.recent_breakouts = self.recent_breakouts[-15:]
            
            return {
                "side": side, 
                "score": strength, 
                "meta": {
                    "breakout_type": breakout_type,
                    "dynamic_threshold": round(self.dynamic_threshold, 6),
                    "breakout_strength": round(self.breakout_strength, 2),
                    "confirmation_strength": round(confirmation_strength, 2),
                    "strategy": self.name
                }
            }
        
        return None

    def update_performance(self, trade_result: str, profit: float):
        """Update strategy performance for optimization"""
        self.performance_history.append(profit)
        
        # Update recent breakouts success rate
        if self.recent_breakouts:
            self.recent_breakouts[-1] = profit > 0
        
        if self.optimize and len(self.performance_history) % 4 == 0:  # More frequent
            self._optimize_parameters()

    def get_strategy_metrics(self) -> Dict:
        """Get strategy performance metrics"""
        if not self.performance_history:
            return {}
            
        wins = sum(1 for p in self.performance_history if p > 0)
        losses = sum(1 for p in self.performance_history if p < 0)
        total_trades = len(self.performance_history)
        win_rate = wins / total_trades if total_trades > 0 else 0
        
        # Analyze breakout types
        breakout_types = {}
        for signal in self.signal_history[-40:]:  # Reduced from 50
            br_type = signal.get("breakout_type", "unknown")
            breakout_types[br_type] = breakout_types.get(br_type, 0) + 1
        
        # Calculate breakout success rate
        success_rate = sum(self.recent_breakouts) / len(self.recent_breakouts) if self.recent_breakouts else 0
        
        return {
            "total_signals": len(self.signal_history),
            "total_trades": total_trades,
            "win_rate": round(win_rate, 3),
            "breakout_success_rate": round(success_rate, 3),
            "current_threshold": round(self.dynamic_threshold, 6),
            "breakout_strength": round(self.breakout_strength, 2),
            "avg_profit": round(np.mean(self.performance_history) if self.performance_history else 0, 4),
            "breakout_types": breakout_types,
            "recent_performance": self.performance_history[-8:] if len(self.performance_history) >= 8 else self.performance_history
        }