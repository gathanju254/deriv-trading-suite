// frontend/src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useTrading } from '../../hooks/useTrading';
import { useToast } from '../../context/ToastContext';

import StatCards from '../../components/Dashboard/StatCards/StatCards';
import BotControls from '../../components/Dashboard/BotControls/BotControls';
import MarketOverview from '../../components/Dashboard/MarketOverview/MarketOverview';
import RecentTrades from '../../components/Dashboard/RecentTrades/RecentTrades';
import StrategyPerformance from '../../components/Dashboard/StrategyPerformance/StrategyPerformance';
import SignalIndicator from '../../components/Dashboard/SignalIndicator/SignalIndicator';
import LoadingSpinner from '../../components/Common/LoadingSpinner/LoadingSpinner';

const Dashboard = () => {
  const {
    loading,
    performance,
    marketData,
    signals,
    tradeHistory,
  } = useTrading();

  const { addToast } = useToast();

  // Only show loading overlay if no data yet
  if (loading && !performance?.total_trades) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-900">
        <LoadingSpinner size="xl" text="Loading trading dashboard..." fullScreen />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen flex flex-col gap-6 md:gap-8 p-4 md:p-6">

      {/* ================= STAT CARDS ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCards />
      </div>

      {/* ================= CONTROLS + MARKET OVERVIEW ================= */}
      <div className="flex flex-col lg:flex-row gap-4">

        {/* Bot Controls */}
        <div className="flex-1 bg-gray-900/80 border border-gray-800 rounded-2xl p-4 flex flex-col gap-4 shadow-lg">
          <h2 className="text-lg font-semibold mb-2">Trading Controls</h2>
          <BotControls />
        </div>

        {/* Market Overview */}
        <div className="flex-1 bg-gray-900/80 border border-gray-800 rounded-2xl p-4 flex flex-col gap-4 shadow-lg">
          <h2 className="text-lg font-semibold mb-2">Market Overview</h2>
          <MarketOverview />
        </div>
      </div>

      {/* ================= STRATEGY PERFORMANCE ================= */}
      <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-4 flex flex-col gap-4 shadow-lg">
        <h2 className="text-lg font-semibold mb-2">Strategy Performance</h2>
        <StrategyPerformance />
      </div>

      {/* ================= SIGNALS + RECENT TRADES ================= */}
      <div className="flex flex-col lg:flex-row gap-4">

        {/* Market Signals */}
        <div className="flex-1 bg-gray-900/80 border border-gray-800 rounded-2xl p-4 flex flex-col gap-4 shadow-lg">
          <h2 className="text-lg font-semibold mb-2">Market Signals</h2>
          <SignalIndicator />
        </div>

        {/* Recent Trades */}
        <div className="flex-1 bg-gray-900/80 border border-gray-800 rounded-2xl p-4 flex flex-col gap-4 shadow-lg">
          <h2 className="text-lg font-semibold mb-2">Recent Trades</h2>
          <RecentTrades />
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
