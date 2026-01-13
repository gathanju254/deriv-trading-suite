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
  const [updatedCard, setUpdatedCard] = useState(null);
  const prevRef = useRef({});

  const normalized = {
    totalProfit: performance?.total_profit ?? performance?.pnl ?? 0,
    winRate: performance?.win_rate ?? 0,
    totalTrades: performance?.total_trades ?? 0,
    sharpeRatio: performance?.sharpe_ratio ?? 0,
    dailyPnl: performance?.daily_pnl ?? 0,
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

  const cards = [
    {
      id: 'totalProfit',
      title: 'Total P&L',
      value: `$${normalized.totalProfit.toFixed(2)}`,
      icon: DollarSign,
      accent: normalized.totalProfit >= 0 ? 'emerald' : 'red',
      sub: `Daily: $${normalized.dailyPnl.toFixed(2)}`
    },
    {
      id: 'winRate',
      title: 'Win Rate',
      value: `${normalized.winRate.toFixed(1)}%`,
      icon: Percent,
      accent: 'blue',
      sub: `${performance?.winning_trades ?? 0}/${performance?.completed_trades ?? 0}`
    },
    {
      id: 'totalTrades',
      title: 'Total Trades',
      value: normalized.totalTrades,
      icon: BarChart3,
      accent: 'violet',
      sub: `Active: ${performance?.active_trades ?? 0}`
    },
    {
      id: 'sharpeRatio',
      title: 'Sharpe Ratio',
      value: normalized.sharpeRatio.toFixed(2),
      icon: Target,
      accent: 'amber',
      sub: `Drawdown: ${performance?.max_drawdown?.toFixed(1) ?? '0.0'}%`
    }
  ];

  return (
    <div className="w-full">
      <div className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(card => {
          const Icon = card.icon;
          const pulse = updatedCard === card.id;

          return (
            <div
              key={card.id}
              className={`relative flex h-full flex-col justify-between rounded-xl border border-slate-800
                bg-gradient-to-br from-slate-900 to-slate-800 p-5 transition-all
                ${pulse ? 'ring-2 ring-emerald-500/40 scale-[1.02]' : 'hover:scale-[1.02]'}
              `}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`rounded-lg bg-${card.accent}-500/15 p-2 text-${card.accent}-400`}
                  >
                    <Icon size={18} />
                  </div>
                  <span className="text-sm font-medium text-slate-300">
                    {card.title}
                  </span>
                </div>

                {wsConnectionStatus === 'connected' && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
                    <Zap size={12} /> LIVE
                  </span>
                )}
              </div>

              {/* Value */}
              <div className="mt-4 text-3xl font-bold text-slate-100">
                {card.value}
              </div>

              {/* Sub */}
              <div className="mt-2 text-xs text-slate-400">
                {card.sub}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StatCards;
