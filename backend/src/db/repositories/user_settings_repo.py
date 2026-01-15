# backend/src/db/repositories/user_settings_repo.py
from src.db.session import SessionLocal
from src.db.models.user_settings import UserSettings


class UserSettingsRepo:
    @staticmethod
    def create_default_settings(user_id: str) -> UserSettings:
        """Create default settings for a new user"""
        db = SessionLocal()
        try:
            settings = UserSettings(user_id=user_id)
            db.add(settings)
            db.commit()
            db.refresh(settings)
            return settings
        finally:
            db.close()

    @staticmethod
    def get_by_user_id(user_id: str) -> UserSettings:
        """Get user settings by user ID"""
        db = SessionLocal()
        try:
            return db.query(UserSettings).filter(
                UserSettings.user_id == user_id
            ).first()
        finally:
            db.close()

    @staticmethod
    def update(user_id: str, **kwargs) -> UserSettings:
        """Update user settings"""
        db = SessionLocal()
        try:
            settings = db.query(UserSettings).filter(
                UserSettings.user_id == user_id
            ).first()
            
            if not settings:
                raise ValueError(f"Settings not found for user {user_id}")
            
            for key, value in kwargs.items():
                if hasattr(settings, key):
                    setattr(settings, key, value)
            
            db.commit()
            db.refresh(settings)
            return settings
        finally:
            db.close()

    @staticmethod
    def get_dict(user_id: str) -> dict:
        """Get user settings as dictionary"""
        db = SessionLocal()
        try:
            settings = db.query(UserSettings).filter(
                UserSettings.user_id == user_id
            ).first()
            
            if not settings:
                return None
            
            return settings.to_dict()
        finally:
            db.close()