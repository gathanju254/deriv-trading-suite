# backend/src/db/models/contract.py

import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Float, Boolean, DateTime, Text, ForeignKey
)
from sqlalchemy.orm import relationship
from src.db.base import Base


def uuid_str():
    return str(uuid.uuid4())


class Contract(Base):
    __tablename__ = "contracts"

    # Identity
    id = Column(String, primary_key=True, default=uuid_str)
    trade_id = Column(String, ForeignKey("trades.id"), index=True, nullable=False)

    # Market execution
    entry_tick = Column(Float, nullable=True)
    exit_tick = Column(Float, nullable=True)

    # Financial outcome (explicit)
    gross_profit = Column(Float, nullable=True)     # before markup
    markup_profit = Column(Float, nullable=False, default=0.0)
    net_profit = Column(Float, nullable=True)       # after markup

    # Lifecycle
    is_sold = Column(Boolean, default=False)
    sell_time = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    settled_at = Column(DateTime, nullable=True)

    # Audit & debugging
    audit_details = Column(Text, nullable=True)

    # Relationship
    trade = relationship(
        "Trade",
        back_populates="contract"
    )
