# backend/src/utils/helpers.py
import asyncio
import time
import json
import hashlib
import logging
from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta
import pandas as pd
import numpy as np

logger = logging.getLogger("helpers")

class Helpers:
    @staticmethod
    def generate_id(prefix: str = "trade") -> str:
        """Generate a unique ID with prefix"""
        timestamp = int(time.time() * 1000)
        random_suffix = hashlib.md5(str(timestamp).encode()).hexdigest()[:8]
        return f"{prefix}_{timestamp}_{random_suffix}"

    @staticmethod
    def format_timestamp(timestamp: Optional[Any] = None) -> str:
        """Format timestamp to ISO format"""
        if timestamp is None:
            timestamp = datetime.utcnow()
        elif isinstance(timestamp, (int, float)):
            timestamp = datetime.fromtimestamp(timestamp)
        elif isinstance(timestamp, str):
            try:
                timestamp = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            except ValueError:
                return timestamp
                
        return timestamp.isoformat() + "Z"

    @staticmethod
    def calculate_percentage_change(old_value: float, new_value: float) -> float:
        """Calculate percentage change between two values"""
        if old_value == 0:
            return 0.0
        return ((new_value - old_value) / old_value) * 100.0

    @staticmethod
    def safe_float(value: Any, default: float = 0.0) -> float:
        """Safely convert value to float"""
        try:
            return float(value)
        except (ValueError, TypeError):
            return default

    @staticmethod
    def safe_int(value: Any, default: int = 0) -> int:
        """Safely convert value to int"""
        try:
            return int(value)
        except (ValueError, TypeError):
            return default

    @staticmethod
    def format_currency(amount: float, currency: str = "USD") -> str:
        """Format currency amount"""
        if currency == "USD":
            return f"${amount:.2f}"
        else:
            return f"{amount:.2f} {currency}"

    @staticmethod
    def format_percentage(value: float) -> str:
        """Format percentage value"""
        return f"{value:.2f}%"

    @staticmethod
    def deep_merge(dict1: Dict, dict2: Dict) -> Dict:
        """Deep merge two dictionaries"""
        result = dict1.copy()
        for key, value in dict2.items():
            if (key in result and isinstance(result[key], dict) 
                and isinstance(value, dict)):
                result[key] = Helpers.deep_merge(result[key], value)
            else:
                result[key] = value
        return result

    @staticmethod
    async def retry_async(func, max_retries: int = 3, delay: float = 1.0, 
                         backoff: float = 2.0, exceptions: tuple = (Exception,)):
        """Retry an async function with exponential backoff"""
        last_exception = None
        current_delay = delay
        
        for attempt in range(max_retries):
            try:
                return await func()
            except exceptions as e:
                last_exception = e
                logger.warning(f"Attempt {attempt + 1} failed: {e}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(current_delay)
                    current_delay *= backoff
                    
        raise last_exception

    @staticmethod
    def is_market_hours(now: Optional[datetime] = None) -> bool:
        """Check if current time is within market hours (simplified)"""
        if now is None:
            now = datetime.utcnow()
            
        # Forex and indices markets are open 24/5
        # Simplified check: Monday 00:00 - Friday 23:59 UTC
        weekday = now.weekday()  # Monday=0, Sunday=6
        return weekday < 5  # Monday to Friday

    @staticmethod
    def calculate_sharpe_ratio(returns: List[float], risk_free_rate: float = 0.02) -> float:
        """Calculate Sharpe ratio from returns"""
        if not returns:
            return 0.0
            
        returns_array = np.array(returns)
        excess_returns = returns_array - risk_free_rate / 252  # Daily risk-free rate
        
        if np.std(excess_returns) == 0:
            return 0.0
            
        return np.mean(excess_returns) / np.std(excess_returns) * np.sqrt(252)

    @staticmethod
    def normalize_scores(scores: List[float]) -> List[float]:
        """Normalize a list of scores to 0-1 range"""
        if not scores:
            return []
        
        min_score = min(scores)
        max_score = max(scores)
        
        if max_score == min_score:
            return [0.5] * len(scores)
        
        return [(score - min_score) / (max_score - min_score) for score in scores]

    @staticmethod
    def safe_json_loads(json_string: str, default: Any = None) -> Any:
        """Safely parse JSON string with error handling"""
        try:
            return json.loads(json_string)
        except (json.JSONDecodeError, TypeError):
            return default

    @staticmethod
    def calculate_volatility(prices: List[float], period: int = 20) -> float:
        """Calculate volatility as standard deviation of returns"""
        if len(prices) < period:
            return 0.0
        
        returns = []
        for i in range(1, len(prices)):
            if prices[i-1] != 0:
                returns.append((prices[i] - prices[i-1]) / prices[i-1])
        
        if not returns:
            return 0.0
        
        return np.std(returns[-period:])

    @staticmethod
    def generate_trade_id() -> str:
        """Generate unique trade ID"""
        from uuid import uuid4
        return f"TRADE_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{uuid4().hex[:8]}"

    @staticmethod
    def validate_trading_hours(symbol: str) -> bool:
        """Check if current time is within trading hours for symbol"""
        # Default implementation - always tradable
        # You can extend this with specific trading hours per symbol
        return True

    @staticmethod
    def calculate_position_size(balance: float, risk_per_trade: float, stop_loss_pips: float) -> float:
        """Calculate position size based on risk management"""
        risk_amount = balance * risk_per_trade
        return risk_amount / stop_loss_pips if stop_loss_pips > 0 else 0

    @staticmethod
    def detect_anomalies(data: List[float], method: str = 'iqr') -> List[bool]:
        """Detect anomalies in data using specified method"""
        if not data:
            return []
            
        if method == 'iqr':
            Q1 = np.percentile(data, 25)
            Q3 = np.percentile(data, 75)
            IQR = Q3 - Q1
            lower_bound = Q1 - 1.5 * IQR
            upper_bound = Q3 + 1.5 * IQR
            return [x < lower_bound or x > upper_bound for x in data]
        else:  # z-score method
            mean = np.mean(data)
            std = np.std(data)
            if std == 0:
                return [False] * len(data)
            return [abs((x - mean) / std) > 3 for x in data]

    @staticmethod
    def format_deriv_amount(amount: float) -> float:
        """Format amount for Deriv API (max 2 decimal places)"""
        return round(amount, 2)

    @staticmethod
    def format_deriv_price(amount: float) -> str:
        """Format price string for Deriv API"""
        return f"{Helpers.format_deriv_amount(amount):.2f}"