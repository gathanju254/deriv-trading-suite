# backend/src/api/routes.py

# Add these imports at the TOP of your routes.py file
from urllib.parse import urlencode
import secrets
from fastapi import Request, Query, Header
from typing import Optional

# Your existing imports...
from fastapi import APIRouter, HTTPException
from src.core.deriv_api import deriv
from src.trading.order_executor import order_executor, position_manager
from src.trading.bot import trading_bot
from src.utils.logger import logger
from src.config.settings import settings
from src.db.repositories.trade_history_repo import TradeHistoryRepo
from src.db.session import SessionLocal
from src.db.models.trade import Trade
from src.db.models.contract import Contract
from datetime import datetime, timedelta
import asyncio
from src.core.risk_manager import RiskState
from src.trading.multi_user_bot import bot_manager
from src.api.dependencies import get_current_user

router = APIRouter(prefix="/api", tags=["Trading API"])

# ============================================================
# AUTH ROUTES (ADD THESE TO YOUR EXISTING FILE)
# ============================================================

@router.get("/auth/login")
async def deriv_login():
    """
    Returns Deriv OAuth URL.
    Frontend must redirect browser to this URL.
    """
    try:
        state = secrets.token_urlsafe(32)

        params = {
            "app_id": settings.DERIV_APP_ID,
            "redirect_uri": settings.DERIV_OAUTH_REDIRECT_URI,
            "response_type": "token",  # Deriv prefers token flow
            "scope": "read write trade",
            "state": state,
            "brand": "deriv",
            "language": "EN",
        }

        auth_url = f"https://oauth.deriv.com/oauth2/authorize?{urlencode(params)}"
        logger.info(f"Deriv OAuth URL generated: {auth_url[:100]}...")

        return {"redirect_url": auth_url, "state": state}

    except Exception as e:
        logger.error(f"OAuth login generation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate login URL")

@router.get("/auth/callback")
async def deriv_callback_custom(
    request: Request,
    acct1: Optional[str] = Query(None),
    token1: Optional[str] = Query(None),
    acct2: Optional[str] = Query(None),
    token2: Optional[str] = Query(None),
    code: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
):
    """
    Forward to the main auth callback endpoint
    """
    # Import here to avoid circular imports
    from src.api.auth_routes import deriv_callback
    
    # Get database session
    db = SessionLocal()
    try:
        return await deriv_callback(request, acct1, token1, acct2, token2, code, state, db)
    finally:
        db.close()

@router.post("/auth/logout")
async def logout_custom(authorization: str = Header(None)):
    """
    Logout endpoint
    """
    # Import here to avoid circular imports
    from src.api.auth_routes import logout
    
    db = SessionLocal()
    try:
        return await logout(authorization, db)
    finally:
        db.close()

@router.get("/auth/me")
async def get_current_user_custom(authorization: str = Header(None)):
    """
    Get current user info
    """
    # Import here to avoid circular imports
    from src.api.auth_routes import get_current_user
    
    db = SessionLocal()
    try:
        return await get_current_user(authorization, db)
    finally:
        db.close()

# ============================================================
# BASIC BOT STATUS
# ============================================================
@router.get("/status")
async def status():
    return {"bot": "running", "symbol": settings.SYMBOL}

@router.get("/health")
async def health_check():
    """Health check endpoint for load balancers"""
    return {
        "status": "healthy",
        "service": "Deriv Trading Backend",
        "timestamp": datetime.utcnow().isoformat()
    }

@router.get("/balance")
async def balance():
    current_balance = await deriv.get_balance()
    logger.info(f"Balance requested: {current_balance}")
    return {"balance": current_balance}

@router.post("/manual/{direction}")
async def manual_trade(direction: str):
    """Execute manual RISE or FALL trade"""
    # Convert direction to Deriv's contract type
    if direction.upper() == "RISE":
        deriv_side = "CALL"
    elif direction.upper() == "FALL":
        deriv_side = "PUT"
    else:
        raise HTTPException(400, "Direction must be 'rise' or 'fall'")
    
    trade_id = await order_executor.place_trade(
        deriv_side, 
        settings.TRADE_AMOUNT, 
        settings.SYMBOL,
        duration=5,
        duration_unit="t"
    )
    return {
        "trade_id": trade_id,
        "direction": direction.upper(),
        "amount": settings.TRADE_AMOUNT
    }


