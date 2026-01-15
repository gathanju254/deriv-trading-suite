# backend/src/config/settings.py
import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    # =======================
    # Environment
    # =======================
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "production")

    # =======================
    # URLs (CRITICAL)
    # =======================
    BACKEND_URL: str = os.getenv(
        "BACKEND_URL",
        "http://localhost:8000"
    )

    FRONTEND_URL: str = os.getenv(
        "FRONTEND_URL",
        "http://localhost:5173"
    )

    # =======================
    # Security / JWT
    # =======================
    SECRET_KEY: str = os.getenv(
        "SECRET_KEY",
        "dev-secret-key-change-this"
    )

    JWT_SECRET_KEY: str = os.getenv(
        "JWT_SECRET_KEY",
        SECRET_KEY
    )

    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
    )
    JWT_EXPIRE_HOURS: int = int(
        os.getenv("JWT_EXPIRE_HOURS", "24")
    )

    # =======================
    # Deriv API / OAuth
    # =======================
    DERIV_APP_ID: str = os.getenv("DERIV_APP_ID")
    DERIV_API_TOKEN: str = os.getenv("DERIV_API_TOKEN")

    DERIV_OAUTH_CLIENT_ID: str = os.getenv("DERIV_OAUTH_CLIENT_ID")

    @property
    def DERIV_OAUTH_REDIRECT_URI(self) -> str:
        return f"{self.BACKEND_URL}/auth/callback"

    DERIV_OAUTH_AUTHORIZE_URL: str = "https://oauth.deriv.com/oauth2/authorize"
    DERIV_OAUTH_TOKEN_URL: str = "https://oauth.deriv.com/oauth2/token"

    # =======================
    # CORS
    # =======================
    @property
    def ALLOWED_ORIGINS(self):
        return [
            self.FRONTEND_URL,
            "https://deriv-trading-suite-67mv.onrender.com",
            "https://deriv-trading-backend.onrender.com",
            "http://localhost:5173",
            "http://localhost:3000",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:3000",
        ]

    # =======================
    # WebSocket
    # =======================
    @property
    def WEBSOCKET_URL(self):
        return self.BACKEND_URL.replace("http", "ws")

    # =======================
    # App earnings
    # =======================
    APP_MARKUP_PERCENTAGE: float = float(
        os.getenv("APP_MARKUP_PERCENTAGE", "2.0")
    )

    # =======================
    # Trading defaults
    # =======================
    SYMBOL: str = os.getenv("SYMBOL", "R_100")
    TRADE_AMOUNT: float = float(os.getenv("TRADE_AMOUNT", "1.0"))
    BASE_CURRENCY: str = os.getenv("BASE_CURRENCY", "USD")
    CONTRACT_DURATION: int = int(os.getenv("CONTRACT_DURATION", "5"))
    TIMEFRAME: str = os.getenv("TIMEFRAME", "1m")
    MAX_TRADES_PER_HOUR: int = int(os.getenv("MAX_TRADES_PER_HOUR", "20"))
    MAX_TRADES: int = int(os.getenv("MAX_TRADES", "100"))
    MIN_CONSENSUS_SCORE: float = float(os.getenv("MIN_CONSENSUS_SCORE", "0.6"))

    # =======================
    # Risk & limits
    # =======================
    DAILY_LOSS_LIMIT_PCT: float = float(os.getenv("DAILY_LOSS_LIMIT_PCT", "0.10"))
    DAILY_PROFIT_LIMIT_PCT: float = float(os.getenv("DAILY_PROFIT_LIMIT_PCT", "0.10"))
    STOP_LOSS_PERCENT: float = float(os.getenv("STOP_LOSS_PERCENT", "5"))
    TAKE_PROFIT_PERCENT: float = float(os.getenv("TAKE_PROFIT_PERCENT", "10"))
    COOLDOWN_AFTER_LOSS: int = int(os.getenv("COOLDOWN_AFTER_LOSS", "3"))
    COOLDOWN_AFTER_WIN: int = int(os.getenv("COOLDOWN_AFTER_WIN", "1"))

    # =======================
    # Recovery system
    # =======================
    RECOVERY_ENABLED: bool = os.getenv("RECOVERY_ENABLED", "True").lower() == "true"
    RECOVERY_MODE: str = os.getenv("RECOVERY_MODE", "MARTINGALE")
    RECOVERY_MULTIPLIER: float = float(os.getenv("RECOVERY_MULTIPLIER", "2.0"))
    MAX_RECOVERY_STREAK: int = int(os.getenv("MAX_RECOVERY_STREAK", "4"))
    MAX_RECOVERY_AMOUNT_MULTIPLIER: float = float(
        os.getenv("MAX_RECOVERY_AMOUNT_MULTIPLIER", "5.0")
    )
    RESET_ON_WIN: bool = os.getenv("RESET_ON_WIN", "True").lower() == "true"
    SMART_RECOVERY: bool = os.getenv("SMART_RECOVERY", "True").lower() == "true"

    # =======================
    # ML & optimization
    # =======================
    ML_CONSENSUS_ENABLED: bool = os.getenv(
        "ML_CONSENSUS_ENABLED", "True"
    ).lower() == "true"

    STRATEGY_OPTIMIZATION_ENABLED: bool = os.getenv(
        "STRATEGY_OPTIMIZATION_ENABLED", "True"
    ).lower() == "true"

    # =======================
    # Performance logging
    # =======================
    PERFORMANCE_LOGGING_ENABLED: bool = os.getenv(
        "PERFORMANCE_LOGGING_ENABLED", "True"
    ).lower() == "true"

    PERFORMANCE_LOG_INTERVAL: int = int(
        os.getenv("PERFORMANCE_LOG_INTERVAL", "300")
    )


settings = Settings()