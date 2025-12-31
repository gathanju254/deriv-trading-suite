# backend/src/db/models/trade.py

import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Float, DateTime, Integer, ForeignKey
)
from sqlalchemy.orm import relationship
from src.db.base import Base


def uuid_str():
    return str(uuid.uuid4())


class Trade(Base):
    __tablename__ = "trades"

    # Core identity
    id = Column(String, primary_key=True, default=uuid_str)
    user_id = Column(String, ForeignKey("users.id"), index=True, nullable=True)

    # Market info
    symbol = Column(String, index=True, nullable=False)
    side = Column(String, nullable=False)  
    # RISE / FALL (consider Enum later)

    duration = Column(Integer, nullable=False)

    # Financials (explicit naming)
    stake_amount = Column(Float, nullable=False)
    gross_payout = Column(Float, nullable=True)   # before markup
    markup_percentage = Column(Float, nullable=False, default=0.0)
    markup_amount = Column(Float, nullable=False, default=0.0)
    net_payout = Column(Float, nullable=True)     # after markup

    # Status lifecycle
    status = Column(
        String,
        default="PENDING",
        nullable=False
    )
    # PENDING / ACTIVE / WON / LOST / ERROR / CANCELLED

    created_at = Column(DateTime, default=datetime.utcnow)
    settled_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="trades")

    proposal = relationship(
        "Proposal",
        back_populates="trade",
        uselist=False,
        cascade="all, delete-orphan"
    )

    contract = relationship(
        "Contract",
        back_populates="trade",
        uselist=False,
        cascade="all, delete-orphan"
    )

    commission = relationship(
        "Commission",
        back_populates="trade",
        uselist=False,
        cascade="all, delete-orphan"
    )
