// frontend/src/components/Dashboard/RecentTrades/RecentTrades.jsx
// frontend/src/components/Dashboard/RecentTrades/RecentTrades.jsx
import React from 'react';
import { useTrading } from '../../../hooks/useTrading';
import { ArrowUpRight, ArrowDownRight, DollarSign, Clock } from 'lucide-react';

const RecentTrades = () => {
  const { tradeHistory, loading } = useTrading();

  // Format date/time
  const formatDateTime = (timestamp) => {
    if (!timestamp) return { date: '--', time: '--:--' };
    try {
      const date = new Date(timestamp);
      return {
        date: date.toLocaleDateString([], { month: 'short', day: 'numeric' }),
        time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
    } catch {
      return { date: '--', time: '--:--' };
    }
  };

  // Calculate profit with fallbacks
  const calculateProfit = (trade) => {
    // Try net_profit first
    if (trade.net_profit !== undefined && trade.net_profit !== null) {
      return Number(trade.net_profit);
    }
    
    // Try profit field
    if (trade.profit !== undefined && trade.profit !== null) {
      return Number(trade.profit);
    }
    
    // Calculate based on status
    if (trade.status?.toUpperCase() === 'WON') {
      const stake = trade.stake_amount || 0;
      return stake * 0.82; // 82% profit
    } else if (trade.status?.toUpperCase() === 'LOST') {
      return -(trade.stake_amount || 0);
    }
    
    return 0;
  };

  // Get status color
  const getStatusColor = (status) => {
    switch(status?.toUpperCase()) {
      case 'WON': return 'text-green-500';
      case 'LOST': return 'text-red-500';
      case 'ACTIVE': return 'text-yellow-500';
      default: return 'text-gray-400';
    }
  };

  // Get direction display
  const getDirection = (trade) => {
    const side = trade.direction || trade.side;
    const s = side?.toUpperCase();
    if (s === 'RISE' || s === 'BUY' || s === 'CALL') return 'RISE';
    if (s === 'FALL' || s === 'SELL' || s === 'PUT') return 'FALL';
    return '--';
  };

  // Get direction color
  const getDirectionColor = (trade) => {
    const side = trade.direction || trade.side;
    const s = side?.toUpperCase();
    if (s === 'RISE' || s === 'BUY' || s === 'CALL') return 'text-green-500';
    if (s === 'FALL' || s === 'SELL' || s === 'PUT') return 'text-red-500';
    return 'text-gray-400';
  };

  // Calculate summary
  const summary = React.useMemo(() => {
    if (!tradeHistory?.length) {
      return { total: 0, won: 0, profit: 0 };
    }

    const won = tradeHistory.filter(t => t.status?.toUpperCase() === 'WON').length;
    const profit = tradeHistory.reduce((sum, t) => sum + calculateProfit(t), 0);

    return {
      total: tradeHistory.length,
      won,
      winRate: ((won / tradeHistory.length) * 100).toFixed(1),
      profit: profit.toFixed(2)
    };
  }, [tradeHistory]);

  if (loading && !tradeHistory?.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <div className="text-gray-400">Loading trades...</div>
        </div>
      </div>
    );
  }

  if (!tradeHistory?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <DollarSign className="w-12 h-12 text-gray-600 mb-3" />
        <div className="text-gray-400">No trades found</div>
        <div className="text-sm text-gray-600 mt-1">Trades will appear here when executed</div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-900/50 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Total Trades</div>
          <div className="text-lg font-semibold text-white">{summary.total}</div>
        </div>
        
        <div className="bg-gray-900/50 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Win Rate</div>
          <div className="text-lg font-semibold text-green-500">{summary.winRate}%</div>
        </div>
        
        <div className="bg-gray-900/50 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Total Profit</div>
          <div className={`text-lg font-semibold ${parseFloat(summary.profit) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            ${summary.profit}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-xs text-gray-400 border-b border-gray-800">
              <th className="pb-2 px-2 text-left">Time</th>
              <th className="pb-2 px-2 text-left">Direction</th>
              <th className="pb-2 px-2 text-left">Amount</th>
              <th className="pb-2 px-2 text-left">P/L</th>
              <th className="pb-2 px-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {tradeHistory.slice(0, 10).map((trade, index) => {
              const { date, time } = formatDateTime(trade.created_at);
              const profit = calculateProfit(trade);
              const status = trade.status?.toUpperCase();
              
              return (
                <tr 
                  key={trade.id || index} 
                  className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors duration-200"
                >
                  <td className="py-3 px-2">
                    <div className="text-sm">
                      <div className="text-gray-300">{date}</div>
                      <div className="text-xs text-gray-500">{time}</div>
                    </div>
                  </td>
                  
                  <td className="py-3 px-2">
                    <span className={`font-medium ${getDirectionColor(trade)}`}>
                      {getDirection(trade)}
                    </span>
                  </td>
                  
                  <td className="py-3 px-2">
                    <div className="text-gray-300">
                      ${(trade.stake_amount || 0).toFixed(2)}
                    </div>
                  </td>
                  
                  <td className="py-3 px-2">
                    <div className={`flex items-center gap-1 ${profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {profit >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      <span>${Math.abs(profit).toFixed(2)}</span>
                    </div>
                  </td>
                  
                  <td className="py-3 px-2">
                    <span className={getStatusColor(status)}>
                      {status || '--'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* View More */}
      {tradeHistory.length > 10 && (
        <div className="text-center">
          <button className="text-sm text-blue-500 hover:text-blue-400">
            View all {tradeHistory.length} trades →
          </button>
        </div>
      )}
    </div>
  );
};

export default RecentTrades;