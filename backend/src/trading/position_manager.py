# backend/src/trading/position_manager.py

import time
from typing import Dict, Optional
from src.utils.logger import logger


class PositionManager:
    def __init__(self):
        # Primary storage: internal_id -> position
        # internal_id is always contract_id as string
        self.active_positions: Dict[str, Dict] = {}

        # contract_id -> uuid mapping
        self.contract_id_to_uuid: Dict[str, str] = {}

        # uuid -> contract_id reverse mapping
        self.uuid_to_contract_id: Dict[str, str] = {}

        # closed / cleaned identifiers (both contract_id & uuid)
        self._cleaned = set()

    # -------------------------
    # CREATE / REGISTER
    # -------------------------
    def add_position(
        self,
        trade_id: str,
        contract_id: str,
        side: str,
        entry_price: float,
        expires_at: Optional[float] = None,
    ):
        contract_id = str(contract_id)

        self.active_positions[contract_id] = {
            "trade_id": trade_id,
            "contract_id": contract_id,
            "uuid": None,
            "side": side,
            "entry_price": entry_price,
            "opened_at": time.time(),
            "expires_at": expires_at,
            "status": "ACTIVE",
        }

        logger.info(f"📌 Added position contract_id={contract_id} trade_id={trade_id}")

    # -------------------------
    # UUID MAPPING
    # -------------------------
    def update_contract_uuid(self, contract_id: str, uuid: str):
        contract_id = str(contract_id)

        pos = self.active_positions.get(contract_id)
        if not pos:
            logger.warning(
                f"UUID update ignored — unknown contract_id={contract_id}"
            )
            return

        pos["uuid"] = uuid
        self.contract_id_to_uuid[contract_id] = uuid
        self.uuid_to_contract_id[uuid] = contract_id

        logger.debug(f"🔗 Mapped contract_id={contract_id} → uuid={uuid}")

    # -------------------------
    # LOOKUP
    # -------------------------
    def get_position(self, identifier: str) -> Optional[Dict]:
        """
        identifier can be contract_id OR uuid
        """
        identifier = str(identifier)

        # direct contract_id lookup
        if identifier in self.active_positions:
            return self.active_positions[identifier]

        # uuid lookup
        contract_id = self.uuid_to_contract_id.get(identifier)
        if contract_id:
            return self.active_positions.get(contract_id)

        return None

    # -------------------------
    # CLOSE / CLEAN
    # -------------------------
    def mark_closed(
        self,
        identifier: str,
        result: str,
        payout: Optional[float] = None,
    ):
        identifier = str(identifier)

        pos = self.get_position(identifier)
        if not pos:
            logger.warning(
                f"⚠️ Attempted to close unknown position id={identifier}"
            )
            return

        contract_id = pos["contract_id"]
        uuid = pos.get("uuid")

        pos["status"] = result
        pos["closed_at"] = time.time()
        pos["payout"] = payout

        # mark all identifiers as cleaned
        self._cleaned.add(contract_id)
        self._cleaned.add(identifier)
        if uuid:
            self._cleaned.add(uuid)

        # remove mappings
        if uuid:
            self.uuid_to_contract_id.pop(uuid, None)
        self.contract_id_to_uuid.pop(contract_id, None)

        # remove active position
        self.active_positions.pop(contract_id, None)

        logger.info(
            f"✅ Closed position contract_id={contract_id} "
            f"uuid={uuid} result={result} payout={payout}"
        )

    # -------------------------
    # STATE CHECKS
    # -------------------------
    def is_cleaned(self, identifier: str) -> bool:
        return str(identifier) in self._cleaned

    def get_open_count(self) -> int:
        return len(self.active_positions)


# Singleton instance
position_manager = PositionManager()
