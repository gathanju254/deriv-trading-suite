# backend/src/main.py
import json
import numpy as np
from datetime import datetime
from decimal import Decimal
from contextlib import asynccontextmanager

from src.config.settings import settings
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from src.api.routes import router as api_router
from src.api.auth_routes import router as auth_router
from src.api.websocket import ws_router
from src.core.deriv_api import deriv
from src.trading.multi_user_bot import bot_manager
from src.utils.logger import logger

# --- DB core ---
from src.db.session import engine
from src.db.base import Base

# --- Performance tracker ---
from src.trading.performance import performance

# ==========================================================
#              IMPORT ALL MODELS (CRITICAL)
# ==========================================================
# If you don’t import them, SQLAlchemy won’t create tables.
import src.db.models.user
import src.db.models.trade
import src.db.models.contract
import src.db.models.proposal

# ==========================================================
#                CUSTOM JSON ENCODER
# ==========================================================
class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (np.float32, np.float64)):
            return float(obj)
        if isinstance(obj, (np.int32, np.int64)):
            return int(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        if isinstance(obj, Decimal):
            return float(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        if isinstance(obj, float) and np.isnan(obj):
            return None
        if obj == float("inf"):
            return "infinity"
        if obj == float("-inf"):
            return "-infinity"
        return super().default(obj)

# ==========================================================
#                APPLICATION LIFESPAN
# ==========================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ---------- STARTUP ----------
    logger.info("🚀 Starting Deriv Trading Suite with Multi-User Support")
    logger.info(f"📊 App Markup: {deriv.app_markup_percentage}%")

    logger.info("📦 Creating database tables (if not exist)...")
    Base.metadata.create_all(bind=engine)

    logger.info("📊 Initializing performance tracker...")
    performance.initialize_after_db()

    logger.info("✅ Startup complete. Bot is NOT auto-started.")
    yield

    # ---------- SHUTDOWN ----------
    logger.info("🛑 Shutting down Deriv Trading Suite...")
    for user_id in list(bot_manager.user_bots.keys()):
        await bot_manager.stop_bot_for_user(user_id)
    logger.info("👋 Shutdown complete.")

# ==========================================================
#                FASTAPI INITIALIZATION
# ==========================================================
app = FastAPI(
    title="Deriv Trading Suite",
    version="1.0.0",
    description="Backend service for automated Deriv trading bot.",
    json_encoder=CustomJSONEncoder,
    lifespan=lifespan,
)

# ==========================================================
#                         CORS
# ==========================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================================
#                  TRUSTED HOSTS
# ==========================================================
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=[
        "deriv-trading-backend.onrender.com",
        "deriv-trading-suite.onrender.com",
        "http://localhost:5173",
        "http://localhost:3000",
    ],
)

# ==========================================================
#                     ROUTERS
# ==========================================================
app.include_router(api_router)
app.include_router(auth_router)
app.include_router(ws_router)

# ==========================================================
#                     ROOT ENDPOINT
# ==========================================================
@app.get("/")
async def root():
    return {
        "status": "running",
        "service": "Deriv Trading Backend",
        "version": "1.0.0",
    }
