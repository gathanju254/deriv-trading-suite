// frontend/src/components/Dashboard/RecentTrades/RecentTrades.jsx
import React, { useMemo } from 'react';
import { useTrading } from '../../../hooks/useTrading';
import {
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  BarChart3
} from 'lucide-react';
import './RecentTrades.css';

const RecentTrades = () => {
  const { tradeHistory, loading } = useTrading();

  // -------------------
  // Date helpers
  // -------------------
  const formatDateParts = (timestamp) => {
    if (!timestamp) {
      return { date: '—', time: '--:--:--' };
    }

    try {
      const d = new Date(timestamp);
      return {
        date: d.toLocaleDateString([], {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }),
        time: d.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      };
    } catch {
      return { date: '—', time: '--:--:--' };
    }
  };

  // -------------------
  // Profit helpers - FIXED
  // -------------------
  const formatProfit = (trade) => {
    // Use net_profit from contract OR calculate from payout
    if (trade.net_profit !== undefined && trade.net_profit !== null) {
      return Number(trade.net_profit).toFixed(2);
    }
    
    if (trade.profit !== undefined && trade.profit !== null) {
      return Number(trade.profit).toFixed(2);
    }
    
    // Fallback calculation based on status
    if (trade.status?.toUpperCase() === 'WON') {
      const stake = trade.stake_amount || 0;
      const payout = stake * 1.82; // 82% profit on win
      const profit = payout - stake;
      return profit.toFixed(2);
    } else if (trade.status?.toUpperCase() === 'LOST') {
      return (-(trade.stake_amount || 0)).toFixed(2);
    }
    
    return '0.00';
  };

  const getProfitColor = (trade) => {
    let profit = 0;
    
    if (trade.net_profit !== undefined && trade.net_profit !== null) {
      profit = trade.net_profit;
    } else if (trade.profit !== undefined && trade.profit !== null) {
      profit = trade.profit;
    } else if (trade.status?.toUpperCase() === 'WON') {
      const stake = trade.stake_amount || 0;
      profit = stake * 0.82; // 82% profit
    } else if (trade.status?.toUpperCase() === 'LOST') {
      profit = -(trade.stake_amount || 0);
    }
    
    if (profit > 0) return 'profit-positive';
    if (profit < 0) return 'profit-negative';
    return 'profit-neutral';
  };

  const getProfitIcon = (trade) => {
    let profit = 0;
    
    if (trade.net_profit !== undefined && trade.net_profit !== null) {
      profit = trade.net_profit;
    } else if (trade.profit !== undefined && trade.profit !== null) {
      profit = trade.profit;
    } else if (trade.status?.toUpperCase() === 'WON') {
      const stake = trade.stake_amount || 0;
      profit = stake * 0.82;
    } else if (trade.status?.toUpperCase() === 'LOST') {
      profit = -(trade.stake_amount || 0);
    }
    
    if (profit > 0) return <ArrowUpRight size={14} />;
    if (profit < 0) return <ArrowDownRight size={14} />;
    return null;
  };

  // -------------------
  // Entry/Exit helpers - FIXED
  // -------------------
  const getEntryExitDisplay = (trade) => {
    // Check if we have entry_tick and exit_tick directly on trade
    if (trade.entry_tick !== undefined || trade.exit_tick !== undefined) {
      return (
        <>
          <div>Entry: {trade.entry_tick?.toFixed(4) || '—'}</div>
          <div>Exit: {trade.exit_tick?.toFixed(4) || '—'}</div>
        </>
      );
    }
    
    // Check if we have contract data
    if (trade.contract) {
      const entry = trade.contract.entry_tick?.toFixed(4) || trade.contract.entry_spot || '—';
      const exit = trade.contract.exit_tick?.toFixed(4) || trade.contract.exit_spot || trade.contract.sell_spot || trade.contract.current_spot || '—';
      return (
        <>
          <div>Entry: {entry}</div>
          <div>Exit: {exit}</div>
        </>
      );
    } else if (trade.status?.toUpperCase() === 'ACTIVE' && trade.current_price) {
      return (
        <>
          <div>Entry: Pending</div>
          <div>Current: ${trade.current_price.toFixed(4)}</div>
        </>
      );
    } else {
      return 'N/A';
    }
  };

  // -------------------
  // Status helpers
  // -------------------
  const getStatusDisplay = (status) => {
    const map = {
      PENDING: { text: 'PENDING', class: 'status-pending' },
      ACTIVE: { text: 'ACTIVE', class: 'status-pending' },
      WON: { text: 'WON', class: 'status-won' },
      LOST: { text: 'LOST', class: 'status-lost' },
      ERROR: { text: 'ERROR', class: 'status-lost' }
    };

    return map[status?.toUpperCase()] || {
      text: 'UNKNOWN',
      class: 'status-pending'
    };
  };

  // -------------------
  // Direction helpers (RISE/FALL)
  // -------------------
  const getDirectionDisplay = (trade) => {
    const side = trade.direction || trade.side || trade.consensus_data?.side;
    const s = side?.toUpperCase();

    if (s === 'RISE' || s === 'BUY' || s === 'CALL') return 'RISE';
    if (s === 'FALL' || s === 'SELL' || s === 'PUT') return 'FALL';
    return 'UNKNOWN';
  };

  const getDirectionClass = (trade) => {
    const side = trade.direction || trade.side || trade.consensus_data?.side;
    const s = side?.toUpperCase();

    if (s === 'RISE' || s === 'BUY' || s === 'CALL') return 'direction-rise';
    if (s === 'FALL' || s === 'SELL' || s === 'PUT') return 'direction-fall';
    return '';
  };

  // -------------------
  // Summary (memoized) - FIXED
  // -------------------
  const summary = useMemo(() => {
    if (!tradeHistory?.length) {
      return { total: 0, won: 0, lost: 0, winRate: 0, totalProfit: '0.00' };
    }

    const total = tradeHistory.length;
    const won = tradeHistory.filter(t => t.status?.toUpperCase() === 'WON').length;
    const lost = tradeHistory.filter(t => t.status?.toUpperCase() === 'LOST').length;
    const winRate = ((won / total) * 100).toFixed(1);
    
    // Calculate total profit with multiple fallback options
    const totalProfit = tradeHistory.reduce((sum, t) => {
      // Try net_profit first
      if (t.net_profit !== undefined && t.net_profit !== null) {
        return sum + t.net_profit;
      }
      
      // Try profit field
      if (t.profit !== undefined && t.profit !== null) {
        return sum + t.profit;
      }
      
      // Calculate based on status
      if (t.status?.toUpperCase() === 'WON') {
        const stake = t.stake_amount || 0;
        return sum + (stake * 0.82); // 82% profit
      } else if (t.status?.toUpperCase() === 'LOST') {
        return sum - (t.stake_amount || 0);
      }
      
      return sum;
    }, 0).toFixed(2);

    return { total, won, lost, winRate, totalProfit };
  }, [tradeHistory]);

  // -------------------
  // LOADING
  // -------------------
  if (loading && !tradeHistory?.length) {
    return (
      <div className="recent-trades">
        <div className="trades-loading">
          <div className="loading-spinner" />
          <p>Loading trade history...</p>
        </div>
      </div>
    );
  }

  // -------------------
  // EMPTY
  // -------------------
  if (!tradeHistory?.length) {
    return (
      <div className="recent-trades">
        <div className="no-trades">
          <DollarSign size={32} />
          <p>No trades found</p>
          <small>Trades will appear once the bot starts executing.</small>
        </div>
      </div>
    );
  }

  // -------------------
  // MAIN TABLE - FIXED
  // -------------------
  return (
    <div className="recent-trades">
      <div className="trades-table-container">
        <table className="trades-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Symbol</th>
              <th>Direction</th>
              <th>Stake</th>
              <th>Duration</th>
              <th>Entry / Exit</th>
              <th>P/L</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {tradeHistory.map((trade, index) => {
              const { date, time } = formatDateParts(trade.created_at);
              const statusInfo = getStatusDisplay(trade.status);

              return (
                <tr key={trade.id || index} className="trade-row">
                  <td>
                    <div className="trade-datetime">
                      <span className="trade-date">{date}</span>
                      <span className="trade-time">{time}</span>
                    </div>
                  </td>

                  <td className="trade-symbol">{trade.symbol || 'N/A'}</td>

                  <td className="trade-direction">
                    <span className={getDirectionClass(trade)}>
                      {getDirectionDisplay(trade)}
                    </span>
                  </td>

                  {/* FIXED: Use stake_amount instead of amount */}
                  <td>${Number(trade.stake_amount || 0).toFixed(2)}</td>

                  {/* FIXED: Show duration if available */}
                  <td>{trade.duration ? `${trade.duration}t` : '5t'}</td>

                  <td className="trade-entry-exit">
                    {getEntryExitDisplay(trade)}
                  </td>

                  <td className={`trade-profit ${getProfitColor(trade)}`}>
                    {getProfitIcon(trade)}
                    ${formatProfit(trade)}
                  </td>

                  <td className="trade-status">
                    <span className={statusInfo.class}>{statusInfo.text}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* SUMMARY */}
      <div className="trades-summary">
        <div className="summary-item">
          <span className="summary-label">Total Trades</span>
          <span className="summary-value">{summary.total}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Win Rate</span>
          <span className="summary-value">
            {summary.winRate}% ({summary.won}/{summary.total})
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Total Profit</span>
          <span className={`summary-value ${parseFloat(summary.totalProfit) >= 0 ? 'profit-positive' : 'profit-negative'}`}>
            ${summary.totalProfit}
          </span>
        </div>
      </div>
    </div>
  );
};

export default RecentTrades;