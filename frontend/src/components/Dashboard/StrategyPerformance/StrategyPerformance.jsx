// frontend/src/components/Dashboard/StrategyPerformance/StrategyPerformance.jsx
import React from 'react';
import { useTrading } from '../../../hooks/useTrading';
import {
  TrendingUp,
  TrendingDown,
  Target,
  Activity,
  Shield,
  Zap,
} from 'lucide-react';

/* ---------------- utils ---------------- */

const safeNum = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const toPercent = (v) => {
  if (v === null || v === undefined) return 0;
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return n <= 1 && n >= 0 ? n * 100 : n;
};

const normalizePerformance = (p = {}) => ({
  totalProfit: safeNum(p.pnl ?? p.total_profit ?? p.totalProfit ?? 0),
  winRate: toPercent(p.win_rate ?? p.winRate ?? 0),
  totalTrades: safeNum(p.total_trades ?? p.totalTrades ?? 0),
  winningTrades: safeNum(p.winning_trades ?? p.wins ?? 0),
  activeTrades: safeNum(p.active_trades ?? 0),
  avgTradesPerDay: safeNum(p.avg_trades_per_day ?? 0),
  sharpe: safeNum(p.sharpe_ratio ?? p.sharpe ?? 0),
  maxDrawdown: safeNum(p.max_drawdown ?? p.maxDrawdown ?? 0),
  volatility: safeNum(p.volatility ?? 0),
  dailyPnl: safeNum(p.daily_pnl ?? 0),
  monthlyPnl: safeNum(p.monthly_pnl ?? 0),
  avgProfit: safeNum(p.avg_profit ?? 0),
  profitFactor:
    p.profit_factor !== undefined && p.profit_factor !== null
      ? safeNum(p.profit_factor, 1)
      : null,
  bestDay:
    p.best_day !== undefined && p.best_day !== null
      ? safeNum(p.best_day, 0)
      : null,
  worstDay:
    p.worst_day !== undefined && p.worst_day !== null
      ? safeNum(p.worst_day, 0)
      : null,
});

/* ---------------- component ---------------- */

const StrategyPerformance = () => {
  const { performance: raw } = useTrading();
  const p = normalizePerformance(raw);

  const metrics = [
    {
      id: 'pnl',
      label: 'Total P&L',
      value: `$${p.totalProfit.toFixed(2)}`,
      icon: TrendingUp,
      trend: p.totalProfit >= 0,
      sub: [
        { label: 'Daily', value: `$${p.dailyPnl.toFixed(2)}` },
        { label: 'Monthly', value: `$${p.monthlyPnl.toFixed(2)}` },
      ],
    },
    {
      id: 'winrate',
      label: 'Win Rate',
      value: `${p.winRate.toFixed(1)}%`,
      icon: Target,
      trend: p.winRate >= 50,
      sub: [
        { label: 'Wins', value: p.winningTrades },
        { label: 'Total', value: p.totalTrades },
      ],
    },
    {
      id: 'trades',
      label: 'Trades',
      value: p.totalTrades,
      icon: Activity,
      trend: null,
      sub: [
        { label: 'Active', value: p.activeTrades },
        { label: 'Avg / Day', value: p.avgTradesPerDay.toFixed(1) },
      ],
    },
    {
      id: 'risk',
      label: 'Sharpe Ratio',
      value: p.sharpe.toFixed(2),
      icon: Shield,
      trend: p.sharpe >= 1,
      sub: [
        { label: 'Drawdown', value: `${p.maxDrawdown.toFixed(1)}%` },
        { label: 'Volatility', value: `${p.volatility.toFixed(1)}%` },
      ],
    },
  ];

  return (
    <div className="space-y-6">

      {/* === TOP METRICS === */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.id}
              className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-slate-400">{m.label}</span>
                <Icon
                  size={18}
                  className={
                    m.trend === null
                      ? 'text-slate-400'
                      : m.trend
                      ? 'text-emerald-400'
                      : 'text-red-400'
                  }
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-2xl font-semibold text-slate-100">
                  {m.value}
                </span>
                {m.trend !== null && (
                  m.trend ? (
                    <TrendingUp size={16} className="text-emerald-400" />
                  ) : (
                    <TrendingDown size={16} className="text-red-400" />
                  )
                )}
              </div>

              <div className="mt-3 space-y-1 text-xs text-slate-400">
                {m.sub.map((s, i) => (
                  <div key={i} className="flex justify-between">
                    <span>{s.label}</span>
                    <span className="text-slate-300">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* === SUPPORTING STATS === */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          
          <div className="flex items-center gap-3">
            <Zap size={16} className="text-emerald-400" />
            <div>
              <div className="text-slate-400 text-xs">Best Day</div>
              <div className="text-emerald-400 font-medium">
                {p.bestDay !== null ? `+$${p.bestDay.toFixed(2)}` : '—'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <TrendingDown size={16} className="text-red-400" />
            <div>
              <div className="text-slate-400 text-xs">Worst Day</div>
              <div className="text-red-400 font-medium">
                {p.worstDay !== null ? `-$${Math.abs(p.worstDay).toFixed(2)}` : '—'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Target size={16} className="text-sky-400" />
            <div>
              <div className="text-slate-400 text-xs">Profit Factor</div>
              <div className="text-slate-200 font-medium">
                {p.profitFactor !== null ? p.profitFactor.toFixed(2) : 'N/A'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Activity size={16} className="text-indigo-400" />
            <div>
              <div className="text-slate-400 text-xs">Avg Profit</div>
              <div className="text-slate-200 font-medium">
                ${p.avgProfit.toFixed(2)}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default StrategyPerformance;
