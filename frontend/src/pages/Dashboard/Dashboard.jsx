// frontend/src/pages/Dashboard.jsx
// frontend/src/pages/Dashboard/Dashboard.jsx
import React from 'react';
import { useTrading } from '../../hooks/useTrading';
import LoadingSpinner from '../../components/Common/LoadingSpinner/LoadingSpinner';

// Dashboard Components
import StatCards from '../../components/Dashboard/StatCards/StatCards';
import BotControls from '../../components/Dashboard/BotControls/BotControls';
import MarketOverview from '../../components/Dashboard/MarketOverview/MarketOverview';
import RecentTrades from '../../components/Dashboard/RecentTrades/RecentTrades';
import StrategyPerformance from '../../components/Dashboard/StrategyPerformance/StrategyPerformance';
import SignalIndicator from '../../components/Dashboard/SignalIndicator/SignalIndicator';

const Dashboard = () => {
  const { loading, performance } = useTrading();

  // Show loading spinner only during initial load with no data
  if (loading && !performance?.total_trades) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner 
          size="xl" 
          text="Loading dashboard..." 
          type="trading"
          theme="blue"
          fullScreen={false}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Performance Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCards />
      </div>

      {/* Control Panels Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trading Controls */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Trading Controls</h2>
            <span className="text-xs px-2 py-1 bg-gray-800 rounded text-gray-400">
              Real-time
            </span>
          </div>
          <BotControls />
        </div>

        {/* Market Overview */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Market Overview</h2>
            <span className="text-xs px-2 py-1 bg-gray-800 rounded text-gray-400">
              Live
            </span>
          </div>
          <MarketOverview />
        </div>
      </div>

      {/* Strategy Performance */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Strategy Performance</h2>
          <span className="text-xs px-2 py-1 bg-gray-800 rounded text-gray-400">
            Historical
          </span>
        </div>
        <StrategyPerformance />
      </div>

      {/* Signals & Trades Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Market Signals */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Market Signals</h2>
            <span className="text-xs px-2 py-1 bg-gray-800 rounded text-gray-400">
              Active
            </span>
          </div>
          <SignalIndicator />
        </div>

        {/* Recent Trades */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Recent Trades</h2>
            <span className="text-xs px-2 py-1 bg-gray-800 rounded text-gray-400">
              Last 24h
            </span>
          </div>
          <RecentTrades />
        </div>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-900/30 border border-gray-800/50 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-400 mb-1">Bot Status</div>
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-sm font-medium text-white">Running</span>
          </div>
        </div>
        
        <div className="bg-gray-900/30 border border-gray-800/50 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-400 mb-1">WebSocket</div>
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-sm font-medium text-white">Connected</span>
          </div>
        </div>
        
        <div className="bg-gray-900/30 border border-gray-800/50 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-400 mb-1">Active Signals</div>
          <div className="text-sm font-medium text-white">12</div>
        </div>
        
        <div className="bg-gray-900/30 border border-gray-800/50 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-400 mb-1">Last Update</div>
          <div className="text-sm font-medium text-white">2 min ago</div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;