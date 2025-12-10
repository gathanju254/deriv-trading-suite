# backend/src/strategies/base_strategy.py
from abc import ABC, abstractmethod
from typing import Dict

class BaseStrategy(ABC):
    name: str = "base"

    @abstractmethod
    def on_tick(self, tick: Dict) -> Dict:
        """
        Process incoming tick.
        Return a dict signal: {"side": "CALL"/"PUT", "score": 0.0, "meta": {...}} or None
        """
        pass
