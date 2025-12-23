# backend/src/strategies/momentum.py
from .base_strategy import BaseStrategy
from src.indicators.technical import rsi, ema, macd
from typing import Dict, List
import numpy as np
from src.utils.logger import logger


class MomentumStrategy(BaseStrategy):
    name = "momentum"

    def __init__(
        self,
        rsi_period=14,
        overbought=75,
        oversold=25,
        macd_fast=12,
        macd_slow=26,
        macd_signal=9,
        optimize=True,
    ):
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

        # -------------------------------------------------
        # ADAPTIVE THRESHOLDS (MORE RESPONSIVE)
        # -------------------------------------------------
        self.dynamic_overbought = 65  # tighter, earlier reaction
        self.dynamic_oversold = 35

        if optimize:
            self._optimize_parameters()

    # -----------------------------------------------------
    # PARAMETER OPTIMIZATION
    # -----------------------------------------------------
    def _optimize_parameters(self):
        """Optimize RSI parameters based on recent performance"""
        if len(self.performance_history) < 15:
            return

        try:
            recent = self.performance_history[-15:]
            win_rate = sum(1 for p in recent if p > 0) / len(recent)

            if win_rate < 0.35:
                # Losing → tighten, reduce overtrading
                self.dynamic_overbought = max(60, self.dynamic_overbought - 2)
                self.dynamic_oversold = min(40, self.dynamic_oversold + 2)
                logger.info(
                    f"Momentum: Tightened thresholds to "
                    f"{self.dynamic_overbought}/{self.dynamic_oversold}"
                )

            elif win_rate > 0.65:
                # Winning → allow more signals
                self.dynamic_overbought = min(72, self.dynamic_overbought + 2)
                self.dynamic_oversold = max(28, self.dynamic_oversold - 2)
                logger.info(
                    f"Momentum: Loosened thresholds to "
                    f"{self.dynamic_overbought}/{self.dynamic_oversold}"
                )

        except Exception as e:
            logger.error(f"Momentum optimization error: {e}")

    # -----------------------------------------------------
    # MACD CONFIRMATION
    # -----------------------------------------------------
    def _calculate_macd_signal(self, prices: List[float]) -> float:
        if len(prices) < self.macd_slow + 10:
            return 0.0

        macd_result = macd(
            prices,
            self.macd_fast,
            self.macd_slow,
            self.macd_signal,
        )

        if not macd_result:
            return 0.0

        return macd_result[-1][0]  # MACD line

    # -----------------------------------------------------
    # TICK HANDLER
    # -----------------------------------------------------
    def on_tick(self, tick: Dict):
        price = float(tick["quote"])
        self.prices.append(price)

        if len(self.prices) > 120:
            self.prices = self.prices[-120:]

        if len(self.prices) < self.rsi_period + 1:
            return None

        rsivals = rsi(self.prices, self.rsi_period)
        if not rsivals:
            return None

        latest_rsi = rsivals[-1]
        macd_signal = self._calculate_macd_signal(self.prices)

        logger.debug(
            f"Momentum RSI={latest_rsi:.2f} "
            f"MACD={macd_signal:.4f} "
            f"Price={price}"
        )

        signal_strength = 0.0
        side = None

        # -------------------------------------------------
        # STRONG MOMENTUM CONDITIONS
        # -------------------------------------------------
        if latest_rsi > self.dynamic_overbought and macd_signal < 0:
            side = "FALL"
            signal_strength = 0.85

        elif latest_rsi < self.dynamic_oversold and macd_signal > 0:
            side = "RISE"
            signal_strength = 0.85

        # -------------------------------------------------
        # STANDARD RSI CONDITIONS
        # -------------------------------------------------
        elif latest_rsi > self.dynamic_overbought:
            side = "FALL"
            signal_strength = 0.70

        elif latest_rsi < self.dynamic_oversold:
            side = "RISE"
            signal_strength = 0.70

        # -------------------------------------------------
        # SENSITIVE DIVERGENCE DETECTION (UPDATED)
        # -------------------------------------------------
        elif len(rsivals) >= 5:
            # Bearish divergence → FALL
            if (
                price > self.prices[-2]
                and latest_rsi < rsivals[-2]
                and latest_rsi > 55
                and price > np.mean(self.prices[-5:])
            ):
                side = "FALL"
                signal_strength = 0.65
                logger.debug("Momentum: Bearish divergence detected")

            # Bullish divergence → RISE
            elif (
                price < self.prices[-2]
                and latest_rsi > rsivals[-2]
                and latest_rsi < 45
                and price < np.mean(self.prices[-5:])
            ):
                side = "RISE"
                signal_strength = 0.65
                logger.debug("Momentum: Bullish divergence detected")

        if not side:
            return None

        self.signal_history.append({
            "timestamp": tick.get("epoch"),
            "side": side,
            "score": signal_strength,
            "rsi": latest_rsi,
            "macd": macd_signal,
            "price": price,
        })

        logger.info(
            f"Momentum signal → {side} "
            f"score={signal_strength:.2f} "
            f"RSI={latest_rsi:.2f}"
        )

        return {
            "side": side,
            "score": signal_strength,
            "meta": {
                "strategy": self.name,
                "rsi": latest_rsi,
                "macd": macd_signal,
                "dynamic_thresholds": f"{self.dynamic_overbought}/{self.dynamic_oversold}",
            },
        }

    # -----------------------------------------------------
    # PERFORMANCE FEEDBACK
    # -----------------------------------------------------
    def update_performance(self, trade_result: str, profit: float):
        self.performance_history.append(profit)

        if self.optimize and len(self.performance_history) % 8 == 0:
            self._optimize_parameters()

    # -----------------------------------------------------
    # METRICS
    # -----------------------------------------------------
    def get_strategy_metrics(self) -> Dict:
        if not self.performance_history:
            return {}

        wins = sum(1 for p in self.performance_history if p > 0)
        total = len(self.performance_history)
        win_rate = wins / total if total else 0.0

        return {
            "total_signals": len(self.signal_history),
            "total_trades": total,
            "win_rate": round(win_rate, 3),
            "current_thresholds": f"{self.dynamic_overbought}/{self.dynamic_oversold}",
            "avg_profit": round(
                float(np.mean(self.performance_history)), 4
            ) if self.performance_history else 0.0,
            "recent_performance": self.performance_history[-10:],
        }
