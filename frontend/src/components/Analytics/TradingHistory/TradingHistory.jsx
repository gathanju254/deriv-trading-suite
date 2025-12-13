// frontend/src/components/Analytics/TradingHistory/TradingHistory.jsx
import React, { useMemo } from 'react';
import { useTrading } from '../../../context/TradingContext';
import { BarChart3, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import './TradingHistory.css';

const TradingHistory = () => {
  const { tradeHistory } = useTrading();

  const summary = useMemo(() => {
    if (!tradeHistory || tradeHistory.length === 0) {
      return {
        totalTrades: 0,
        wonTrades: 0,
        lostTrades: 0,
        totalProfit: 0,
        winRate: 0
      };
    }

    const won = tradeHistory.filter(t => t.status === 'WON').length;
    const lost = tradeHistory.filter(t => t.status === 'LOST').length;
    const totalProfit = tradeHistory.reduce((sum, t) => sum + (t.contract?.profit || 0), 0);
    const winRate = tradeHistory.length > 0 ? (won / tradeHistory.length) * 100 : 0;

    return {
      totalTrades: tradeHistory.length,
      wonTrades: won,
      lostTrades: lost,
      totalProfit,
      winRate
    };
  }, [tradeHistory]);

  const formatDate = (timestamp) => {
    if (!timestamp) return '—';
    try {
      return new Date(timestamp).toLocaleDateString();
    } catch {
      return '—';
    }
  };

  const formatProfit = (profit) => {
    if (profit === undefined || profit === null) return '—';
    const sign = profit >= 0 ? '+' : '';
    return `${sign}$${profit.toFixed(2)}`;
  };

  return (
    <div className="trading-history">
      <div className="history-header">
        <h3>
          <BarChart3 size={20} />
          Trading History
        </h3>
        <div className="history-summary">
          <span>Total: {summary.totalTrades}</span>
          <span>Won: {summary.wonTrades}</span>
          <span>Lost: {summary.lostTrades}</span>
        </div>
      </div>

      <div className="history-stats">
        <div className="stat-card">
          <div className="stat-icon">
            <DollarSign size={16} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Profit</span>
            <span className={`stat-value ${summary.totalProfit >= 0 ? 'positive' : 'negative'}`}>
              ${summary.totalProfit.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <TrendingUp size={16} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Win Rate</span>
            <span className="stat-value">{summary.winRate.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      <div className="history-table-container">
        <table className="history-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Symbol</th>
              <th>Side</th>
              <th>Amount</th>
              <th>Profit</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {tradeHistory.slice(0, 20).map((trade, index) => (
              <tr key={trade.id || index}>
                <td>{formatDate(trade.created_at)}</td>
                <td>{trade.symbol || '—'}</td>
                <td className={`side ${trade.side?.toLowerCase()}`}>
                  {trade.side || '—'}
                </td>
                <td>${(trade.amount || 0).toFixed(2)}</td>
                <td className={`profit ${trade.contract?.profit >= 0 ? 'positive' : 'negative'}`}>
                  {formatProfit(trade.contract?.profit)}
                </td>
                <td className={`status ${trade.status?.toLowerCase()}`}>
                  {trade.status || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {tradeHistory.length === 0 && (
          <div className="no-history">
            <p>No trading history available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TradingHistory;

