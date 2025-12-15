# backend/src/core/risk_manager.py
import time
import math
from typing import Dict, List, Optional
from src.config.settings import settings
from src.utils.logger import logger
from enum import Enum
from dataclasses import dataclass


# ======================================================
# RISK STATES
# ======================================================

class RiskState(Enum):
    NORMAL = "normal"
    RECOVERY = "recovery"
    PANIC = "panic"
    LOCKED = "locked"


# ======================================================
# CONFIG
# ======================================================

@dataclass
class RiskConfig:
    min_balance: float = 5.0
    max_daily_loss_pct: float = 0.05
    max_drawdown_pct: float = 0.15  # HARD DRAWDOWN STOP

    max_trades_per_hour: int = 20
    max_open_trades: int = 3
    cooldown_seconds: int = 10

    recovery_enabled: bool = True
    recovery_multiplier: float = 1.6  # For hybrid mode
    max_recovery_streak: int = 4  # Reduced for safety
    max_recovery_pct_balance: float = 0.05
    max_recovery_multiplier: float = 6.0  # Hard cap

    panic_drawdown_ratio: float = 0.8  # Panic at 80% of max drawdown
    panic_lock_seconds: int = 1800  # 30 minutes

    fib_sequence = [1, 1, 2, 3, 5, 8]  # For hybrid recovery


# ======================================================
# RISK MANAGER (ENHANCED WITH HYBRID RECOVERY & HARD DRAWDOWN)
# ======================================================

