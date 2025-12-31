# backend/src/db/models/user.py
import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Boolean, DateTime, Float, ForeignKey, Index
)
from sqlalchemy.orm import relationship
from src.db.base import Base


def uuid_str():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=uuid_str)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, nullable=True)
    deriv_account_id = Column(String, unique=True, index=True, nullable=True)

    is_active = Column(Boolean, default=True)
    app_markup_percentage = Column(Float, default=2.0)  # default user markup
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)

    # Relationships
    sessions = relationship(
        "UserSession",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    trades = relationship(
        "Trade",
        back_populates="user"
    )
    commissions = relationship(
        "Commission",
        back_populates="user"
    )


class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(String, primary_key=True, default=uuid_str)
    user_id = Column(String, ForeignKey("users.id"), index=True, nullable=False)

    access_token = Column(String, nullable=False)
    refresh_token = Column(String, nullable=True)
    expires_at = Column(DateTime, nullable=False)

    is_active = Column(Boolean, default=True)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="sessions")

    __table_args__ = (
        Index("idx_user_active_session", "user_id", "is_active"),
    )


class Commission(Base):
    __tablename__ = "commissions"

    id = Column(String, primary_key=True, default=uuid_str)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    trade_id = Column(String, ForeignKey("trades.id"), nullable=False)

    amount = Column(Float, nullable=False)
    markup_percentage = Column(Float, nullable=False)  # snapshot at trade time
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="commissions")
    trade = relationship("Trade", back_populates="commission")
