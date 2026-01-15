# backend/src/api/settings_routes.py
from fastapi import APIRouter, HTTPException, Depends
from src.api.dependencies import get_current_user
from src.db.repositories.user_settings_repo import UserSettingsRepo
from src.db.models.user_settings import RecoveryMode
from src.db.session import SessionLocal  # Add this at the top
from src.utils.logger import logger

router = APIRouter(prefix="/api/settings", tags=["User Settings"])


@router.get("")
async def get_user_settings(current_user = Depends(get_current_user)):
    """Get current user's settings"""
    try:
        settings = UserSettingsRepo.get_dict(current_user.id)
        if not settings:
            raise HTTPException(status_code=404, detail="Settings not found")
        return settings
    except Exception as e:
        logger.error(f"Error fetching settings: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch settings")


@router.put("")
async def update_user_settings(
    settings_update: dict,
    current_user = Depends(get_current_user)
):
    """Update user settings"""
    try:
        # Validate recovery mode if provided
        if "recovery_mode" in settings_update:
            try:
                RecoveryMode(settings_update["recovery_mode"])
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid recovery mode. Must be one of: {[m.value for m in RecoveryMode]}"
                )
        
        # Validate ranges
        if "daily_loss_limit_pct" in settings_update:
            val = settings_update["daily_loss_limit_pct"]
            if not (0 < val <= 100):
                raise HTTPException(status_code=400, detail="daily_loss_limit_pct must be between 0 and 100")
        
        if "daily_profit_limit_pct" in settings_update:
            val = settings_update["daily_profit_limit_pct"]
            if not (0 < val <= 100):
                raise HTTPException(status_code=400, detail="daily_profit_limit_pct must be between 0 and 100")
        
        if "recovery_multiplier" in settings_update:
            val = settings_update["recovery_multiplier"]
            if not (1.0 <= val <= 10.0):
                raise HTTPException(status_code=400, detail="recovery_multiplier must be between 1.0 and 10.0")
        
        if "min_consensus_score" in settings_update:
            val = settings_update["min_consensus_score"]
            if not (0.0 <= val <= 1.0):
                raise HTTPException(status_code=400, detail="min_consensus_score must be between 0.0 and 1.0")
        
        # Update settings
        updated_settings = UserSettingsRepo.update(current_user.id, **settings_update)
        logger.info(f"Settings updated for user {current_user.id}")
        
        return updated_settings.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating settings: {e}")
        raise HTTPException(status_code=500, detail="Failed to update settings")


@router.post("/reset")
async def reset_user_settings(current_user = Depends(get_current_user)):
    """Reset user settings to defaults"""
    try:
        # Delete existing settings
        db = SessionLocal()
        try:
            existing = db.query(UserSettings).filter(
                UserSettings.user_id == current_user.id
            ).first()
            if existing:
                db.delete(existing)
                db.commit()
        finally:
            db.close()
        
        # Create new default settings
        settings = UserSettingsRepo.create_default_settings(current_user.id)
        logger.info(f"Settings reset to defaults for user {current_user.id}")
        
        return settings.to_dict()
    except Exception as e:
        logger.error(f"Error resetting settings: {e}")
        raise HTTPException(status_code=500, detail="Failed to reset settings")


@router.get("/available-symbols")
async def get_available_symbols(current_user = Depends(get_current_user)):
    """Get list of available trading symbols"""
    return {
        "symbols": [
            {"value": "R_50", "label": "Volatility 50 Index", "description": "Medium volatility"},
            {"value": "R_100", "label": "Volatility 100 Index", "description": "High volatility"},
            {"value": "R_25", "label": "Volatility 25 Index", "description": "Low volatility"},
            {"value": "EURUSD", "label": "EUR/USD", "description": "Forex pair"},
            {"value": "GBPUSD", "label": "GBP/USD", "description": "Forex pair"},
        ]
    }


@router.get("/available-recovery-modes")
async def get_recovery_modes(current_user = Depends(get_current_user)):
    """Get available recovery modes"""
    return {
        "modes": [
            {"value": "MARTINGALE", "label": "Martingale", "description": "Classic Martingale progression"},
            {"value": "FIBONACCI", "label": "Fibonacci", "description": "Fibonacci sequence progression"},
            {"value": "HYBRID", "label": "Hybrid", "description": "Combined Martingale and Fibonacci"},
        ]
    }