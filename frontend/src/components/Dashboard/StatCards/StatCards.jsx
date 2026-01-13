// frontend/src/components/Dashboard/StatCards/StatCards.jsx
import React, { useEffect, useRef, useState } from 'react';
import { useTrading } from '../../../hooks/useTrading';
import {
  DollarSign,
  Percent,
  BarChart3,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
} from 'lucide-react';

const StatCards = () => {
  const { performance, wsConnectionStatus } = useTrading();
  const prevRef = useRef({});
  const [updatedCard, setUpdatedCard] = useState(null);

  const stats = {
    totalProfit: performance?.total_profit ?? performance?.pnl ?? 0,
    winRate: performance?.win_rate ?? 0,
    totalTrades: performance?.total_trades ?? 0,
    sharpeRatio: performance?.sharpe_ratio ?? 0,
    dailyPnl: performance?.daily_pnl ?? 0,
  };

  useEffect(() => {
    const prev = prevRef.current;
    const changed = Object.keys(stats).find(
      key => prev[key] !== undefined && prev[key] !== stats[key]
    );

    if (changed) {
      setUpdatedCard(changed);
      setTimeout(() => setUpdatedCard(null), 700);
    }

    prevRef.current = stats;
  }, [stats]);

  const cards = [
    {
      id: 'totalProfit',
      title: 'Total P&L',
      value: `$${stats.totalProfit.toFixed(2)}`,
      sub: `Daily: $${stats.dailyPnl.toFixed(2)}`,
      icon: DollarSign,
      accent: stats.totalProfit >= 0 ? 'emerald' : 'red',
    },
    {
      id: 'winRate',
      title: 'Win Rate',
      value: `${stats.winRate.toFixed(1)}%`,
      sub: `${performance?.winning_trades ?? 0} wins`,
      icon: Percent,
      accent: 'blue',
    },
    {
      id: 'totalTrades',
      title: 'Trades',
      value: stats.totalTrades.toString(),
      sub: `Active: ${performance?.active_trades ?? 0}`,
      icon: BarChart3,
      accent: 'violet',
    },
    {
      id: 'sharpeRatio',
      title: 'Sharpe',
      value: stats.sharpeRatio.toFixed(2),
      sub: `Drawdown: ${performance?.max_drawdown?.toFixed(1) ?? '0.0'}%`,
      icon: Target,
      accent: 'amber',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
      {cards.map(card => {
        const Icon = card.icon;
        const isUpdated = updatedCard === card.id;

        return (
          <div
            key={card.id}
            className={`
              relative rounded-2xl border border-slate-800
              bg-gradient-to-br from-slate-900 to-slate-950
              p-6 transition-all duration-300
              ${isUpdated ? 'ring-2 ring-emerald-500/40' : ''}
            `}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">{card.title}</span>
              <Icon className={`h-5 w-5 text-${card.accent}-400`} />
            </div>

            {/* Value */}
            <div className="mt-4 text-3xl font-semibold tracking-tight text-slate-100">
              {card.value}
            </div>

            {/* Sub + live */}
            <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
              <span>{card.sub}</span>
              {wsConnectionStatus === 'connected' && (
                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                  <Zap size={12} /> LIVE
                </span>
              )}
            </div>

            {/* Update glow */}
            {isUpdated && (
              <span className="absolute inset-0 rounded-2xl bg-emerald-500/5 pointer-events-none" />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default StatCards;
