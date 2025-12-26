# backend//test_connection.py
import asyncio
import time
from src.core.deriv_api import deriv

async def test_connection():
    print("Testing Deriv WebSocket connection...")
    
    try:
        start = time.time()
        await deriv.connect()
        print(f"Connect: {time.time() - start:.2f}s")
        
        start = time.time()
        authorized = await deriv.authorize()
        print(f"Authorize: {time.time() - start:.2f}s - Success: {authorized}")
        
        if authorized:
            balance = await deriv.get_balance()
            print(f"Balance: {balance}")
            
            # Test tick subscription
            await deriv.subscribe_ticks("R_50")
            print("Subscribed to ticks")
            
            # Listen for a few ticks
            tick_count = 0
            
            async def tick_handler(msg):
                nonlocal tick_count
                if "tick" in msg:
                    tick_count += 1
                    tick = msg["tick"]
                    print(f"Tick {tick_count}: {tick.get('symbol')} @ {tick.get('quote')}")
            
            await deriv.add_listener(tick_handler)
            
            print("Listening for ticks (5 seconds)...")
            await asyncio.sleep(5)
            
            await deriv.remove_listener(tick_handler)
            print(f"Received {tick_count} ticks")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        await deriv.close()
        print("Connection closed")

if __name__ == "__main__":
    asyncio.run(test_connection())