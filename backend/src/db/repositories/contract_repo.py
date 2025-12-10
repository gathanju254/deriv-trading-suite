# backend/src/db/repositories/contract_repo.py
from src.db.session import SessionLocal
from src.db.models.contract import Contract

class ContractRepo:
    @staticmethod
    def save(contract: Contract):
        db = SessionLocal()
        try:
            db.add(contract)
            db.commit()
            db.refresh(contract)
            return contract
        finally:
            db.close()

    @staticmethod
    def find(id: str):
        db = SessionLocal()
        try:
            return db.query(Contract).filter(Contract.id == id).first()
        finally:
            db.close()

    @staticmethod
    def update(contract: Contract):
        db = SessionLocal()
        try:
            db.merge(contract)
            db.commit()
            return contract
        finally:
            db.close()

    @staticmethod
    def delete(id: str):
        db = SessionLocal()
        try:
            contract = db.query(Contract).filter(Contract.id == id).first()
            if contract:
                db.delete(contract)
                db.commit()
            return contract
        finally:
            db.close()