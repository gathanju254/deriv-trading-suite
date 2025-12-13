// frontend/src/components/Dashboard/SignalIndicator/SignalIndicator.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useTrading } from '../../../context/TradingContext';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Clock,
  Zap,
  RefreshCw,
  Activity
} from 'lucide-react';
import './SignalIndicator.css';

const safeNum = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

// Confidence normalization: backend may send 0..1 or 0..100
const normalizeConfidence = (c) => {
  if (c === null || c === undefined) return 0.5;
  const n = Number(c);
  if (!Number.isFinite(n)) return 0.5;
  if (n > 1) return Math.min(n / 100, 1);
  return Math.min(Math.max(n, 0), 1);
};

// Timestamp normalization: accepts seconds or milliseconds or ISO string
const toTimestampMs = (t) => {
  if (!t) return Date.now();
  const n = Number(t);
  if (Number.isFinite(n)) {
    return n < 1e11 ? Math.round(n * 1000) : Math.round(n);
  }
  const parsed = Date.parse(String(t));
  return Number.isFinite(parsed) ? parsed : Date.now();
};

const formatTime = (ts) => {
  try {
    const d = new Date(toTimestampMs(ts));
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return '—';
  }
};

const formatTimeAgo = (ts) => {
  try {
    const secs = Math.floor((Date.now() - toTimestampMs(ts)) / 1000);
    if (secs < 60) return `${secs}s ago`;
    if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
    if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
    return `${Math.floor(secs / 86400)}d ago`;
  } catch {
    return '--';
  }
};

const getSignalColor = (direction) => {
  const dir = String(direction || '').toLowerCase();
  if (dir.includes('buy') || dir.includes('bullish') || dir.includes('long') || dir.includes('up') || dir.includes('call')) return '#10b981';
  if (dir.includes('sell') || dir.includes('bearish') || dir.includes('short') || dir.includes('down') || dir.includes('put')) return '#ef4444';
  return '#94a3b8';
};

const getSignalIcon = (direction) => {
  const dir = String(direction || '').toLowerCase();
  if (dir.includes('buy') || dir.includes('bullish') || dir.includes('long') || dir.includes('up') || dir.includes('call')) return <TrendingUp size={16} />;
  if (dir.includes('sell') || dir.includes('bearish') || dir.includes('short') || dir.includes('down') || dir.includes('put')) return <TrendingDown size={16} />;
  return <AlertTriangle size={16} />;
};

