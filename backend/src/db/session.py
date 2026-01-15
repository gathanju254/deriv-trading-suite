# backend/src/db/session.py
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import OperationalError, ProgrammingError
from src.config.settings import settings
import time
import logging

logger = logging.getLogger(__name__)

# Use DATABASE_URL from environment variables (Render provides this)
DATABASE_URL = settings.DATABASE_URL

# PostgreSQL engine configuration with retry logic
def create_engine_with_retry(url, retries=3, delay=2):
    for attempt in range(retries):
        try:
            engine = create_engine(
                url,
                pool_pre_ping=True,  # Check connection before using
                pool_recycle=300,    # Recycle connections after 5 minutes
                pool_size=10,        # Connection pool size
                max_overflow=20,     # Maximum overflow connections
                echo=False           # Set to True for SQL logging during development
            )
            
            # Test connection
            with engine.connect() as conn:
                conn.execute("SELECT 1")
            
            logger.info(f"✅ Database connection established (attempt {attempt + 1}/{retries})")
            return engine
            
        except (OperationalError, ProgrammingError) as e:
            if attempt < retries - 1:
                logger.warning(f"⚠️ Database connection failed (attempt {attempt + 1}/{retries}): {e}")
                logger.info(f"⏳ Retrying in {delay} seconds...")
                time.sleep(delay)
                delay *= 2  # Exponential backoff
            else:
                logger.error(f"❌ Failed to connect to database after {retries} attempts")
                raise

try:
    engine = create_engine_with_retry(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    logger.info("✅ Database session factory created")
except Exception as e:
    logger.error(f"❌ Failed to create database engine: {e}")
    # Fallback to SQLite for development if PostgreSQL fails
    if "postgresql" in DATABASE_URL:
        logger.warning("⚠️ Falling back to SQLite for development")
        engine = create_engine(
            "sqlite:///./trading.db",
            connect_args={"check_same_thread": False}
        )
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    else:
        raise

# Add connection event listeners for better debugging
@event.listens_for(engine, "connect")
def receive_connect(dbapi_connection, connection_record):
    logger.debug("🔌 Database connection established")

@event.listens_for(engine, "checkout")
def receive_checkout(dbapi_connection, connection_record, connection_proxy):
    logger.debug("📤 Database connection checked out from pool")

@event.listens_for(engine, "checkin")
def receive_checkin(dbapi_connection, connection_record):
    logger.debug("📥 Database connection returned to pool")