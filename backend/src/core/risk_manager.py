# backend/src/core/risk_manager.py
import time
import math
from typing import Dict, List, Optional
from src.config.settings import settings
from src.utils.logger import logger


class RiskManager:
    """
    ENHANCED RISK MANAGER WITH RECOVERY SYSTEM
    - Professional risk management with recovery options
    - Martingale/Fibonacci recovery strategies
    - Smart recovery calculations
    - Multiple safety features
    - Detailed tracking and metrics
    """

    def __init__(self):
        # Core parameters
        self.base_amount = settings.TRADE_AMOUNT
        self.max_open_trades = settings.MAX_TRADES

        # Balance protection
        self.balance_floor_pct = 0.20         # never trade if below 20% of balance
        self.daily_loss_limit_pct = 0.10      # stop trading after -10% daily loss
        self.max_drawdown_pct = 0.15          # global dd protection

        # Cooldowns
        self.cooldown_after_loss = settings.COOLDOWN_AFTER_LOSS
        self.cooldown_after_win = settings.COOLDOWN_AFTER_WIN

        # Recovery system settings
        self.recovery_enabled = settings.RECOVERY_ENABLED
        self.recovery_multiplier = settings.RECOVERY_MULTIPLIER
        self.max_recovery_streak = settings.MAX_RECOVERY_STREAK
        self.max_recovery_amount_multiplier = settings.MAX_RECOVERY_AMOUNT_MULTIPLIER
        self.reset_on_win = settings.RESET_ON_WIN
        self.smart_recovery = settings.SMART_RECOVERY
        self.recovery_mode = settings.RECOVERY_MODE

        # Recovery tracking
        self.consecutive_losses = 0
        self.consecutive_wins = 0
        self.recovery_streak = 0
        self.next_trade_amount = self.base_amount
        self.total_losses = 0.0  # Track total losses for smart recovery
        self.recovery_target = 0.0  # Amount needed to recover losses
        self.recovery_history = []  # Store recovery sequence for analysis

        # Hourly overtrading protection
        self.max_trades_per_hour = 12
        self.trade_count_1h = 0
        self.last_reset_time = time.time()

        # PnL monitoring
        self.start_day_balance = None
        self.peak_balance = None
        self.last_trade_amount = self.base_amount

        # Fibonacci sequence for Fibonacci recovery mode
        self.fibonacci_sequence = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55]

    def _calculate_smart_recovery_amount(self) -> float:
        """
        Calculate smart recovery amount based on total losses.
        Accounts for payout percentage (approximately 82% for binary options).
        """
        if self.total_losses <= 0:
            return self.base_amount * self.recovery_multiplier
        
        # Calculate exact amount needed to recover losses (accounting for 82% payout)
        target_recovery = abs(self.total_losses) / 0.82
        base_recovery = self.last_trade_amount * self.recovery_multiplier
        
        # Use the larger of the two to ensure recovery
        calculated_amount = max(base_recovery, target_recovery)
        
        # Cap at maximum allowed
        max_allowed = self.base_amount * self.max_recovery_amount_multiplier
        return min(calculated_amount, max_allowed)

    def _calculate_fibonacci_amount(self) -> float:
        """Calculate recovery amount using Fibonacci sequence."""
        if self.recovery_streak >= len(self.fibonacci_sequence):
            # Use last Fibonacci number if streak exceeds sequence
            fib_multiplier = self.fibonacci_sequence[-1]
        else:
            fib_multiplier = self.fibonacci_sequence[self.recovery_streak]
        
        return self.base_amount * fib_multiplier

    def _calculate_martingale_amount(self) -> float:
        """Calculate recovery amount using classic martingale."""
        return self.last_trade_amount * self.recovery_multiplier

    def _calculate_next_recovery_amount(self) -> float:
        """Calculate next trade amount based on recovery mode."""
        if not self.recovery_enabled or self.recovery_streak == 0:
            return self.base_amount
        
        if self.recovery_mode == "FIBONACCI":
            base_amount = self._calculate_fibonacci_amount()
        else:  # Default to MARTINGALE
            base_amount = self._calculate_martingale_amount()
        
        # Apply smart recovery if enabled
        if self.smart_recovery:
            smart_amount = self._calculate_smart_recovery_amount()
            base_amount = max(base_amount, smart_amount)
        
        # Apply maximum cap
        max_amount = self.base_amount * self.max_recovery_amount_multiplier
        return min(base_amount, max_amount)

    def _check_recovery_limits(self, balance: float) -> bool:
        """Check if recovery system is within safe limits."""
        # Check max recovery streak
        if self.recovery_streak >= self.max_recovery_streak:
            logger.warning(f"RiskManager: Max recovery streak reached ({self.recovery_streak})")
            return False
        
        # Check if next amount is too large relative to balance
        max_percentage_of_balance = 0.05  # Max 5% of balance per trade
        max_amount_by_balance = balance * max_percentage_of_balance
        
        if self.next_trade_amount > max_amount_by_balance:
            logger.warning(f"RiskManager: Recovery amount too large for balance")
            return False
        
        # Check if recovery would exceed maximum cap
        max_allowed = self.base_amount * self.max_recovery_amount_multiplier
        if self.next_trade_amount > max_allowed:
            logger.warning(f"RiskManager: Recovery amount exceeds maximum cap")
            return False
        
        return True

    # =================================================================
    #                         TRADE ALLOWANCE
    # =================================================================
    def allow_trade(self, current_open_count: int, balance: float) -> bool:
        """
        Determines whether the bot is allowed to place a new trade.
        Enhanced to allow recovery trades to bypass hourly limit.
        """

        # Init day trackers
        if self.start_day_balance is None:
            self.start_day_balance = balance

        if self.peak_balance is None:
            self.peak_balance = balance

        # Update peak balance for drawdown calc
        if balance > self.peak_balance:
            self.peak_balance = balance

        # -------------------------------------------------------------
        # 1) Recovery system checks
        # -------------------------------------------------------------
        if self.recovery_enabled and self.recovery_streak > 0:
            if not self._check_recovery_limits(balance):
                logger.info("RiskManager: Recovery system blocked trade (limits exceeded)")
                return False

        # -------------------------------------------------------------
        # 2) Hourly trade limit - BUT ALLOW RECOVERY TRADES
        # -------------------------------------------------------------
        if time.time() - self.last_reset_time > 3600:
            self.trade_count_1h = 0
            self.last_reset_time = time.time()

        # EXCEPTION: Allow recovery trades even if hourly limit reached
        hourly_limit_applies = True
        if self.recovery_enabled and self.recovery_streak > 0:
            hourly_limit_applies = False
            logger.info(f"RiskManager: Recovery trade allowed despite hourly limit (streak: {self.recovery_streak})")

        if hourly_limit_applies and self.trade_count_1h >= self.max_trades_per_hour:
            logger.info(f"RiskManager: Hourly trade limit reached ({self.trade_count_1h}/{self.max_trades_per_hour})")
            return False

        # -------------------------------------------------------------
        # 3) Open trades cap
        # -------------------------------------------------------------
        if current_open_count >= self.max_open_trades:
            logger.info("RiskManager: Max open trades reached.")
            return False

        # -------------------------------------------------------------
        # 4) Balance protection floor
        # -------------------------------------------------------------
        min_required = balance * self.balance_floor_pct
        if balance < min_required:
            logger.warning(f"RiskManager: Balance {balance} below protection floor {min_required}. Blocking!")
            return False

        # -------------------------------------------------------------
        # 5) Daily loss limit
        # -------------------------------------------------------------
        daily_change = (balance - self.start_day_balance) / self.start_day_balance
        if daily_change <= -self.daily_loss_limit_pct:
            logger.warning("RiskManager: Daily loss limit reached. Stopping trading for the day.")
            return False

        # -------------------------------------------------------------
        # 6) Max drawdown protection
        # -------------------------------------------------------------
        drawdown = (self.peak_balance - balance) / self.peak_balance
        if drawdown >= self.max_drawdown_pct:
            logger.warning("RiskManager: Max drawdown hit. Block trading to avoid deeper losses.")
            return False

        # -------------------------------------------------------------
        # 7) Cooldown after loss streak
        # -------------------------------------------------------------
        if self.consecutive_losses >= self.cooldown_after_loss:
            logger.info(
                f"RiskManager: In loss cooldown. Loss streak = {self.consecutive_losses}"
            )
            return False

        # -------------------------------------------------------------
        # 8) Cooldown after win streak (profit locking)
        # -------------------------------------------------------------
        if self.consecutive_wins >= self.cooldown_after_win:
            logger.info(
                f"RiskManager: Win cooldown active. Wins streak = {self.consecutive_wins}"
            )
            return False

        # -------------------------------------------------------------
        # 9) Check if next trade amount is affordable
        # -------------------------------------------------------------
        if balance < self.next_trade_amount * 1.2:  # 20% buffer
            logger.info("RiskManager: Insufficient balance for next trade amount.")
            return False

        return True

    # =================================================================
    #                         UPDATE OUTCOME
    # =================================================================
    def update_trade_outcome(self, trade_result: str, trade_amount: float):
        """
        Update risk state based on wins/losses and compute next trade amount.
        Enhanced with recovery system.
        """

        # Don't count recovery trades toward hourly limit until after completion
        # (They were already allowed to bypass the limit)
        if not (self.recovery_enabled and self.recovery_streak > 0):
            self.trade_count_1h += 1

        self.last_trade_amount = trade_amount

        # -------------------------
        # WIN — handle recovery completion
        # -------------------------
        if trade_result == "WON":
            # NOW count the successful recovery trade toward hourly limit
            if self.recovery_enabled and self.recovery_streak > 0:
                self.trade_count_1h += 1

            self.consecutive_losses = 0
            self.consecutive_wins += 1

            # Record recovery result
            if self.recovery_streak > 0:
                logger.info(f"✅ RECOVERY COMPLETE after {self.recovery_streak} attempts")
                recovery_data = {
                    "streak": self.recovery_streak,
                    "total_losses": self.total_losses,
                    "final_amount": trade_amount,
                    "recovered": True,
                    "timestamp": time.time()
                }
                self.recovery_history.append(recovery_data)

            # Reset recovery system
            if self.reset_on_win:
                self.recovery_streak = 0
                self.total_losses = 0.0
                self.recovery_target = 0.0
                self.next_trade_amount = self.base_amount
                logger.info("RiskManager: Recovery system reset after win")
            else:
                self.next_trade_amount = self.base_amount

            return

        # -------------------------
        # LOSS — activate/increment recovery
        # -------------------------
        if trade_result == "LOST":
            # Recovery loss doesn't count toward hourly limit yet
            # (Will be counted when recovery completes)
            if not (self.recovery_enabled and self.recovery_streak > 0):
                self.trade_count_1h += 1

            self.consecutive_losses += 1
            self.consecutive_wins = 0

            # Update total losses
            self.total_losses -= trade_amount

            # Increment recovery streak
            self.recovery_streak += 1

            # Calculate next amount
            if self.recovery_enabled:
                self.next_trade_amount = self._calculate_next_recovery_amount()

                # Log recovery activation
                logger.info(f"🔄 RECOVERY ACTIVE | Streak: {self.recovery_streak}")
                logger.info(f"   Total Losses: ${abs(self.total_losses):.2f}")
                logger.info(f"   Next Amount: ${self.next_trade_amount:.2f}")
                logger.info(f"   Target Recovery: ${abs(self.total_losses)/0.82:.2f}")

                # Record recovery attempt
                recovery_data = {
                    "streak": self.recovery_streak,
                    "amount": self.next_trade_amount,
                    "loss": trade_amount,
                    "total_losses": self.total_losses,
                    "timestamp": time.time()
                }
                self.recovery_history.append(recovery_data)
            else:
                # No recovery, use conservative increase
                if self.consecutive_losses >= 2:
                    new_amount = trade_amount * 1.5
                    max_amount = self.base_amount * 3
                    self.next_trade_amount = min(new_amount, max_amount)
                else:
                    self.next_trade_amount = self.base_amount

            return

        # PENDING / UNKNOWN => safe reset
        self.next_trade_amount = self.base_amount

    # =================================================================
    #                      RISK METRICS REPORTING
    # =================================================================
    def get_next_trade_amount(self) -> float:
        return float(self.next_trade_amount)

    def reset_streak(self):
        """Reset all streaks and recovery system."""
        self.consecutive_losses = 0
        self.consecutive_wins = 0
        self.recovery_streak = 0
        self.total_losses = 0.0
        self.recovery_target = 0.0
        self.next_trade_amount = self.base_amount
        logger.info("RiskManager: All streaks and recovery system reset.")

    def get_recovery_metrics(self) -> Dict:
        """Get detailed recovery metrics."""
        return {
            "recovery_enabled": self.recovery_enabled,
            "recovery_streak": self.recovery_streak,
            "consecutive_losses": self.consecutive_losses,
            "total_losses": round(abs(self.total_losses), 2),
            "recovery_target": round(abs(self.total_losses) / 0.82, 2) if self.total_losses < 0 else 0,
            "next_amount": round(self.next_trade_amount, 2),
            "recovery_mode": self.recovery_mode,
            "smart_recovery": self.smart_recovery,
            "max_recovery_streak": self.max_recovery_streak,
            "max_amount_multiplier": self.max_recovery_amount_multiplier,
            "recovery_history_count": len(self.recovery_history)
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
        }
        
        # Add recovery metrics if enabled
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
            if self.recovery_mode == "FIBONACCI":
                next_amount = current_amount * self.fibonacci_sequence[min(i, len(self.fibonacci_sequence)-1)]
            else:
                next_amount = current_amount * self.recovery_multiplier
            
            # Apply smart recovery calculation
            if self.smart_recovery:
                target_recovery = abs(total_loss) / 0.82
                next_amount = max(next_amount, target_recovery)
            
            # Apply cap
            max_amount = self.base_amount * self.max_recovery_amount_multiplier
            next_amount = min(next_amount, max_amount)
            
            # Calculate potential win (82% payout)
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
            
            # Update for next iteration
            current_amount = next_amount
            total_loss += next_amount
        
        return sequence

risk_manager = RiskManager()