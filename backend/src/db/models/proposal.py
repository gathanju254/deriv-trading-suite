from sqlalchemy import Column, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from src.db.base import Base

class Proposal(Base):
    __tablename__ = "proposals"

    id = Column(String, primary_key=True)  # Deriv proposal_id
    trade_id = Column(String, ForeignKey("trades.id"))
    price = Column(Float)
    payout = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)

    trade = relationship("Trade", back_populates="proposal")
