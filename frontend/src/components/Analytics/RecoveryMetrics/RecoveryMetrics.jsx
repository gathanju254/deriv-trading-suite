// frontend/src/components/Analytics/RecoveryMetrics/RecoveryMetrics.jsx
import React, { useEffect, useState } from 'react';
import { useTrading } from '../../../context/TradingContext';
import { RefreshCw, TrendingUp, AlertTriangle } from 'lucide-react';
import './RecoveryMetrics.css';


const RecoveryMetrics = () => {
  const { performance } = useTrading();
  const [recoveryData, setRecoveryData] = useState({});

  useEffect(() => {
    // Fetch recovery metrics from performance data
    if (performance?.recovery_metrics) {
      setRecoveryData(performance.recovery_metrics);
    }
  }, [performance]);

  const {
    recovery_streak = 0,
    total_losses = 0,
    recovery_target = 0,
    recovery_mode = 'MARTINGALE',
    recovery_history_count = 0
  } = recoveryData;

  return (
    <div className="recovery-metrics">
      <div className="metrics-header">
        <h3>
          <RefreshCw size={20} />
          Recovery System
        </h3>
        <div className="recovery-status">
          <span className={`status ${recovery_streak > 0 ? 'active' : 'inactive'}`}>
            {recovery_streak > 0 ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      <div className="recovery-grid">
        <div className="metric-card">
          <div className="metric-icon">
            <TrendingUp size={16} />
          </div>
          <div className="metric-content">
            <span className="metric-label">Recovery Streak</span>
            <span className="metric-value">{recovery_streak}</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">
            <AlertTriangle size={16} />
          </div>
          <div className="metric-content">
            <span className="metric-label">Total Losses</span>
            <span className="metric-value">${total_losses.toFixed(2)}</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">
            <RefreshCw size={16} />
          </div>
          <div className="metric-content">
            <span className="metric-label">Recovery Target</span>
            <span className="metric-value">${recovery_target.toFixed(2)}</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">
            <span>⚙️</span>
          </div>
          <div className="metric-content">
            <span className="metric-label">Recovery Mode</span>
            <span className="metric-value">{recovery_mode}</span>
          </div>
        </div>
      </div>

      <div className="recovery-info">
        <p>
          Recovery attempts: {recovery_history_count} | 
          Current streak: {recovery_streak}
        </p>
      </div>
    </div>
  );
};

export default RecoveryMetrics;
