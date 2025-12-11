// frontend/src/components/Dashboard/StatCards/StatCards.jsx
import React, { useEffect, useState } from 'react';
import { useTrading } from '../../../context/TradingContext';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Percent,
  BarChart3,
  Target
} from 'lucide-react';
import './StatCards.css';

const StatCards = () => {
  const { performance } = useTrading();
  const [normalizedData, setNormalizedData] = useState({});

  useEffect(() => {
    console.debug('📊 StatCards received performance:', performance);

    // Normalize data from backend response
    // Try multiple field name variations
    const normalized = {
      totalProfit: 
        performance?.total_profit ?? 
        performance?.pnl ?? 
        performance?.profit ?? 
        0,
      
      winRate: 
        performance?.win_rate ?? 
        performance?.win_percent ?? 
        0,
      
      totalTrades: 
        performance?.total_trades ?? 
        performance?.completed_trades ?? 
        0,
      
      sharpeRatio: 
        performance?.sharpe_ratio ?? 
        performance?.sharpe ?? 
        0
    };

    setNormalizedData(normalized);
    
    console.debug('📊 Normalized data:', normalized);
  }, [performance]);

  const cards = [
    {
      id: 'total_profit',
      title: 'Total P&L',
      value: `$${parseFloat(normalizedData.totalProfit || 0).toFixed(2)}`,
      icon: DollarSign,
      color: (normalizedData.totalProfit || 0) >= 0 ? 'green' : 'red'
    },
    {
      id: 'win_rate',
      title: 'Win Rate',
      value: `${parseFloat(normalizedData.winRate || 0).toFixed(1)}%`,
      icon: Percent,
      color: 'blue'
    },
    {
      id: 'total_trades',
      title: 'Total Trades',
      value: normalizedData.totalTrades?.toString() || '0',
      icon: BarChart3,
      color: 'purple'
    },
    {
      id: 'sharpe_ratio',
      title: 'Sharpe Ratio',
      value: parseFloat(normalizedData.sharpeRatio || 0).toFixed(2),
      icon: Target,
      color: 'orange'
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
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StatCards;