# backend/src/strategies/mean_reversion.py
from .base_strategy import BaseStrategy
from src.indicators.technical import ema, bollinger_bands
from typing import Dict, List, Tuple
import numpy as np
from src.utils.logger import logger

class MeanReversionStrategy(BaseStrategy):
    name = "mean_reversion"

    def __init__(
        self,
        ema_short: int = 5,
        ema_long: int = 20,
        bb_period: int = 20,
        bb_std: float = 2.0,
        reversal_threshold: float = 0.0005,
        optimize: bool = True
    ):
        self.ema_short = int(ema_short)
        self.ema_long = int(ema_long)
        self.bb_period = int(bb_period)
        self.bb_std = float(bb_std)
        self.reversal_threshold = float(reversal_threshold)
        self.optimize = bool(optimize)

        self.prices: List[float] = []
        self.performance_history: List[float] = []
        self.signal_history: List[Dict] = []

        # Adaptive parameters - BALANCED (not too conservative)
        self.dynamic_threshold = self.reversal_threshold
        self.volatility_adjustment = 1.0

        if self.optimize:
            try:
                self._optimize_parameters()
            except Exception:
                logger.exception("MeanReversion: initial optimization failed")

    def _optimize_parameters(self):
        """Optimize parameters based on market conditions and performance"""
        if len(self.prices) < 30 or len(self.performance_history) < 5:
            return

        try:
            # Calculate recent volatility
            recent_prices = self.prices[-15:]
            returns = [recent_prices[i] / recent_prices[i - 1] - 1 for i in range(1, len(recent_prices))]
            volatility = np.std(returns) if returns else 0.001

            # Adjust threshold based on volatility - BALANCED
            self.volatility_adjustment = max(0.8, min(1.5, volatility * 800))
            
            # BALANCED: Reasonable thresholds for synthetic indices
            self.dynamic_threshold = max(0.0003, min(0.003, volatility * 1.2))

            # Performance-based optimization
            recent_performance = self.performance_history[-10:]
            if recent_performance:
                win_rate = sum(1 for p in recent_performance if p > 0) / len(recent_performance)

                if win_rate < 0.35:
                    # Increase threshold slightly to reduce false signals
                    self.dynamic_threshold *= 1.1
                    logger.info(f"MeanReversion: Increased threshold to {self.dynamic_threshold:.6f} due to poor performance")
                elif win_rate > 0.65:
                    # Decrease threshold for more signals
                    self.dynamic_threshold *= 0.9
                    logger.info(f"MeanReversion: Decreased threshold to {self.dynamic_threshold:.6f} due to good performance")

            logger.info(f"MeanReversion: Dynamic threshold adjusted to {self.dynamic_threshold:.6f}")

        except Exception as e:
            logger.error(f"MeanReversion optimization error: {e}")

    def _calculate_bollinger_signal(self, prices: List[float]) -> Dict:
        """Calculate Bollinger Bands signals (robust unpacking)"""
        result: Dict = {}

        if len(prices) < self.bb_period:
            return result

        bb = bollinger_bands(prices, self.bb_period, self.bb_std)
        if not bb:
            return result

        # bb is a list of tuples: [(upper, middle, lower), ...]
        try:
            # unzip into three sequences
            uppers, middles, lowers = zip(*bb)
        except Exception:
            # defensive fallback: if structure unexpected, try to read last tuple only
            try:
                last = bb[-1]
                if len(last) >= 3:
                    upper_last, middle_last, lower_last = last[0], last[1], last[2]
                    uppers, middles, lowers = ( (upper_last,), (middle_last,), (lower_last,) )
                else:
                    return result
            except Exception:
                return result

        # safe access to last and previous elements
        upper_last = uppers[-1]
        middle_last = middles[-1]
        lower_last = lowers[-1]

        # compute previous middle when available
        middle_prev = middles[-2] if len(middles) >= 2 else middle_last
        # current price
        current_price = prices[-1]

        # Price near upper band -> potential reversal down → FALL signal
        # Use 99% of band for better sensitivity
        if current_price >= upper_last * 0.99:
            result["side"] = "FALL"
            result["strength"] = 0.75  # Reduced from 0.8
            result["band_position"] = "upper"

        # Price near lower band -> potential reversal up → RISE signal
        elif current_price <= lower_last * 1.01:
            result["side"] = "RISE"
            result["strength"] = 0.75  # Reduced from 0.8
            result["band_position"] = "lower"

        # Price crossing middle band upward → RISE signal
        elif (len(prices) >= 2) and (prices[-2] < middle_prev and current_price > middle_last):
            result["side"] = "RISE"
            result["strength"] = 0.6
            result["band_position"] = "middle_up"

        # Price crossing middle band downward → FALL signal
        elif (len(prices) >= 2) and (prices[-2] > middle_prev and current_price < middle_last):
            result["side"] = "FALL"
            result["strength"] = 0.6
            result["band_position"] = "middle_down"

        return result

    def on_tick(self, tick: Dict):
        price = float(tick["quote"])
        self.prices.append(price)

        # Maintain reasonable data size
        if len(self.prices) > 150:
            self.prices = self.prices[-150:]

        # Need enough data for calculations
        if len(self.prices) < max(self.ema_long, self.bb_period):
            return None

        # Calculate EMAs
        es = ema(self.prices, self.ema_short)
        el = ema(self.prices, self.ema_long)
        if not es or not el:
            return None

        short_ema = es[-1]
        long_ema = el[-1]

        # Calculate Bollinger Bands signal
        bb_signal = self._calculate_bollinger_signal(self.prices)

        # Enhanced mean reversion logic
        signals: List[tuple] = []

        # price to long ratio
        price_to_long_ratio = (price - long_ema) / long_ema if long_ema != 0 else 0.0

        # Strong FALL signal: Price significantly above long EMA + Bollinger upper band
        if (price_to_long_ratio > self.dynamic_threshold and
            bb_signal.get("band_position") in ["upper", "middle_down"]):
            strength = bb_signal.get("strength", 0.7) + 0.1
            signals.append(("FALL", strength, "ema_bb_confirmation"))

        # Strong RISE signal: Price significantly below long EMA + Bollinger lower band
        elif (price_to_long_ratio < -self.dynamic_threshold and
              bb_signal.get("band_position") in ["lower", "middle_up"]):
            strength = bb_signal.get("strength", 0.7) + 0.1
            signals.append(("RISE", strength, "ema_bb_confirmation"))

        # Standard EMA mean reversion - BALANCED thresholds
        elif price_to_long_ratio > self.dynamic_threshold:
            signals.append(("FALL", 0.65, "ema_reversion"))  # Increased from 0.6

        elif price_to_long_ratio < -self.dynamic_threshold:
            signals.append(("RISE", 0.65, "ema_reversion"))  # Increased from 0.6

        # Bollinger Band standalone signals (strong ones only)
        elif bb_signal and bb_signal.get("strength", 0) >= 0.7:  # Reduced from 0.8
            signals.append((bb_signal["side"], bb_signal["strength"], "bollinger"))

        # Take the strongest signal
        if signals:
            # Sort by strength and take the strongest
            signals.sort(key=lambda x: x[1], reverse=True)
            side, strength, signal_type = signals[0]

            # Store signal for tracking
            self.signal_history.append({
                "timestamp": tick.get("epoch"),
                "side": side,
                "score": strength,
                "signal_type": signal_type,
                "price_ema_ratio": price_to_long_ratio,
                "price": price
            })

            return {
                "side": side,
                "score": strength,
                "meta": {
                    "price_ema_ratio": round(price_to_long_ratio, 6),
                    "signal_type": signal_type,
                    "dynamic_threshold": self.dynamic_threshold,
                    "volatility_adjustment": self.volatility_adjustment,
                    "strategy": self.name
                }
            }

        return None

    def update_performance(self, trade_result: str, profit: float):
        """Update strategy performance for optimization"""
        try:
            self.performance_history.append(float(profit))
            # keep bounded history
            if len(self.performance_history) > 150:
                self.performance_history = self.performance_history[-150:]
            if self.optimize and len(self.performance_history) % 3 == 0:  # More frequent optimization
                self._optimize_parameters()
        except Exception:
            logger.exception("MeanReversion.update_performance failed")

    def get_strategy_metrics(self) -> Dict:
        """Get strategy performance metrics"""
        if not self.performance_history:
            return {}

        wins = sum(1 for p in self.performance_history if p > 0)
        losses = sum(1 for p in self.performance_history if p < 0)
        total_trades = len(self.performance_history)
        win_rate = wins / total_trades if total_trades > 0 else 0

        # Analyze signal types
        signal_types: Dict[str, int] = {}
        for signal in self.signal_history[-50:]:
            sig_type = signal.get("signal_type", "unknown")
            signal_types[sig_type] = signal_types.get(sig_type, 0) + 1

        return {
            "total_signals": len(self.signal_history),
            "total_trades": total_trades,
            "win_rate": round(win_rate, 3),
            "current_threshold": round(self.dynamic_threshold, 6),
            "volatility_adjustment": round(self.volatility_adjustment, 3),
            "avg_profit": round(np.mean(self.performance_history) if self.performance_history else 0, 4),
            "signal_types": signal_types,
            "recent_performance": self.performance_history[-10:] if len(self.performance_history) >= 10 else self.performance_history
        }