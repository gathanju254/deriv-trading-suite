// frontend/src/components/Dashboard/MarketOverview/MarketOverview.jsx
// frontend/src/components/Dashboard/MarketOverview/MarketOverview.jsx
import React, { useEffect, useState } from 'react';
import { useTrading } from '../../../context/TradingContext';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import './MarketOverview.css';

const MarketOverview = () => {
  const { marketData, wsConnectionStatus } = useTrading();
  const [priceHistory, setPriceHistory] = useState([]);
  const [marketStats, setMarketStats] = useState({
    volatility: 0,
    volume: 0,
    bidAskSpread: 0,
    trend: 'neutral'
  });

  // Simulate price history data
  useEffect(() => {
    if (marketData.lastPrice) {
      const newPrice = {
        price: parseFloat(marketData.lastPrice),
        timestamp: Date.now()
      };
      
      setPriceHistory(prev => {
        const updated = [...prev, newPrice].slice(-20); // Keep last 20 prices
        return updated;
      });
    }
  }, [marketData.lastPrice]);

  // Calculate market stats
  useEffect(() => {
    if (priceHistory.length > 1) {
      const prices = priceHistory.map(p => p.price);
      const latestPrice = prices[prices.length - 1];
      const previousPrice = prices[prices.length - 2];
      
      // Calculate price change percentage
      const priceChange = ((latestPrice - previousPrice) / previousPrice) * 100;
      
      // Calculate volatility (simplified)
      const volatility = calculateVolatility(prices);
      
      // Calculate average volume (mock)
      const volume = 1000000 + Math.random() * 500000;
      
      // Calculate bid-ask spread (mock)
      const spread = 0.0001 + Math.random() * 0.0002;
      
      // Determine trend
      let trend = 'neutral';
      if (priceChange > 0.5) trend = 'bullish';
      else if (priceChange < -0.5) trend = 'bearish';
      
      setMarketStats({
        priceChange: parseFloat(priceChange.toFixed(4)),
        volatility: parseFloat(volatility.toFixed(6)),
        volume: Math.floor(volume),
        bidAskSpread: parseFloat(spread.toFixed(6)),
        trend
      });
    }
  }, [priceHistory]);

  const calculateVolatility = (prices) => {
    if (prices.length < 2) return 0;
    
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      const returnValue = (prices[i] - prices[i - 1]) / prices[i - 1];
      returns.push(returnValue);
    }
    
    const mean = returns.reduce((sum, val) => sum + val, 0) / returns.length;
    const variance = returns.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / returns.length;
    return Math.sqrt(variance) * 100; // Annualized percentage
  };

  const formatVolume = (volume) => {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(2)}M`;
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(2)}K`;
    }
    return volume.toFixed(0);
  };

  const renderMiniChart = () => {
    if (priceHistory.length < 2) {
      return <div className="mini-chart-placeholder">No data yet</div>;
    }

    const prices = priceHistory.map(p => p.price);
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const priceRange = maxPrice - minPrice || 1;

    return (
      <svg className="mini-chart" width="100%" height="50">
        {prices.map((price, index) => {
          if (index === 0) return null;
          
          const x1 = ((index - 1) / (prices.length - 1)) * 100;
          const x2 = (index / (prices.length - 1)) * 100;
          const y1 = 100 - ((prices[index - 1] - minPrice) / priceRange * 90);
          const y2 = 100 - ((price - minPrice) / priceRange * 90);
          
          const color = price > prices[index - 1] ? '#10b981' : '#ef4444';
          
          return (
            <line
              key={index}
              x1={`${x1}%`}
              y1={`${y1}%`}
              x2={`${x2}%`}
              y2={`${y2}%`}
              stroke={color}
              strokeWidth="2"
            />
          );
        })}
      </svg>
    );
  };

  return (
    <div className="market-overview">
      <div className="market-header">
        <div className="market-title">
          <h3>Market Overview</h3>
          <span className="market-symbol">{marketData.symbol || 'R_100'}</span>
        </div>
        <div className="connection-status">
          <Activity size={12} className={`pulse-${wsConnectionStatus}`} />
          <span className={`status-${wsConnectionStatus}`}>
            {wsConnectionStatus === 'connected' ? 'Live' : wsConnectionStatus}
          </span>
        </div>
      </div>

      <div className="price-display">
        <div className="current-price">
          <span className="price-value">
            ${marketData.lastPrice ? parseFloat(marketData.lastPrice).toFixed(4) : '0.0000'}
          </span>
          {marketStats.priceChange !== undefined && (
            <div className={`price-change ${marketStats.priceChange >= 0 ? 'positive' : 'negative'}`}>
              {marketStats.priceChange >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
              <span>{Math.abs(marketStats.priceChange).toFixed(4)}%</span>
            </div>
          )}
        </div>
        <div className="market-trend">
          <span className={`trend-indicator trend-${marketStats.trend}`}>
            {marketStats.trend === 'bullish' ? <TrendingUp size={14} /> : 
             marketStats.trend === 'bearish' ? <TrendingDown size={14} /> : '—'}
            {marketStats.trend}
          </span>
        </div>
      </div>

      <div className="mini-chart-container">
        {renderMiniChart()}
      </div>

      <div className="market-stats">
        <div className="stat-item">
          <span className="stat-label">Volatility</span>
          <span className="stat-value">{marketStats.volatility.toFixed(4)}%</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Volume</span>
          <span className="stat-value">{formatVolume(marketStats.volume)}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Spread</span>
          <span className="stat-value">{marketStats.bidAskSpread.toFixed(6)}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Last Update</span>
          <span className="stat-value">
            {marketData.timestamp ? 
              new Date(marketData.timestamp * 1000).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit',
                second: '2-digit'
              }) : '—'}
          </span>
        </div>
      </div>

      <div className="market-insights">
        <h4>Market Insights</h4>
        <div className="insights-content">
          {marketStats.trend === 'bullish' ? (
            <p className="insight-bullish">
              <TrendingUp size={14} />
              Strong bullish momentum detected. Consider long positions with proper risk management.
            </p>
          ) : marketStats.trend === 'bearish' ? (
            <p className="insight-bearish">
              <TrendingDown size={14} />
              Bearish pressure observed. Short opportunities may be present, watch for reversals.
            </p>
          ) : (
            <p className="insight-neutral">
              Market showing consolidation. Wait for breakout confirmation before entering positions.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MarketOverview;