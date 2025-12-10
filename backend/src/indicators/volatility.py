# backend/src/indicators/volatility.py
from typing import List
import statistics

def rolling_volatility(values: List[float], window: int = 20) -> List[float]:
    out = []
    for i in range(window, len(values)+1):
        window_vals = values[i-window:i]
        if len(window_vals) < 2:
            out.append(0.0)
        else:
            returns = [(window_vals[j] / window_vals[j-1] - 1) for j in range(1, len(window_vals))]
            out.append(statistics.pstdev(returns))
    return out