# ============================================================
# BOT CONTROL ENDPOINTS
# ============================================================
@router.post("/start")
async def start_bot():
    """Start the trading bot"""
    try:
        if not trading_bot.running:
            # Use asyncio.create_task to run in background
            asyncio.create_task(trading_bot.run())
            return {"status": "Bot started", "running": True}
        return {"status": "Bot already running", "running": True}
    except Exception as e:
        logger.error(f"Failed to start bot: {e}")
        raise HTTPException(500, f"Failed to start bot: {e}")

@router.post("/stop")
async def stop_bot():
    """Stop the trading bot"""
    try:
        if trading_bot.running:
            await trading_bot.stop()  # Call the new stop method
            return {"status": "Bot stopped", "running": False}
        return {"status": "Bot already stopped", "running": False}
    except Exception as e:
        logger.error(f"Failed to stop bot: {e}")
        raise HTTPException(500, f"Failed to stop bot: {e}")

@router.get("/bot/status")
async def get_bot_status():
    return {
        "running": trading_bot.running,
        "symbol": settings.SYMBOL,
        "active_positions": position_manager.get_open_count()
    }

# ============================================================
# SIGNALS ENDPOINT
# ============================================================
@router.get("/trades/signals")
async def get_signals(limit: int = 10):
    """Get recent trading signals generated by the bot"""
    try:
        from src.trading.bot import trading_bot
        
        signals = trading_bot.get_recent_signals(limit=limit)
        
        if not signals:
            logger.warning("No signals in bot history - bot may not be running")
            return {
                "signals": [],
                "total_signals": 0,
                "rise_signals": 0,
                "fall_signals": 0,
                "bot_running": trading_bot.running,
                "signal_history_size": len(trading_bot.signal_history),
                "last_update": datetime.utcnow().isoformat()
            }
        
        # Count RISE/FALL signals
        rise_count = sum(1 for s in signals if str(s.get("direction", "")).upper() in ["RISE", "BUY", "CALL"])
        fall_count = sum(1 for s in signals if str(s.get("direction", "")).upper() in ["FALL", "SELL", "PUT"])
        
        logger.info(f"Returning {len(signals)} signals: {rise_count} RISE, {fall_count} FALL")
        
        # Convert signals to use consistent RISE/FALL terminology
        standardized_signals = []
        for signal in signals:
            sig = signal.copy()
            direction = str(sig.get("direction", "")).upper()
            if direction in ["BUY", "CALL"]:
                sig["direction"] = "RISE"
            elif direction in ["SELL", "PUT"]:
                sig["direction"] = "FALL"
            standardized_signals.append(sig)
        
        return {
            "signals": standardized_signals,
            "total_signals": len(signals),
            "rise_signals": rise_count,
            "fall_signals": fall_count,
            "bot_running": trading_bot.running,
            "signal_history_size": len(trading_bot.signal_history),
            "last_update": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error fetching signals: {e}", exc_info=True)
        return {
            "signals": [],
            "total_signals": 0,
            "rise_signals": 0,
            "fall_signals": 0,
            "error": str(e),
            "last_update": datetime.utcnow().isoformat()
        }

# ============================================================
# MARKET DATA
# ============================================================
@router.get("/market/data")
async def get_market_data():
    """Get current market data"""
    try:
        # You can implement actual price fetching here
        return {
            "symbol": settings.SYMBOL,
            "price": 0,  # Placeholder
            "status": "unknown"
        }
    except Exception as e:
        raise HTTPException(500, f"Failed to get market data: {e}")

# ============================================================
# TRADE HISTORY
# ============================================================
@router.get("/trades")
async def get_trades(limit: int = 100, offset: int = 0):
    """
    Fetch recent trades with contract details,
    normalized to RISE / FALL terminology.
    Uses the correct schema with stake_amount instead of amount.
    """
    try:
        trades = TradeHistoryRepo.get_all_trades(limit=limit, offset=offset)
        
        formatted_trades = []
        
        for trade in trades:
            # Get contract data if available
            contract = trade.get("contract") or {}
            
            # Get payout from contract or calculate from trade
            net_payout = None
            if contract and contract.get("net_profit") is not None:
                net_payout = trade.get("stake_amount", 0) + contract.get("net_profit", 0)
            elif trade.get("net_payout") is not None:
                net_payout = trade.get("net_payout")
            
            # Calculate profit/loss
            stake = float(trade.get("stake_amount", 0) or 0)
            profit = None
            if net_payout is not None:
                profit = net_payout - stake
            
            formatted_trades.append({
                "id": trade.get("id"),
                "symbol": trade.get("symbol"),
                "direction": (
                    "RISE"
                    if trade.get("side", "").upper() in ["RISE", "CALL", "BUY"]
                    else "FALL"
                ),
                "stake_amount": stake,
                "status": trade.get("status"),
                "created_at": trade.get("created_at"),
                "settled_at": trade.get("settled_at"),
                "payout": float(net_payout) if net_payout is not None else None,
                "profit": float(profit) if profit is not None else None,  # This should show the actual profit
                "entry_tick": contract.get("entry_tick"),
                "exit_tick": contract.get("exit_tick"),
                "net_profit": contract.get("net_profit", 0.0),  # This should match the profit
            })
        
        return {"trades": formatted_trades}
        
    except Exception as e:
        logger.exception("Error fetching trades")
        return {"error": str(e)}


@router.get("/trades/status/{status}")
async def get_trades_by_status(status: str, limit: int = 100):
    valid_statuses = ["PENDING", "ACTIVE", "WON", "LOST", "ERROR"]
    if status.upper() not in valid_statuses:
        raise HTTPException(400, f"Invalid status. Must be one of: {', '.join(valid_statuses)}")
    
    db = SessionLocal()
    try:
        trades = db.query(Trade).filter(
            Trade.status == status.upper()
        ).order_by(Trade.created_at.desc()).limit(limit).all()
        
        # Convert trades to use RISE/FALL terminology and correct field names
        formatted_trades = []
        for trade in trades:
            formatted_trade = {
                "id": trade.id,
                "symbol": trade.symbol,
                "direction": "RISE" if trade.side == "CALL" else "FALL",
                "stake_amount": float(trade.stake_amount) if trade.stake_amount else 0,
                "status": trade.status,
                "created_at": trade.created_at.isoformat() if trade.created_at else None,
                "settled_at": trade.settled_at.isoformat() if trade.settled_at else None,
            }
            
            # Add contract data if available
            if trade.contract:
                formatted_trade.update({
                    "entry_tick": trade.contract.entry_tick,
                    "exit_tick": trade.contract.exit_tick,
                    "net_profit": trade.contract.net_profit,
                    "payout": float(trade.stake_amount + trade.contract.net_profit) if trade.contract.net_profit else None,
                    "profit": float(trade.contract.net_profit) if trade.contract.net_profit else None,
                })
            
            formatted_trades.append(formatted_trade)
        
        return {"trades": formatted_trades}
    finally:
        db.close()

@router.get("/trades/status/{status}")
async def get_trades_by_status(status: str, limit: int = 100):
    valid_statuses = ["PENDING", "ACTIVE", "WON", "LOST", "ERROR"]
    if status.upper() not in valid_statuses:
        raise HTTPException(400, f"Invalid status. Must be one of: {', '.join(valid_statuses)}")
    
    trades = TradeHistoryRepo.get_trades_by_status(
        status.upper(), limit=limit
    )
    
    # Convert trades to use RISE/FALL terminology
    formatted_trades = []
    for trade in trades:
        formatted_trades.append({
            "id": trade.id,
            "symbol": trade.symbol,
            "direction": "RISE" if trade.side == "CALL" else "FALL",
            "amount": float(trade.stake_amount) if trade.stake_amount else 0,  # Changed from trade.amount
            "status": trade.status,
            "created_at": trade.created_at.isoformat() if trade.created_at else None,
            "settled_at": trade.settled_at.isoformat() if trade.settled_at else None,
            "payout": float(trade.net_payout) if trade.net_payout else None,
            "profit": float(trade.net_payout - trade.stake_amount) if trade.net_payout and trade.stake_amount else None,
        })
    
    return {"trades": formatted_trades}

@router.get("/trades/stats/summary")
async def get_trading_stats():
    stats = TradeHistoryRepo.get_trading_stats()
    
    # Add RISE/FALL breakdown if available
    db = SessionLocal()
    try:
        rise_trades = db.query(Trade).filter(
            (Trade.side == "CALL") | (Trade.side == "BUY")
        ).count()
        fall_trades = db.query(Trade).filter(
            (Trade.side == "PUT") | (Trade.side == "SELL")
        ).count()
        
        stats["rise_trades"] = rise_trades
        stats["fall_trades"] = fall_trades
        stats["rise_ratio"] = round((rise_trades / (rise_trades + fall_trades)) * 100, 2) if (rise_trades + fall_trades) > 0 else 0
    finally:
        db.close()
    
    return stats

@router.get("/trades/date-range")
async def get_trades_by_date_range(start_date: str, end_date: str):
    try:
        start = datetime.fromisoformat(start_date)
        end = datetime.fromisoformat(end_date)
        
        db = SessionLocal()
        try:
            trades = db.query(Trade).filter(
                Trade.created_at >= start,
                Trade.created_at <= end
            ).order_by(Trade.created_at.desc()).all()
            
            # Convert trades to use RISE/FALL terminology
            formatted_trades = []
            for trade in trades:
                formatted_trades.append({
                    "id": trade.id,
                    "symbol": trade.symbol,
                    "direction": "RISE" if trade.side == "CALL" else "FALL",
                    "amount": float(trade.stake_amount) if trade.stake_amount else 0,  # Changed from trade.amount
                    "status": trade.status,
                    "created_at": trade.created_at.isoformat() if trade.created_at else None,
                    "settled_at": trade.settled_at.isoformat() if trade.settled_at else None,
                    "payout": float(trade.net_payout) if trade.net_payout else None,
                    "profit": float(trade.net_payout - trade.stake_amount) if trade.net_payout and trade.stake_amount else None,
                })
            
            return {"trades": formatted_trades}
        finally:
            db.close()
    except ValueError as e:
        raise HTTPException(400, f"Invalid date format: {e}")


# ============================================================
# DEBUG ENDPOINTS
# ============================================================
@router.get("/debug/positions")
async def debug_positions():
    positions = position_manager.active_positions
    
    # Convert positions to use RISE/FALL terminology
    formatted_positions = {}
    for contract_id, pos in positions.items():
        formatted_pos = pos.copy()
        direction = str(pos.get("side", "")).upper()
        if direction in ["CALL", "BUY"]:
            formatted_pos["direction"] = "RISE"
        elif direction in ["PUT", "SELL"]:
            formatted_pos["direction"] = "FALL"
        formatted_positions[contract_id] = formatted_pos
    
    return {
        "open_positions": position_manager.get_open_count(),
        "active_positions": formatted_positions
    }

@router.get("/debug/bot")
async def debug_bot():
    return {
        "bot_running": trading_bot.running,
        "strategies": [s.name for s in trading_bot.strategies],
        "symbol": settings.SYMBOL,
        "trade_amount": settings.TRADE_AMOUNT,
        "contract_type": "Rise/Fall (1-tick)",
        "duration": settings.CONTRACT_DURATION
    }


# ============================================================
# PERFORMANCE + RISK METRICS
# ============================================================
@router.get("/performance/metrics")
async def get_performance_metrics():
    """Get current bot performance metrics"""
    try:
        metrics = trading_bot.get_bot_metrics()  # Remove 'await' here
        return metrics
    except Exception as e:
        logger.error(f"Error getting performance metrics: {e}")
        return {
            "running": trading_bot.running if hasattr(trading_bot, 'running') else False,
            "total_trades": 0,
            "win_rate": 0,
            "pnl": 0,
            "sharpe_ratio": 0,
            "total_profit": 0,
            "completed_trades": 0,
            "winning_trades": 0,
            "contract_type": "Rise/Fall"
        }

@router.get("/risk/metrics")
async def get_risk_metrics():
    metrics = trading_bot.risk.get_risk_metrics()
    # Add contract type info
    metrics["contract_type"] = "Rise/Fall"
    metrics["duration_ticks"] = settings.CONTRACT_DURATION
    return metrics

@router.post("/risk/reset")
async def reset_risk():
    trading_bot.risk.reset_streak()
    return {"status": "Risk streaks reset"}

@router.post("/risk/unlock")
async def manual_unlock():
    """Manually unlock trading if locked"""
    success = trading_bot.risk.manual_unlock()
    if success:
        # Also reset daily profit tracking
        trading_bot.risk.daily_profit = 0.0
        trading_bot.risk.daily_loss = 0.0
        logger.info("💰 Manual unlock: Reset daily profit/loss tracking")
        
        return {
            "status": "Trading unlocked and daily P&L reset",
            "daily_profit": trading_bot.risk.daily_profit,
            "daily_loss": trading_bot.risk.daily_loss,
            "net_daily_pnl": trading_bot.risk.get_net_daily_pnl()["net_daily_pnl"]
        }
    return {"status": "No lock to unlock"}

@router.post("/risk/reset-daily-profit")
async def reset_daily_profit():
    """Reset daily profit tracking to unlock trading"""
    success = trading_bot.risk.manual_unlock()
    if success:
        return {"status": "Daily profit tracking reset and trading unlocked"}
    return {"status": "No lock to reset"}

@router.get("/risk/lock-status")
async def get_lock_status():
    """Get detailed lock status information"""
    risk = trading_bot.risk
    
    # Calculate percentages
    start_balance = risk.start_day_balance or 0
    daily_loss_pct = (risk.daily_loss / start_balance) * 100 if start_balance > 0 else 0
    daily_profit_pct = (risk.daily_profit / start_balance) * 100 if start_balance > 0 else 0
    
    return {
        "state": risk.state.value,
        "locked_until": risk.locked_until,
        "daily_loss": {
            "amount": risk.daily_loss,
            "percentage": round(daily_loss_pct, 2),
            "limit_percentage": risk.daily_loss_limit_pct * 100
        },
        "daily_profit": {
            "amount": risk.daily_profit,
            "percentage": round(daily_profit_pct, 2),
            "limit_percentage": risk.daily_profit_limit_pct * 100
        },
        "start_balance": start_balance,
        "current_balance": await deriv.get_balance(),
        "is_locked": risk.state == RiskState.LOCKED,
        "lock_reason": "daily_loss" if daily_loss_pct >= risk.daily_loss_limit_pct * 100 else 
                      "daily_profit" if daily_profit_pct >= risk.daily_profit_limit_pct * 100 else 
                      "none",
        "contract_type": "Rise/Fall"
    }

# ============================================================
# STRATEGY PERFORMANCE
# ============================================================
@router.get("/strategies/performance")
async def get_strategies_performance():
    # Convert strategy performance to use RISE/FALL terminology
    perf = trading_bot.strategy_performance.copy()
    for strategy_name, data in perf.items():
        # Rename "calls" to "rise_signals" and "puts" to "fall_signals"
        if "calls" in data and "puts" in data:
            data["rise_signals"] = data.pop("calls")
            data["fall_signals"] = data.pop("puts")
    return perf


# ============================================================
# ML CONSENSUS STATUS
# ============================================================
@router.get("/ml/status")
async def get_ml_status():
    return {
        "ml_enabled": settings.ML_CONSENSUS_ENABLED,
        "model_trained": trading_bot.consensus.ml_consensus.is_trained,
        "training_samples": len(trading_bot.consensus.ml_consensus.training_data),
        "prediction_type": "RISE/FALL direction"
    }


# ============================================================
# RECOVERY SYSTEM ENDPOINTS
# ============================================================
@router.post("/recovery/reset")
async def reset_recovery():
    trading_bot.risk.reset_streak()
    return {
        "status": "Recovery system reset",
        "next_amount": trading_bot.risk.get_next_trade_amount(),
        "contract_type": "Rise/Fall"
    }

@router.get("/recovery/status")
async def get_recovery_status():
    status = trading_bot.risk.get_recovery_metrics()
    status["contract_type"] = "Rise/Fall"
    return status

@router.get("/recovery/simulate")
async def simulate_recovery(
    initial_loss: float = 10.0,
    max_streak: int = 3
):
    sequence = trading_bot.risk.simulate_recovery_sequence(
        initial_loss, max_streak
    )
    return {
        "simulation": sequence,
        "settings": {
            "recovery_mode": settings.RECOVERY_MODE,
            "multiplier": settings.RECOVERY_MULTIPLIER,
            "max_streak": settings.MAX_RECOVERY_STREAK,
            "smart_recovery": settings.SMART_RECOVERY,
            "contract_type": "Rise/Fall"
        }
    }

@router.post("/recovery/configure")
async def configure_recovery(
    enabled: bool = None,
    multiplier: float = None,
    max_streak: int = None,
    smart: bool = None,
    mode: str = None
):
    risk = trading_bot.risk

    if enabled is not None:
        risk.recovery_enabled = enabled

    if multiplier is not None and 1.0 <= multiplier <= 5.0:
        risk.recovery_multiplier = multiplier

    if max_streak is not None and 1 <= max_streak <= 10:
        risk.max_recovery_streak = max_streak

    if smart is not None:
        risk.smart_recovery = smart

    if mode in ["MARTINGALE", "FIBONACCI"]:
        risk.recovery_mode = mode

    return {
        "status": "Recovery configuration updated",
        "current": risk.get_recovery_metrics(),
        "contract_type": "Rise/Fall"
    }

@router.post("/trades/manual-settle/{trade_id}")
async def manual_settle_trade(trade_id: str, result: str = None, payout: float = None):
    """Manually settle a stuck trade"""
    db = SessionLocal()
    try:
        trade = db.query(Trade).filter(Trade.id == trade_id).first()
        if not trade:
            raise HTTPException(404, "Trade not found")
        
        if result not in ["WON", "LOST"]:
            raise HTTPException(400, "Result must be 'WON' or 'LOST'")
        
        # Update trade
        trade.status = result
        trade.settled_at = datetime.utcnow()
        if payout is not None:
            trade.net_payout = payout
        
        # Update risk manager
        from src.core.risk_manager import risk_manager
        risk_manager.update_trade_outcome(result, trade.stake_amount, payout - trade.stake_amount if payout else 0)  # Changed from trade.amount
        
        db.commit()
        return {"status": "Trade manually settled", "trade_id": trade_id}
    except Exception as e:
        db.rollback()
        logger.exception("Error manually settling trade")
        raise HTTPException(500, str(e))
    finally:
        db.close()

@router.post("/trades/auto-settle-expired")
async def auto_settle_expired_trades():
    """Automatically settle trades that should have expired"""
    db = SessionLocal()
    try:
        cutoff = datetime.utcnow() - timedelta(minutes=3)
        expired_trades = db.query(Trade).filter(
            Trade.status == "ACTIVE",
            Trade.created_at < cutoff
        ).all()
        
        settled_count = 0
        for trade in expired_trades:
            trade.status = "LOST"
            trade.settled_at = datetime.utcnow()
            trade.net_payout = 0.0
            
            # Update risk manager
            from src.core.risk_manager import risk_manager
            risk_manager.update_trade_outcome("LOST", trade.stake_amount, -trade.stake_amount)  # Changed from trade.amount
            
            settled_count += 1
        
        db.commit()
        return {"status": f"Auto-settled {settled_count} expired trades"}
    except Exception as e:
        db.rollback()
        logger.exception("Error auto-settling expired trades")
        raise HTTPException(500, str(e))
    finally:
        db.close()

# ============================================================
# RISE/FALL SPECIFIC ENDPOINTS
# ============================================================
@router.get("/contract-type")
async def get_contract_type():
    """Get information about the contract type being traded"""
    return {
        "type": "Rise/Fall (Up/Down)",
        "description": "1-tick contract predicting if price will RISE (go up) or FALL (go down)",
        "duration_ticks": settings.CONTRACT_DURATION,
        "deriv_mapping": {
            "RISE": "CALL",
            "FALL": "PUT"
        },
        "payout_percentage": 82,  # Typical for Deriv Rise/Fall contracts
        "symbol": settings.SYMBOL
    }

@router.get("/trades/direction/{direction}")
async def get_trades_by_direction(direction: str, limit: int = 50):
    """Get trades by direction (RISE or FALL)"""
    if direction.upper() not in ["RISE", "FALL"]:
        raise HTTPException(400, "Direction must be 'RISE' or 'FALL'")
    
    db = SessionLocal()
    try:
        deriv_side = "CALL" if direction.upper() == "RISE" else "PUT"
        trades = db.query(Trade).filter(Trade.side == deriv_side).order_by(Trade.created_at.desc()).limit(limit).all()
        
        # Convert trades to use RISE/FALL terminology
        formatted_trades = []
        for trade in trades:
            formatted_trades.append({
                "id": trade.id,
                "symbol": trade.symbol,
                "direction": direction.upper(),
                "amount": float(trade.stake_amount) if trade.stake_amount else 0,  # Changed from trade.amount
                "status": trade.status,
                "created_at": trade.created_at.isoformat() if trade.created_at else None,
                "settled_at": trade.settled_at.isoformat() if trade.settled_at else None,
                "payout": float(trade.net_payout) if trade.net_payout else None,
                "profit": float(trade.net_payout - trade.stake_amount) if trade.net_payout and trade.stake_amount else None,
            })
        
        return {"trades": formatted_trades}
    finally:
        db.close()

# New user-specific endpoints
@router.post("/user/bot/start")
async def start_user_bot(user_id: str, oauth_token: str):
    success = await bot_manager.start_bot_for_user(user_id, oauth_token)
    return {"success": success}

@router.post("/user/bot/stop")
async def stop_user_bot(user_id: str):
    success = await bot_manager.stop_bot_for_user(user_id)
    return {"success": success}

@router.get("/user/bot/status/{user_id}")
async def get_user_bot_status(user_id: str):
    return bot_manager.get_user_bot_status(user_id)

@router.get("/admin/commissions")
async def get_commission_summary():
    return bot_manager.get_commission_summary()