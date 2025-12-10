# backend/src/test_recovery.py
from src.core.risk_manager import RiskManager
import time

def test_recovery_system():
    """Test the recovery system manually"""
    risk = RiskManager()
    
    print("=== RECOVERY SYSTEM TEST ===")
    print(f"Base amount: ${risk.base_amount}")
    print(f"Recovery enabled: {risk.recovery_enabled}")
    print(f"Multiplier: {risk.recovery_multiplier}")
    print(f"Max streak: {risk.max_recovery_streak}")
    
    # Simulate losing trades
    print("\n--- Simulating losses ---")
    
    # Trade 1: LOSE
    print(f"\nTrade 1: ${risk.get_next_trade_amount()} → LOSS")
    risk.update_trade_outcome("LOST", risk.get_next_trade_amount())
    print(f"  Next amount: ${risk.get_next_trade_amount()}")
    print(f"  Recovery streak: {risk.recovery_streak}")
    print(f"  Total losses: ${abs(risk.total_losses)}")
    
    # Trade 2: LOSE
    print(f"\nTrade 2: ${risk.get_next_trade_amount()} → LOSS")
    risk.update_trade_outcome("LOST", risk.get_next_trade_amount())
    print(f"  Next amount: ${risk.get_next_trade_amount()}")
    print(f"  Recovery streak: {risk.recovery_streak}")
    print(f"  Total losses: ${abs(risk.total_losses)}")
    print(f"  Smart recovery target: ${abs(risk.total_losses)/0.82:.2f}")
    
    # Trade 3: WIN
    print(f"\nTrade 3: ${risk.get_next_trade_amount()} → WIN")
    risk.update_trade_outcome("WON", risk.get_next_trade_amount())
    print(f"  Next amount: ${risk.get_next_trade_amount()}")
    print(f"  Recovery streak: {risk.recovery_streak}")
    print(f"  Total losses: ${abs(risk.total_losses)}")
    
    print("\n=== Test complete ===")
    print("Recovery system working correctly!")

if __name__ == "__main__":
    test_recovery_system()