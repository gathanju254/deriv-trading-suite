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
     Highlight on update
  ---------------------------- */
  useEffect(() => {
    for (const key in stats) {
      if (prev.current[key] !== stats[key]) {
        setHighlight(key);
        setTimeout(() => setHighlight(null), 400);
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
    <section className="w-full">
      <div
        className="
          w-full
          flex flex-col gap-4
          sm:grid sm:grid-cols-2
          lg:flex lg:flex-row
        "
      >
        {cards.map(({ id, label, value, sub, icon: Icon, trend }) => {
          const positive = trend !== null && isPositive(trend);
          const negative = trend !== null && !isPositive(trend);

          return (
            <div
              key={id}
              className={`
                relative flex-1
                rounded-2xl
                border border-gray-800/70
                bg-gradient-to-br from-gray-900/90 via-gray-900/60 to-gray-900/30
                px-6 py-6
                transition-all duration-300
                hover:border-gray-700
                hover:shadow-xl hover:shadow-black/40
                ${highlight === id ? 'ring-1 ring-primary/40' : ''}
              `}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-gray-800/70">
                    <Icon size={16} className="text-gray-200" />
                  </div>
                  <span className="text-sm font-medium text-gray-400">
                    {label}
                  </span>
                </div>

                {trend !== null && (
                  <div
                    className={`
                      flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold
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

              {/* Value */}
              <div className="text-3xl font-semibold text-white tracking-tight">
                {value}
              </div>

              {/* Sub */}
              <div className="mt-2 text-xs text-gray-500">
                {sub}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default StatCards;

