// frontend/src/components/Dashboard/SignalIndicator/SignalIndicator.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useTrading } from '../../../hooks/useTrading';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  Zap,
  RefreshCw,
  Activity,
} from 'lucide-react';

/* ---------------- utils ---------------- */

const safeNum = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const normalizeConfidence = (c) => {
  if (c === null || c === undefined) return 0.5;
  const n = Number(c);
  if (!Number.isFinite(n)) return 0.5;
  if (n > 1) return Math.min(n / 100, 1);
  return Math.min(Math.max(n, 0), 1);
};

const toTimestampMs = (t) => {
  if (!t) return Date.now();
  const n = Number(t);
  if (Number.isFinite(n)) return n < 1e11 ? n * 1000 : n;
  const parsed = Date.parse(String(t));
  return Number.isFinite(parsed) ? parsed : Date.now();
};

const formatTime = (ts) =>
  new Date(toTimestampMs(ts)).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

const formatTimeAgo = (ts) => {
  const secs = Math.floor((Date.now() - toTimestampMs(ts)) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
};

const signalType = (dir = '') => {
  const d = dir.toLowerCase();
  if (['buy', 'bullish', 'long', 'up', 'call'].some(k => d.includes(k))) return 'bull';
  if (['sell', 'bearish', 'short', 'down', 'put'].some(k => d.includes(k))) return 'bear';
  return 'neutral';
};

/* ---------------- component ---------------- */

const SignalIndicator = () => {
  const { signals, marketData, loading, refreshSignals } = useTrading();

  const [activeSignals, setActiveSignals] = useState([]);
  const [signalStrength, setSignalStrength] = useState(0);
  const [lastSignalUpdate, setLastSignalUpdate] = useState(null);
  const [showAll, setShowAll] = useState(false);

  const prevRef = useRef(null);

  useEffect(() => {
    if (!Array.isArray(signals)) return;

    if (JSON.stringify(signals) === JSON.stringify(prevRef.current)) return;
    prevRef.current = signals;

    const processed = signals.slice(0, 20).map((s, i) => ({
      id: s?.id || `sig-${i}`,
      direction: s?.direction || 'NEUTRAL',
      symbol: s?.symbol || marketData?.symbol || 'R_100',
      timestamp: toTimestampMs(s?.timestamp),
      confidence: normalizeConfidence(s?.confidence),
      message: s?.message || 'Signal detected',
      price: safeNum(s?.price),
    }));

    setActiveSignals(processed);
    setLastSignalUpdate(Date.now());

    if (!processed.length) return setSignalStrength(0);

    const avgConf =
      processed.reduce((a, b) => a + b.confidence, 0) / processed.length;

    const bull = processed.filter(s => signalType(s.direction) === 'bull').length;
    const bear = processed.filter(s => signalType(s.direction) === 'bear').length;

    setSignalStrength(Math.max(-1, Math.min(1, (bull - bear) * avgConf / processed.length)));
  }, [signals, marketData]);

  /* ---------------- render ---------------- */

  return (
    <div className="space-y-6">

      {/* === MARKET SENTIMENT === */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="flex items-center gap-2 font-semibold text-slate-100">
            <Zap className="text-emerald-400" size={18} />
            Market Sentiment
          </h3>

          <button
            onClick={refreshSignals}
            disabled={loading}
            className="rounded-md border border-slate-700 p-2 hover:bg-slate-800 disabled:opacity-50"
          >
            <RefreshCw
              size={14}
              className={loading ? 'animate-spin' : ''}
            />
          </button>
        </div>

        {/* Meter */}
        <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              signalStrength > 0
                ? 'bg-emerald-500'
                : signalStrength < 0
                ? 'bg-red-500'
                : 'bg-slate-500'
            }`}
            style={{ width: `${((signalStrength + 1) / 2) * 100}%` }}
          />
        </div>

        <div className="mt-3 flex justify-between text-xs text-slate-400">
          <span>Bearish</span>
          <span>Neutral</span>
          <span>Bullish</span>
        </div>

        {lastSignalUpdate && (
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <Clock size={12} />
            Updated {formatTime(lastSignalUpdate)}
          </div>
        )}
      </div>

      {/* === SIGNALS LIST === */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-100">Recent Signals</h3>

          {activeSignals.length > 5 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-xs text-emerald-400 hover:underline"
            >
              {showAll ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>

        {!activeSignals.length ? (
          <div className="flex flex-col items-center py-10 text-slate-500">
            <AlertTriangle size={32} />
            <p className="mt-2">No active signals</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeSignals.slice(0, showAll ? 20 : 5).map(sig => {
              const type = signalType(sig.direction);
              return (
                <div
                  key={sig.id}
                  className={`rounded-lg border-l-4 p-4 bg-slate-800/60 ${
                    type === 'bull'
                      ? 'border-emerald-500'
                      : type === 'bear'
                      ? 'border-red-500'
                      : 'border-slate-500'
                  }`}
                >
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-semibold text-slate-100">
                      {sig.direction.toUpperCase()} · {sig.symbol}
                    </span>
                    <span className="text-xs text-slate-400">
                      {formatTimeAgo(sig.timestamp)}
                    </span>
                  </div>

                  <p className="text-sm text-slate-300 mb-2">{sig.message}</p>

                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Price: ${sig.price.toFixed(4)}</span>
                    <span>{Math.round(sig.confidence * 100)}% confidence</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* === SUMMARY === */}
      {!!activeSignals.length && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex items-center gap-4 text-sm text-slate-300">
          <Activity size={14} />
          <span>{activeSignals.length} active</span>
          <TrendingUp size={14} className="text-emerald-400" />
          <span>
            {activeSignals.filter(s => signalType(s.direction) === 'bull').length} bullish
          </span>
          <TrendingDown size={14} className="text-red-400" />
          <span>
            {activeSignals.filter(s => signalType(s.direction) === 'bear').length} bearish
          </span>
        </div>
      )}
    </div>
  );
};

export default SignalIndicator;
