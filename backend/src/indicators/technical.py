# backend/src/indicators/technical.py
# backend/src/indicators/technical.py
from typing import List, Tuple, Optional
import math
import numpy as np

def ema(values: List[float], period: int) -> List[float]:
    """Calculate Exponential Moving Average"""
    if not values or period <= 0 or len(values) < period:
        return []
    
    # Ensure we have numpy arrays for better performance
    values_array = np.array(values, dtype=np.float64)
    
    # Initialize with SMA for first value
    k = 2.0 / (period + 1.0)
    ema_values = []
    
    # Calculate SMA for first value
    sma = np.mean(values_array[:period])
    ema_values.append(sma)
    
    # Calculate EMA for subsequent values
    for i in range(period, len(values_array)):
        ema_val = (values_array[i] - ema_values[-1]) * k + ema_values[-1]
        ema_values.append(ema_val)
    
    return ema_values

def rsi(values: List[float], period: int = 14) -> List[float]:
    """Calculate Relative Strength Index with proper handling"""
    if len(values) < period + 1:
        return []
    
    # Convert to numpy for better performance
    values_array = np.array(values, dtype=np.float64)
    
    # Calculate price changes
    deltas = np.diff(values_array)
    
    # Separate gains and losses
    gains = np.where(deltas > 0, deltas, 0.0)
    losses = np.where(deltas < 0, -deltas, 0.0)
    
    # Initialize RSI array
    rsi_values = []
    
    # Calculate first average gain and loss
    avg_gain = np.mean(gains[:period])
    avg_loss = np.mean(losses[:period])
    
    # Handle division by zero
    if avg_loss == 0:
        first_rsi = 100.0
    else:
        rs = avg_gain / avg_loss
        first_rsi = 100.0 - (100.0 / (1.0 + rs))
    
    rsi_values.append(first_rsi)
    
    # Calculate subsequent RSI values using smoothing
    for i in range(period, len(gains)):
        avg_gain = (avg_gain * (period - 1) + gains[i]) / period
        avg_loss = (avg_loss * (period - 1) + losses[i]) / period
        
        if avg_loss == 0:
            rsi_values.append(100.0)
        else:
            rs = avg_gain / avg_loss
            rsi_val = 100.0 - (100.0 / (1.0 + rs))
            rsi_values.append(rsi_val)
    
    return rsi_values


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

def macd(values: List[float], fast: int = 12, slow: int = 26, signal: int = 9) -> List[Tuple[float, float, float]]:
    """Calculate MACD (Moving Average Convergence Divergence)"""
    if len(values) < slow:
        return []
    
    # Calculate EMAs
    ema_fast = ema(values, fast)
    ema_slow = ema(values, slow)
    
    # Align lengths (take the last common values)
    min_len = min(len(ema_fast), len(ema_slow))
    if min_len < signal + 1:
        return []
    
    ema_fast = ema_fast[-min_len:]
    ema_slow = ema_slow[-min_len:]
    
    # Calculate MACD line (difference between fast and slow EMA)
    macd_line = []
    for i in range(min_len):
        macd_val = ema_fast[i] - ema_slow[i]
        macd_line.append(macd_val)
    
    # Calculate signal line (EMA of MACD line)
    signal_line = ema(macd_line, signal)
    
    # Align signal line with macd_line
    if len(signal_line) < 1:
        return []
    
    # Calculate histogram (difference between MACD line and signal line)
    histogram = []
    result = []
    
    # We need to align the arrays properly
    offset = len(macd_line) - len(signal_line)
    for i in range(len(signal_line)):
        hist_val = macd_line[i + offset] - signal_line[i]
        histogram.append(hist_val)
        result.append((macd_line[i + offset], signal_line[i], hist_val))
    
    return result

# Helper functions for momentum strategy
def calculate_rsi_momentum(rsi_values: List[float], current_price: float, previous_price: float) -> Optional[float]:
    """Calculate momentum based on RSI and price movement"""
    if len(rsi_values) < 2:
        return None
    
    current_rsi = rsi_values[-1]
    previous_rsi = rsi_values[-2]
    
    # Calculate RSI momentum
    rsi_momentum = current_rsi - previous_rsi
    
    # Calculate price momentum
    if previous_price != 0:
        price_momentum = ((current_price - previous_price) / previous_price) * 100
    else:
        price_momentum = 0
    
    # Combined momentum score
    momentum_score = (rsi_momentum * 0.7) + (price_momentum * 0.3)
    
    return momentum_score

def detect_rsi_divergence(prices: List[float], rsi_values: List[float], lookback: int = 5) -> Tuple[bool, bool]:
    """
    Detect RSI divergence
    Returns: (bearish_divergence, bullish_divergence)
    """
    if len(prices) < lookback + 1 or len(rsi_values) < lookback + 1:
        return False, False
    
    # Get recent data
    recent_prices = prices[-lookback:]
    recent_rsi = rsi_values[-lookback:]
    
    # Find peaks and troughs
    price_peak = max(recent_prices)
    price_trough = min(recent_prices)
    rsi_peak = max(recent_rsi)
    rsi_trough = min(recent_rsi)
    
    # Check for bearish divergence (price higher high, RSI lower high)
    price_rising = recent_prices[-1] > recent_prices[0]
    rsi_falling = recent_rsi[-1] < recent_rsi[0]
    
    bearish_div = price_rising and rsi_falling and rsi_peak > 60
    
    # Check for bullish divergence (price lower low, RSI higher low)
    price_falling = recent_prices[-1] < recent_prices[0]
    rsi_rising = recent_rsi[-1] > recent_rsi[0]
    
    bullish_div = price_falling and rsi_rising and rsi_trough < 40
    
    return bearish_div, bullish_div

def normalize_rsi(rsi_value: float) -> float:
    """Normalize RSI value to 0-1 range for scoring"""
    if rsi_value <= 30:
        return 0.0
    elif rsi_value >= 70:
        return 1.0
    else:
        return (rsi_value - 30) / 40