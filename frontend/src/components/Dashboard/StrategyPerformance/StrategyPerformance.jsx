// frontend/src/components/Dashboard/StrategyPerformance/StrategyPerformance.jsx

import React from 'react';
import { useTrading } from '../../../context/TradingContext';
import { TrendingUp, TrendingDown, Target, Activity, PieChart, Shield, Zap } from 'lucide-react';
import './StrategyPerformance.css';

const StrategyPerformance = () => {
  const { performance } = useTrading();
  
  const strategyMetrics = [
    {
      id: 'overall_performance',
      title: 'Total P&L',
      value: `$${performance.pnl?.toFixed(2) || '0.00'}`,
      trend: performance.pnl >= 0 ? 'up' : 'down',
      icon: TrendingUp,
      color: performance.pnl >= 0 ? 'success' : 'error',
      details: [
        { label: 'Daily', value: `$${performance.daily_pnl?.toFixed(2) || '0.00'}` },
        { label: 'Monthly', value: `$${performance.monthly_pnl?.toFixed(2) || '0.00'}` }
      ]
    },
    {
      id: 'accuracy',
      title: 'Win Rate',
      value: `${performance.win_rate?.toFixed(1) || '0.0'}%`,
      trend: performance.win_rate >= 50 ? 'up' : 'down',
      icon: Target,
      color: performance.win_rate >= 50 ? 'success' : performance.win_rate >= 40 ? 'warning' : 'error',
      details: [
        { label: 'Wins', value: performance.winning_trades || 0 },
        { label: 'Total', value: performance.completed_trades || 0 }
      ]
    },
    {
      id: 'trades',
      title: 'Total Trades',
      value: performance.total_trades || '0',
      trend: 'neutral',
      icon: Activity,
      color: 'info',
      details: [
        { label: 'Active', value: performance.active_trades || '0' },
        { label: 'Daily Avg', value: performance.avg_trades_per_day?.toFixed(1) || '0.0' }
      ]
    },
    {
      id: 'risk_metrics',
      title: 'Sharpe Ratio',
      value: performance.sharpe_ratio?.toFixed(2) || '0.00',
      trend: performance.sharpe_ratio >= 1 ? 'up' : 'down',
      icon: Shield,
      color: performance.sharpe_ratio >= 1 ? 'success' : performance.sharpe_ratio >= 0.5 ? 'warning' : 'error',
      details: [
        { label: 'Max Drawdown', value: `${performance.max_drawdown?.toFixed(1) || '0.0'}%` },
        { label: 'Volatility', value: `${performance.volatility?.toFixed(1) || '0.0'}%` }
      ]
    }
  ];

  const getTrendIcon = (trend) => {
    if (trend === 'up') return <TrendingUp size={16} className="trend-up" />;
    if (trend === 'down') return <TrendingDown size={16} className="trend-down" />;
    return null;
  };

  return (
    <div className="strategy-performance">
      <div className="performance-header">
        <h2>
          <PieChart size={20} />
          Performance Overview
        </h2>
      </div>

      <div className="metrics-grid">
        {strategyMetrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.id} className={`metric-card ${metric.color}`}>
              <div className="metric-header">
                <div className="metric-icon">
                  <Icon size={20} />
                </div>
                <div className="metric-title">
                  <h3>{metric.title}</h3>
                  <div className="metric-trend">
                    {getTrendIcon(metric.trend)}
                  </div>
                </div>
              </div>
              
              <div className="metric-main">
                <div className="metric-value">{metric.value}</div>
                <div className="metric-details">
                  {metric.details.map((detail, index) => (
                    <div key={index} className="detail-item">
                      <span className="detail-label">{detail.label}</span>
                      <span className="detail-value">{detail.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Additional Performance Stats */}
      <div className="performance-stats">
        <div className="stat-item">
          <div className="stat-icon">
            <Zap size={16} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Best Day</span>
            <span className="stat-value positive">
              +${performance.best_day?.toFixed(2) || '0.00'}
            </span>
          </div>
        </div>
        
        <div className="stat-item">
          <div className="stat-icon">
            <TrendingDown size={16} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Worst Day</span>
            <span className="stat-value negative">
              -${Math.abs(performance.worst_day || 0).toFixed(2)}
            </span>
          </div>
        </div>
        
        <div className="stat-item">
          <div className="stat-icon">
            <Target size={16} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Profit Factor</span>
            <span className="stat-value">
              {performance.profit_factor?.toFixed(2) || '1.00'}
            </span>
          </div>
        </div>
        
        <div className="stat-item">
          <div className="stat-icon">
            <Activity size={16} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Avg Profit</span>
            <span className="stat-value">
              ${performance.avg_profit?.toFixed(2) || '0.00'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StrategyPerformance;