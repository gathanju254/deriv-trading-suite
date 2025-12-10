// frontend/src/components/TradingView/SignalIndicator/SignalIndicator.jsx

// frontend/src/components/TradingView/SignalIndicator/SignalIndicator.jsx
import React, { useState, useEffect } from 'react';
import { useTrading } from '../../../context/TradingContext';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Circle, 
  Clock,
  Zap
} from 'lucide-react';
import './SignalIndicator.css';

const SignalIndicator = () => {
  const { signals, marketData } = useTrading();
  const [activeSignals, setActiveSignals] = useState([]);
  const [signalStrength, setSignalStrength] = useState(0);

  // Process signals for display
  useEffect(() => {
    if (!signals || !Array.isArray(signals)) return;

    const processed = signals.slice(0, 10).map(signal => ({
      id: signal.id || Math.random(),
      type: signal.type || 'info',
      direction: signal.direction || signal.action || 'neutral',
      symbol: signal.symbol || 'R_100',
      timestamp: signal.timestamp || Date.now(),
      confidence: signal.confidence || signal.strength || 0.5,
      message: signal.message || signal.reason || 'Signal detected',
      price: signal.price || marketData?.lastPrice || 0,
      expiry: signal.expiry || null
    }));

    setActiveSignals(processed);

    // Calculate overall signal strength
    if (processed.length > 0) {
      const avgConfidence = processed.reduce((sum, s) => sum + s.confidence, 0) / processed.length;
      const bullishCount = processed.filter(s => s.direction === 'buy').length;
      const bearishCount = processed.filter(s => s.direction === 'sell').length;
      const strength = (bullishCount - bearishCount) * avgConfidence;
      setSignalStrength(Math.min(Math.max(strength, -1), 1));
    }
  }, [signals, marketData]);

  const getSignalColor = (direction) => {
    switch (direction.toLowerCase()) {
      case 'buy':
      case 'bullish':
      case 'up':
        return '#10b981';
      case 'sell':
      case 'bearish':
      case 'down':
        return '#ef4444';
      default:
        return '#94a3b8';
    }
  };

  const getSignalIcon = (direction) => {
    switch (direction.toLowerCase()) {
      case 'buy':
      case 'bullish':
      case 'up':
        return <TrendingUp size={16} />;
      case 'sell':
      case 'bearish':
      case 'down':
        return <TrendingDown size={16} />;
      default:
        return <AlertTriangle size={16} />;
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatTimeAgo = (timestamp) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const getSignalStrengthText = () => {
    if (signalStrength > 0.7) return 'Strong Bullish';
    if (signalStrength > 0.3) return 'Bullish';
    if (signalStrength > -0.3) return 'Neutral';
    if (signalStrength > -0.7) return 'Bearish';
    return 'Strong Bearish';
  };

  return (
    <div className="signal-indicator">
      {/* Signal Strength Meter */}
      <div className="signal-strength">
        <div className="strength-header">
          <h3>
            <Zap size={18} />
            Market Sentiment
          </h3>
          <span className={`sentiment-${signalStrength > 0.3 ? 'bullish' : signalStrength < -0.3 ? 'bearish' : 'neutral'}`}>
            {getSignalStrengthText()}
          </span>
        </div>
        
        <div className="strength-meter">
          <div className="meter-background">
            <div 
              className="meter-fill"
              style={{
                width: `${((signalStrength + 1) / 2) * 100}%`,
                backgroundColor: signalStrength >= 0 ? '#10b981' : '#ef4444'
              }}
            />
          </div>
          <div className="meter-labels">
            <span className="bearish-label">Bearish</span>
            <span className="neutral-label">Neutral</span>
            <span className="bullish-label">Bullish</span>
          </div>
        </div>

        <div className="strength-stats">
          <div className="stat">
            <span className="stat-label">Total Signals</span>
            <span className="stat-value">{activeSignals.length}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Bullish</span>
            <span className="stat-value bullish">
              {activeSignals.filter(s => s.direction === 'buy').length}
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">Bearish</span>
            <span className="stat-value bearish">
              {activeSignals.filter(s => s.direction === 'sell').length}
            </span>
          </div>
        </div>
      </div>

      {/* Recent Signals List */}
      <div className="signals-list">
        <h3>Recent Signals</h3>
        {activeSignals.length === 0 ? (
          <div className="no-signals">
            <AlertTriangle size={24} />
            <p>No active signals</p>
          </div>
        ) : (
          <div className="signals-grid">
            {activeSignals.map(signal => (
              <div 
                key={signal.id} 
                className={`signal-card signal-${signal.direction}`}
                style={{ borderLeftColor: getSignalColor(signal.direction) }}
              >
                <div className="signal-header">
                  <div className="signal-direction">
                    {getSignalIcon(signal.direction)}
                    <span className="direction-text">{signal.direction.toUpperCase()}</span>
                  </div>
                  <div className="signal-meta">
                    <span className="signal-symbol">{signal.symbol}</span>
                    <div className="signal-time">
                      <Clock size={12} />
                      {formatTimeAgo(signal.timestamp)}
                    </div>
                  </div>
                </div>
                
                <div className="signal-body">
                  <p className="signal-message">{signal.message}</p>
                  
                  <div className="signal-details">
                    <div className="signal-price">
                      <span className="price-label">Price:</span>
                      <span className="price-value">
                        ${parseFloat(signal.price).toFixed(4)}
                      </span>
                    </div>
                    
                    <div className="signal-confidence">
                      <span className="confidence-label">Confidence:</span>
                      <div className="confidence-bar">
                        <div 
                          className="confidence-fill"
                          style={{ 
                            width: `${signal.confidence * 100}%`,
                            backgroundColor: getSignalColor(signal.direction)
                          }}
                        />
                      </div>
                      <span className="confidence-value">
                        {(signal.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Action Buttons */}
      {activeSignals.length > 0 && (
        <div className="signal-actions">
          <button className="action-btn action-follow">
            Follow Strongest Signal
          </button>
          <button className="action-btn action-clear">
            Clear All Signals
          </button>
        </div>
      )}
    </div>
  );
};

export default SignalIndicator;