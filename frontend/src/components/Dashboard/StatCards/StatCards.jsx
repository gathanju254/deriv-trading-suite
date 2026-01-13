// frontend/src/components/Dashboard/StatCards/StatCards.jsx
// frontend/src/components/Dashboard/StatCards/StatCards.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useTrading } from '../../../hooks/useTrading';
import {
  DollarSign,
  Percent,
  BarChart3,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Zap
} from 'lucide-react';

const StatCards = () => {
  const { performance, wsConnectionStatus } = useTrading();
  const [prevPerformance, setPrevPerformance] = useState({});
  const [updatedCard, setUpdatedCard] = useState(null);

  const prevPerformanceRef = useRef({});

  // Normalize performance data
  const normalized = {
    totalProfit: performance?.total_profit ?? performance?.pnl ?? performance?.profit ?? 0,
    winRate: performance?.win_rate ?? performance?.win_percent ?? 0,
    totalTrades: performance?.total_trades ?? performance?.completed_trades ?? 0,
    sharpeRatio: performance?.sharpe_ratio ?? performance?.sharpe ?? 0,
    dailyPnl: performance?.daily_pnl ?? performance?.daily_profit ?? 0
  };

  // Detect updated card
  useEffect(() => {
    let updated = null;
    if (prevPerformanceRef.current) {
      if (prevPerformanceRef.current.totalProfit !== normalized.totalProfit) updated = 'totalProfit';
      else if (prevPerformanceRef.current.winRate !== normalized.winRate) updated = 'winRate';
      else if (prevPerformanceRef.current.totalTrades !== normalized.totalTrades) updated = 'totalTrades';
      else if (prevPerformanceRef.current.sharpeRatio !== normalized.sharpeRatio) updated = 'sharpeRatio';
    }
    prevPerformanceRef.current = { ...normalized };
    if (updated) {
      setUpdatedCard(updated);
      setTimeout(() => setUpdatedCard(null), 600);
    }
    setPrevPerformance(normalized);
  }, [normalized]);

  const formatChange = (current, previous) => {
    if (previous === undefined) return '0.00';
    const diff = current - previous;
    if (diff > 0) return `+${diff.toFixed(2)}`;
    if (diff < 0) return `${diff.toFixed(2)}`;
    return '0.00';
  };

  const getChangeIcon = (current, previous) => {
    const diff = current - previous;
    if (diff > 0) return <ArrowUpRight size={12} />;
    if (diff < 0) return <ArrowDownRight size={12} />;
    return null;
  };

  const cards = [
    {
      id: 'totalProfit',
      title: 'Total P&L',
      value: `$${normalized.totalProfit.toFixed(2)}`,
      change: formatChange(normalized.totalProfit, prevPerformance.totalProfit),
      icon: DollarSign,
      color: normalized.totalProfit >= 0 ? 'text-green-400' : 'text-red-400',
      subValue: `Daily: $${normalized.dailyPnl.toFixed(2)}`,
      live: wsConnectionStatus === 'connected'
    },
    {
      id: 'winRate',
      title: 'Win Rate',
      value: `${normalized.winRate.toFixed(1)}%`,
      change: formatChange(normalized.winRate, prevPerformance.winRate),
      icon: Percent,
      color: 'text-blue-400',
      subValue: `${performance?.winning_trades ?? 0}/${performance?.completed_trades ?? 0}`,
      live: wsConnectionStatus === 'connected'
    },
    {
      id: 'totalTrades',
      title: 'Total Trades',
      value: normalized.totalTrades.toString(),
      change: formatChange(normalized.totalTrades, prevPerformance.totalTrades),
      icon: BarChart3,
      color: 'text-purple-400',
      subValue: `Active: ${performance?.active_trades ?? 0}`,
      live: wsConnectionStatus === 'connected'
    },
    {
      id: 'sharpeRatio',
      title: 'Sharpe Ratio',
      value: normalized.sharpeRatio.toFixed(2),
      change: formatChange(normalized.sharpeRatio, prevPerformance.sharpeRatio),
      icon: Target,
      color: 'text-yellow-400',
      subValue: `Risk: ${performance?.max_drawdown?.toFixed(1) ?? '0.0'}%`,
      live: wsConnectionStatus === 'connected'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(card => {
        const Icon = card.icon;
        const isUpdated = updatedCard === card.id;
        return (
          <div
            key={card.id}
            className={`relative p-4 rounded-2xl shadow-lg bg-gray-900 flex flex-col gap-2 transition-transform duration-300
              ${isUpdated ? 'animate-pulse scale-105' : 'hover:scale-105'}
            `}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon size={18} className={card.color} />
                <span className="text-sm font-medium text-gray-300">{card.title}</span>
              </div>
              <div className={`flex items-center gap-1 text-xs font-semibold ${parseFloat(card.change) > 0 ? 'text-green-400' : parseFloat(card.change) < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                {getChangeIcon(parseFloat(card.value.replace(/[$%]/g,'')), prevPerformance[card.id])}
                {card.change}
              </div>
            </div>

            {/* Value */}
            <div className="text-xl sm:text-2xl font-bold text-gray-100">{card.value}</div>

            {/* Sub info + live badge */}
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>{card.subValue}</span>
              {card.live && (
                <span className="flex items-center gap-1 text-green-400 font-semibold">
                  <Zap size={12} /> LIVE
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StatCards;
