#backend/src/db/base.py
from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    """
    Base class for all SQLAlchemy ORM models.

    All database models (Trade, Proposal, Contract, etc.) should inherit from this class.
    DeclarativeBase handles the SQLAlchemy ORM mapping automatically.
    """
    pass

