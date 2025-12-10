# backend/src/db/repositories/proposal_repo.py
from src.db.session import SessionLocal
from src.db.models.proposal import Proposal

class ProposalRepo:
    @staticmethod
    def save(proposal: Proposal):
        db = SessionLocal()
        try:
            db.add(proposal)
            db.commit()
            db.refresh(proposal)
            return proposal
        finally:
            db.close()

    @staticmethod
    def find(id: str):
        db = SessionLocal()
        try:
            return db.query(Proposal).filter(Proposal.id == id).first()
        finally:
            db.close()

    @staticmethod
    def delete(id: str):
        db = SessionLocal()
        try:
            proposal = db.query(Proposal).filter(Proposal.id == id).first()
            if proposal:
                db.delete(proposal)
                db.commit()
            return proposal
        finally:
            db.close()