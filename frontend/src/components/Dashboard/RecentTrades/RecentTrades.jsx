// frontend/src/components/Dashboard/RecentTrades/RecentTrades.jsx
import React from 'react';
import { useTrading } from '../../../context/TradingContext';
import { TrendingUp, TrendingDown, DollarSign, Clock, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import './RecentTrades.css';

const RecentTrades = () => {
  const { tradeHistory, loading } = useTrading();

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatProfit = (amount) => {
    return parseFloat(amount).toFixed(2);
  };

  const getProfitColor = (profit) => {
    if (profit > 0) return 'profit-positive';
    if (profit < 0) return 'profit-negative';
    return 'profit-neutral';
  };

  const getProfitIcon = (profit) => {
    if (profit > 0) return <ArrowUpRight size={14} />;
    if (profit < 0) return <ArrowDownRight size={14} />;
    return null;
  };

  if (loading && (!tradeHistory || tradeHistory.length === 0)) {
    return (
      <div className="recent-trades">
        <div className="section-header">
          <h2>Recent Trades</h2>
        </div>
        <div className="trades-loading">
          <div className="loading-spinner" />
          <p>Loading trades...</p>
        </div>
      </div>
    );
  }

  if (!tradeHistory || tradeHistory.length === 0) {
    return (
      <div className="recent-trades">
        <div className="section-header">
          <h2>Recent Trades</h2>
        </div>
        <div className="no-trades">
          <DollarSign size={32} />
          <p>No trades yet</p>
          <small>Start the bot to begin trading</small>
        </div>
      </div>
    );
  }

  return (
    <div className="recent-trades">
      <div className="section-header">
        <h2>
          <Clock size={20} />
          Recent Trades
        </h2>
        <div className="trade-count">
          Last {tradeHistory.length} trades
        </div>
      </div>

      <div className="trades-table-container">
        <table className="trades-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Symbol</th>
              <th>Direction</th>
              <th>Stake</th>
              <th>Profit/Loss</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {tradeHistory.map((trade, index) => (
              <tr key={trade.id || index} className="trade-row">
                <td className="trade-time">
                  <Clock size={12} />
                  {formatDate(trade.timestamp || trade.time)}
                </td>
                <td className="trade-symbol">
                  {trade.symbol || 'R_100'}
                </td>
                <td className="trade-direction">
                  <span className={`direction-${trade.side?.toLowerCase() || 'buy'}`}>
                    {trade.side?.toUpperCase() || 'BUY'}
                  </span>
                </td>
                <td className="trade-stake">
                  ${trade.stake ? parseFloat(trade.stake).toFixed(2) : '1.00'}
                </td>
                <td className={`trade-profit ${getProfitColor(trade.profit || trade.pnl || 0)}`}>
                  {getProfitIcon(trade.profit || trade.pnl || 0)}
                  ${formatProfit(trade.profit || trade.pnl || 0)}
                </td>
                <td className="trade-status">
                  <span className={`status-${trade.result?.toLowerCase() || 'pending'}`}>
                    {trade.result?.toUpperCase() || 'PENDING'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {tradeHistory.length > 0 && (
        <div className="trades-summary">
          <div className="summary-item">
            <span className="summary-label">Total Trades:</span>
            <span className="summary-value">{tradeHistory.length}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Win Rate:</span>
            <span className="summary-value">
              {tradeHistory.filter(t => t.result === 'WON').length}/{tradeHistory.length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecentTrades;