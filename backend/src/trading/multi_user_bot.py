# backend/src/trading/multi_user_bot.py
import asyncio
import time
from typing import Dict, List
from datetime import datetime
import uuid

from src.core.deriv_api import deriv
from src.core.market_analyzer import market_analyzer
from src.core.signal_consensus import SignalConsensus
from src.core.risk_manager import risk_manager
from src.config.settings import settings
from src.utils.logger import logger

# Import strategies
from src.strategies.mean_reversion import MeanReversionStrategy
from src.strategies.momentum import MomentumStrategy
from src.strategies.breakout import BreakoutStrategy

class UserTradingBot:
    """Individual bot instance for a user"""
    
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.market_analyzer = market_analyzer
        self.consensus = SignalConsensus()
        self.risk = risk_manager
        
        # User-specific strategies (reuse your existing ones)
        self.strategies = [
            MeanReversionStrategy(
                ema_short=5, ema_long=20,
                optimize=settings.STRATEGY_OPTIMIZATION_ENABLED
            ),
            MomentumStrategy(
                rsi_period=14, overbought=70, oversold=30,
                optimize=settings.STRATEGY_OPTIMIZATION_ENABLED
            ),
            BreakoutStrategy(
                window=20, threshold=0.001,
                optimize=settings.STRATEGY_OPTIMIZATION_ENABLED
            )
        ]
        
        self.running = False
        self.last_trade_time = 0
        self.min_trade_interval = 15
        self.latest_price = None
        self.session_open = None
        
        # Commission tracking
        self.total_commission_earned = 0.0
    
    async def run(self, oauth_token: str):
        """Start trading for this user"""
        if self.running:
            logger.warning(f"Bot already running for user {self.user_id}")
            return
        
        self.running = True
        logger.info(f"🚀 Starting TradingBot for user {self.user_id}")
        
        try:
            # Authorize user with Deriv
            authorized = await deriv.authorize_user(self.user_id, oauth_token)
            if not authorized:
                logger.error(f"❌ Authorization failed for user {self.user_id}")
                self.running = False
                return
            
            # Subscribe to ticks
            await deriv.subscribe_ticks_for_user(self.user_id, settings.SYMBOL)
            logger.info(f"📡 Subscribed to ticks for user {self.user_id}")
            
            # Main trading loop (simplified; reuse logic from bot.py)
            while self.running:
                try:
                    await asyncio.sleep(0.1)
                    # Process ticks and signals (integrate your existing _tick_handler logic here)
                    # For brevity, assume signals are processed similarly to bot.py
                    # On trade execution, use deriv.place_trade_for_user to apply markup
                except Exception as e:
                    logger.error(f"Error in user {self.user_id} bot loop: {e}")
                    await asyncio.sleep(1)
        
        except Exception as e:
            logger.error(f"Failed to start bot for user {self.user_id}: {e}")
            self.running = False
    
    async def stop(self):
        """Stop trading for this user"""
        self.running = False
        logger.info(f"🛑 Stopped TradingBot for user {self.user_id}")

class MultiUserBotManager:
    """Manager for multiple user bots"""
    
    def __init__(self):
        self.user_bots: Dict[str, UserTradingBot] = {}
        self._user_bot_tasks: Dict[str, asyncio.Task] = {}
        
        # Commission tracking
        self.total_commissions = 0.0
        self.daily_commissions = 0.0
    
    async def start_bot_for_user(self, user_id: str, oauth_token: str) -> bool:
        """Start a trading bot for a specific user"""
        try:
            if user_id in self.user_bots and self.user_bots[user_id].running:
                logger.warning(f"Bot already running for user {user_id}")
                return True
            
            # Create new bot instance
            bot = UserTradingBot(user_id)
            self.user_bots[user_id] = bot
            
            # Start bot in background
            task = asyncio.create_task(bot.run(oauth_token))
            self._user_bot_tasks[user_id] = task
            
            logger.info(f"Started bot for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to start bot for user {user_id}: {e}")
            return False
    
    async def stop_bot_for_user(self, user_id: str) -> bool:
        """Stop trading bot for a specific user"""
        try:
            if user_id in self.user_bots:
                await self.user_bots[user_id].stop()
                
                # Cancel background task
                if user_id in self._user_bot_tasks:
                    self._user_bot_tasks[user_id].cancel()
                    try:
                        await self._user_bot_tasks[user_id]
                    except asyncio.CancelledError:
                        pass
                    
                    del self._user_bot_tasks[user_id]
                
                del self.user_bots[user_id]
                logger.info(f"Stopped bot for user {user_id}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to stop bot for user {user_id}: {e}")
            return False
    
    def get_user_bot_status(self, user_id: str) -> Dict:
        """Get status of a user's bot"""
        if user_id in self.user_bots:
            bot = self.user_bots[user_id]
            return {
                "running": bot.running,
                "user_id": user_id,
                "total_commission": bot.total_commission_earned,
                "last_trade_time": bot.last_trade_time
            }
        return {"running": False, "user_id": user_id}
    
    def get_all_bot_statuses(self) -> List[Dict]:
        """Get status of all user bots"""
        return [
            self.get_user_bot_status(user_id)
            for user_id in self.user_bots.keys()
        ]
    
    def get_commission_summary(self) -> Dict:
        """Get commission earnings summary"""
        return {
            "total_commissions": self.total_commissions,
            "daily_commissions": self.daily_commissions,
            "active_users": len(self.user_bots),
            "markup_percentage": deriv.app_markup_percentage
        }

# Global instance
bot_manager = MultiUserBotManager()