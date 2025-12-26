// frontend/src/components/Analytics/SignalAnalysis/SignalAnalysis.jsx
import React, { useMemo } from 'react';
import { useTrading } from '../../../hooks/useTrading';
import { Activity, TrendingUp, TrendingDown, Target } from 'lucide-react';
import './SignalAnalysis.css';

const SignalAnalysis = () => {
  const { signals, tradeHistory } = useTrading();

  const analysis = useMemo(() => {
    if (!signals || signals.length === 0) {
      return {
        totalSignals: 0,
        bullishSignals: 0,
        bearishSignals: 0,
        avgConfidence: 0,
        signalAccuracy: 0
      };
    }

    const bullish = signals.filter(s => 
      String(s.direction || '').toLowerCase().includes('buy') || 
      String(s.direction || '').toLowerCase().includes('call')
    ).length;

    const bearish = signals.filter(s => 
      String(s.direction || '').toLowerCase().includes('sell') || 
      String(s.direction || '').toLowerCase().includes('put')
    ).length;

    const avgConfidence = signals.reduce((sum, s) => sum + (s.confidence || 0), 0) / signals.length;

    // Simple accuracy calculation based on recent trades
    const recentTrades = tradeHistory.slice(-10);
    const accurateSignals = recentTrades.filter(t => {
      const signal = signals.find(s => s.timestamp && t.created_at && 
        Math.abs(new Date(s.timestamp) - new Date(t.created_at)) < 60000); // Within 1 min
      if (!signal) return false;
      const signalDir = String(signal.direction).toLowerCase();
      const tradeDir = t.side.toLowerCase();
      return (signalDir.includes('buy') && tradeDir.includes('call')) || 
             (signalDir.includes('sell') && tradeDir.includes('put'));
    }).length;

    const signalAccuracy = recentTrades.length > 0 ? (accurateSignals / recentTrades.length) * 100 : 0;

    return {
      totalSignals: signals.length,
      bullishSignals: bullish,
      bearishSignals: bearish,
      avgConfidence: avgConfidence * 100,
      signalAccuracy
    };
  }, [signals, tradeHistory]);

  return (
    <div className="signal-analysis">
      <div className="analysis-header">
        <h3>
          <Activity size={20} />
          Signal Analysis
        </h3>
      </div>

      <div className="analysis-grid">
        <div className="analysis-card">
          <div className="analysis-icon">
            <Target size={16} />
          </div>
          <div className="analysis-content">
            <span className="analysis-label">Total Signals</span>
            <span className="analysis-value">{analysis.totalSignals}</span>
          </div>
        </div>

        <div className="analysis-card bullish">
          <div className="analysis-icon">
            <TrendingUp size={16} />
          </div>
          <div className="analysis-content">
            <span className="analysis-label">Bullish Signals</span>
            <span className="analysis-value">{analysis.bullishSignals}</span>
          </div>
        </div>

        <div className="analysis-card bearish">
          <div className="analysis-icon">
            <TrendingDown size={16} />
          </div>
          <div className="analysis-content">
            <span className="analysis-label">Bearish Signals</span>
            <span className="analysis-value">{analysis.bearishSignals}</span>
          </div>
        </div>

        <div className="analysis-card">
          <div className="analysis-icon">
            <Activity size={16} />
          </div>
          <div className="analysis-content">
            <span className="analysis-label">Avg Confidence</span>
            <span className="analysis-value">{analysis.avgConfidence.toFixed(1)}%</span>
          </div>
        </div>

        <div className="analysis-card accuracy">
          <div className="analysis-icon">
            <Target size={16} />
          </div>
          <div className="analysis-content">
            <span className="analysis-label">Signal Accuracy</span>
            <span className="analysis-value">{analysis.signalAccuracy.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignalAnalysis;

