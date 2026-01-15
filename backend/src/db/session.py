# backend/src/db/session.py
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import OperationalError
import time
import os
from src.utils.logger import logger

def get_database_url():
    """Get database URL from environment or use default"""
    return os.getenv("DATABASE_URL", "sqlite:///./trading.db")

DATABASE_URL = get_database_url()

def create_engine_with_retry(url, max_retries=3, delay=2):
    """
    Create SQLAlchemy engine with retry logic for connection testing.
    """
    for attempt in range(1, max_retries + 1):
        try:
            logger.info(f"Database connection attempt {attempt}/{max_retries}...")
            
            engine = create_engine(
                url,
                connect_args={"check_same_thread": False} if url.startswith("sqlite") else {},
                echo=False,
                pool_pre_ping=True,  # Enable connection health checks
            )
            
            # Test the connection
            with engine.connect() as conn:
                # Use text() for raw SQL statements in SQLAlchemy 2.0+
                conn.execute(text("SELECT 1"))
            
            logger.info("✅ Database connection established")
            return engine
            
        except OperationalError as e:
            logger.warning(f"⚠️ Database connection failed (attempt {attempt}/{max_retries}): {e}")
            if attempt < max_retries:
                logger.info(f"Retrying in {delay} seconds...")
                time.sleep(delay)
            else:
                logger.error(f"❌ Failed to connect to database after {max_retries} attempts")
                raise
        except Exception as e:
            logger.error(f"❌ Unexpected database error: {e}")
            raise

try:
    engine = create_engine_with_retry(DATABASE_URL)
except Exception as e:
    logger.critical(f"❌ Failed to create database engine: {e}")
    # Create engine without connection test as fallback
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
        echo=False,
    )
    logger.warning("⚠️ Created database engine without connection test")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)