const SignalIndicator = () => {
  const { signals, marketData, loading, refreshSignals } = useTrading();
  const [activeSignals, setActiveSignals] = useState([]);
  const [signalStrength, setSignalStrength] = useState(0);
  const [lastSignalUpdate, setLastSignalUpdate] = useState(null);
  const prevSignalsRef = useRef(null);

  useEffect(() => {
    if (!signals || !Array.isArray(signals)) {
      setActiveSignals([]);
      setSignalStrength(0);
      return;
    }

    // Only process if signals have actually changed
    if (JSON.stringify(signals) === JSON.stringify(prevSignalsRef.current)) {
      return;
    }
    prevSignalsRef.current = signals;

    try {
      // Normalize incoming signals safely
      const processed = signals.slice(0, 20).map((signal, idx) => {
        if (!signal) return null;

        const confidence = normalizeConfidence(
          signal.confidence ?? signal.strength ?? signal.probability ?? 0.5
        );
        const priceCandidate = signal.price ?? signal.entry_price ?? marketData?.lastPrice ?? 0;
        const price = safeNum(priceCandidate, 0);
        const ts = signal.timestamp ?? signal.time ?? signal.created_at ?? signal.purchase_time ?? Date.now();

        return {
          id: signal.id || signal.signal_id || `signal-${idx}-${Date.now()}`,
          direction: signal.direction || signal.action || signal.recommendation || (signal.side ? String(signal.side).toUpperCase() : 'NEUTRAL'),
          symbol: signal.symbol || signal.pair || marketData?.symbol || 'R_100',
          timestamp: toTimestampMs(ts),
          confidence,
          message: signal.message || signal.reason || signal.description || signal.longcode || 'Signal detected',
          price,
          source: signal.source || signal.strategy || 'unknown'
        };
      }).filter(s => s !== null);

      setActiveSignals(processed);
      setLastSignalUpdate(Date.now());

      // Compute signal strength with proper error handling
      if (processed.length > 0) {
        const avgConf = processed.reduce((s, x) => s + (x.confidence ?? 0.5), 0) / processed.length;
        const bull = processed.filter(s => {
          const dir = String(s.direction || '').toLowerCase();
          return ['buy','bullish','long','up','call'].some(k => dir.includes(k));
        }).length;
        const bear = processed.filter(s => {
          const dir = String(s.direction || '').toLowerCase();
          return ['sell','bearish','short','down','put'].some(k => dir.includes(k));
        }).length;
        
        const raw = (bull - bear) * avgConf;
        const normalized = processed.length ? raw / processed.length : 0;
        setSignalStrength(Math.max(-1, Math.min(1, normalized)));
      } else {
        setSignalStrength(0);
      }
    } catch (error) {
      console.error('Error processing signals:', error);
      setActiveSignals([]);
      setSignalStrength(0);
    }
  }, [signals, marketData]);

  const handleRefresh = async () => {
    try {
      await refreshSignals();
    } catch (e) {
      console.error('Failed to refresh signals', e);
    }
  };

  return (
    <div className="signal-indicator">
      <div className="card">
        <div className="strength-header">
          <h3><Zap size={18}/> Market Sentiment</h3>
          <div className="strength-actions">
            <button 
              className="refresh-btn" 
              onClick={handleRefresh} 
              disabled={loading} 
              title="Refresh signals"
            >
              <RefreshCw size={14} className={loading ? 'spinning' : ''} />
            </button>
            <div 
              className={`sentiment-${
                signalStrength >= 0.3 ? 'bullish' : 
                signalStrength <= -0.3 ? 'bearish' : 
                'neutral'
              }`} 
              aria-hidden
            >
              {signalStrength > 0.65 ? 'Strong Bullish' : 
               signalStrength > 0.2 ? 'Bullish' : 
               signalStrength > -0.2 ? 'Neutral' : 
               signalStrength > -0.65 ? 'Bearish' : 
               'Strong Bearish'}
            </div>
          </div>
        </div>

        <div className="strength-meter">
          <div className="meter-background" aria-hidden>
            <div
              className="meter-fill"
              style={{ width: `${((signalStrength + 1) / 2) * 100}%` }}
            />
          </div>
          <div className="meter-labels">
            <span>Bearish</span>
            <span>Neutral</span>
            <span>Bullish</span>
          </div>

          <div className="strength-stats" role="list" aria-label="Signal statistics">
            <div className="stat" role="listitem">
              <div className="stat-label">Total</div>
              <div className="stat-value">{activeSignals.length}</div>
            </div>
            <div className="stat" role="listitem">
              <div className="stat-label">Bullish</div>
              <div className="stat-value bullish">
                {activeSignals.filter(s => {
                  const dir = String(s.direction || '').toLowerCase();
                  return ['buy','bullish','long','up','call'].some(k => dir.includes(k));
                }).length}
              </div>
            </div>
            <div className="stat" role="listitem">
              <div className="stat-label">Bearish</div>
              <div className="stat-value bearish">
                {activeSignals.filter(s => {
                  const dir = String(s.direction || '').toLowerCase();
                  return ['sell','bearish','short','down','put'].some(k => dir.includes(k));
                }).length}
              </div>
            </div>
          </div>

          {lastSignalUpdate && (
            <div className="last-update-info">
              <Clock size={12} /> Updated {formatTime(lastSignalUpdate)}
            </div>
          )}
        </div>
      </div>

      <div className="card signals-list">
        <div className="signals-header">
          <h3>Recent Signals</h3>
          <div className="signals-count">
            Showing {Math.min(activeSignals.length, 10)} of {activeSignals.length}
          </div>
        </div>

        {activeSignals.length === 0 ? (
          <div className="no-signals" aria-live="polite">
            <AlertTriangle size={24} />
            <p style={{marginTop:8}}>No active signals</p>
            <small style={{color:'#94a3b8'}}>
              Signals will appear when the trading bot is active
            </small>
          </div>
        ) : (
          <div className="signals-grid" role="list">
            {activeSignals.slice(0, 10).map(sig => (
              <div
                key={sig.id}
                role="listitem"
                className="signal-card"
                style={{
                  borderLeftColor: getSignalColor(sig.direction)
                }}
              >
                <div className="signal-header">
                  <div className="signal-direction">
                    {getSignalIcon(sig.direction)}
                    <span 
                      className="direction-text" 
                      style={{color: getSignalColor(sig.direction)}}
                    >
                      {String(sig.direction).toUpperCase()}
                    </span>
                  </div>
                  <div className="signal-meta">
                    <div className="signal-symbol">{sig.symbol}</div>
                    <div className="signal-time">{formatTimeAgo(sig.timestamp)}</div>
                  </div>
                </div>

                <div className="signal-body">
                  <p className="signal-message">{sig.message}</p>

                  <div className="signal-details" aria-hidden>
                    <div>
                      <div className="price-label">Price</div>
                      <div className="price-value">
                        ${safeNum(sig.price, 0).toFixed(4)}
                      </div>
                    </div>

                    <div>
                      <div className="confidence-label">Confidence</div>
                      <div className="confidence-bar" aria-hidden>
                        <div 
                          className="confidence-fill" 
                          style={{ width: `${(sig.confidence ?? 0.5) * 100}%` }} 
                        />
                      </div>
                      <div 
                        className="confidence-value" 
                        style={{textAlign:'right', marginTop:4}}
                      >
                        {Math.round((sig.confidence ?? 0.5) * 100)}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {activeSignals.length > 0 && (
        <div className="card signal-summary" aria-hidden>
          <div style={{display:'flex', gap:12, alignItems:'center', flexWrap:'wrap'}}>
            <Activity size={14} />
            <span>Active: {activeSignals.length}</span>
            <TrendingUp size={14} style={{marginLeft:12}} />
            <span className="bullish">
              {activeSignals.filter(s => {
                const dir = String(s.direction || '').toLowerCase();
                return ['buy','bullish','long','up','call'].some(k => dir.includes(k));
              }).length} Bullish
            </span>
            <TrendingDown size={14} style={{marginLeft:12}} />
            <span className="bearish">
              {activeSignals.filter(s => {
                const dir = String(s.direction || '').toLowerCase();
                return ['sell','bearish','short','down','put'].some(k => dir.includes(k));
              }).length} Bearish
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SignalIndicator;