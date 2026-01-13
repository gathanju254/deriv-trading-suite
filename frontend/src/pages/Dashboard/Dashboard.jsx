// frontend/src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useTrading } from '../../hooks/useTrading';
import { useToast } from '../../context/ToastContext';
import LoadingSpinner from '../../components/Common/LoadingSpinner/LoadingSpinner';
import {
  RefreshCw,
  Activity,
  BarChart3,
  Clock,
  Settings,
  Bell,
  Play,
  StopCircle,
} from 'lucide-react';

import StatCards from '../../components/Dashboard/StatCards/StatCards';
import BotControls from '../../components/Dashboard/BotControls/BotControls';
import MarketOverview from '../../components/Dashboard/MarketOverview/MarketOverview';
import RecentTrades from '../../components/Dashboard/RecentTrades/RecentTrades';
import StrategyPerformance from '../../components/Dashboard/StrategyPerformance/StrategyPerformance';
import SignalIndicator from '../../components/Dashboard/SignalIndicator/SignalIndicator';

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
    stopBot,
  } = useTrading();

  const { addToast } = useToast();
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState(0);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      setRefreshProgress(prev => {
        if (prev >= 100) {
          refreshAllData();
          return 0;
        }
        return prev + 1;
      });
    }, 300);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshAllData]);

  const handleManualRefresh = async (type = 'all') => {
    try {
      if (type === 'performance') {
        await refreshPerformance();
        addToast('Performance refreshed', 'success', 2000);
      } else if (type === 'trades') {
        await refreshTradeHistory();
        addToast('Trades refreshed', 'success', 2000);
      } else {
        await refreshAllData();
        addToast('All data refreshed', 'success', 2000);
      }
    } catch {
      addToast('Refresh failed', 'error');
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
    } catch {
      addToast('Bot action failed', 'error');
    }
  };

  const formatTimeSince = timestamp => {
    if (!timestamp) return '—';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  if (loading && !performance?.total_trades) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-900">
        <LoadingSpinner size="xl" text="Loading trading dashboard..." fullScreen />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gray-950 text-gray-100 flex flex-col">

      {/* ================= HEADER ================= */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between px-4 md:px-6 py-4 bg-gray-900/50 backdrop-blur-sm border-b border-gray-800">
        {/* Title & Status */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Trading Dashboard
          </h1>
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <span className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${wsConnectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
              {wsConnectionStatus === 'connected' ? 'Live' : wsConnectionStatus}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={14} />
              Updated {formatTimeSince(lastUpdateTime)}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 mt-3 md:mt-0">
          <button
            className={`flex items-center gap-1 px-3 py-1 rounded-lg font-semibold transition-colors ${botStatus === 'running' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
            onClick={handleQuickBotToggle}
            disabled={loading}
          >
            {botStatus === 'running' ? <StopCircle size={16} /> : <Play size={16} />}
            {botStatus === 'running' ? 'Stop Bot' : 'Start Bot'}
          </button>

          <button
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors relative"
            onClick={() => handleManualRefresh('all')}
            disabled={loading}
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            {autoRefresh && (
              <div className="absolute bottom-0 left-0 h-1 bg-blue-500 transition-all duration-300" style={{ width: `${refreshProgress}%` }} />
            )}
          </button>

          <button className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors">
            <Bell size={18} />
          </button>
          <button className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors">
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* ================= CONTENT ================= */}
      <div className="flex-1 p-4 md:p-6 flex flex-col gap-6 md:gap-8">

        {/* STAT CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCards />
        </div>

        {/* CONTROLS + MARKET */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Bot Controls */}
          <div className="flex-1 bg-gray-900/80 border border-gray-800 rounded-2xl p-4 flex flex-col gap-4 shadow-lg">
            <div className="flex justify-between items-center mb-2">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Activity size={20} /> Trading Controls
              </h2>
              <span className={`font-semibold ${botStatus === 'running' ? 'text-green-400' : 'text-red-400'}`}>
                {botStatus === 'running' ? '🟢 ACTIVE' : '🔴 STOPPED'}
              </span>
            </div>
            <BotControls />
          </div>

          {/* Market Overview */}
          <div className="flex-1 bg-gray-900/80 border border-gray-800 rounded-2xl p-4 flex flex-col gap-4 shadow-lg">
            <div className="flex justify-between items-center mb-2">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <BarChart3 size={20} /> Market Overview
              </h2>
              <span className={`flex items-center gap-1 text-sm ${wsConnectionStatus === 'connected' ? 'text-green-400' : 'text-red-400'}`}>
                <div className={`w-2 h-2 rounded-full ${wsConnectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
                {wsConnectionStatus === 'connected' ? 'Live' : wsConnectionStatus}
              </span>
            </div>
            <MarketOverview />
          </div>
        </div>

        {/* Strategy Performance */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-4 flex flex-col gap-4 shadow-lg">
          <div className="flex justify-between items-center mb-2">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <BarChart3 size={20} /> Strategy Performance
            </h2>
            {performance.win_rate !== undefined && (
              <span className="text-green-400 font-bold">{performance.win_rate.toFixed(1)}% Win Rate</span>
            )}
          </div>
          <StrategyPerformance />
        </div>

        {/* Signals + Trades */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 bg-gray-900/80 border border-gray-800 rounded-2xl p-4 flex flex-col gap-4 shadow-lg">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold">Market Signals</h2>
              <span className="text-sm text-gray-400">{signals?.length || 0} active</span>
            </div>
            <SignalIndicator />
          </div>

          <div className="flex-1 bg-gray-900/80 border border-gray-800 rounded-2xl p-4 flex flex-col gap-4 shadow-lg">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold">Recent Trades</h2>
              <span className="text-sm text-gray-400">{tradeHistory?.length || 0} total</span>
            </div>
            <RecentTrades />
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
