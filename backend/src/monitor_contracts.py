# backend/src/monitor_contracts.py
import asyncio
import time
from src.core.deriv_api import deriv
from src.utils.logger import logger

async def monitor_contracts():
    """Monitor contract status and check if they're closing"""
    logger.info("=== CONTRACT MONITOR STARTED ===")
    
    # Add a listener to catch ALL messages
    async def message_listener(msg):
        # Log ALL messages to see what's happening
        print(f"\n📨 RAW MESSAGE: {msg}")
        
        # Check for contract updates
        if "proposal_open_contract" in msg:
            contract = msg["proposal_open_contract"]
            print(f"📝 CONTRACT UPDATE: {contract}")
            
            if contract.get("is_expired") or contract.get("is_sold"):
                print(f"🎯 CONTRACT CLOSED/EXPIRED: {contract.get('id')}")
                print(f"   Status: {contract.get('status')}")
                print(f"   Payout: {contract.get('payout')}")
                print(f"   Sell price: {contract.get('sell_price')}")
        
        # Check for sell messages
        if "sell" in msg:
            sell = msg["sell"]
            print(f"💰 SELL MESSAGE: {sell}")
        
        # Check for balance updates
        if "balance" in msg:
            print(f"💰 BALANCE UPDATE: {msg['balance']}")
    
    await deriv.add_listener(message_listener)
    
    # Keep running
    while True:
        await asyncio.sleep(1)

if __name__ == "__main__":
    asyncio.run(monitor_contracts())