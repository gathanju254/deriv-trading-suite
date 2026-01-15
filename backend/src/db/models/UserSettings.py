# backend/src/db/models/user_settings.py

import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Float, Boolean, DateTime, Integer, ForeignKey, Enum
)
from sqlalchemy.orm import relationship
from src.db.base import Base
import enum


def uuid_str():
    return str(uuid.uuid4())


class RecoveryMode(str, enum.Enum):
    MARTINGALE = "MARTINGALE"
    FIBONACCI = "FIBONACCI"
    HYBRID = "HYBRID"


class UserSettings(Base):
    __tablename__ = "user_settings"

    id = Column(String, primary_key=True, default=uuid_str)
    user_id = Column(String, ForeignKey("users.id"), unique=True, index=True, nullable=False)

    # =====================================================
    # TRADING PREFERENCES
    # =====================================================
    trade_amount = Column(Float, nullable=False, default=0.40)
    symbol = Column(String, nullable=False, default="R_50")
    contract_duration = Column(Integer, nullable=False, default=1)  # in ticks
    base_currency = Column(String, nullable=False, default="USD")
    max_trades = Column(Integer, nullable=False, default=10)
    max_trades_per_hour = Column(Integer, nullable=False, default=50)

    # =====================================================
    # RISK MANAGEMENT
    # =====================================================
    daily_loss_limit_pct = Column(Float, nullable=False, default=20.0)
    daily_profit_limit_pct = Column(Float, nullable=False, default=20.0)
    
    # Cooldowns
    cooldown_after_loss = Column(Integer, nullable=False, default=0)  # seconds
    cooldown_after_win = Column(Integer, nullable=False, default=25)  # seconds

    # =====================================================
    # RECOVERY SYSTEM
    # =====================================================
    recovery_enabled = Column(Boolean, nullable=False, default=True)
    recovery_mode = Column(
        Enum(RecoveryMode),
        nullable=False,
        default=RecoveryMode.HYBRID
    )
    recovery_multiplier = Column(Float, nullable=False, default=1.6)
    max_recovery_streak = Column(Integer, nullable=False, default=10)
    max_recovery_amount_multiplier = Column(Float, nullable=False, default=8.0)
    reset_on_win = Column(Boolean, nullable=False, default=True)
    smart_recovery = Column(Boolean, nullable=False, default=True)

    # =====================================================
    # STRATEGY & ML SETTINGS
    # =====================================================
    min_consensus_score = Column(Float, nullable=False, default=0.75)
    ml_consensus_enabled = Column(Boolean, nullable=False, default=True)
    strategy_optimization_enabled = Column(Boolean, nullable=False, default=True)

    # =====================================================
    # NOTIFICATION PREFERENCES
    # =====================================================
    email_on_trade = Column(Boolean, nullable=False, default=False)
    email_on_loss = Column(Boolean, nullable=False, default=True)
    email_on_daily_limit = Column(Boolean, nullable=False, default=True)
    push_notifications_enabled = Column(Boolean, nullable=False, default=True)

    # =====================================================
    # UI & DISPLAY PREFERENCES
    # =====================================================
    theme = Column(String, nullable=False, default="dark")  # dark, light
    chart_type = Column(String, nullable=False, default="candlestick")
    auto_refresh_enabled = Column(Boolean, nullable=False, default=True)
    refresh_interval = Column(Integer, nullable=False, default=5)  # seconds

    # =====================================================
    # TIMESTAMPS
    # =====================================================
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="settings")

    def to_dict(self):
        """Convert settings to dictionary for API responses"""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "trading": {
                "trade_amount": self.trade_amount,
                "symbol": self.symbol,
                "contract_duration": self.contract_duration,
                "base_currency": self.base_currency,
                "max_trades": self.max_trades,
                "max_trades_per_hour": self.max_trades_per_hour,
            },
            "risk_management": {
                "daily_loss_limit_pct": self.daily_loss_limit_pct,
                "daily_profit_limit_pct": self.daily_profit_limit_pct,
                "cooldown_after_loss": self.cooldown_after_loss,
                "cooldown_after_win": self.cooldown_after_win,
            },
            "recovery": {
                "enabled": self.recovery_enabled,
                "mode": self.recovery_mode.value,
                "multiplier": self.recovery_multiplier,
                "max_streak": self.max_recovery_streak,
                "max_amount_multiplier": self.max_recovery_amount_multiplier,
                "reset_on_win": self.reset_on_win,
                "smart_recovery": self.smart_recovery,
            },
            "strategy": {
                "min_consensus_score": self.min_consensus_score,
                "ml_consensus_enabled": self.ml_consensus_enabled,
                "strategy_optimization_enabled": self.strategy_optimization_enabled,
            },
            "notifications": {
                "email_on_trade": self.email_on_trade,
                "email_on_loss": self.email_on_loss,
                "email_on_daily_limit": self.email_on_daily_limit,
                "push_notifications_enabled": self.push_notifications_enabled,
            },
            "display": {
                "theme": self.theme,
                "chart_type": self.chart_type,
                "auto_refresh_enabled": self.auto_refresh_enabled,
                "refresh_interval": self.refresh_interval,
            },
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }