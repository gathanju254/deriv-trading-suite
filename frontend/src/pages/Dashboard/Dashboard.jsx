// frontend/src/pages/Dashboard/Dashboard.jsx
// frontend/src/pages/Dashboard/Dashboard.jsx
import React from 'react';
import { useTrading } from '../../hooks/useTrading';
import LoadingSpinner from '../../components/Common/LoadingSpinner/LoadingSpinner';

// Dashboard Sections
import StatCards from '../../components/Dashboard/StatCards/StatCards';
import BotControls from '../../components/Dashboard/BotControls/BotControls';
import MarketOverview from '../../components/Dashboard/MarketOverview/MarketOverview';
import RecentTrades from '../../components/Dashboard/RecentTrades/RecentTrades';
import StrategyPerformance from '../../components/Dashboard/StrategyPerformance/StrategyPerformance';
import SignalIndicator from '../../components/Dashboard/SignalIndicator/SignalIndicator';

const Dashboard = () => {
  const { loading, performance } = useTrading();

  /* -------------------------------------------------
     Initial loading (no data yet)
  -------------------------------------------------- */
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
    <div className="space-y-8">
      {/* =================================================
         TOP PERFORMANCE SNAPSHOT
      ================================================= */}
      <section>
        <StatCards />
      </section>

      {/* =================================================
         CONTROLS & MARKET OVERVIEW
      ================================================= */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trading Controls */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 md:p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-white">
              Trading Controls
            </h2>
            <span className="text-xs px-2 py-1 rounded-md bg-gray-800 text-gray-400">
              Real-time
            </span>
          </div>
          <BotControls />
        </div>

        {/* Market Overview */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 md:p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-white">
              Market Overview
            </h2>
            <span className="text-xs px-2 py-1 rounded-md bg-gray-800 text-gray-400">
              Live
            </span>
          </div>
          <MarketOverview />
        </div>
      </section>

      {/* =================================================
         STRATEGY PERFORMANCE
      ================================================= */}
      <section className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 md:p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-white">
            Strategy Performance
          </h2>
          <span className="text-xs px-2 py-1 rounded-md bg-gray-800 text-gray-400">
            Historical
          </span>
        </div>
        <StrategyPerformance />
      </section>

      {/* =================================================
         SIGNALS & RECENT TRADES
      ================================================= */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Market Signals */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 md:p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-white">
              Market Signals
            </h2>
            <span className="text-xs px-2 py-1 rounded-md bg-gray-800 text-gray-400">
              Active
            </span>
          </div>
          <SignalIndicator />
        </div>

        {/* Recent Trades */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 md:p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-white">
              Recent Trades
            </h2>
            <span className="text-xs px-2 py-1 rounded-md bg-gray-800 text-gray-400">
              Last 24h
            </span>
          </div>
          <RecentTrades />
        </div>
      </section>

      {/* =================================================
         SYSTEM STATUS SUMMARY
      ================================================= */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Bot Status', value: 'Running', pulse: 'bg-green-500' },
          { label: 'WebSocket', value: 'Connected', pulse: 'bg-green-500' },
          { label: 'Active Signals', value: '12' },
          { label: 'Last Update', value: '2 min ago' },
        ].map(({ label, value, pulse }) => (
          <div
            key={label}
            className="bg-gray-900/30 border border-gray-800/50 rounded-lg p-3 text-center"
          >
            <div className="text-xs text-gray-400 mb-1">{label}</div>
            <div className="flex items-center justify-center gap-2">
              {pulse && (
                <span
                  className={`w-2 h-2 rounded-full ${pulse} animate-pulse`}
                />
              )}
              <span className="text-sm font-medium text-white">
                {value}
              </span>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
};

export default Dashboard;
