// frontend/src/components/Dashboard/RecentTrades/RecentTrades.jsx
import React, { useMemo } from 'react';
import { useTrading } from '../../../hooks/useTrading';
import {
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
} from 'lucide-react';

/* ---------------- helpers ---------------- */

const formatDateParts = (timestamp) => {
  if (!timestamp) return { date: '—', time: '--:--:--' };
  const d = new Date(timestamp);
  return {
    date: d.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }),
    time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };
};

const getProfitValue = (t) => {
  if (t.net_profit != null) return Number(t.net_profit);
  if (t.profit != null) return Number(t.profit);
  if (t.status?.toUpperCase() === 'WON') return (t.stake_amount || 0) * 0.82;
  if (t.status?.toUpperCase() === 'LOST') return -(t.stake_amount || 0);
  return 0;
};

const getDirection = (t) => {
  const s = (t.direction || t.side || '').toUpperCase();
  if (['RISE', 'BUY', 'CALL'].includes(s)) return { text: 'RISE', color: 'text-emerald-400' };
  if (['FALL', 'SELL', 'PUT'].includes(s)) return { text: 'FALL', color: 'text-red-400' };
  return { text: '—', color: 'text-slate-400' };
};

const getStatusBadge = (status) => {
  const s = status?.toUpperCase();
  if (s === 'WON') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  if (s === 'LOST') return 'bg-red-500/10 text-red-400 border-red-500/20';
  if (s === 'ACTIVE' || s === 'PENDING')
    return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
};

/* ---------------- component ---------------- */

const RecentTrades = () => {
  const { tradeHistory, loading } = useTrading();

  const summary = useMemo(() => {
    if (!tradeHistory?.length) {
      return { total: 0, won: 0, lost: 0, winRate: 0, profit: 0 };
    }

    const total = tradeHistory.length;
    const won = tradeHistory.filter(t => t.status?.toUpperCase() === 'WON').length;
    const lost = tradeHistory.filter(t => t.status?.toUpperCase() === 'LOST').length;
    const profit = tradeHistory.reduce((s, t) => s + getProfitValue(t), 0);

    return {
      total,
      won,
      lost,
      winRate: ((won / total) * 100).toFixed(1),
      profit,
    };
  }, [tradeHistory]);

  /* ---------------- states ---------------- */

  if (loading && !tradeHistory?.length) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-center">
        <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
        <p className="text-sm text-slate-400">Loading trade history…</p>
      </div>
    );
  }

  if (!tradeHistory?.length) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-8 text-center">
        <DollarSign size={32} className="mx-auto mb-3 text-slate-500" />
        <p className="text-slate-300">No trades yet</p>
        <span className="text-xs text-slate-500">
          Trades will appear once execution begins.
        </span>
      </div>
    );
  }

  /* ---------------- table ---------------- */

  return (
    <div className="space-y-4">

      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/70">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-slate-900 text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left">Time</th>
              <th className="px-4 py-3 text-left">Symbol</th>
              <th className="px-4 py-3 text-left">Direction</th>
              <th className="px-4 py-3 text-right">Stake</th>
              <th className="px-4 py-3 text-right">Duration</th>
              <th className="px-4 py-3 text-left">Entry / Exit</th>
              <th className="px-4 py-3 text-right">P/L</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800">
            {tradeHistory.map((t, i) => {
              const { date, time } = formatDateParts(t.created_at);
              const profit = getProfitValue(t);
              const dir = getDirection(t);

              return (
                <tr key={t.id || i} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3">
                    <div className="text-xs text-slate-500">{date}</div>
                    <div className="text-slate-300">{time}</div>
                  </td>

                  <td className="px-4 py-3 text-slate-200">
                    {t.symbol || '—'}
                  </td>

                  <td className={`px-4 py-3 font-medium ${dir.color}`}>
                    {dir.text}
                  </td>

                  <td className="px-4 py-3 text-right">
                    ${Number(t.stake_amount || 0).toFixed(2)}
                  </td>

                  <td className="px-4 py-3 text-right">
                    {t.duration ? `${t.duration}t` : '—'}
                  </td>

                  <td className="px-4 py-3 text-xs text-slate-400">
                    <div>Entry: {t.entry_tick?.toFixed?.(4) || '—'}</div>
                    <div>Exit: {t.exit_tick?.toFixed?.(4) || '—'}</div>
                  </td>

                  <td
                    className={`px-4 py-3 text-right font-medium ${
                      profit > 0
                        ? 'text-emerald-400'
                        : profit < 0
                        ? 'text-red-400'
                        : 'text-slate-400'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {profit > 0 && <ArrowUpRight size={14} />}
                      {profit < 0 && <ArrowDownRight size={14} />}
                      ${profit.toFixed(2)}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${getStatusBadge(
                        t.status
                      )}`}
                    >
                      {t.status || 'UNKNOWN'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* === SUMMARY === */}
      <div className="grid gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4 sm:grid-cols-3 text-sm">
        <div>
          <div className="text-xs text-slate-500">Total Trades</div>
          <div className="text-slate-200 font-medium">{summary.total}</div>
        </div>

        <div>
          <div className="text-xs text-slate-500">Win Rate</div>
          <div className="text-slate-200 font-medium">
            {summary.winRate}% ({summary.won}/{summary.total})
          </div>
        </div>

        <div>
          <div className="text-xs text-slate-500">Total P/L</div>
          <div
            className={`font-medium ${
              summary.profit >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            ${summary.profit.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecentTrades;
