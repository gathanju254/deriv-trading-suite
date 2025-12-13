// frontend/src/components/Dashboard/StrategyPerformance/StrategyPerformance.jsx

import React from 'react';
import { useTrading } from '../../../context/TradingContext';
import { TrendingUp, TrendingDown, Target, Activity, PieChart, Shield, Zap } from 'lucide-react';
import './StrategyPerformance.css';

const safeNum = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const toPercent = (v) => {
  // Backend may already return percent (e.g. 50.46) or ratio (0.5).
  if (v === null || v === undefined) return 0;
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return n <= 1 && n >= 0 ? n * 100 : n;
};

const normalizePerformance = (p = {}) => {
  const totalProfit = safeNum(p.pnl ?? p.total_profit ?? p.totalProfit ?? p.profit ?? 0);
  const avgProfit = safeNum(p.avg_profit ?? p.avgProfit ?? 0);
  
  // These now come directly from backend!
  const profitFactorRaw = p.profit_factor ?? p.profitFactor ?? null;
  const bestDayRaw = p.best_day ?? p.bestDay ?? null;
  const worstDayRaw = p.worst_day ?? p.worstDay ?? null;

  return {
    totalProfit,
    winRate: toPercent(p.win_rate ?? p.winRate ?? p.win_percent ?? 0),
    totalTrades: safeNum(p.total_trades ?? p.completed_trades ?? p.totalTrades ?? 0),
    winningTrades: safeNum(p.winning_trades ?? p.won_trades ?? p.wins ?? 0),
    activeTrades: safeNum(p.active_trades ?? p.activeTrades ?? 0),
    avgTradesPerDay: safeNum(p.avg_trades_per_day ?? p.avgTradesPerDay ?? 0),
    sharpe: safeNum(p.sharpe_ratio ?? p.sharpe ?? p.sharpeRatio ?? 0),
    maxDrawdown: safeNum(p.max_drawdown ?? p.maxDrawdown ?? p.max_drawdown_percent ?? 0),
    volatility: safeNum(p.volatility ?? p.volatiltiy ?? 0),
    dailyPnl: safeNum(p.daily_pnl ?? p.dailyPnl ?? p.daily_profit ?? 0),
    monthlyPnl: safeNum(p.monthly_pnl ?? p.monthlyPnl ?? 0),
    avgProfit,
    // These are now numbers or null - much cleaner!
    profitFactor: profitFactorRaw !== null && profitFactorRaw !== undefined ? safeNum(profitFactorRaw, 1) : null,
    bestDay: bestDayRaw !== null && bestDayRaw !== undefined ? safeNum(bestDayRaw, 0) : null,
    worstDay: worstDayRaw !== null && worstDayRaw !== undefined ? safeNum(worstDayRaw, 0) : null
  };
};

const StrategyPerformance = () => {
  const { performance: raw } = useTrading();
  const performance = normalizePerformance(raw);

  const strategyMetrics = [
    {
      id: 'overall_performance',
      title: 'Total P&L',
      value: `$${performance.totalProfit.toFixed(2)}`,
      trend: performance.totalProfit >= 0 ? 'up' : 'down',
      icon: TrendingUp,
      color: performance.totalProfit >= 0 ? 'success' : 'error',
      details: [
        { label: 'Daily', value: `$${performance.dailyPnl.toFixed(2)}` },
        { label: 'Monthly', value: `$${performance.monthlyPnl.toFixed(2)}` }
      ]
    },
    {
      id: 'accuracy',
      title: 'Win Rate',
      value: `${performance.winRate.toFixed(1)}%`,
      trend: performance.winRate >= 50 ? 'up' : 'down',
      icon: Target,
      color: performance.winRate >= 50 ? 'success' : performance.winRate >= 40 ? 'warning' : 'error',
      details: [
        { label: 'Wins', value: performance.winningTrades },
        { label: 'Total', value: performance.totalTrades }
      ]
    },
    {
      id: 'trades',
      title: 'Total Trades',
      value: `${performance.totalTrades || 0}`,
      trend: 'neutral',
      icon: Activity,
      color: 'info',
      details: [
        { label: 'Active', value: performance.activeTrades },
        { label: 'Daily Avg', value: performance.avgTradesPerDay.toFixed(1) }
      ]
    },
    {
      id: 'risk_metrics',
      title: 'Sharpe Ratio',
      value: performance.sharpe.toFixed(2),
      trend: performance.sharpe >= 1 ? 'up' : 'down',
      icon: Shield,
      color: performance.sharpe >= 1 ? 'success' : performance.sharpe >= 0.5 ? 'warning' : 'error',
      details: [
        { label: 'Max Drawdown', value: `${performance.maxDrawdown.toFixed(1)}%` },
        { label: 'Volatility', value: `${performance.volatility.toFixed(1)}%` }
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

      {/* Additional Performance Stats - FIXED */}
      <div className="performance-stats">
        <div className="stat-item">
          <div className="stat-icon">
            <Zap size={16} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Best Day</span>
            <span className="stat-value positive">
              {performance.bestDay !== null ? `+$${performance.bestDay.toFixed(2)}` : '—'}
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
              {performance.worstDay !== null ? `-$${Math.abs(performance.worstDay).toFixed(2)}` : '—'}
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
              {performance.profitFactor !== null ? performance.profitFactor.toFixed(2) : 'N/A'}
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
              ${performance.avgProfit.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StrategyPerformance;