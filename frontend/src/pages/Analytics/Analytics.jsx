// frontend/src/pages/Analytics.jsx
import React from 'react';
import PerformanceChart from '../../components/Analytics/PerformanceChart/PerformanceChart';
import SignalAnalysis from '../../components/Analytics/SignalAnalysis/SignalAnalysis';
import RecoveryMetrics from '../../components/Analytics/RecoveryMetrics/RecoveryMetrics';
import TradingHistory from '../../components/Analytics/TradingHistory/TradingHistory';
import LoadingSpinner from '../../components/Common/LoadingSpinner/LoadingSpinner';
import { useTrading } from '../../hooks/useTrading';
import './Analytics.css';

const Analytics = () => {
  const { loading, performance } = useTrading();

  if (loading && !performance.total_trades) {
    return (
      <div className="analytics-loading">
        <LoadingSpinner size="large" text="Loading analytics data..." />
      </div>
    );
  }

  return (
    <div className="analytics-page">
      <div className="page-header">
        <h1>Analytics & Performance</h1>
        <p>Detailed analysis of trading performance and strategy effectiveness</p>
      </div>

      <div className="analytics-content">
        <div className="analytics-section">
          <PerformanceChart />
        </div>
        
        <div className="analytics-grid">
          <div className="analytics-column">
            <SignalAnalysis />
            <RecoveryMetrics />
          </div>
          <div className="analytics-column">
            <TradingHistory />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;