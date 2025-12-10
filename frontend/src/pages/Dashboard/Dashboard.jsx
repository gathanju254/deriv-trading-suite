// frontend/src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useTrading } from '../../context/TradingContext';
import { useToast } from '../../context/ToastContext';
import LoadingSpinner from '../Common/LoadingSpinner';
import { 
  RefreshCw, 
  Activity, 
  TrendingUp, 
  AlertCircle,
  BarChart3,
  DollarSign,
  Clock,
  Play,
  StopCircle,
  Zap
} from 'lucide-react';
import StatCards from './StatCards/StatCards';
import BotControls from './BotControls/BotControls';
import './Dashboard.css';

const Dashboard = () => {
  const { 
    loading, 
    botStatus, 
    wsConnectionStatus, 
    refreshAllData,
    refreshPerformance,
    refreshTradeHistory,
    lastUpdateTime,
    startBot,
    stopBot,
    performance,
    marketData 
  } = useTrading();
  const { addToast } = useToast();
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState(0);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        // Increment progress bar
        setRefreshProgress(prev => {
          if (prev >= 100) {
            refreshAllData();
            return 0;
          }
          return prev + 1;
        });
      }, 300); // Update progress every 300ms for 30 second total

      return () => {
        clearInterval(interval);
        setRefreshProgress(0);
      };
    }
  }, [autoRefresh, refreshAllData]);

  const handleManualRefresh = async (type = 'all') => {
    try {
      switch (type) {
        case 'performance':
          await refreshPerformance();
          addToast('Performance data refreshed', 'success', 2000);
          break;
        case 'trades':
          await refreshTradeHistory();
          addToast('Trade history refreshed', 'success', 2000);
          break;
        default:
          await refreshAllData();
          addToast('All data refreshed', 'success', 2000);
      }
    } catch (error) {
      addToast(`Failed to refresh ${type} data`, 'error');
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatTimeSince = (timestamp) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  if (loading && !performance?.total_trades) {
    return (
      <div className="dashboard-loading">
        <LoadingSpinner size="large" text="Loading trading dashboard..." />
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-main">
          <h1>Trading Dashboard</h1>
          <div className="header-subtitle">
            <div className={`status-badge ${botStatus}`}>
              <Activity size={14} />
              <span>Bot: {botStatus}</span>
            </div>
            <div className={`status-badge ${wsConnectionStatus}`}>
              <Zap size={14} />
              <span>WS: {wsConnectionStatus}</span>
            </div>
          </div>
        </div>

        <div className="header-controls">
          {/* Bot Controls */}
          <div className="bot-controls-quick">
            <button
              className={`btn btn-${botStatus === 'running' ? 'danger' : 'success'}`}
              onClick={botStatus === 'running' ? stopBot : startBot}
              disabled={loading}
            >
              {botStatus === 'running' ? (
                <>
                  <StopCircle size={16} />
                  Stop Bot
                </>
              ) : (
                <>
                  <Play size={16} />
                  Start Bot
                </>
              )}
            </button>
          </div>

          {/* Refresh Controls */}
          <div className="refresh-controls">
            <div className="last-update">
              <Clock size={14} />
              <span>Updated: {formatTimeSince(lastUpdateTime)}</span>
            </div>
            
            <div className="refresh-options">
              <div className="auto-refresh-toggle">
                <input
                  type="checkbox"
                  id="auto-refresh"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  disabled={loading}
                />
                <label htmlFor="auto-refresh">Auto-refresh</label>
                {autoRefresh && (
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${refreshProgress}%` }}
                    />
                  </div>
                )}
              </div>

              <div className="refresh-buttons">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleManualRefresh('performance')}
                  disabled={loading}
                  title="Refresh performance only"
                >
                  <BarChart3 size={14} />
                  Perf
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleManualRefresh('trades')}
                  disabled={loading}
                  title="Refresh trades only"
                >
                  <DollarSign size={14} />
                  Trades
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => handleManualRefresh('all')}
                  disabled={loading}
                >
                  <RefreshCw size={14} className={loading ? 'spinning' : ''} />
                  Refresh All
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="stats-overview">
        <StatCards />
      </div>

      {/* Main Content Grid */}
      <div className="dashboard-grid">
        <div className="dashboard-column">
          {/* Market Overview */}
          <div className="dashboard-section">
            <div className="section-header">
              <h2>
                <TrendingUp size={20} />
                Market Overview
              </h2>
              {marketData.lastPrice && (
                <div className="current-price">
                  <span>${parseFloat(marketData.lastPrice).toFixed(4)}</span>
                  <span className="price-symbol">{marketData.symbol || 'R_100'}</span>
                </div>
              )}
            </div>
            {/* Add your MarketOverview component here */}
          </div>

          {/* Bot Controls Detailed */}
          <div className="dashboard-section">
            <div className="section-header">
              <h2>
                <Activity size={20} />
                Trading Controls
              </h2>
              <div className={`control-status ${botStatus}`}>
                {botStatus === 'running' ? 'Active' : 'Stopped'}
              </div>
            </div>
            <BotControls />
          </div>
        </div>

        <div className="dashboard-column">
          {/* Performance Chart */}
          <div className="dashboard-section">
            <div className="section-header">
              <h2>
                <BarChart3 size={20} />
                Performance
              </h2>
              {performance.win_rate !== undefined && (
                <div className="performance-badge">
                  Win Rate: {performance.win_rate?.toFixed(1) || '0.0'}%
                </div>
              )}
            </div>
            {/* Add your PerformanceChart component here */}
          </div>

          {/* Recent Signals */}
          <div className="dashboard-section">
            <div className="section-header">
              <h2>
                <AlertCircle size={20} />
                Recent Signals
              </h2>
              <div className="signal-count">
                {signals?.length || 0} active
              </div>
            </div>
            {/* Add your SignalIndicator component here */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;