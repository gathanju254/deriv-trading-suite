# backend/src/trading/position_manager.py
import time
from typing import Dict
from src.utils.logger import logger

class PositionManager:
    def __init__(self):
        # contract_id -> trade dict
        self.active_positions: Dict[str, Dict] = {}
        # set of cleaned contracts to prevent double processing
        self._cleaned = set()

    def add_position(self, trade_id: str, contract_id: str, side: str, entry_price: float, expires_at: float = None):
        self.active_positions[contract_id] = {
            "trade_id": trade_id,
            "contract_id": contract_id,
            "side": side,
            "entry_price": entry_price,
            "opened_at": time.time(),
            "expires_at": expires_at,
            "status": "ACTIVE"
        }
        logger.info(f"Added position {contract_id} for trade {trade_id}")

    def mark_closed(self, contract_id: str, result: str, payout: float = None):
        p = self.active_positions.get(contract_id)
        if not p:
            logger.warning("Attempted to close unknown contract %s", contract_id)
            return
        p["status"] = result
        p["closed_at"] = time.time()
        p["payout"] = payout
        # mark cleaned so future updates ignored
        self._cleaned.add(contract_id)
        # optionally remove from dict to keep memory small
        try:
            del self.active_positions[contract_id]
        except KeyError:
            pass
        logger.info(f"Closed position {contract_id} -> {result}")

    def is_cleaned(self, contract_id: str) -> bool:
        return contract_id in self._cleaned

    def get_open_count(self):
        return len(self.active_positions)

# Create the singleton instance
position_manager = PositionManager()