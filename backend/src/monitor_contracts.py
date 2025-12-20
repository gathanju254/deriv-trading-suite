# backend/src/monitor_contracts.py
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

import asyncio
import time
import json
from datetime import datetime
from typing import Dict, Any
from dataclasses import dataclass, asdict
import csv

from src.core.deriv_api import deriv
from src.utils.logger import logger
from src.trading.position_manager import position_manager
from src.trading.order_executor import order_executor
from src.config.settings import settings

@dataclass
class ContractSnapshot:
    """Data class for contract snapshots"""
    contract_id: str
    timestamp: str
    is_sold: bool = False
    is_expired: bool = False
    status: str = "unknown"
    payout: float = 0.0
    sell_price: float = 0.0
    profit: float = 0.0
    entry_tick: float = 0.0
    exit_tick: float = 0.0
    message_type: str = ""
    raw_data: Dict[str, Any] = None
    
    def to_dict(self):
        """Convert to dictionary for JSON serialization"""
        data = asdict(self)
        if self.raw_data:
            try:
                data['raw_data'] = json.dumps(self.raw_data)
            except Exception:
                data['raw_data'] = str(self.raw_data)
        return data

class ContractMonitor:
    """Advanced contract monitoring system"""
    
    def __init__(self):
        self.active_contracts: Dict[str, ContractSnapshot] = {}
        self.closed_contracts: Dict[str, ContractSnapshot] = {}
        self.message_log = []
        self.is_running = False
        self.log_file = f"contract_log_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        self.setup_logging()
    
    def setup_logging(self):
        """Setup CSV logging for contract data"""
        try:
            with open(self.log_file, 'w', newline='') as f:
                writer = csv.writer(f)
                writer.writerow([
                    'timestamp', 'contract_id', 'is_sold', 'is_expired', 
                    'status', 'payout', 'sell_price', 'profit', 
                    'entry_tick', 'exit_tick', 'message_type'
                ])
            logger.info(f"Contract log created: {self.log_file}")
        except Exception as e:
            logger.error(f"Failed to create log file: {e}")
    
    def log_contract_data(self, snapshot: ContractSnapshot):
        """Log contract data to CSV"""
        try:
            with open(self.log_file, 'a', newline='') as f:
                writer = csv.writer(f)
                writer.writerow([
                    snapshot.timestamp,
                    snapshot.contract_id,
                    snapshot.is_sold,
                    snapshot.is_expired,
                    snapshot.status,
                    snapshot.payout,
                    snapshot.sell_price,
                    snapshot.profit,
                    snapshot.entry_tick,
                    snapshot.exit_tick,
                    snapshot.message_type
                ])
        except Exception as e:
            logger.error(f"Failed to log contract data: {e}")
    
    async def message_listener(self, msg: Dict[str, Any]):
        """Enhanced message listener for contract monitoring"""
        timestamp = datetime.now().isoformat()
        
        try:
            msg_type = self._get_message_type(msg)
            logger.debug(f"📨 [{msg_type}] message received")
            
            self.message_log.append({
                'timestamp': timestamp,
                'type': msg_type,
                'data': json.dumps(msg)[:500]
            })
            if len(self.message_log) > 100:
                self.message_log.pop(0)
            
            if "proposal_open_contract" in msg:
                await self._handle_contract_update(msg["proposal_open_contract"], timestamp)
            elif "contract" in msg:
                await self._handle_contract_update(msg["contract"], timestamp)
            elif "sell" in msg:
                await self._handle_sell_message(msg["sell"], timestamp)
            elif "buy" in msg:
                await self._handle_buy_message(msg["buy"], timestamp)
            elif "error" in msg:
                logger.error(f"❌ Error from Deriv: {msg.get('error')}")
            
        except Exception as e:
            logger.error(f"Error in message listener: {e}")
            logger.exception("Full traceback:")
    
    def _get_message_type(self, msg: Dict[str, Any]) -> str:
        """Extract message type from Deriv response"""
        if "proposal_open_contract" in msg:
            return "contract_update"
        elif "contract" in msg:
            return "contract"
        elif "sell" in msg:
            return "sell"
        elif "buy" in msg:
            return "buy"
        elif "authorize" in msg:
            return "authorize"
        elif "balance" in msg:
            return "balance"
        elif "tick" in msg:
            return "tick"
        elif "error" in msg:
            return "error"
        else:
            return "unknown"
    
    async def _handle_contract_update(self, contract_data: Dict[str, Any], timestamp: str):
        """Handle contract update messages"""
        contract_id = str(contract_data.get("id") or contract_data.get("contract_id", "unknown"))
        
        snapshot = ContractSnapshot(
            contract_id=contract_id,
            timestamp=timestamp,
            is_sold=contract_data.get("is_sold", False) in [True, 1, "1"],
            is_expired=contract_data.get("is_expired", False) in [True, 1, "1"],
            status=contract_data.get("status", "unknown"),
            payout=float(contract_data.get("payout", 0) or 0),
            sell_price=float(contract_data.get("sell_price", 0) or 0),
            profit=float(contract_data.get("profit", 0) or 0),
            entry_tick=float(contract_data.get("entry_tick", 0) or 0),
            exit_tick=float(contract_data.get("exit_tick", 0) or 0),
            message_type="contract_update",
            raw_data=contract_data
        )
        
        if snapshot.is_sold or snapshot.is_expired or snapshot.status in ["sold", "won", "lost"]:
            self.closed_contracts[contract_id] = snapshot
            if contract_id in self.active_contracts:
                del self.active_contracts[contract_id]
            
            logger.info(f"🎯 CONTRACT {'EXPIRED' if snapshot.is_expired else 'CLOSED'}: {contract_id}")
            logger.info(f"   Status: {snapshot.status}")
            logger.info(f"   Payout: ${snapshot.payout:.2f}")
            logger.info(f"   Profit: ${snapshot.profit:.2f}")
            
            if contract_id in position_manager.active_positions:
                logger.warning(f"⚠️  Contract {contract_id} closed but still in position_manager!")
        else:
            self.active_contracts[contract_id] = snapshot
            logger.debug(f"📝 Active contract update: {contract_id}")
        
        self.log_contract_data(snapshot)
    
    async def _handle_sell_message(self, sell_data: Dict[str, Any], timestamp: str):
        """Handle sell response messages"""
        contract_id = str(sell_data.get("contract_id", "unknown"))
        
        snapshot = ContractSnapshot(
            contract_id=contract_id,
            timestamp=timestamp,
            is_sold=True,
            status="sold",
            payout=float(sell_data.get("amount", 0) or 0),
            sell_price=float(sell_data.get("price", 0) or 0),
            profit=float(sell_data.get("profit", 0) or 0),
            message_type="sell",
            raw_data=sell_data
        )
        
        logger.info(f"💰 SELL EXECUTED: {contract_id}")
        logger.info(f"   Amount: ${snapshot.payout:.2f}")
        logger.info(f"   Profit: ${snapshot.profit:.2f}")
        
        self.log_contract_data(snapshot)
    
    async def _handle_buy_message(self, buy_data: Dict[str, Any], timestamp: str):
        """Handle buy response messages"""
        contract_id = str(buy_data.get("contract_id", buy_data.get("id", "unknown")))
        
        snapshot = ContractSnapshot(
            contract_id=contract_id,
            timestamp=timestamp,
            status="opened",
            message_type="buy",
            raw_data=buy_data
        )
        
        logger.info(f"🛒 BUY CONFIRMED: {contract_id}")
        logger.info(f"   Proposal ID: {buy_data.get('proposal_id')}")
        
        self.log_contract_data(snapshot)
    
    async def periodic_check(self):
        """Periodically check for stuck contracts"""
        while self.is_running:
            await asyncio.sleep(30)
            
            try:
                current_time = time.time()
                stuck_contracts = []
                
                for contract_id, pos in list(position_manager.active_positions.items()):
                    opened_at = pos.get("opened_at", 0)
                    expires_at = pos.get("expires_at", 0)
                    
                    if opened_at and current_time - opened_at > 300:
                        stuck_contracts.append(contract_id)
                
                if stuck_contracts:
                    logger.warning(f"⚠️  Found {len(stuck_contracts)} potentially stuck contracts:")
                    for contract_id in stuck_contracts:
                        logger.warning(f"   - {contract_id}")
                        await deriv.send({
                            "proposal_open_contract": 1,
                            "contract_id": contract_id,
                            "subscribe": 0
                        })
            
            except Exception as e:
                logger.error(f"Error in periodic check: {e}")
    
    async def start_monitoring(self):
        """Start the contract monitoring system"""
        if self.is_running:
            logger.warning("Contract monitor already running")
            return
        
        self.is_running = True
        logger.info("=== ADVANCED CONTRACT MONITOR STARTED ===")
        logger.info(f"Logging to: {self.log_file}")
        
        await deriv.add_listener(self.message_listener)
        
        periodic_task = asyncio.create_task(self.periodic_check())
        
        try:
            while self.is_running:
                await asyncio.sleep(1)
        except asyncio.CancelledError:
            logger.info("Contract monitor stopped")
        finally:
            self.is_running = False
            periodic_task.cancel()
    
    async def stop_monitoring(self):
        """Stop the contract monitoring system"""
        self.is_running = False
        logger.info("Contract monitor stopping...")
    
    def get_status_report(self) -> Dict[str, Any]:
        """Get a status report of the monitoring system"""
        return {
            "is_running": self.is_running,
            "active_contracts_count": len(self.active_contracts),
            "closed_contracts_count": len(self.closed_contracts),
            "recent_messages_count": len(self.message_log),
            "log_file": self.log_file,
            "position_manager_active": len(position_manager.active_positions),
            "order_executor_trades": len(order_executor.trades)
        }
    
    def get_recent_messages(self, limit: int = 20) -> list:
        """Get recent messages for debugging"""
        return self.message_log[-limit:] if self.message_log else []
    
    def get_contract_summary(self, contract_id: str) -> Dict[str, Any]:
        """Get summary for a specific contract"""
        summary = {}
        
        if contract_id in self.active_contracts:
            summary["active"] = self.active_contracts[contract_id].to_dict()
        
        if contract_id in self.closed_contracts:
            summary["closed"] = self.closed_contracts[contract_id].to_dict()
        
        if contract_id in position_manager.active_positions:
            summary["position_manager"] = position_manager.active_positions[contract_id]
        
        for trade_id, trade_data in order_executor.trades.items():
            if trade_data.get("contract_id") == contract_id:
                summary["order_executor"] = {"trade_id": trade_id, **trade_data}
                break
        
        return summary

# Create singleton instance
contract_monitor = ContractMonitor()

async def main():
    """Main function to run the contract monitor"""
    try:
        await deriv.connect()
        ok = await deriv.authorize()
        if not ok:
            logger.error("❌ Authorization failed")
            return
        
        logger.info("✅ Connected and authorized to Deriv")
        
        await deriv.subscribe_ticks(settings.SYMBOL)
        
        await contract_monitor.start_monitoring()
        
    except KeyboardInterrupt:
        logger.info("Stopping monitor...")
        await contract_monitor.stop_monitoring()
    except Exception as e:
        logger.error(f"Monitor failed: {e}")
        await contract_monitor.stop_monitoring()

if __name__ == "__main__":
    asyncio.run(main())