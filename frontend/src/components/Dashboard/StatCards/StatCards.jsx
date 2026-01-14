// frontend/src/components/Dashboard/StatCards/StatCards.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTrading } from '../../../hooks/useTrading';
import {
  DollarSign,
  Percent,
  BarChart3,
  Target,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

/* ---------------------------
   Small helpers (keep UI sane)
---------------------------- */
const fmtMoney = (v) => `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
const fmtPercent = (v) => `${Number(v).toFixed(1)}%`;
const fmtNumber = (v) => Number(v).toLocaleString();
const isPositive = (v) => v > 0;

const StatCards = () => {
  const { performance } = useTrading();
  const [highlight, setHighlight] = useState(null);
  const prev = useRef({});

  /* ---------------------------
     Normalize backend chaos
  ---------------------------- */
  const stats = useMemo(() => ({
    totalProfit: performance?.total_profit ?? performance?.pnl ?? 0,
    dailyPnl: performance?.daily_pnl ?? 0,

    winRate: performance?.win_rate ?? 0,
    totalTrades: performance?.total_trades ?? 0,
    activeTrades: performance?.active_trades ?? 0,
    completedTrades: performance?.completed_trades ?? 0,
    winningTrades: performance?.winning_trades ?? 0,

    sharpeRatio: performance?.sharpe_ratio ?? 0,
    maxDrawdown: performance?.max_drawdown ?? 0,
  }), [performance]);

  /* ---------------------------
     Subtle update pulse
  ---------------------------- */
  useEffect(() => {
    for (const key in stats) {
      if (prev.current[key] !== stats[key]) {
        setHighlight(key);
        setTimeout(() => setHighlight(null), 350);
        break;
      }
    }
    prev.current = stats;
  }, [stats]);

  /* ---------------------------
     Card definitions
  ---------------------------- */
  const cards = [
    {
      id: 'totalProfit',
      label: 'Total P&L',
      value: fmtMoney(stats.totalProfit),
      sub: `Today: ${fmtMoney(stats.dailyPnl)}`,
      icon: DollarSign,
      trend: stats.totalProfit,
    },
    {
      id: 'winRate',
      label: 'Win Rate',
      value: fmtPercent(stats.winRate),
      sub: `${stats.winningTrades}/${stats.completedTrades} wins`,
      icon: Percent,
      trend: stats.winRate - 50,
    },
    {
      id: 'totalTrades',
      label: 'Total Trades',
      value: fmtNumber(stats.totalTrades),
      sub: `${stats.activeTrades} active`,
      icon: BarChart3,
      trend: null,
    },
    {
      id: 'sharpeRatio',
      label: 'Risk Score',
      value: stats.sharpeRatio.toFixed(2),
      sub: `DD: ${stats.maxDrawdown.toFixed(1)}%`,
      icon: Target,
      trend: stats.sharpeRatio - 1,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map(({ id, label, value, sub, icon: Icon, trend }) => {
        const positive = trend !== null && isPositive(trend);
        const negative = trend !== null && !isPositive(trend);

        return (
          <div
            key={id}
            className={`
              relative rounded-lg border border-gray-800
              bg-gray-900/50 p-4 transition-all duration-200
              ${highlight === id ? 'ring-1 ring-primary/40 bg-gray-900/70' : ''}
            `}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Icon size={16} className="text-gray-400" />
                <span className="text-sm text-gray-400">{label}</span>
              </div>

              {trend !== null && (
                <div
                  className={`
                    p-1 rounded-md
                    ${positive && 'bg-green-500/10 text-green-400'}
                    ${negative && 'bg-red-500/10 text-red-400'}
                  `}
                >
                  {positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                </div>
              )}
            </div>

            {/* Value */}
            <div className="text-2xl font-bold text-white leading-tight">
              {value}
            </div>

            {/* Subtext */}
            <div className="mt-1 text-xs text-gray-500">
              {sub}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StatCards;
