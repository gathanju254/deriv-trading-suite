// frontend/src/components/Dashboard/MarketOverview/MarketOverview.jsx
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useTrading } from '../../../hooks/useTrading';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Activity, BarChart3, Zap, Shield } from 'lucide-react';
import './MarketOverview.css';

const MarketOverview = () => {
  const { marketData, wsConnectionStatus } = useTrading();
  const [priceHistory, setPriceHistory] = useState([]);
  
  // Move calculateVolatility BEFORE marketStats (was below useMemo)
  const calculateVolatility = useCallback((prices) => {
    if (prices.length < 2) return 0;
    
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      if (prices[i - 1] !== 0) {
        const returnValue = (prices[i] - prices[i - 1]) / prices[i - 1];
        returns.push(returnValue);
      }
    }
    
    if (returns.length === 0) return 0;
    
    const mean = returns.reduce((sum, val) => sum + val, 0) / returns.length;
    const variance = returns.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / returns.length;
    return Math.sqrt(variance) * 100;
  }, []);
  
  // Use marketStats after calculateVolatility is defined
  const marketStats = useMemo(() => {
    if (priceHistory.length < 2) {
      return {
        priceChange: 0,
        volatility: 0,
        volume: 0,
        bidAskSpread: 0.00015, // Default spread
        trend: 'neutral'
      };
    }

    const prices = priceHistory.map(p => p.price);
    const latestPrice = prices[prices.length - 1];
    const previousPrice = prices[prices.length - 2];
    
    // Safely calculate price change
    const priceChange = previousPrice !== 0 ? 
      ((latestPrice - previousPrice) / previousPrice) * 100 : 0;
    
    // Calculate volatility
    const volatility = calculateVolatility(prices);
    
    // Determine trend with more nuanced thresholds
    let trend = 'neutral';
    if (priceChange > 0.3) trend = 'bullish';
    else if (priceChange < -0.3) trend = 'bearish';
    
    return {
      priceChange: parseFloat(priceChange.toFixed(4)),
      volatility: parseFloat(volatility.toFixed(4)),
      volume: Math.floor(1500000 + Math.random() * 1000000), // Simulated volume
      bidAskSpread: 0.0001 + Math.random() * 0.0002,
      trend
    };
  }, [priceHistory]);

  // Update price history - optimized to prevent infinite loops
  useEffect(() => {
    if (marketData.lastPrice !== undefined) {
      const newPrice = parseFloat(marketData.lastPrice);
      if (!isNaN(newPrice)) {
        setPriceHistory(prev => {
          // Avoid adding duplicate prices in quick succession
          const lastEntry = prev[prev.length - 1];
          if (lastEntry && Math.abs(lastEntry.price - newPrice) < 0.00001) {
            return prev; // Price hasn't changed meaningfully
          }
          
          const updated = [...prev, { 
            price: newPrice, 
            timestamp: Date.now() 
          }].slice(-30); // Keep last 30 prices for smoother chart
          
          return updated;
        });
      }
    }
  }, [marketData.lastPrice]);

  // Memoize chart rendering
  const renderMiniChart = useMemo(() => {
    if (priceHistory.length < 2) {
      return <div className="mini-chart-placeholder">Awaiting live data...</div>;
    }

    const prices = priceHistory.map(p => p.price);
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const priceRange = maxPrice - minPrice || 1;

    return (
      <svg className="mini-chart" width="100%" height="50" aria-label="Price trend chart">
        {prices.map((price, index) => {
          if (index === 0) return null;
          
          const x1 = ((index - 1) / (prices.length - 1)) * 100;
          const x2 = (index / (prices.length - 1)) * 100;
          const y1 = 100 - ((prices[index - 1] - minPrice) / priceRange * 90);
          const y2 = 100 - ((price - minPrice) / priceRange * 90);
          
          const isPositive = price >= prices[index - 1];
          const color = isPositive ? '#10b981' : '#ef4444';
          
          return (
            <line
              key={`chart-line-${index}`}
              x1={`${x1}%`}
              y1={`${y1}%`}
              x2={`${x2}%`}
              y2={`${y2}%`}
              stroke={color}
              strokeWidth={isPositive ? "2" : "1.5"}
              strokeOpacity="0.8"
            />
          );
        })}
      </svg>
    );
  }, [priceHistory]);

  const formatVolume = (volume) => {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M`;
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}K`;
    }
    return volume.toFixed(0);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '—';
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  const getMarketInsight = () => {
    if (marketStats.trend === 'bullish') {
      return { 
        text: 'Bullish momentum building. Consider long positions with tight stops.',
        icon: <TrendingUp size={14} />,
        className: 'insight-bullish'
      };
    } else if (marketStats.trend === 'bearish') {
      return { 
        text: 'Bearish pressure detected. Watch for reversal signals.',
        icon: <TrendingDown size={14} />,
        className: 'insight-bearish'
      };
    }
    return { 
      text: 'Market consolidating. Await clearer directional signal.',
      icon: <Activity size={14} />,
      className: 'insight-neutral'
    };
  };

  const insight = getMarketInsight();

  return (
    <div className="market-overview">
      <div className="market-header">
        <div className="market-title">
          <BarChart3 size={18} />
          <h3>Market Overview</h3>
          <span className="market-symbol">{marketData.symbol || 'R_100'}</span>
        </div>
        <div className="connection-status">
          <div className={`status-dot ${wsConnectionStatus}`} />
          <span className={`status-text status-${wsConnectionStatus}`}>
            {wsConnectionStatus === 'connected' ? 'Live' : wsConnectionStatus}
          </span>
        </div>
      </div>

      <div className="price-section">
        <div className="price-primary">
          <span className="price-value">
            ${marketData.lastPrice ? parseFloat(marketData.lastPrice).toFixed(4) : '0.0000'}
          </span>
          {marketStats.priceChange !== 0 && (
            <div className={`price-change ${marketStats.priceChange >= 0 ? 'positive' : 'negative'}`}>
              {marketStats.priceChange >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              <span>{Math.abs(marketStats.priceChange).toFixed(2)}%</span>
            </div>
          )}
        </div>
        <div className="price-trend">
          <span className={`trend-badge trend-${marketStats.trend}`}>
            {marketStats.trend === 'bullish' ? <TrendingUp size={12} /> : 
             marketStats.trend === 'bearish' ? <TrendingDown size={12} /> : <Activity size={12} />}
            <span>{marketStats.trend}</span>
          </span>
        </div>
      </div>

      <div className="mini-chart-container">
        {renderMiniChart}
      </div>

      <div className="market-metrics">
        <div className="metric-card">
          <div className="metric-icon volatility">
            <Zap size={14} />
          </div>
          <div className="metric-content">
            <div className="metric-label">Volatility</div>
            <div className="metric-value">{marketStats.volatility.toFixed(2)}%</div>
          </div>
        </div>
        
        <div className="metric-card">
          <div className="metric-icon volume">
            <Activity size={14} />
          </div>
          <div className="metric-content">
            <div className="metric-label">24h Volume</div>
            <div className="metric-value">{formatVolume(marketStats.volume)}</div>
          </div>
        </div>
        
        <div className="metric-card">
          <div className="metric-icon spread">
            <Shield size={14} />
          </div>
          <div className="metric-content">
            <div className="metric-label">Spread</div>
            <div className="metric-value">{marketStats.bidAskSpread.toFixed(5)}</div>
          </div>
        </div>
        
        <div className="metric-card">
          <div className="metric-icon time">
            <span>🕒</span>
          </div>
          <div className="metric-content">
            <div className="metric-label">Last Update</div>
            <div className="metric-value">{formatTime(marketData.timestamp)}</div>
          </div>
        </div>
      </div>

      <div className="market-insight">
        <div className="insight-header">
          <h4>Market Insight</h4>
          <span className="insight-source">AI Analysis</span>
        </div>
        <div className={`insight-content ${insight.className}`}>
          {insight.icon}
          <p>{insight.text}</p>
        </div>
      </div>
    </div>
  );
};

export default MarketOverview;