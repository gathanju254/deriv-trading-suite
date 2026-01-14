// frontend/src/components/Dashboard/MarketOverview/MarketOverview.jsx
// frontend/src/components/Dashboard/MarketOverview/MarketOverview.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { useTrading } from '../../../hooks/useTrading';
import { TrendingUp, TrendingDown, Activity, Zap, BarChart, Clock, TrendingUp as ArrowUp, TrendingDown as ArrowDown } from 'lucide-react';

const MarketOverview = () => {
  const { marketData } = useTrading();
  const [priceHistory, setPriceHistory] = useState([]);

  // Update price history when new data arrives
  useEffect(() => {
    if (marketData.lastPrice !== undefined) {
      const newPrice = parseFloat(marketData.lastPrice);
      if (!isNaN(newPrice)) {
        setPriceHistory(prev => {
          const last = prev.at(-1);
          if (last && last.price === newPrice) return prev;
          const newEntry = { 
            price: newPrice, 
            timestamp: Date.now(),
            change: prev.length > 0 ? newPrice - prev[prev.length - 1].price : 0
          };
          return [...prev, newEntry].slice(-20);
        });
      }
    }
  }, [marketData.lastPrice]);

  // Calculate market statistics
  const marketStats = useMemo(() => {
    if (priceHistory.length < 2) {
      return {
        priceChange: 0,
        changePercent: 0,
        volatility: 0,
        trend: 'neutral',
        high: 0,
        low: 0
      };
    }

    const prices = priceHistory.map(p => p.price);
    const latest = prices.at(-1);
    const previous = prices.at(-2);
    const change = latest - previous;
    const changePercent = previous !== 0 ? (change / previous) * 100 : 0;
    
    // Simple volatility calculation
    const returns = prices.slice(1).map((p, i) => (p - prices[i]) / prices[i]);
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance) * 100;

    // Determine trend
    let trend = 'neutral';
    if (changePercent > 0.1) trend = 'bullish';
    else if (changePercent < -0.1) trend = 'bearish';

    return {
      price: latest,
      change,
      changePercent,
      volatility,
      trend,
      high: Math.max(...prices),
      low: Math.min(...prices),
      lastUpdate: priceHistory.at(-1)?.timestamp || Date.now()
    };
  }, [priceHistory]);

  // Render mini chart
  const renderChart = useMemo(() => {
    if (priceHistory.length < 2) {
      return (
        <div className="h-20 flex items-center justify-center">
          <div className="text-gray-500 text-sm">Awaiting data...</div>
        </div>
      );
    }

    const prices = priceHistory.map(p => p.price);
    const max = Math.max(...prices);
    const min = Math.min(...prices);
    const range = max - min || 1;

    return (
      <div className="h-20 relative">
        <svg className="w-full h-full" viewBox="0 0 100 50">
          <defs>
            <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
          </defs>
          
          {/* Fill area */}
          <path
            d={prices.map((p, i) => {
              const x = (i / (prices.length - 1)) * 100;
              const y = 50 - ((p - min) / range) * 45;
              return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
            }).join(' ') + ` L 100 50 L 0 50`}
            fill="url(#chartGradient)"
          />
          
          {/* Line */}
          <polyline
            points={prices.map((p, i) => {
              const x = (i / (prices.length - 1)) * 100;
              const y = 50 - ((p - min) / range) * 45;
              return `${x},${y}`;
            }).join(' ')}
            fill="none"
            stroke={marketStats.trend === 'bullish' ? '#10b981' : marketStats.trend === 'bearish' ? '#ef4444' : '#6b7280'}
            strokeWidth="2"
          />
        </svg>
      </div>
    );
  }, [priceHistory, marketStats.trend]);

  // Format time
  const formatTime = (timestamp) => {
    if (!timestamp) return '--:--';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Get trend icon and color
  const getTrendConfig = (trend) => {
    switch (trend) {
      case 'bullish':
        return { icon: ArrowUp, color: 'text-green-500', bgColor: 'bg-green-500/10', label: 'Bullish' };
      case 'bearish':
        return { icon: ArrowDown, color: 'text-red-500', bgColor: 'bg-red-500/10', label: 'Bearish' };
      default:
        return { icon: Activity, color: 'text-gray-500', bgColor: 'bg-gray-500/10', label: 'Neutral' };
    }
  };

  const trendConfig = getTrendConfig(marketStats.trend);

  return (
    <div className="space-y-5">
      {/* Price Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-400">Current Price</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">
              ${marketStats.price?.toFixed(4) || '0.0000'}
            </span>
            {marketStats.change !== 0 && (
              <div className={`flex items-center gap-1 text-sm ${marketStats.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {marketStats.change >= 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                <span>{Math.abs(marketStats.changePercent).toFixed(2)}%</span>
              </div>
            )}
          </div>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${trendConfig.bgColor}`}>
          <trendConfig.icon size={16} className={trendConfig.color} />
          <span className={`text-sm font-medium ${trendConfig.color}`}>
            {trendConfig.label}
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="border border-gray-800 rounded-lg overflow-hidden">
        {renderChart}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gray-800/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={16} className="text-yellow-500" />
            <span className="text-sm text-gray-400">Volatility</span>
          </div>
          <div className="text-lg font-semibold text-white">
            {marketStats.volatility.toFixed(2)}%
          </div>
        </div>

        <div className="bg-gray-800/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <BarChart size={16} className="text-blue-500" />
            <span className="text-sm text-gray-400">24h High</span>
          </div>
          <div className="text-lg font-semibold text-white">
            ${marketStats.high?.toFixed(4) || '0.0000'}
          </div>
        </div>

        <div className="bg-gray-800/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <BarChart size={16} className="text-red-500" />
            <span className="text-sm text-gray-400">24h Low</span>
          </div>
          <div className="text-lg font-semibold text-white">
            ${marketStats.low?.toFixed(4) || '0.0000'}
          </div>
        </div>

        <div className="bg-gray-800/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={16} className="text-gray-400" />
            <span className="text-sm text-gray-400">Last Update</span>
          </div>
          <div className="text-lg font-semibold text-white">
            {formatTime(marketStats.lastUpdate)}
          </div>
        </div>
      </div>

      {/* Market Summary */}
      <div className="border border-gray-800 rounded-lg p-4">
        <div className="text-sm font-medium text-gray-300 mb-2">Market Summary</div>
        <div className="text-sm text-gray-400">
          {marketStats.trend === 'bullish' 
            ? 'Positive momentum with steady uptrend. Consider long positions.'
            : marketStats.trend === 'bearish'
            ? 'Negative pressure observed. Caution advised for new positions.'
            : 'Market consolidating. Await clearer directional signals.'}
        </div>
      </div>
    </div>
  );
};

export default MarketOverview;