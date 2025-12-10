# backend/src/db/models/trade.py

from sqlalchemy import Column, String, Float, DateTime, Integer, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from src.db.base import Base

class Trade(Base):
    __tablename__ = "trades"

    id = Column(String, primary_key=True)  # your local trade_id (UUID)
    symbol = Column(String, index=True)
    side = Column(String)  # CALL / PUT
    amount = Column(Float)
    duration = Column(Integer)
    status = Column(String, default="PENDING")  # PENDING / ACTIVE / WON / LOST / ERROR
    created_at = Column(DateTime, default=datetime.utcnow)

    # relations
    proposal = relationship("Proposal", back_populates="trade", uselist=False)
    contract = relationship("Contract", back_populates="trade", uselist=False)
