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
# If you don't import them, SQLAlchemy won't create tables.
import src.db.models.user
import src.db.models.trade
import src.db.models.contract
import src.db.models.proposal

# ==========================================================
#                CUSTOM JSON ENCODER
# ==========================================================
class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        elif isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        return super().default(obj)

# ==========================================================
#                    LIFESPAN EVENTS
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
#                  FASTAPI APP SETUP
# ==========================================================
app = FastAPI(
    title="Deriv Trading Suite",
    description="Professional trading dashboard and automation suite",
    version="1.0.0",
    lifespan=lifespan,
)

# ==========================================================
#                    CORS MIDDLEWARE
# ==========================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])

# ==========================================================
#                     ROUTERS
# ==========================================================
# ⚠️ CRITICAL: auth_router MUST be included without prefix
# so that @router.get("/callback") becomes /auth/callback
app.include_router(auth_router)  # Routes: /auth/login, /auth/callback, /auth/logout, /auth/me

# API routes with /api prefix
app.include_router(api_router)   # Routes: /api/*

# WebSocket routes
app.include_router(ws_router)    # Routes: /ws

# ==========================================================
#                     ROOT ENDPOINT
# ==========================================================
@app.get("/")
async def root():
    return {
        "status": "running",
        "service": "Deriv Trading Backend",
        "version": "1.0.0",
        "cors": "enabled_for_debugging",
        "timestamp": datetime.utcnow().isoformat()
    }

# ==========================================================
#                     HEALTH CHECK ENDPOINT
# ==========================================================
@app.get("/health")
async def health():
    """Health check endpoint for load balancers and debugging"""
    return {
        "status": "healthy",
        "service": "Deriv Trading Backend",
        "timestamp": datetime.utcnow().isoformat()
    }

# ==========================================================
#                     DEBUG ENDPOINTS
# ==========================================================
@app.get("/debug/cors-test")
async def cors_test():
    """Endpoint to test CORS headers"""
    return {"message": "CORS test endpoint"}

@app.options("/debug/cors-test")
async def cors_test_options():
    """Handle OPTIONS requests for CORS preflight"""
    return {}

@app.head("/")
async def root_head():
    """Handle HEAD requests for health checks"""
    return {}

@app.head("/health")
async def health_head():
    """Handle HEAD requests for health checks"""
    return {}

# ==========================================================
#                  JSON ENCODER CONFIGURATION
# ==========================================================
app.json_encoder_class = CustomJSONEncoder

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)