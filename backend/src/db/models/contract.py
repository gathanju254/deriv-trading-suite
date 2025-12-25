# backend/src/db/models/contract.py
from sqlalchemy import Column, String, Float, Boolean, DateTime, Text, ForeignKey  # Add ForeignKey import
from sqlalchemy.orm import relationship
from datetime import datetime
from src.db.base import Base

class Contract(Base):
    __tablename__ = "contracts"

    id = Column(String, primary_key=True)
    trade_id = Column(String, ForeignKey("trades.id"))  # Add ForeignKey constraint
    entry_tick = Column(Float, nullable=True)
    exit_tick = Column(Float, nullable=True)
    profit = Column(Float, nullable=True)
    is_sold = Column(Boolean, default=False)
    sell_time = Column(DateTime, nullable=True)
    audit_details = Column(Text, nullable=True)

    trade = relationship("Trade", back_populates="contract")
