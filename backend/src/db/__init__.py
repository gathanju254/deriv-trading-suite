# backend/src/db/init_db.py
from src.db.session import engine
from src.db.base import Base
from src.db.models import trade, contract, proposal

def init_db():
    Base.metadata.create_all(bind=engine)

if __name__ == "__main__":
    init_db()