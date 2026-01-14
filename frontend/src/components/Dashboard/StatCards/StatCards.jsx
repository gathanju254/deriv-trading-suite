// frontend/src/components/Dashboard/StatCards/StatCards.jsx
// frontend/src/components/Dashboard/StatCards/StatCards.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useTrading } from '../../../hooks/useTrading';
import {
  DollarSign,
  Percent,
  BarChart3,
  Target,
  Zap
} from 'lucide-react';

const StatCards = () => {
  const { performance, wsConnectionStatus } = useTrading();
  const [updatedCard, setUpdatedCard] = useState(null);
  const prevRef = useRef({});

  const normalized = {
    totalProfit: performance?.total_profit ?? performance?.pnl ?? 0,
    winRate: performance?.win_rate ?? 0,
    totalTrades: performance?.total_trades ?? 0,
    sharpeRatio: performance?.sharpe_ratio ?? 0,
    dailyPnl: performance?.daily_pnl ?? 0,
    activeTrades: performance?.active_trades ?? 0,
    completedTrades: performance?.completed_trades ?? 0,
    winningTrades: performance?.winning_trades ?? 0,
    maxDrawdown: performance?.max_drawdown ?? 0,
  };

  useEffect(() => {
    for (const key in normalized) {
      if (prevRef.current[key] !== normalized[key]) {
        setUpdatedCard(key);
        setTimeout(() => setUpdatedCard(null), 600);
        break;
      }
    }
    prevRef.current = normalized;
  }, [normalized]);

  const getColorClass = (type, value) => {
    if (type === 'profit') {
      return value >= 0 ? 'text-green-500' : 'text-red-500';
    }
    if (type === 'winRate') {
      if (value >= 70) return 'text-green-500';
      if (value >= 50) return 'text-yellow-500';
      return 'text-red-500';
    }
    return 'text-gray-300';
  };

  const getBgColor = (type, value) => {
    if (type === 'profit') {
      return value >= 0 ? 'bg-green-500/10' : 'bg-red-500/10';
    }
    if (type === 'winRate') {
      if (value >= 70) return 'bg-green-500/10';
      if (value >= 50) return 'bg-yellow-500/10';
      return 'bg-red-500/10';
    }
    return 'bg-gray-800/50';
  };

  const cards = [
    {
      id: 'totalProfit',
      title: 'Total P&L',
      value: `$${normalized.totalProfit.toFixed(2)}`,
      icon: DollarSign,
      color: getColorClass('profit', normalized.totalProfit),
      bgColor: getBgColor('profit', normalized.totalProfit),
      sub: `Daily: $${normalized.dailyPnl.toFixed(2)}`
    },
    {
      id: 'winRate',
      title: 'Win Rate',
      value: `${normalized.winRate.toFixed(1)}%`,
      icon: Percent,
      color: getColorClass('winRate', normalized.winRate),
      bgColor: getBgColor('winRate', normalized.winRate),
      sub: `${normalized.winningTrades}/${normalized.completedTrades} trades`
    },
    {
      id: 'totalTrades',
      title: 'Total Trades',
      value: normalized.totalTrades,
      icon: BarChart3,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      sub: `${normalized.activeTrades} active`
    },
    {
      id: 'sharpeRatio',
      title: 'Sharpe Ratio',
      value: normalized.sharpeRatio.toFixed(2),
      icon: Target,
      color: normalized.sharpeRatio > 1 ? 'text-purple-500' : 'text-gray-400',
      bgColor: normalized.sharpeRatio > 1 ? 'bg-purple-500/10' : 'bg-gray-800/50',
      sub: `Drawdown: ${normalized.maxDrawdown.toFixed(1)}%`
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(card => {
        const Icon = card.icon;
        const pulse = updatedCard === card.id;

        return (
          <div
            key={card.id}
            className={`relative rounded-xl border border-gray-800 bg-gray-900/50 p-5 transition-all duration-300
              ${pulse ? 'ring-2 ring-green-500/30 scale-[1.02]' : 'hover:border-gray-700'}
            `}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2 ${card.bgColor} ${card.color}`}>
                  <Icon size={18} />
                </div>
                <span className="text-sm font-medium text-gray-300">
                  {card.title}
                </span>
              </div>

              {wsConnectionStatus === 'connected' && (
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs text-green-400">Live</span>
                </div>
              )}
            </div>

            {/* Value */}
            <div className={`text-2xl font-bold ${card.color} mb-2`}>
              {card.value}
            </div>

            {/* Subtitle */}
            <div className="text-sm text-gray-400">
              {card.sub}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StatCards;