# backend/src/strategies/base_strategy.py
from abc import ABC, abstractmethod
from typing import Dict, Optional
from src.utils.logger import logger

class BaseStrategy(ABC):
    """Base class for all trading strategies"""
    
    name: str = "base"
    
    def __init__(self):
        self.last_signal = None
        self.signal_history = []
    
    @abstractmethod
    def on_tick(self, tick: Dict) -> Optional[Dict]:
        """
        Analyze a tick and return a signal if one is generated.
        
        Args:
            tick: Tick data dict with keys: symbol, quote, epoch, etc.
            
        Returns:
            Signal dict or None:
            {
                "side": "BUY" or "SELL",
                "score": float (0-1),
                "meta": {"strategy": self.name, "reason": "..."},
                "confidence": float (0-1)
            }
        """
        pass
    
    def should_trade(self) -> bool:
        """Override to add strategy-specific trading conditions"""
        return True
    
    def log(self, message: str):
        """Convenience logging method"""
        logger.info(f"[{self.name}] {message}")
