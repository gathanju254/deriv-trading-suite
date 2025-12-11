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
  Clock,
  Zap,
  Settings,
  Bell,
  Play,
  StopCircle
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
    tradeHistory,
    startBot,
    stopBot
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

  const handleQuickBotToggle = async () => {
    try {
      if (botStatus === 'running') {
        await stopBot();
        addToast('Bot stopped', 'success');
      } else {
        await startBot();
        addToast('Bot started', 'success');
      }
    } catch (error) {
      addToast(`Failed to ${botStatus === 'running' ? 'stop' : 'start'} bot`, 'error');
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
      {/* Top Header Bar */}
      <div className="dashboard-header">
        <div className="header-left">
          <div className="header-title">
            <h1>Trading Dashboard</h1>
            <div className="header-subtitle">
              <span className={`connection-status ${wsConnectionStatus}`}>
                <div className="status-dot" />
                {wsConnectionStatus === 'connected' ? 'Live' : wsConnectionStatus}
              </span>
              <span className="last-update">
                <Clock size={14} />
                Updated {formatTimeSince(lastUpdateTime)}
              </span>
            </div>
          </div>
        </div>

        <div className="header-right">
          {/* Quick Bot Toggle */}
          <button
            className={`quick-bot-toggle ${botStatus}`}
            onClick={handleQuickBotToggle}
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

          {/* Refresh Control */}
          <div className="refresh-control">
            <button
              className="refresh-btn"
              onClick={() => handleManualRefresh('all')}
              disabled={loading}
              title="Refresh all data"
            >
              <RefreshCw size={18} className={loading ? 'spinning' : ''} />
            </button>
            {autoRefresh && (
              <div className="refresh-progress">
                <div 
                  className="progress-bar" 
                  style={{ width: `${refreshProgress}%` }}
                />
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="quick-actions">
            <button className="action-btn" title="Notifications">
              <Bell size={18} />
            </button>
            <button className="action-btn" title="Settings">
              <Settings size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <div className="dashboard-content">
        
        {/* Top Section: Stats Row */}
        <div className="stats-section">
          <StatCards />
        </div>

        {/* Middle Section: Controls & Market */}
        <div className="controls-market-section">
          {/* Left: Bot Controls */}
          <div className="controls-card">
            <div className="section-header">
              <h2>
                <Activity size={20} />
                Trading Controls
              </h2>
              <div className={`bot-status ${botStatus}`}>
                {botStatus === 'running' ? '🟢 ACTIVE' : '🔴 STOPPED'}
              </div>
            </div>
            <BotControls />
          </div>

          {/* Right: Market Overview */}
          <div className="market-card">
            <div className="section-header">
              <h2>
                <TrendingUp size={20} />
                Market Overview
              </h2>
              {marketData.lastPrice && (
                <div className="market-price">
                  <span className="price">${parseFloat(marketData.lastPrice).toFixed(4)}</span>
                  <span className="symbol">{marketData.symbol || 'R_100'}</span>
                </div>
              )}
            </div>
            <MarketOverview />
          </div>
        </div>

        {/* Bottom Section: Performance & Activity */}
        <div className="performance-activity-section">
          {/* Performance Card */}
          <div className="performance-card">
            <div className="section-header">
              <h2>
                <BarChart3 size={20} />
                Strategy Performance
              </h2>
              {performance.win_rate !== undefined && (
                <div className="win-rate-badge">
                  {performance.win_rate?.toFixed(1) || '0.0'}% Win Rate
                </div>
              )}
            </div>
            <StrategyPerformance />
          </div>

          {/* Activity Cards Row */}
          <div className="activity-cards-row">
            <div className="signals-card">
              <div className="section-header">
                <h2>Market Signals</h2>
                <div className="signal-count">
                  {signals?.length || 0} active
                </div>
              </div>
              <SignalIndicator />
            </div>

            <div className="trades-card">
              <div className="section-header">
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