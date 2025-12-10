// frontend/src/components/Dashboard/StatCards/StatCards.jsx
import React from 'react';
import { useTrading } from '../../../context/TradingContext';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Percent,
  BarChart3,
  Target,
  Shield,
  Clock
} from 'lucide-react';
import './StatCards.css';

const StatCards = () => {
  const { performance } = useTrading();

  // Debug: inspect incoming performance object
  console.debug('StatCards performance', performance);

  // Normalize / fallback field names returned by backend / services
  const totalProfit = performance?.total_profit ?? performance?.total_pnl ?? performance?.pnl ?? performance?.profit ?? 0;
  const winRate = performance?.win_rate ?? performance?.winrate ?? performance?.winRatio ?? performance?.win_percent ?? 0;
  const totalTrades = performance?.total_trades ?? performance?.totalTrades ?? performance?.trades ?? 0;
  const sharpe = performance?.sharpe_ratio ?? performance?.sharpe ?? performance?.sharpeRatio ?? 0;

  const cards = [
    {
      id: 'total_profit',
      title: 'Total P&L',
      value: `$${parseFloat(totalProfit).toFixed(2)}`,
      icon: DollarSign,
      color: totalProfit >= 0 ? 'green' : 'red',
      change: null
    },
    {
      id: 'win_rate',
      title: 'Win Rate',
      value: `${parseFloat(winRate || 0).toFixed(1)}%`,
      icon: Percent,
      color: 'blue',
      change: null
    },
    {
      id: 'total_trades',
      title: 'Total Trades',
      value: totalTrades || '0',
      icon: BarChart3,
      color: 'purple',
      change: null
    },
    {
      id: 'sharpe_ratio',
      title: 'Sharpe Ratio',
      value: parseFloat(sharpe || 0).toFixed(2),
      icon: Target,
      color: 'orange',
      change: null
    }
  ];

  return (
    <div className="stat-cards">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.id} className={`stat-card ${card.color}`}>
            <div className="stat-icon">
              <Icon size={24} />
            </div>
            <div className="stat-content">
              <h3>{card.title}</h3>
              <div className="stat-value">{card.value}</div>
              {card.change !== null && (
                <div className={`stat-change ${card.change >= 0 ? 'positive' : 'negative'}`}>
                  {card.change >= 0 ? '+' : ''}{card.change}%
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StatCards;