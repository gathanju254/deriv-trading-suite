// frontend/src/components/Dashboard/RecentTrades/RecentTrades.jsx
import React, { useMemo } from 'react';
import { useTrading } from '../../../context/TradingContext';
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
  // Profit helpers
  // -------------------
  const formatProfit = (trade) => {
    const profit = trade.contract?.profit ?? 0;
    return Number(profit).toFixed(2);
  };

  const getProfitColor = (trade) => {
    const profit = trade.contract?.profit ?? 0;
    if (profit > 0) return 'profit-positive';
    if (profit < 0) return 'profit-negative';
    return 'profit-neutral';
  };

  const getProfitIcon = (trade) => {
    const profit = trade.contract?.profit ?? 0;
    if (profit > 0) return <ArrowUpRight size={14} />;
    if (profit < 0) return <ArrowDownRight size={14} />;
    return null;
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
  // Direction helpers
  // -------------------
  const getDirectionDisplay = (side) => {
    const s = side?.toUpperCase();
    return s === 'CALL' ? 'BUY' : s === 'PUT' ? 'SELL' : 'UNKNOWN';
  };

  const getDirectionClass = (side) => {
    const s = side?.toUpperCase();
    return s === 'CALL' ? 'direction-buy' : 'direction-sell';
  };

  // -------------------
  // Summary (memoized)
  // -------------------
  const summary = useMemo(() => {
    if (!tradeHistory?.length) {
      return { total: 0, won: 0, lost: 0, winRate: 0, totalProfit: '0.00' };
    }

    const total = tradeHistory.length;
    const won = tradeHistory.filter(t => t.status?.toUpperCase() === 'WON').length;
    const lost = tradeHistory.filter(t => t.status?.toUpperCase() === 'LOST').length;
    const winRate = ((won / total) * 100).toFixed(1);
    const totalProfit = tradeHistory
      .reduce((sum, t) => sum + (t.contract?.profit ?? 0), 0)
      .toFixed(2);

    return { total, won, lost, winRate, totalProfit };
  }, [tradeHistory]);

  // -------------------
  // LOADING
  // -------------------
  if (loading && !tradeHistory?.length) {
    return (
      <div className="recent-trades">
        <div className="section-header">
          <h2><BarChart3 size={20} /> Recent Trades</h2>
        </div>
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
        <div className="section-header">
          <h2><BarChart3 size={20} /> Recent Trades</h2>
        </div>
        <div className="no-trades">
          <DollarSign size={32} />
          <p>No trades found</p>
          <small>Trades will appear once the bot starts executing.</small>
        </div>
      </div>
    );
  }

  // -------------------
  // MAIN TABLE
  // -------------------
  return (
    <div className="recent-trades">
      <div className="section-header">
        <h2><BarChart3 size={20} /> Recent Trades</h2>
        <div className="trade-count">{summary.total} trades loaded</div>
      </div>

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
                  {/* ✅ DATETIME CELL */}
                  <td>
                    <div className="trade-datetime">
                      <span className="trade-date">{date}</span>
                      <span className="trade-time">{time}</span>
                    </div>
                  </td>

                  <td className="trade-symbol">{trade.symbol || 'N/A'}</td>

                  <td className="trade-direction">
                    <span className={getDirectionClass(trade.side)}>
                      {getDirectionDisplay(trade.side)}
                    </span>
                  </td>

                  <td>${Number(trade.amount || 0).toFixed(2)}</td>

                  <td>{trade.duration ? `${trade.duration}t` : 'N/A'}</td>

                  <td className="trade-entry-exit">
                    {trade.contract ? (
                      <>
                        <div>Entry: {trade.contract.entry_tick ?? '—'}</div>
                        <div>Exit: {trade.contract.exit_tick ?? '—'}</div>
                      </>
                    ) : (
                      'Pending'
                    )}
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