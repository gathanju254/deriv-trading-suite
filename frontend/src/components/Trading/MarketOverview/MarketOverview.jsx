// frontend/src/components/Trading/MarketOverview/MarketOverview.jsx
import React, { useEffect, useState } from 'react';
import { useTrading } from '../../../hooks/useTrading';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BarChart3, 
  Clock,
  Activity,
  AlertCircle,
  Zap
} from 'lucide-react';
import './MarketOverview.css';

const MarketOverview = () => {
  const { marketData, signals, tradeHistory } = useTrading();
  const [marketMetrics, setMarketMetrics] = useState({
    trend: 'neutral',
    volatility: 0,
    volume: 0,
    momentum: 0,
    rsi: 50,
    support: 0,
    resistance: 0
  });

  useEffect(() => {
    if (tradeHistory && tradeHistory.length > 0) {
      calculateMarketMetrics();
    }
  }, [tradeHistory, marketData]);

  const calculateMarketMetrics = () => {
    if (!tradeHistory || tradeHistory.length < 5) return;

    const recentTrades = tradeHistory.slice(-20);
    const prices = recentTrades.map(t => parseFloat(t.price) || parseFloat(t.amount) || 0).filter(p => p > 0);
    
    if (prices.length < 2) return;

    // Calculate trend
    const firstPrice = prices[0];
    const lastPrice = prices[prices.length - 1];
    const priceChange = ((lastPrice - firstPrice) / firstPrice) * 100;
    
    let trend = 'neutral';
    if (priceChange > 1) trend = 'bullish';
    else if (priceChange < -1) trend = 'bearish';

    // Calculate volatility
    const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - avgPrice, 2), 0) / prices.length;
    const volatility = Math.sqrt(variance) / avgPrice * 100;

    // Calculate momentum
    const wins = recentTrades.filter(t => t.result === 'WON').length;
    const losses = recentTrades.filter(t => t.result === 'LOST').length;
    const momentum = ((wins - losses) / recentTrades.length) * 100;

    // Calculate RSI from prices (simplified version)
    const rsi = calculateRSI(prices);

    // Calculate support and resistance from actual price data
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const support = minPrice;
    const resistance = maxPrice;

    setMarketMetrics({
      trend,
      volatility: parseFloat(volatility.toFixed(4)),
      volume: recentTrades.length * 1000,
      momentum: parseFloat(momentum.toFixed(1)),
      rsi: parseFloat(rsi.toFixed(1)),
      support: parseFloat(support.toFixed(4)),
      resistance: parseFloat(resistance.toFixed(4))
    });
  };

  const calculateRSI = (prices, period = 14) => {
    if (prices.length < period + 1) return 50; // Default neutral

    const gains = [];
    const losses = [];

    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) {
        gains.push(change);
        losses.push(0);
      } else {
        gains.push(0);
        losses.push(Math.abs(change));
      }
    }

    const avgGain = gains.slice(-period).reduce((sum, gain) => sum + gain, 0) / period;
    const avgLoss = losses.slice(-period).reduce((sum, loss) => sum + loss, 0) / period;

    if (avgLoss === 0) return 100;

    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  };

  const getMarketSentiment = () => {
    if (marketMetrics.momentum > 20) return 'Very Bullish';
    if (marketMetrics.momentum > 5) return 'Bullish';
    if (marketMetrics.momentum > -5) return 'Neutral';
    if (marketMetrics.momentum > -20) return 'Bearish';
    return 'Very Bearish';
  };

  const getSignalStrength = () => {
    if (!signals || signals.length === 0) return 0;
    
    const buySignals = signals.filter(s => s.direction === 'buy' || s.direction === 'BUY' || s.direction === 'call' || s.direction === 'CALL').length;
    const sellSignals = signals.filter(s => s.direction === 'sell' || s.direction === 'SELL' || s.direction === 'put' || s.direction === 'PUT').length;
    
    if (buySignals === 0 && sellSignals === 0) return 0;
    return ((buySignals - sellSignals) / (buySignals + sellSignals)) * 100;
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '—';
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getRSIColor = (rsi) => {
    if (rsi > 70) return '#ef4444'; // Overbought
    if (rsi < 30) return '#3b82f6'; // Oversold
    return '#10b981'; // Neutral
  };

  const getMomentumColor = (momentum) => {
    if (momentum > 20) return '#10b981'; // Strong bullish
    if (momentum > 5) return '#22c55e'; // Bullish
    if (momentum > -5) return '#94a3b8'; // Neutral
    if (momentum > -20) return '#f59e0b'; // Bearish
    return '#ef4444'; // Strong bearish
  };

  return (
    <div className="market-overview-trading">
      <div className="overview-header">
        <h2>
          <BarChart3 size={20} />
          Market Analysis
        </h2>
        <div className={`market-status ${marketMetrics.trend}`}>
          {marketMetrics.trend.toUpperCase()}
        </div>
      </div>

      <div className="overview-content">
        {/* Current Market Data */}
        <div className="current-market">
          <div className="price-display">
            <div className="price-info">
              <span className="price-label">Current Price</span>
              <span className="price-value">
                ${marketData.lastPrice ? parseFloat(marketData.lastPrice).toFixed(4) : '0.0000'}
              </span>
              <span className="price-symbol">{marketData.symbol || 'R_100'}</span>
            </div>
            <div className="price-meta">
              <div className="meta-item">
                <Clock size={14} />
                <span>{formatTime(marketData.timestamp)}</span>
              </div>
              <div className="meta-item">
                <Activity size={14} />
                <span>{signals?.length || 0} signals</span>
              </div>
            </div>
          </div>
        </div>

        {/* Market Metrics Grid */}
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-icon volatility">
              <Zap size={16} />
            </div>
            <div className="metric-content">
              <span className="metric-label">Volatility</span>
              <span className="metric-value">{marketMetrics.volatility}%</span>
              <div className="metric-bar">
                <div 
                  className="metric-fill"
                  style={{ 
                    width: `${Math.min(marketMetrics.volatility * 10, 100)}%`,
                    backgroundColor: marketMetrics.volatility > 2 ? '#ef4444' : 
                                   marketMetrics.volatility > 1 ? '#f59e0b' : '#10b981'
                  }}
                />
              </div>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon momentum">
              <TrendingUp size={16} />
            </div>
            <div className="metric-content">
              <span className="metric-label">Momentum</span>
              <span 
                className="metric-value"
                style={{ color: getMomentumColor(marketMetrics.momentum) }}
              >
                {marketMetrics.momentum}%
              </span>
              <div className="metric-bar">
                <div 
                  className="metric-fill"
                  style={{ 
                    width: `${((marketMetrics.momentum + 50) / 100) * 100}%`,
                    backgroundColor: getMomentumColor(marketMetrics.momentum)
                  }}
                />
              </div>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon rsi">
              <Activity size={16} />
            </div>
            <div className="metric-content">
              <span className="metric-label">RSI</span>
              <span 
                className="metric-value"
                style={{ color: getRSIColor(marketMetrics.rsi) }}
              >
                {marketMetrics.rsi}
              </span>
              <div className="metric-bar">
                <div 
                  className="metric-fill"
                  style={{ 
                    width: `${marketMetrics.rsi}%`,
                    backgroundColor: getRSIColor(marketMetrics.rsi)
                  }}
                />
              </div>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon signals">
              <AlertCircle size={16} />
            </div>
            <div className="metric-content">
              <span className="metric-label">Signal Strength</span>
              <span className="metric-value">
                {getSignalStrength().toFixed(0)}%
              </span>
              <div className="metric-bar">
                <div 
                  className="metric-fill"
                  style={{ 
                    width: `${Math.abs(getSignalStrength())}%`,
                    backgroundColor: getSignalStrength() > 0 ? '#10b981' : '#ef4444'
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Support & Resistance */}
        <div className="support-resistance">
          <h3>Key Levels</h3>
          <div className="levels-grid">
            <div className="level-item">
              <span className="level-label support">Support</span>
              <span className="level-value">${marketMetrics.support.toFixed(4)}</span>
            </div>
            <div className="level-item">
              <span className="level-label current">Current</span>
              <span className="level-value">${marketData.lastPrice ? parseFloat(marketData.lastPrice).toFixed(4) : '0.0000'}</span>
            </div>
            <div className="level-item">
              <span className="level-label resistance">Resistance</span>
              <span className="level-value">${marketMetrics.resistance.toFixed(4)}</span>
            </div>
          </div>
        </div>

        {/* Market Sentiment */}
        <div className="market-sentiment">
          <h3>Market Sentiment</h3>
          <div className="sentiment-indicator">
            <div className="sentiment-meter">
              <div 
                className="sentiment-fill"
                style={{ 
                  width: `${((marketMetrics.momentum + 50) / 100) * 100}%`,
                  backgroundColor: getMomentumColor(marketMetrics.momentum)
                }}
              />
            </div>
            <div className="sentiment-labels">
              <span className="label-bearish">Bearish</span>
              <span className="label-neutral">Neutral</span>
              <span className="label-bullish">Bullish</span>
            </div>
            <div className="sentiment-value">
              {getMarketSentiment()}
            </div>
          </div>
        </div>

        {/* Trading Recommendations */}
        <div className="trading-recommendations">
          <h3>Trading Recommendations</h3>
          <div className="recommendation-content">
            {marketMetrics.trend === 'bullish' ? (
              <div className="recommendation bullish">
                <TrendingUp size={16} />
                <p>Strong bullish trend detected. Consider CALL positions with proper stop losses.</p>
              </div>
            ) : marketMetrics.trend === 'bearish' ? (
              <div className="recommendation bearish">
                <TrendingDown size={16} />
                <p>Bearish momentum increasing. PUT positions may have higher probability.</p>
              </div>
            ) : (
              <div className="recommendation neutral">
                <Activity size={16} />
                <p>Market consolidating. Wait for clear breakout before entering positions.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketOverview;
