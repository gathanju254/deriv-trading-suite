# backend/src/db/repositories/trade_repo.py
from src.db.session import SessionLocal
from src.db.models.trade import Trade

class TradeRepo:
    @staticmethod
    def create(trade: Trade):
        db = SessionLocal()
        try:
            db.add(trade)
            db.commit()
            db.refresh(trade)
            return trade
        finally:
            db.close()

    @staticmethod
    def get(trade_id: str):
        db = SessionLocal()
        try:
            return db.query(Trade).filter(Trade.id == trade_id).first()
        finally:
            db.close()

    @staticmethod
    def update(trade: Trade):
        db = SessionLocal()
        try:
            db.merge(trade)
            db.commit()
            return trade
        finally:
            db.close()

    @staticmethod
    def delete(trade_id: str):
        db = SessionLocal()
        try:
            trade = db.query(Trade).filter(Trade.id == trade_id).first()
            if trade:
                db.delete(trade)
                db.commit()
            return trade
        finally:
            db.close()