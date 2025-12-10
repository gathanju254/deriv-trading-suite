# backend/src/core/market_analyzer.py
import numpy as np
from typing import Dict, List
from src.utils.logger import logger


class MarketAnalyzer:
    """
    Advanced Market Condition Analyzer
    - Volatility filtering
    - Trend strength analysis  
    - Market regime detection
    - Trading session awareness
    - Risk-on/risk-off detection
    """

    def __init__(self):
        self.recent_prices: List[float] = []
        self.max_history = 100
        self.volatility_threshold = 0.008  # 0.4% volatility threshold
        self.min_volatility_threshold = 0.00005  # Minimum volatility to trade
        self.trend_strength_threshold = 0.0001
        
        # Market state tracking
        self.consecutive_rejects = 0
        self.last_tradable_time = 0
        self.market_regime = "UNKNOWN"  # TRENDING, RANGING, VOLATILE, FLAT

    def analyze_market(self, price: float) -> Dict:
        """
        Comprehensive market analysis to determine if conditions are favorable for trading.
        
        Returns:
            Dict with 'tradable' boolean and 'reason' for rejection if applicable
        """
        
        # Track prices with size limit
        self.recent_prices.append(price)
        if len(self.recent_prices) > self.max_history:
            self.recent_prices.pop(0)

        # Need sufficient data for analysis
        if len(self.recent_prices) < 20:
            return {
                "tradable": True,  
                "reason": "Collecting price data",
                "regime": "DATA_COLLECTING",
                "volatility": 0.0,
                "trend_strength": 0.0
            }


        self.recent_prices.append(price)
        if len(self.recent_prices) > self.max_history:
            self.recent_prices.pop(0)

        # Need sufficient data for analysis
        if len(self.recent_prices) < 20:
            return {
                "tradable": True,  
                "reason": "Collecting price data",
                "regime": "DATA_COLLECTING",
                "volatility": 0.0,
                "trend_strength": 0.0
            }

        # ---------------------------------------------------------
        # 1. VOLATILITY ANALYSIS
        # ---------------------------------------------------------
        recent_volatility = self._calculate_volatility()
        
        # Too volatile - high risk
        if recent_volatility > self.volatility_threshold:
            self.market_regime = "VOLATILE"
            self.consecutive_rejects += 1
            return {
                "tradable": False, 
                "reason": f"High volatility: {recent_volatility:.4f}",
                "regime": self.market_regime
            }

        # Too flat - no movement
        if recent_volatility < self.min_volatility_threshold:
            self.market_regime = "FLAT"
            self.consecutive_rejects += 1
            return {
                "tradable": False, 
                "reason": f"Market too flat: {recent_volatility:.4f}",
                "regime": self.market_regime
            }

        # ---------------------------------------------------------
        # 2. TREND STRENGTH ANALYSIS
        # ---------------------------------------------------------
        trend_strength = self._calculate_trend_strength()
        
        if trend_strength < self.trend_strength_threshold:
            self.market_regime = "RANGING"
            self.consecutive_rejects += 1
            return {
                "tradable": False, 
                "reason": f"Weak trend strength: {trend_strength:.4f}",
                "regime": self.market_regime
            }

        # ---------------------------------------------------------
        # 3. PRICE STABILITY CHECK (avoid whipsaws)
        # ---------------------------------------------------------
        if not self._check_price_stability():
            self.consecutive_rejects += 1
            return {
                "tradable": False, 
                "reason": "Unstable price action (whipsaw detected)",
                "regime": "UNSTABLE"
            }

        # ---------------------------------------------------------
        # 4. MARKET REGIME CLASSIFICATION
        # ---------------------------------------------------------
        if trend_strength > self.trend_strength_threshold * 2:
            self.market_regime = "TRENDING"
        else:
            self.market_regime = "RANGING"

        # All checks passed - market is tradable
        self.consecutive_rejects = 0
        self.last_tradable_time = len(self.recent_prices)
        
        return {
            "tradable": True,
            "regime": self.market_regime,
            "volatility": recent_volatility,
            "trend_strength": trend_strength,
            "price": price
        }

    def _calculate_volatility(self) -> float:
        """Calculate normalized volatility as percentage of price"""
        if len(self.recent_prices) < 10:
            return 0.0
            
        price_range = max(self.recent_prices[-20:]) - min(self.recent_prices[-20:])
        avg_price = np.mean(self.recent_prices[-20:])
        
        if avg_price == 0:
            return 0.0
            
        return price_range / avg_price

    def _calculate_trend_strength(self) -> float:
        """Calculate trend strength using multiple timeframes"""
        if len(self.recent_prices) < 20:
            return 0.0

        # Fast SMA (5 periods)
        sma_fast = np.mean(self.recent_prices[-5:])
        
        # Slow SMA (20 periods)  
        sma_slow = np.mean(self.recent_prices[-20:])
        
        # Medium SMA (10 periods) for confirmation
        sma_medium = np.mean(self.recent_prices[-10:])
        
        avg_price = np.mean(self.recent_prices[-20:])
        if avg_price == 0:
            return 0.0

        # Calculate trend strength from multiple SMA comparisons
        trend_strength_fast_slow = abs(sma_fast - sma_slow) / avg_price
        trend_strength_medium_slow = abs(sma_medium - sma_slow) / avg_price
        
        # Use the stronger trend signal
        trend_strength = max(trend_strength_fast_slow, trend_strength_medium_slow)
        
        return trend_strength

    def _check_price_stability(self) -> bool:
        """Optimized price stability filter for Deriv synthetic indices."""

        # Need minimum history
        if len(self.recent_prices) < 12:
            return True

        # ---- 1. Price change (volatility) check ----
        recent_changes = []
        for i in range(1, 12):
            p1 = self.recent_prices[-i]
            p0 = self.recent_prices[-i-1]
            change = abs(p1 - p0) / max(p0, 1e-9)
            recent_changes.append(change)

        avg_change = sum(recent_changes) / len(recent_changes)

        # ⚠ Synthetic indices normally have tiny micro-volatility
        # Block only EXTREME chop (0.8% jump tick-to-tick)
        if avg_change > 0.008:   # 0.8%
            return False

        # ---- 2. Direction stability check ----
        directions = []
        for i in range(1, 8):
            if self.recent_prices[-i] > self.recent_prices[-i-1]:
                directions.append(1)
            else:
                directions.append(-1)

        # Count direction flips
        direction_changes = sum(
            1 for i in range(1, len(directions)) if directions[i] != directions[i-1]
        )

        flip_ratio = direction_changes / len(directions)

        # ✔ Allow up to 85% micro-flips (R_100 is choppy)
        # Only filter out *extreme* alternating up-down-up-down movement
        if flip_ratio > 0.85:
            return False

        return True

    def get_market_metrics(self) -> Dict:
        """Get comprehensive market metrics for monitoring"""
        if len(self.recent_prices) < 20:
            return {
                "regime": "UNKNOWN",
                "volatility": 0.0,
                "trend_strength": 0.0,
                "consecutive_rejects": self.consecutive_rejects,
                "data_points": len(self.recent_prices)
            }
            
        return {
            "regime": self.market_regime,
            "volatility": self._calculate_volatility(),
            "trend_strength": self._calculate_trend_strength(),
            "current_price": self.recent_prices[-1] if self.recent_prices else 0,
            "consecutive_rejects": self.consecutive_rejects,
            "data_points": len(self.recent_prices)
        }

    def reset(self):
        """Reset analyzer state"""
        self.recent_prices.clear()
        self.consecutive_rejects = 0
        self.last_tradable_time = 0
        self.market_regime = "UNKNOWN"
        logger.info("MarketAnalyzer reset complete")


# Global instance
market_analyzer = MarketAnalyzer()