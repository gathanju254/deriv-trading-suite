# backend/src/indicators/technical.py
from typing import List
import math

def ema(values: List[float], period: int) -> List[float]:
    if not values or period <= 0:
        return []
    k = 2 / (period + 1)
    out = []
    prev = values[0]
    out.append(prev)
    for v in values[1:]:
        prev = (v - prev) * k + prev
        out.append(prev)
    return out

def rsi(values: List[float], period: int = 14) -> List[float]:
    if len(values) < period + 1:
        return []
    deltas = [values[i] - values[i-1] for i in range(1, len(values))]
    gains = [d if d > 0 else 0 for d in deltas]
    losses = [-d if d < 0 else 0 for d in deltas]
    avg_gain = sum(gains[:period]) / period
    avg_loss = sum(losses[:period]) / period
    rsis = []
    for i in range(period, len(gains)):
        avg_gain = (avg_gain * (period - 1) + gains[i]) / period
        avg_loss = (avg_loss * (period - 1) + losses[i]) / period
        rs = avg_gain / avg_loss if avg_loss != 0 else math.inf
        rsi_val = 100 - (100 / (1 + rs))
        rsis.append(rsi_val)
    return rsis


def bollinger_bands(values: List[float], period: int = 20, std_dev: float = 2) -> List[tuple]:
    """Calculate Bollinger Bands"""
    if len(values) < period:
        return []
    
    bands = []
    for i in range(period, len(values) + 1):
        window = values[i-period:i]
        middle = sum(window) / period
        variance = sum((x - middle) ** 2 for x in window) / period
        std = variance ** 0.5
        
        upper = middle + (std_dev * std)
        lower = middle - (std_dev * std)
        bands.append((upper, middle, lower))
    
    return bands

def atr(highs: List[float], lows: List[float], closes: List[float], period: int = 14) -> List[float]:
    """Calculate Average True Range"""
    if len(highs) < period + 1 or len(lows) < period + 1 or len(closes) < period + 1:
        return []
    
    true_ranges = []
    for i in range(1, len(highs)):
        high_low = highs[i] - lows[i]
        high_close_prev = abs(highs[i] - closes[i-1])
        low_close_prev = abs(lows[i] - closes[i-1])
        true_range = max(high_low, high_close_prev, low_close_prev)
        true_ranges.append(true_range)
    
    atr_values = []
    current_atr = sum(true_ranges[:period]) / period
    atr_values.append(current_atr)
    
    for i in range(period, len(true_ranges)):
        current_atr = (current_atr * (period - 1) + true_ranges[i]) / period
        atr_values.append(current_atr)
    
    return atr_values

def macd(values: List[float], fast: int = 12, slow: int = 26, signal: int = 9) -> List[tuple]:
    """Calculate MACD"""
    if len(values) < slow:
        return []
    
    ema_fast = ema(values, fast)
    ema_slow = ema(values, slow)
    
    # Align lengths
    min_len = min(len(ema_fast), len(ema_slow))
    ema_fast = ema_fast[-min_len:]
    ema_slow = ema_slow[-min_len:]
    
    macd_line = [fast_val - slow_val for fast_val, slow_val in zip(ema_fast, ema_slow)]
    signal_line = ema(macd_line, signal)
    
    # Calculate histogram
    histogram = []
    for i in range(min(len(macd_line), len(signal_line))):
        histogram.append(macd_line[i] - signal_line[i])
    
    return list(zip(macd_line, signal_line, histogram))
