# backend/src/config/settings.py
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Settings:
    # -----------------------
    # Deriv API credentials
    # -----------------------
    DERIV_APP_ID: str = os.getenv("DERIV_APP_ID")
    DERIV_API_TOKEN: str = os.getenv("DERIV_API_TOKEN")

    # -----------------------
    # Trading defaults
    # -----------------------
    SYMBOL: str = os.getenv("SYMBOL", "R_100")
    TRADE_AMOUNT: float = float(os.getenv("TRADE_AMOUNT", 1.0))
    MAX_TRADES_PER_HOUR: int = int(os.getenv("MAX_TRADES_PER_HOUR", 20))
    MAX_TRADES: int = int(os.getenv("MAX_TRADES", 100))
    STOP_LOSS_PERCENT: float = float(os.getenv("STOP_LOSS_PERCENT", 5))
    TAKE_PROFIT_PERCENT: float = float(os.getenv("TAKE_PROFIT_PERCENT", 10))
    MIN_CONSENSUS_SCORE: float = float(os.getenv("MIN_CONSENSUS_SCORE", 0.6))
    BASE_CURRENCY: str = os.getenv("BASE_CURRENCY", "USD")
    CONTRACT_DURATION: int = int(os.getenv("CONTRACT_DURATION", 5))
    TIMEFRAME: str = os.getenv("TIMEFRAME", "1m")


    # -----------------------
    # Advanced risk & money management
    # -----------------------
    DAILY_LOSS_LIMIT_PCT: float = float(os.getenv("DAILY_LOSS_LIMIT_PCT", 0.10))
    DAILY_PROFIT_LIMIT_PCT: float = float(os.getenv("DAILY_PROFIT_LIMIT_PCT", 0.10))  # NEW: 10% daily profit cap
    MARTINGALE_MULTIPLIER: float = float(os.getenv("MARTINGALE_MULTIPLIER", 2.0))
    ANTI_MARTINGALE_MULTIPLIER: float = float(os.getenv("ANTI_MARTINGALE_MULTIPLIER", 1.5))
    COOLDOWN_AFTER_LOSS: int = int(os.getenv("COOLDOWN_AFTER_LOSS", 3))  # trades
    COOLDOWN_AFTER_WIN: int = int(os.getenv("COOLDOWN_AFTER_WIN", 1))    # trades

    # -----------------------
    # Recovery System Settings
    # -----------------------
    RECOVERY_ENABLED: bool = os.getenv("RECOVERY_ENABLED", "True").lower() == "true"
    RECOVERY_MULTIPLIER: float = float(os.getenv("RECOVERY_MULTIPLIER", 2.0))
    MAX_RECOVERY_STREAK: int = int(os.getenv("MAX_RECOVERY_STREAK", 4))
    MAX_RECOVERY_AMOUNT_MULTIPLIER: float = float(os.getenv("MAX_RECOVERY_AMOUNT_MULTIPLIER", 5.0))
    RESET_ON_WIN: bool = os.getenv("RESET_ON_WIN", "True").lower() == "true"
    SMART_RECOVERY: bool = os.getenv("SMART_RECOVERY", "True").lower() == "true"
    RECOVERY_MODE: str = os.getenv("RECOVERY_MODE", "MARTINGALE")  # MARTINGALE or FIBONACCI
    
    # -----------------------
    # ML-based consensus
    # -----------------------
    ML_CONSENSUS_ENABLED: bool = os.getenv("ML_CONSENSUS_ENABLED", "True").lower() == "true"

    # -----------------------
    # Strategy optimization
    # -----------------------
    STRATEGY_OPTIMIZATION_ENABLED: bool = os.getenv("STRATEGY_OPTIMIZATION_ENABLED", "True").lower() == "true"

    # -----------------------
    # Optional: PnL & performance tracking defaults
    # -----------------------
    PERFORMANCE_LOGGING_ENABLED: bool = os.getenv("PERFORMANCE_LOGGING_ENABLED", "True").lower() == "true"
    PERFORMANCE_LOG_INTERVAL: int = int(os.getenv("PERFORMANCE_LOG_INTERVAL", 300))  # seconds

settings = Settings()