class RiskManager:
    """
    ENHANCED RISK MANAGER WITH HYBRID FIBONACCI+MARTINGALE RECOVERY AND HARD DRAWDOWN STOP
    - Hybrid Recovery: Fibonacci (1-2 losses) → Fibonacci × Martingale (3+ losses) → Safe step-back on wins
    - Hard Drawdown Stop: Locks trading at max drawdown (non-negotiable)
    - Fixed total_losses tracking for accurate recovery targets
    - Preserves all existing features: Panic mode, session management, safety checks, metrics
    """

    def __init__(self, config: Optional[RiskConfig] = None):
        self.config = config or RiskConfig()
        
        # Load from settings for compatibility
        self.config.recovery_enabled = settings.RECOVERY_ENABLED
        self.config.recovery_multiplier = settings.RECOVERY_MULTIPLIER
        self.config.max_recovery_streak = min(settings.MAX_RECOVERY_STREAK, 4)  # Cap for safety
        self.config.max_recovery_pct_balance = settings.MAX_RECOVERY_AMOUNT_MULTIPLIER
        self.config.max_trades_per_hour = 12  # From your existing code
        self.config.max_open_trades = settings.MAX_TRADES
        self.config.cooldown_seconds = 10  # From your existing code

        self.state = RiskState.NORMAL

        # Core parameters (preserved)
        self.base_amount = settings.TRADE_AMOUNT
        self.max_open_trades = settings.MAX_TRADES
        self.balance_floor_pct = 0.20
        self.daily_loss_limit_pct = 0.10
        self.max_drawdown_pct = 0.15
        self.cooldown_after_loss = settings.COOLDOWN_AFTER_LOSS
        self.cooldown_after_win = settings.COOLDOWN_AFTER_WIN
        self.recovery_mode = "HYBRID"  # New: Hybrid Fibonacci + Martingale
        self.reset_on_win = settings.RESET_ON_WIN
        self.smart_recovery = settings.SMART_RECOVERY
        self.max_recovery_amount_multiplier = settings.MAX_RECOVERY_AMOUNT_MULTIPLIER

        # Set recovery attributes directly on self for direct access
        self.recovery_enabled = self.config.recovery_enabled
        self.recovery_multiplier = self.config.recovery_multiplier
        self.max_recovery_streak = self.config.max_recovery_streak
        self.max_recovery_pct_balance = self.config.max_recovery_pct_balance

        # Recovery tracking (enhanced)
        self.consecutive_losses = 0
        self.consecutive_wins = 0
        self.recovery_streak = 0
        self.next_trade_amount = self.base_amount
        self.total_losses = 0.0  # Fixed: Now properly tracks cumulative losses
        self.recovery_target = 0.0
        self.recovery_history = []
        self.fibonacci_sequence = self.config.fib_sequence

        # Hourly overtrading protection (preserved)
        self.max_trades_per_hour = 12
        self.trade_count_1h = 0
        self.last_reset_time = time.time()

        # PnL monitoring (preserved/enhanced)
        self.start_day_balance = None
        self.peak_balance = None
        self.last_trade_amount = self.base_amount
        self.net_loss = 0.0
        self.daily_loss = 0.0

        # New: Panic mode tracking
        self.panic_until = None

        if self.config.recovery_enabled:
            logger.info("🛡️ RiskManager ready with Hybrid Recovery & Hard Drawdown Stop")

    # ==================================================
    # SESSION MANAGEMENT (PRESERVED)
    # ==================================================

    def start_session(self, balance: float):
        """Initialize/reset state for a new trading session"""
        self.start_day_balance = balance
        self.peak_balance = balance
        self.daily_loss = 0.0
        self.net_loss = 0.0
        self.recovery_streak = 0
        self.total_losses = 0.0  # Reset losses per session
        self.recovery_history.clear()
        self.trade_count_1h = 0
        self.last_reset_time = time.time()
        self.state = RiskState.NORMAL
        self.panic_until = None
        logger.info(f"📈 Session started @ balance={balance:.2f}")

    # ==================================================
    # TRADE ALLOWANCE (PRESERVED/ENHANCED)
    # ==================================================

    def allow_trade(self, current_open_count: int, balance: float) -> bool:
        """
        Determines whether the bot is allowed to place a new trade.
        Enhanced with panic mode and session checks.
        """
        now = time.time()

        # New: Check panic/locked states
        if self.state == RiskState.LOCKED:
            logger.info("RiskManager: Trading locked (panic or max drawdown)")
            return False

        if self.state == RiskState.PANIC:
            if now < (self.panic_until or 0):
                logger.info("RiskManager: In panic mode, trading blocked")
                return False
            self.state = RiskState.NORMAL  # Exit panic if time passed

        # Init day trackers (preserved)
        if self.start_day_balance is None:
            self.start_day_balance = balance
        if self.peak_balance is None:
            self.peak_balance = balance

        # Update peak balance for drawdown calc (preserved)
        if balance > self.peak_balance:
            self.peak_balance = balance

        # Recovery system checks (preserved)
        if self.recovery_enabled and self.recovery_streak > 0:
            if not self._check_recovery_limits(balance):
                logger.info("RiskManager: Recovery system blocked trade (limits exceeded)")
                return False

        # Hourly trade limit (preserved, with recovery exception)
        if time.time() - self.last_reset_time > 3600:
            self.trade_count_1h = 0
            self.last_reset_time = time.time()

        hourly_limit_applies = True
        if self.recovery_enabled and self.recovery_streak > 0:
            hourly_limit_applies = False
            logger.info(f"RiskManager: Recovery trade allowed despite hourly limit (streak: {self.recovery_streak})")

        if hourly_limit_applies and self.trade_count_1h >= self.max_trades_per_hour:
            logger.info(f"RiskManager: Hourly trade limit reached ({self.trade_count_1h}/{self.max_trades_per_hour})")
            return False

        # Open trades cap (preserved)
        if current_open_count >= self.max_open_trades:
            logger.info("RiskManager: Max open trades reached.")
            return False

        # Balance protection floor (FIXED: Use start_day_balance)
        if self.start_day_balance is not None:
            min_required = self.start_day_balance * self.balance_floor_pct
            if balance < min_required:
                logger.warning(f"RiskManager: Balance {balance} below protection floor {min_required} (based on start balance). Blocking!")
                return False

        # Daily loss limit (preserved)
        if self.start_day_balance is not None:
            daily_change = (balance - self.start_day_balance) / self.start_day_balance
            if daily_change <= -self.daily_loss_limit_pct:
                logger.warning("RiskManager: Daily loss limit reached. Stopping trading for the day.")
                return False

        # REMOVED: Drawdown check (now owned by _check_drawdown() to avoid double locking)

        # Cooldown after loss streak (preserved)
        if self.consecutive_losses >= self.cooldown_after_loss:
            logger.info(f"RiskManager: In loss cooldown. Loss streak = {self.consecutive_losses}")
            return False

        # Cooldown after win streak (preserved)
        if self.consecutive_wins >= self.cooldown_after_win:
            logger.info(f"RiskManager: Win cooldown active. Wins streak = {self.consecutive_wins}")
            return False

        # Affordability check (preserved)
        if balance < self.next_trade_amount * 1.2:
            logger.info("RiskManager: Insufficient balance for next trade amount.")
            return False

        return True

    # ==================================================
    # POSITION SIZING (ENHANCED WITH HYBRID RECOVERY)
    # ==================================================

    def get_next_trade_amount(self, base_amount: Optional[float] = None, balance: Optional[float] = None) -> float:
        """Calculate next trade amount with hybrid Fibonacci + Martingale recovery"""
        base = base_amount or self.base_amount
        bal = balance or 0.0

        if not self.recovery_enabled or self.recovery_streak == 0:
            return base

        if self.recovery_streak > self.max_recovery_streak:
            self._enter_panic()
            return 0.0

        # Hybrid Recovery Logic
        fib_index = min(self.recovery_streak - 1, len(self.fibonacci_sequence) - 1)
        fib_multiplier = self.fibonacci_sequence[fib_index]

        martingale_factor = 1.0
        if self.recovery_streak >= 3:  # 3+ losses: Add Martingale aggression
            martingale_factor = self.recovery_multiplier

        raw_amount = base * fib_multiplier * martingale_factor

        # Smart recovery (preserved)
        if self.smart_recovery:
            smart_amount = abs(self.total_losses) / 0.82  # Target to recover all losses
            raw_amount = max(raw_amount, smart_amount)

        # Cap at maximum (enhanced)
        max_amount = self.base_amount * self.max_recovery_amount_multiplier
        amount = min(raw_amount, max_amount)

        # New: Cap at percentage of balance
        if bal > 0:
            max_by_balance = bal * self.config.max_recovery_pct_balance
            amount = min(amount, max_by_balance)

        return round(amount, 2)

    # ==================================================
    # TRADE OUTCOME (FIXED TOTAL_LOSSES TRACKING)
    # ==================================================

    def update_trade_outcome(self, trade_result: str, trade_amount: float):
        """
        Update risk state based on wins/losses and compute next trade amount.
        Fixed: Properly tracks total_losses for accurate recovery targets.
        """
        now = time.time()

        # Hourly limit tracking (preserved)
        if not (self.recovery_enabled and self.recovery_streak > 0):
            self.trade_count_1h += 1

        self.last_trade_amount = trade_amount

        # WIN handling (enhanced: Reduce total_losses)
        if trade_result == "WON":
            if self.recovery_enabled and self.recovery_streak > 0:
                self.trade_count_1h += 1

            self.consecutive_losses = 0
            self.consecutive_wins += 1

            # Fixed: Reduce total_losses on win (caps at 0)
            self.total_losses = max(0.0, self.total_losses - trade_amount)
            self.net_loss = max(0.0, self.net_loss - trade_amount)

            # Safe step-back: Reduce streak aggressively on win
            self.recovery_streak = max(0, self.recovery_streak - 2)

            # Record recovery result (preserved)
            if self.recovery_streak > 0:
                recovery_data = {
                    "streak": self.recovery_streak,
                    "amount": self.next_trade_amount,
                    "loss": trade_amount,
                    "total_losses": self.total_losses,
                    "timestamp": now,
                    "recovered": True
                }
                self.recovery_history.append(recovery_data)

            # Reset recovery if streak hits 0 (preserved)
            if self.reset_on_win and self.recovery_streak == 0:
                self.total_losses = 0.0
                self.recovery_target = 0.0
                self.next_trade_amount = self.base_amount
                self.state = RiskState.NORMAL
                logger.info("RiskManager: Recovery system reset after win")

        # LOSS handling (fixed: Increment total_losses)
        if trade_result == "LOST":
            self.consecutive_losses += 1
            self.consecutive_wins = 0
            self.daily_loss += trade_amount  # From your existing code
            self.net_loss += trade_amount

            # Fixed: Increment total_losses for accurate tracking
            self.total_losses += trade_amount

            # Increment recovery streak (preserved)
            self.recovery_streak += 1

            # Calculate next amount (enhanced with hybrid)
            if self.recovery_enabled:
                self.next_trade_amount = self.get_next_trade_amount()
                self.recovery_target = abs(self.total_losses) / 0.82
                self.state = RiskState.RECOVERY

                # Log recovery activation (enhanced)
                logger.info(f"🔄 RECOVERY ACTIVE | Streak: {self.recovery_streak}")
                logger.info(f"   Total Losses: ${abs(self.total_losses):.2f}")
                logger.info(f"   Next Amount: ${self.next_trade_amount:.2f}")
                logger.info(f"   Target Recovery: ${self.recovery_target:.2f}")

                # Record recovery attempt (preserved)
                recovery_data = {
                    "loss": trade_amount,
                    "streak": self.recovery_streak,
                    "total_losses": self.total_losses,
                    "timestamp": now,
                    "recovered": False
                }
                self.recovery_history.append(recovery_data)

        # PENDING/UNKNOWN (preserved)
        if trade_result not in ["WON", "LOST"]:
            self.next_trade_amount = self.base_amount

        # Safety checks (enhanced)
        self._check_drawdown()
        self._check_daily_loss()

    # ==================================================
    # RECOVERY CALCULATIONS (PRESERVED)
    # ==================================================

    def _calculate_fibonacci_amount(self) -> float:
        """Calculate recovery amount using Fibonacci sequence."""
        if self.recovery_streak >= len(self.fibonacci_sequence):
            fib_multiplier = self.fibonacci_sequence[-1]
        else:
            fib_multiplier = self.fibonacci_sequence[self.recovery_streak]
        
        return self.base_amount * fib_multiplier

    def _calculate_martingale_amount(self) -> float:
        """Calculate recovery amount using classic martingale."""
        return self.last_trade_amount * self.recovery_multiplier

    def _calculate_smart_recovery_amount(self) -> float:
        """
        Calculate smart recovery amount based on total losses.
        Accounts for payout percentage (approximately 82% for binary options).
        """
        if self.total_losses <= 0:
            return self.base_amount * self.recovery_multiplier
        
        target_recovery = abs(self.total_losses) / 0.82
        base_recovery = self.last_trade_amount * self.recovery_multiplier
        
        return max(base_recovery, target_recovery)

    def _calculate_next_recovery_amount(self) -> float:
        """Calculate next trade amount based on recovery mode."""
        if not self.recovery_enabled or self.recovery_streak == 0:
            return self.base_amount
        
        if self.recovery_mode == "FIBONACCI":
            base_amount = self._calculate_fibonacci_amount()
        else:
            base_amount = self._calculate_martingale_amount()
        
        if self.smart_recovery:
            smart_amount = self._calculate_smart_recovery_amount()
            base_amount = max(base_amount, smart_amount)
        
        max_amount = self.base_amount * self.max_recovery_amount_multiplier
        return min(base_amount, max_amount)

    def _check_recovery_limits(self, balance: float) -> bool:
        """Check if recovery system is within safe limits."""
        if self.recovery_streak >= self.max_recovery_streak:
            logger.warning(f"RiskManager: Max recovery streak reached ({self.recovery_streak})")
            return False
        
        max_percentage_of_balance = 0.05
        max_amount_by_balance = balance * max_percentage_of_balance
        
        if self.next_trade_amount > max_amount_by_balance:
            logger.warning(f"RiskManager: Recovery amount too large for balance")
            return False
        
        max_allowed = self.base_amount * self.max_recovery_amount_multiplier
        if self.next_trade_amount > max_allowed:
            logger.warning(f"RiskManager: Recovery amount exceeds maximum cap")
            return False
        
        return True

    # ==================================================
    # SAFETY CHECKS (ENHANCED WITH HARD DRAWDOWN)
    # ==================================================

    def _check_drawdown(self):
        if not self.peak_balance or not self.start_day_balance:
            return

        drawdown = self.net_loss / self.peak_balance

        if drawdown >= self.max_drawdown_pct:
            self.state = RiskState.LOCKED
            logger.critical("💥 HARD DRAWDOWN — LOCKED")
        elif drawdown >= self.max_drawdown_pct * self.config.panic_drawdown_ratio:
            self._enter_panic()

    def _check_daily_loss(self):
        if self.start_day_balance and self.daily_loss >= self.start_day_balance * self.daily_loss_limit_pct:
            self.state = RiskState.LOCKED
            logger.critical("📉 DAILY LOSS LIMIT — LOCKED")

    def _enter_panic(self):
        """Enter panic mode to prevent further trading"""
        self.state = RiskState.PANIC
        self.panic_until = time.time() + self.config.panic_lock_seconds
        logger.critical("🚨 PANIC MODE ACTIVATED")

    # ==================================================
    # METRICS (EXPANDED)
    # ==================================================

    def get_next_trade_amount_legacy(self) -> float:
        """Legacy method for backward compatibility"""
        return self.get_next_trade_amount()

    def reset_streak(self):
        """Reset all streaks and recovery system."""
        self.consecutive_losses = 0
        self.consecutive_wins = 0
        self.recovery_streak = 0
        self.total_losses = 0.0
        self.recovery_target = 0.0
        self.next_trade_amount = self.base_amount
        self.state = RiskState.NORMAL
        self.panic_until = None
        logger.info("RiskManager: All streaks and recovery system reset.")

    def get_recovery_metrics(self) -> Dict:
        """Get detailed recovery metrics."""
        return {
            "recovery_enabled": self.recovery_enabled,
            "recovery_streak": self.recovery_streak,
            "consecutive_losses": self.consecutive_losses,
            "total_losses": round(abs(self.total_losses), 2),
            "recovery_target": round(abs(self.total_losses) / 0.82, 2) if self.total_losses > 0 else 0,
            "next_amount": round(self.next_trade_amount, 2),
            "recovery_mode": self.recovery_mode,
            "smart_recovery": self.smart_recovery,
            "max_recovery_streak": self.max_recovery_streak,
            "max_amount_multiplier": self.max_recovery_amount_multiplier,
            "recovery_history_count": len(self.recovery_history),
            "state": self.state.value,
            "panic_until": self.panic_until
        }

    def get_risk_metrics(self) -> Dict:
        """Get comprehensive risk metrics including recovery data."""
        base_metrics = {
            "next_trade_amount": self.next_trade_amount,
            "consecutive_losses": self.consecutive_losses,
            "consecutive_wins": self.consecutive_wins,
            "hourly_trades": self.trade_count_1h,
            "max_trades_per_hour": self.max_trades_per_hour,
            "max_open_trades": self.max_open_trades,
            "balance_floor_pct": self.balance_floor_pct,
            "daily_loss_limit_pct": self.daily_loss_limit_pct,
            "max_drawdown_pct": self.max_drawdown_pct,
            "state": self.state.value,
            "panic_until": self.panic_until,
            "net_loss": self.net_loss,
            "daily_loss": self.daily_loss
        }
        
        if self.recovery_enabled:
            base_metrics.update(self.get_recovery_metrics())
        
        return base_metrics

    def simulate_recovery_sequence(self, initial_loss: float = 10.0, max_streak: int = 3) -> List[Dict]:
        """
        Simulate a recovery sequence for analysis.
        Useful for understanding how the recovery system works.
        """
        sequence = []
        current_amount = initial_loss
        total_loss = initial_loss
        
        for i in range(max_streak):
            fib_index = min(i, len(self.fibonacci_sequence) - 1)
            fib_multiplier = self.fibonacci_sequence[fib_index]
            martingale_factor = 1.0 if i < 2 else self.recovery_multiplier
            next_amount = current_amount * fib_multiplier * martingale_factor
            
            if self.smart_recovery:
                target_recovery = abs(total_loss) / 0.82
                next_amount = max(next_amount, target_recovery)
            
            max_amount = self.base_amount * self.max_recovery_amount_multiplier
            next_amount = min(next_amount, max_amount)
            
            potential_win = next_amount * 0.82
            net_profit = potential_win - total_loss
            
            sequence.append({
                "attempt": i + 1,
                "amount": round(next_amount, 2),
                "total_loss": round(abs(total_loss), 2),
                "target_recovery": round(abs(total_loss) / 0.82, 2),
                "potential_win": round(potential_win, 2),
                "net_profit_if_wins": round(net_profit, 2),
                "recovery_complete": net_profit > 0
            })
            
            current_amount = next_amount
            total_loss += next_amount
        
        return sequence


# ======================================================
# SINGLETON (PRESERVED)
# ======================================================

risk_manager = RiskManager()