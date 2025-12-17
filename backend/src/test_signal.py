# backend/src/test_signal.py
import sys
import os
import random
import time
from typing import List, Dict

# Add the src directory to the path so we can import modules
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from src.strategies.mean_reversion import MeanReversionStrategy
from src.strategies.momentum import MomentumStrategy
from src.strategies.breakout import BreakoutStrategy
from src.core.signal_consensus import SignalConsensus
from src.config.settings import settings
from src.utils.logger import logger

def generate_fake_ticks(base_price: float = 100.0, num_ticks: int = 50) -> List[Dict]:
    """Generate fake tick data for testing"""
    ticks = []
    price = base_price
    
    for i in range(num_ticks):
        # Simulate some price movement
        change = random.uniform(-0.5, 0.5)
        price += change
        price = max(50.0, min(150.0, price))  # Keep within bounds
        
        tick = {
            "quote": round(price, 4),
            "symbol": settings.SYMBOL,
            "epoch": int(time.time()) + i
        }
        ticks.append(tick)
    
    return ticks

def simulate_trade_outcome(consensus_score: float) -> bool:
    """Simulate win/loss based on consensus score (higher score = higher win chance)"""
    win_probability = 0.5 + (consensus_score - 0.5) * 0.6  # Score 1.0 -> 80% win; Score 0.6 -> 56% win
    return random.random() < win_probability

def test_signal_generation():
    """Test signal generation from all strategies with trade simulation"""
    print("=== SIGNAL GENERATION & TRADE SIMULATION TEST ===")
    
    # Initialize strategies
    strategies = [
        MeanReversionStrategy(optimize=False),  # Disable optimization for testing
        MomentumStrategy(optimize=False),
        BreakoutStrategy(optimize=False)
    ]
    
    # Initialize consensus
    consensus = SignalConsensus()
    
    # Generate fake tick data
    ticks = generate_fake_ticks(base_price=100.0, num_ticks=100)
    print(f"Generated {len(ticks)} fake ticks")
    
    all_signals = []
    open_positions = {}  # tick_index -> {'side': str, 'entry_price': float, 'exit_tick': int}
    total_trades = 0
    wins = 0
    losses = 0
    net_profit = 0.0
    stake = 1.0  # Fixed stake per trade (matches TRADE_AMOUNT)
    contract_duration_ticks = 5  # Simulate 5 ticks for expiry
    
    # Process each tick
    for i, tick in enumerate(ticks):
        print(f"\n--- Processing tick {i+1}/{len(ticks)}: Price={tick['quote']} ---")
        
        # Close any expired positions
        to_close = []
        for entry_tick, pos in open_positions.items():
            if i >= pos['exit_tick']:
                # Simulate outcome at expiry
                exit_price = tick['quote']
                is_win = simulate_trade_outcome(pos.get('consensus_score', 0.5))
                payout = stake * 0.82 if is_win else 0.0  # Deriv payout approximation
                profit = payout - stake
                
                total_trades += 1
                if is_win:
                    wins += 1
                    print(f"  ✅ CLOSED TRADE (WIN): Entry@{pos['entry_price']}, Exit@{exit_price}, Profit=${profit:.2f}")
                else:
                    losses += 1
                    print(f"  ❌ CLOSED TRADE (LOSS): Entry@{pos['entry_price']}, Exit@{exit_price}, Profit=${profit:.2f}")
                
                net_profit += profit
                to_close.append(entry_tick)
        
        for tick_idx in to_close:
            del open_positions[tick_idx]
        
        # Get signals from each strategy
        strategy_signals = []
        for strategy in strategies:
            try:
                signal = strategy.on_tick(tick)
                if signal:
                    print(f"  {strategy.name}: {signal}")
                    strategy_signals.append(signal)
                else:
                    print(f"  {strategy.name}: No signal")
            except Exception as e:
                print(f"  {strategy.name}: ERROR - {e}")
        
        # Aggregate with consensus
        if strategy_signals:
            try:
                consensus_result = consensus.aggregate(strategy_signals, tick['quote'])
                if consensus_result:
                    print(f"  CONSENSUS: {consensus_result}")
                    all_signals.append({
                        'tick': i,
                        'price': tick['quote'],
                        'signals': strategy_signals,
                        'consensus': consensus_result
                    })
                    
                    # Simulate trade entry
                    side = consensus_result['side']
                    entry_price = tick['quote']
                    exit_tick = i + contract_duration_ticks
                    open_positions[i] = {
                        'side': side,
                        'entry_price': entry_price,
                        'exit_tick': exit_tick,
                        'consensus_score': consensus_result['score']
                    }
                    print(f"  🚀 SIMULATED TRADE ENTRY: {side} @ {entry_price}, Exit in {contract_duration_ticks} ticks")
                else:
                    print("  CONSENSUS: No consensus")
            except Exception as e:
                print(f"  CONSENSUS: ERROR - {e}")
        else:
            print("  No signals from any strategy")
    
    # Close any remaining positions at end
    for entry_tick, pos in open_positions.items():
        exit_price = ticks[-1]['quote']  # Use last price
        is_win = simulate_trade_outcome(pos.get('consensus_score', 0.5))
        payout = stake * 0.82 if is_win else 0.0
        profit = payout - stake
        
        total_trades += 1
        if is_win:
            wins += 1
            print(f"  ✅ FINAL CLOSED TRADE (WIN): Entry@{pos['entry_price']}, Exit@{exit_price}, Profit=${profit:.2f}")
        else:
            losses += 1
            print(f"  ❌ FINAL CLOSED TRADE (LOSS): Entry@{pos['entry_price']}, Exit@{exit_price}, Profit=${profit:.2f}")
        
        net_profit += profit
    
    # Summary
    print("\n=== TEST SUMMARY ===")
    print(f"Total ticks processed: {len(ticks)}")
    print(f"Total consensus signals: {len(all_signals)}")
    print(f"Total simulated trades: {total_trades}")
    print(f"Wins: {wins}, Losses: {losses}")
    print(f"Win Rate: {(wins / total_trades * 100) if total_trades > 0 else 0:.1f}%")
    print(f"Net Profit: ${net_profit:.2f}")
    
    if all_signals:
        print("\nConsensus signals:")
        for sig in all_signals:
            print(f"  Tick {sig['tick']}: Price={sig['price']}, Side={sig['consensus']['side']}, Score={sig['consensus']['score']:.3f}")
    else:
        print("No consensus signals generated - check strategy logic or thresholds")
    
    # Test individual strategy metrics
    print("\n=== STRATEGY METRICS ===")
    for strategy in strategies:
        try:
            metrics = strategy.get_strategy_metrics()
            print(f"{strategy.name}: {metrics}")
        except Exception as e:
            print(f"{strategy.name}: ERROR getting metrics - {e}")

if __name__ == "__main__":
    test_signal_generation()