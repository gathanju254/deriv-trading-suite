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
   Formatting helpers
---------------------------- */
const fmtMoney = (v) =>
  `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
const fmtPercent = (v) => `${Number(v).toFixed(1)}%`;
const fmtNumber = (v) => Number(v).toLocaleString();
const isPositive = (v) => v > 0;

const StatCards = () => {
  const { performance } = useTrading();
  const [highlight, setHighlight] = useState(null);
  const prev = useRef({});

  /* ---------------------------
     Normalize backend data
  ---------------------------- */
  const stats = useMemo(
    () => ({
      totalProfit: performance?.total_profit ?? performance?.pnl ?? 0,
      dailyPnl: performance?.daily_pnl ?? 0,

      winRate: performance?.win_rate ?? 0,
      totalTrades: performance?.total_trades ?? 0,
      activeTrades: performance?.active_trades ?? 0,
      completedTrades: performance?.completed_trades ?? 0,
      winningTrades: performance?.winning_trades ?? 0,

      sharpeRatio: performance?.sharpe_ratio ?? 0,
      maxDrawdown: performance?.max_drawdown ?? 0,
    }),
    [performance]
  );

  /* ---------------------------
     Subtle update highlight
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
     Card configuration
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
      sub: `Max DD: ${stats.maxDrawdown.toFixed(1)}%`,
      icon: Target,
      trend: stats.sharpeRatio - 1,
    },
  ];

  return (
    <div
      className="
        flex flex-col gap-4
        sm:grid sm:grid-cols-2
        lg:flex lg:flex-row lg:gap-4
      "
    >
      {cards.map(({ id, label, value, sub, icon: Icon, trend }) => {
        const positive = trend !== null && isPositive(trend);
        const negative = trend !== null && !isPositive(trend);

        return (
          <div
            key={id}
            className={`
              flex-1 relative rounded-xl
              border border-gray-800/60
              bg-gradient-to-br from-gray-900/80 to-gray-900/40
              px-5 py-6
              transition-all duration-200
              hover:border-gray-700
              hover:shadow-lg hover:shadow-black/30
              ${highlight === id ? 'ring-1 ring-primary/40' : ''}
            `}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-gray-800/70">
                  <Icon size={16} className="text-gray-200" />
                </div>
                <span className="text-sm font-medium text-gray-400">
                  {label}
                </span>
              </div>

              {trend !== null && (
                <div
                  className={`
                    flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium
                    ${positive && 'bg-green-500/10 text-green-400'}
                    ${negative && 'bg-red-500/10 text-red-400'}
                  `}
                >
                  {positive ? (
                    <TrendingUp size={12} />
                  ) : (
                    <TrendingDown size={12} />
                  )}
                </div>
              )}
            </div>

            {/* Main value */}
            <div className="text-2xl md:text-3xl font-semibold text-white tracking-tight">
              {value}
            </div>

            {/* Subtext */}
            <div className="mt-2 text-xs text-gray-500">
              {sub}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StatCards;
