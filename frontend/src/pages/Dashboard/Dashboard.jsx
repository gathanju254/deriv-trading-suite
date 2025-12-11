// frontend/src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useTrading } from '../../context/TradingContext';
import { useToast } from '../../context/ToastContext';
import LoadingSpinner from '../../components/Common/LoadingSpinner/LoadingSpinner';
import { 
  RefreshCw, 
  Activity, 
  TrendingUp, 
  BarChart3,
  DollarSign,
  Clock,
  Zap,
  Settings,
  Bell
} from 'lucide-react';
import StatCards from '../../components/Dashboard/StatCards/StatCards';
import BotControls from '../../components/Dashboard/BotControls/BotControls';
import MarketOverview from '../../components/Dashboard/MarketOverview/MarketOverview';
import RecentTrades from '../../components/Dashboard/RecentTrades/RecentTrades';
import StrategyPerformance from '../../components/Dashboard/StrategyPerformance/StrategyPerformance';
import SignalIndicator from '../../components/Dashboard/SignalIndicator/SignalIndicator';
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
    performance,
    marketData,
    signals,
    tradeHistory
  } = useTrading();
  const { addToast } = useToast();
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState(0);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        setRefreshProgress(prev => {
          if (prev >= 100) {
            refreshAllData();
            return 0;
          }
          return prev + 1;
        });
      }, 300);

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
      {/* Top Bar - Status and Quick Actions */}
      <div className="dashboard-top-bar">
        <div className="top-bar-left">
          <div className="dashboard-title">
            <h1>Trading Dashboard</h1>
            <div className="connection-status">
              <div className={`status-dot status-${wsConnectionStatus}`} />
              <span>{wsConnectionStatus === 'connected' ? 'Live Data' : wsConnectionStatus}</span>
            </div>
          </div>
          <div className="status-indicators">
            <div className={`status-indicator ${botStatus}`}>
              <Activity size={14} />
              <span>Bot: {botStatus}</span>
            </div>
            <div className="status-indicator market-status">
              <TrendingUp size={14} />
              <span>Market: {marketData.symbol || 'R_100'}</span>
            </div>
          </div>
        </div>

        <div className="top-bar-right">
          <div className="quick-actions">
            <button className="action-btn" title="Notifications">
              <Bell size={18} />
            </button>
            <button className="action-btn" title="Settings">
              <Settings size={18} />
            </button>
            <div className="refresh-indicator">
              <button
                className="refresh-btn"
                onClick={() => handleManualRefresh('all')}
                disabled={loading}
                title="Refresh all data"
              >
                <RefreshCw size={16} className={loading ? 'spinning' : ''} />
              </button>
              <span className="last-update-text">
                Updated {formatTimeSince(lastUpdateTime)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="dashboard-main">
        {/* Left Column - Controls and Market */}
        <div className="dashboard-left-column">
          {/* Quick Stats Row */}
          <div className="quick-stats-row">
            <StatCards />
          </div>

          {/* Bot Controls Card */}
          <div className="dashboard-card">
            <div className="card-header">
              <h2>
                <Activity size={20} />
                Trading Controls
              </h2>
            </div>
            <BotControls />
          </div>

          {/* Market Overview */}
          <div className="dashboard-card">
            <div className="card-header">
              <h2>
                <TrendingUp size={20} />
                Market Overview
              </h2>
              {marketData.lastPrice && (
                <div className="current-price">
                  <span>${parseFloat(marketData.lastPrice).toFixed(4)}</span>
                </div>
              )}
            </div>
            <MarketOverview />
          </div>
        </div>

        {/* Right Column - Performance and Activity */}
        <div className="dashboard-right-column">
          {/* Performance Summary */}
          <div className="dashboard-card performance-card">
            <div className="card-header">
              <h2>
                <BarChart3 size={20} />
                Strategy Performance
              </h2>
              {performance.win_rate !== undefined && (
                <div className="performance-badge">
                  {performance.win_rate?.toFixed(1) || '0.0'}% Win Rate
                </div>
              )}
            </div>
            <StrategyPerformance />
          </div>

          {/* Recent Activity Row */}
          <div className="activity-row">
            <div className="dashboard-card">
              <div className="card-header">
                <h2>Market Signals</h2>
                <div className="signal-count">
                  {signals?.length || 0} active
                </div>
              </div>
              <SignalIndicator />
            </div>

            <div className="dashboard-card">
              <div className="card-header">
                <h2>Recent Trades</h2>
                <div className="trade-count">
                  {tradeHistory?.length || 0} total
                </div>
              </div>
              <RecentTrades />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;