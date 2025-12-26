# backend/src/main.py

import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.encoders import jsonable_encoder
import json
import numpy as np
from datetime import datetime
from decimal import Decimal

from src.api.routes import router as api_router
from src.api.websocket import ws_router
from src.utils.logger import logger
from src.trading.bot import trading_bot

# --- DB imports ---
from src.db.session import engine
from src.db.base import Base

# --- Performance tracker import ---
from src.trading.performance import performance  # Add this line

# Import models so SQLAlchemy registers them
import src.db.models.trade
import src.db.models.contract
import src.db.models.proposal

# ==========================================================
#                CUSTOM JSON ENCODER
# ==========================================================
class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (np.float32, np.float64, np.int32, np.int64)):
            return float(obj) if isinstance(obj, (np.float32, np.float64)) else int(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, Decimal):
            return float(obj)
        elif isinstance(obj, datetime):
            return obj.isoformat()
        elif obj == float('inf'):
            return "infinity"
        elif obj == float('-inf'):
            return "-infinity"
        elif isinstance(obj, float) and np.isnan(obj):
            return None
        return super().default(obj)

# ==========================================================
#                FASTAPI INITIALIZATION
# ==========================================================
app = FastAPI(
    title="Deriv Trading Suite",
    version="1.0.0",
    description="Backend service for automated Deriv trading bot.",
    json_encoder=CustomJSONEncoder
)

# ==========================================================
#                         CORS
# ==========================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite React Dev
        "http://localhost:3000",   # CRA React
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================================
#                  TRUSTED HOSTS (Security)
# ==========================================================
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=[
        "localhost",
        "127.0.0.1"
    ]
)

# ==========================================================
#                     ROUTERS
# ==========================================================
app.include_router(api_router)
app.include_router(ws_router)


# ==========================================================
#                     STARTUP EVENT
# ==========================================================
@app.on_event("startup")
async def startup_event():
    logger.info("Initializing database...")
    Base.metadata.create_all(bind=engine)
    
    # Initialize performance tracker after DB is ready
    performance.initialize_after_db()

    logger.info("✅ Database initialized. Bot is NOT auto-started.")
    # REMOVED: asyncio.create_task(trading_bot.run())


# ==========================================================
#                     ROOT ENDPOINT
# ==========================================================
@app.get("/")
async def root():
    return {
        "status": "Deriv Trading Backend Running",
        "message": "API Online",
        "version": "1.0.0"
    }
