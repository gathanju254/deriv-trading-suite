// frontend/src/components/Trading/TradeControls/TradeControls.jsx
import React, { useState, useEffect } from 'react';
import { useTrading } from '../../../context/TradingContext';
import { useToast } from '../../../context/ToastContext';
import { 
  Send, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Percent, 
  Clock,
  Shield,
  Target,
  Zap
} from 'lucide-react';
import './TradeControls.css';

const TradeControls = () => {
  const { executeManualTrade, loading, marketData, tradeHistory } = useTrading();
  const { addToast } = useToast();
  
  const [stake, setStake] = useState(1.00);
  const [duration, setDuration] = useState(60);
  const [selectedAction, setSelectedAction] = useState('call');
  const [recentTrades, setRecentTrades] = useState([]);

  useEffect(() => {
    if (tradeHistory && Array.isArray(tradeHistory)) {
      setRecentTrades(tradeHistory.slice(0, 3));
    }
  }, [tradeHistory]);

  const handleTrade = async (action) => {
    try {
      const tradeData = {
        action,
        stake: parseFloat(stake),
        duration,
        symbol: marketData.symbol || 'R_100',
        price: marketData.lastPrice || 0
      };
      
      await executeManualTrade(action, tradeData);
      addToast(`${action.toUpperCase()} trade executed successfully`, 'success');
      
      // Reset form
      setStake(1.00);
      setDuration(60);
    } catch (error) {
      addToast(`Failed to execute ${action} trade`, 'error');
    }
  };

  const getMarketTrend = () => {
    if (!tradeHistory || tradeHistory.length < 2) return 'neutral';
    
    const recent = tradeHistory.slice(-10);
    const wins = recent.filter(t => t.result === 'WON').length;
    const losses = recent.filter(t => t.result === 'LOST').length;
    
    if (wins > losses * 1.5) return 'bullish';
    if (losses > wins * 1.5) return 'bearish';
    return 'neutral';
  };

  const calculateRisk = () => {
    const baseRisk = stake * 0.85; // 85% of stake is risk
    return baseRisk.toFixed(2);
  };

  const calculatePotentialProfit = () => {
    // For binary options, typical payout is 75-85%
    const payoutRate = selectedAction === 'call' ? 0.78 : 0.82;
    const profit = stake * payoutRate;
    return profit.toFixed(2);
  };

  const getTradeProbability = () => {
    if (!tradeHistory || tradeHistory.length === 0) return 50;
    
    const total = tradeHistory.length;
    const wins = tradeHistory.filter(t => t.result === 'WON').length;
    const winRate = (wins / total) * 100;
    
    // Adjust based on market trend
    const trend = getMarketTrend();
    let adjustment = 0;
    if (trend === 'bullish' && selectedAction === 'call') adjustment = 10;
    if (trend === 'bearish' && selectedAction === 'put') adjustment = 10;
    
    return Math.min(90, Math.max(10, winRate + adjustment));
  };

  const tradeProbability = getTradeProbability();
  const marketTrend = getMarketTrend();

  return (
    <div className="trade-controls">
      <div className="controls-header">
        <h2>
          <Target size={20} />
          Trade Controls
        </h2>
        <div className={`market-trend trend-${marketTrend}`}>
          {marketTrend.charAt(0).toUpperCase() + marketTrend.slice(1)}
        </div>
      </div>

      <div className="controls-content">
        {/* Action Selection */}
        <div className="action-selector">
          <button
            className={`action-btn ${selectedAction === 'call' ? 'active' : ''}`}
            onClick={() => setSelectedAction('call')}
          >
            <TrendingUp size={18} />
            CALL
          </button>
          <button
            className={`action-btn ${selectedAction === 'put' ? 'active' : ''}`}
            onClick={() => setSelectedAction('put')}
          >
            <TrendingDown size={18} />
            PUT
          </button>
        </div>

        {/* Stake Input */}
        <div className="input-group">
          <label>
            <DollarSign size={16} />
            Stake Amount ($)
          </label>
          <div className="stake-input">
            <input
              type="number"
              value={stake}
              onChange={(e) => setStake(Math.max(0.01, parseFloat(e.target.value) || 0))}
              min="0.01"
              step="0.01"
              disabled={loading}
            />
            <div className="stake-presets">
              {[1, 5, 10, 25, 50].map(amount => (
                <button
                  key={amount}
                  className="stake-preset"
                  onClick={() => setStake(amount)}
                  disabled={loading}
                >
                  ${amount}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Duration Input */}
        <div className="input-group">
          <label>
            <Clock size={16} />
            Duration (seconds)
          </label>
          <div className="duration-input">
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(Math.max(5, Math.min(300, parseInt(e.target.value) || 60)))}
              min="5"
              max="300"
              step="5"
              disabled={loading}
            />
            <div className="duration-presets">
              {[5, 15, 30, 60, 120, 300].map(seconds => (
                <button
                  key={seconds}
                  className="duration-preset"
                  onClick={() => setDuration(seconds)}
                  disabled={loading}
                >
                  {seconds}s
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Risk Analysis */}
        <div className="risk-analysis">
          <h3>Risk Analysis</h3>
          <div className="risk-grid">
            <div className="risk-item">
              <div className="risk-icon">
                <Shield size={14} />
              </div>
              <div className="risk-content">
                <span className="risk-label">Risk Amount</span>
                <span className="risk-value">${calculateRisk()}</span>
              </div>
            </div>
            <div className="risk-item">
              <div className="risk-icon">
                <Zap size={14} />
              </div>
              <div className="risk-content">
                <span className="risk-label">Potential Profit</span>
                <span className="risk-value profit">+${calculatePotentialProfit()}</span>
              </div>
            </div>
            <div className="risk-item">
              <div className="risk-icon">
                <Percent size={14} />
              </div>
              <div className="risk-content">
                <span className="risk-label">Win Probability</span>
                <div className="probability-meter">
                  <div 
                    className="probability-fill"
                    style={{ width: `${tradeProbability}%` }}
                  />
                </div>
                <span className="risk-value">{tradeProbability.toFixed(0)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Execute Button */}
        <button
          className={`execute-btn ${selectedAction}`}
          onClick={() => handleTrade(selectedAction)}
          disabled={loading}
        >
          <Send size={18} />
          {loading ? 'Executing...' : `Execute ${selectedAction.toUpperCase()}`}
          <span className="trade-summary">
            Stake: ${stake.toFixed(2)} | Duration: {duration}s
          </span>
        </button>

        {/* Quick Stats */}
        <div className="quick-stats">
          <div className="stat">
            <span className="stat-label">Current Price:</span>
            <span className="stat-value">
              ${marketData.lastPrice ? parseFloat(marketData.lastPrice).toFixed(4) : '0.0000'}
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">Symbol:</span>
            <span className="stat-value">{marketData.symbol || 'R_100'}</span>
          </div>
        </div>

        {/* Recent Trades */}
        {recentTrades.length > 0 && (
          <div className="recent-trades">
            <h3>Recent Trades</h3>
            <div className="trades-list">
              {recentTrades.map((trade, index) => (
                <div key={index} className={`trade-item ${trade.result?.toLowerCase()}`}>
                  <div className="trade-action">
                    <span className={`action ${trade.side?.toLowerCase()}`}>
                      {trade.side?.toUpperCase() || 'CALL'}
                    </span>
                    <span className="trade-amount">${trade.amount?.toFixed(2) || '1.00'}</span>
                  </div>
                  <div className="trade-result">
                    <span className={`result ${trade.result?.toLowerCase()}`}>
                      {trade.result || 'PENDING'}
                    </span>
                    <span className="trade-profit">
                      {trade.profit ? `$${trade.profit.toFixed(2)}` : '—'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TradeControls;