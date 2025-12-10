# backend/src/db/models/contract.py
from sqlalchemy import Column, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from src.db.base import Base

class Contract(Base):
    __tablename__ = "contracts"

    id = Column(String, primary_key=True)  # Deriv contract_id
    trade_id = Column(String, ForeignKey("trades.id"))
    entry_tick = Column(Float)
    exit_tick = Column(Float)
    profit = Column(Float)
    is_sold = Column(String)
    sell_time = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)

    trade = relationship("Trade", back_populates="contract")
