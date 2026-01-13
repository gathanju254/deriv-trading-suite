// frontend/src/components/Dashboard/MarketOverview/MarketOverview.jsx
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useTrading } from '../../../hooks/useTrading';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Activity, Zap, Shield } from 'lucide-react';

const MarketOverview = () => {
  const { marketData } = useTrading();
  const [priceHistory, setPriceHistory] = useState([]);

  const calculateVolatility = useCallback((prices) => {
    if (prices.length < 2) return 0;
    const returns = prices.slice(1).map((p, i) => (p - prices[i]) / prices[i]);
    if (!returns.length) return 0;
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
    return Math.sqrt(variance) * 100;
  }, []);

  const marketStats = useMemo(() => {
    if (priceHistory.length < 2) return { priceChange: 0, volatility: 0, volume: 0, bidAskSpread: 0.00015, trend: 'neutral' };
    const prices = priceHistory.map(p => p.price);
    const latest = prices.at(-1), prev = prices.at(-2);
    const priceChange = prev !== 0 ? ((latest - prev) / prev) * 100 : 0;
    const volatility = calculateVolatility(prices);
    let trend = 'neutral';
    if (priceChange > 0.3) trend = 'bullish';
    else if (priceChange < -0.3) trend = 'bearish';
    return { priceChange: parseFloat(priceChange.toFixed(4)), volatility: parseFloat(volatility.toFixed(4)), volume: Math.floor(1500000 + Math.random() * 1000000), bidAskSpread: 0.0001 + Math.random() * 0.0002, trend };
  }, [priceHistory]);

  useEffect(() => {
    if (marketData.lastPrice !== undefined) {
      const newPrice = parseFloat(marketData.lastPrice);
      if (!isNaN(newPrice)) {
        setPriceHistory(prev => {
          const last = prev.at(-1);
          if (last && Math.abs(last.price - newPrice) < 0.00001) return prev;
          return [...prev, { price: newPrice, timestamp: Date.now() }].slice(-30);
        });
      }
    }
  }, [marketData.lastPrice]);

  const renderMiniChart = useMemo(() => {
    if (priceHistory.length < 2) return <div className="text-gray-400 text-sm">Awaiting live data...</div>;
    const prices = priceHistory.map(p => p.price);
    const max = Math.max(...prices), min = Math.min(...prices), range = max - min || 1;
    return (
      <svg className="w-full h-12" aria-label="Price trend chart">
        {prices.map((p, i) => {
          if (i === 0) return null;
          const x1 = ((i-1)/(prices.length-1))*100;
          const x2 = (i/(prices.length-1))*100;
          const y1 = 100 - ((prices[i-1]-min)/range*90);
          const y2 = 100 - ((p-min)/range*90);
          const color = p >= prices[i-1] ? '#10b981' : '#ef4444';
          return <line key={i} x1={`${x1}%`} y1={`${y1}%`} x2={`${x2}%`} y2={`${y2}%`} stroke={color} strokeWidth={2} strokeOpacity={0.8} />;
        })}
      </svg>
    );
  }, [priceHistory]);

  const formatVolume = v => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `${(v/1e3).toFixed(1)}K` : v.toFixed(0);
  const formatTime = ts => ts ? new Date(ts*1000).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) : '—';

  const getMarketInsight = () => {
    if (marketStats.trend === 'bullish') return { text: 'Bullish momentum building.', icon: <TrendingUp size={14} />, color: 'text-green-500' };
    if (marketStats.trend === 'bearish') return { text: 'Bearish pressure detected.', icon: <TrendingDown size={14} />, color: 'text-red-500' };
    return { text: 'Market consolidating.', icon: <Activity size={14} />, color: 'text-gray-400' };
  };
  const insight = getMarketInsight();

  return (
    <div className="space-y-4">
      {/* Price Section */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <span className="text-2xl font-bold">${marketData.lastPrice ? parseFloat(marketData.lastPrice).toFixed(4) : '0.0000'}</span>
          {marketStats.priceChange !== 0 && (
            <div className={`flex items-center space-x-1 ${marketStats.priceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {marketStats.priceChange >= 0 ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>}
              <span>{Math.abs(marketStats.priceChange).toFixed(2)}%</span>
            </div>
          )}
        </div>
        <span className={`flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-semibold ${marketStats.trend === 'bullish' ? 'bg-green-100 text-green-800' : marketStats.trend === 'bearish' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'}`}>
          {marketStats.trend === 'bullish' ? <TrendingUp size={12}/> : marketStats.trend === 'bearish' ? <TrendingDown size={12}/> : <Activity size={12}/>}
          <span>{marketStats.trend}</span>
        </span>
      </div>

      {/* Mini Chart */}
      <div>{renderMiniChart}</div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-3">
        <div className="flex items-center p-3 bg-gray-800 rounded">
          <Zap size={16} className="text-yellow-400 mr-2"/>
          <div>
            <div className="text-sm text-gray-400">Volatility</div>
            <div className="text-lg font-semibold">{marketStats.volatility.toFixed(2)}%</div>
          </div>
        </div>
        <div className="flex items-center p-3 bg-gray-800 rounded">
          <Activity size={16} className="text-blue-400 mr-2"/>
          <div>
            <div className="text-sm text-gray-400">24h Volume</div>
            <div className="text-lg font-semibold">{formatVolume(marketStats.volume)}</div>
          </div>
        </div>
        <div className="flex items-center p-3 bg-gray-800 rounded">
          <Shield size={16} className="text-purple-400 mr-2"/>
          <div>
            <div className="text-sm text-gray-400">Spread</div>
            <div className="text-lg font-semibold">{marketStats.bidAskSpread.toFixed(5)}</div>
          </div>
        </div>
        <div className="flex items-center p-3 bg-gray-800 rounded">
          <span className="mr-2">🕒</span>
          <div>
            <div className="text-sm text-gray-400">Last Update</div>
            <div className="text-lg font-semibold">{formatTime(marketData.timestamp)}</div>
          </div>
        </div>
      </div>

      {/* Insight */}
      <div className="p-3 bg-gray-900 rounded space-y-1">
        <h4 className="font-semibold text-gray-300">Market Insight</h4>
        <div className={`flex items-center space-x-2 text-sm ${insight.color}`}>
          {insight.icon}
          <p>{insight.text}</p>
        </div>
      </div>
    </div>
  );
};

export default MarketOverview;
