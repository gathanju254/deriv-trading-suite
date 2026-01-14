// frontend/src/components/Dashboard/StrategyPerformance/StrategyPerformance.jsx
// frontend/src/components/Dashboard/StrategyPerformance/StrategyPerformance.jsx
import React from 'react';
import { useTrading } from '../../../hooks/useTrading';
import { TrendingUp, Target, Activity, Shield, Zap, TrendingDown } from 'lucide-react';

const StrategyPerformance = () => {
  const { performance } = useTrading();

  // Normalize and format performance data
  const metrics = {
    totalProfit: performance?.total_profit || performance?.pnl || 0,
    winRate: performance?.win_rate || 0,
    totalTrades: performance?.total_trades || 0,
    winningTrades: performance?.winning_trades || 0,
    activeTrades: performance?.active_trades || 0,
    sharpeRatio: performance?.sharpe_ratio || 0,
    maxDrawdown: performance?.max_drawdown || 0,
    dailyPnl: performance?.daily_pnl || 0,
    profitFactor: performance?.profit_factor || 0,
    avgProfit: performance?.avg_profit || 0
  };

  const mainCards = [
    {
      id: 'pnl',
      title: 'Total P&L',
      value: `$${metrics.totalProfit.toFixed(2)}`,
      icon: TrendingUp,
      color: metrics.totalProfit >= 0 ? 'text-green-500' : 'text-red-500',
      subValue: `Daily: $${metrics.dailyPnl.toFixed(2)}`
    },
    {
      id: 'winrate',
      title: 'Win Rate',
      value: `${metrics.winRate.toFixed(1)}%`,
      icon: Target,
      color: metrics.winRate >= 70 ? 'text-green-500' : metrics.winRate >= 50 ? 'text-yellow-500' : 'text-red-500',
      subValue: `${metrics.winningTrades}/${metrics.totalTrades} trades`
    },
    {
      id: 'activity',
      title: 'Activity',
      value: metrics.totalTrades,
      icon: Activity,
      color: 'text-blue-500',
      subValue: `${metrics.activeTrades} active`
    },
    {
      id: 'risk',
      title: 'Risk',
      value: metrics.sharpeRatio.toFixed(2),
      icon: Shield,
      color: metrics.sharpeRatio > 1 ? 'text-purple-500' : 'text-gray-400',
      subValue: `DD: ${metrics.maxDrawdown.toFixed(1)}%`
    }
  ];

  const detailStats = [
    { label: 'Profit Factor', value: metrics.profitFactor.toFixed(2), icon: Zap, color: 'text-green-500' },
    { label: 'Avg Profit', value: `$${metrics.avgProfit.toFixed(2)}`, icon: TrendingUp, color: 'text-blue-500' },
    { label: 'Active Positions', value: metrics.activeTrades, icon: Activity, color: 'text-yellow-500' }
  ];

  return (
    <div className="space-y-6">
      {/* Main Performance Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {mainCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.id} className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-400">{card.title}</span>
                <div className={`p-2 rounded-lg ${card.color.replace('text-', 'bg-')}/10`}>
                  <Icon size={16} className={card.color} />
                </div>
              </div>
              
              <div className={`text-2xl font-bold ${card.color} mb-1`}>
                {card.value}
              </div>
              
              <div className="text-sm text-gray-400">
                {card.subValue}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed Stats */}
      <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {detailStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.color.replace('text-', 'bg-')}/10`}>
                  <Icon size={16} className={stat.color} />
                </div>
                <div>
                  <div className="text-sm text-gray-400">{stat.label}</div>
                  <div className="text-lg font-semibold text-white">{stat.value}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Insights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
          <div className="text-sm text-gray-400 mb-2">Performance Trend</div>
          <div className="flex items-center gap-2">
            <TrendingUp className="text-green-500" size={20} />
            <div className="flex-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Last 7 days</span>
                <span className="text-green-500">+{metrics.dailyPnl.toFixed(2)}%</span>
              </div>
              <div className="h-1 bg-gray-800 rounded-full mt-1 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full"
                  style={{ width: `${Math.min(metrics.winRate, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
          <div className="text-sm text-gray-400 mb-2">Risk Level</div>
          <div className="flex items-center gap-2">
            <Shield className={metrics.sharpeRatio > 1 ? "text-green-500" : "text-yellow-500"} size={20} />
            <div className="flex-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Sharpe Ratio</span>
                <span className={metrics.sharpeRatio > 1 ? "text-green-500" : "text-yellow-500"}>
                  {metrics.sharpeRatio.toFixed(2)}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {metrics.sharpeRatio > 1 ? 'Good risk-adjusted returns' : 'Moderate risk profile'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StrategyPerformance;