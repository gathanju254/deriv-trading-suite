// frontend/src/components/Dashboard/StatCards/StatCards.jsx
// Alternative Cleaner Version
import React, { useEffect, useState, useRef } from 'react';
import { useTrading } from '../../../hooks/useTrading';
import { DollarSign, Percent, BarChart3, Target, TrendingUp, TrendingDown } from 'lucide-react';

const StatCards = () => {
  const { performance } = useTrading();
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
        setTimeout(() => setUpdatedCard(null), 300);
        break;
      }
    }
    prevRef.current = normalized;
  }, [normalized]);

  const cards = [
    {
      id: 'totalProfit',
      title: 'Total P&L',
      value: `$${normalized.totalProfit.toFixed(2)}`,
      icon: DollarSign,
      change: normalized.dailyPnl,
      trend: normalized.totalProfit >= 0
    },
    {
      id: 'winRate',
      title: 'Win Rate',
      value: `${normalized.winRate.toFixed(1)}%`,
      icon: Percent,
      change: `${normalized.winningTrades}/${normalized.completedTrades}`,
      trend: normalized.winRate >= 50
    },
    {
      id: 'totalTrades',
      title: 'Total Trades',
      value: normalized.totalTrades,
      icon: BarChart3,
      change: `${normalized.activeTrades} active`,
      trend: null
    },
    {
      id: 'sharpeRatio',
      title: 'Risk Score',
      value: normalized.sharpeRatio.toFixed(2),
      icon: Target,
      change: `DD: ${normalized.maxDrawdown.toFixed(1)}%`,
      trend: normalized.sharpeRatio > 1
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map(card => {
        const Icon = card.icon;
        const isPositive = card.trend === true;
        const isNegative = card.trend === false;
        
        return (
          <div
            key={card.id}
            className={`bg-gray-900/50 border border-gray-800 rounded-lg p-4 transition-colors duration-200
              ${updatedCard === card.id ? 'ring-1 ring-blue-500/30' : ''}
            `}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Icon size={16} className="text-gray-400" />
                <span className="text-sm text-gray-400">{card.title}</span>
              </div>
              
              {card.trend !== null && (
                <div className={`p-1 rounded ${isPositive ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                  {isPositive ? (
                    <TrendingUp size={12} />
                  ) : (
                    <TrendingDown size={12} />
                  )}
                </div>
              )}
            </div>

            <div className="text-2xl font-bold text-white mb-1">
              {card.value}
            </div>

            <div className="text-xs text-gray-500">
              {card.change}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StatCards;