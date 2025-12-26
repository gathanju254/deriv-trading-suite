// frontend/src/components/Dashboard/StatCards/StatCards.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useTrading } from '../../../hooks/useTrading';

import { 
  DollarSign, 
  Percent,
  BarChart3,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Zap
} from 'lucide-react';
import './StatCards.css';

const StatCards = () => {
  const { performance, wsConnectionStatus } = useTrading();
  const [normalizedData, setNormalizedData] = useState({});
  const [prevData, setPrevData] = useState({});
  const [updatedCard, setUpdatedCard] = useState(null);
  const [realtimeMode, setRealtimeMode] = useState(false);
  const prevPerformanceRef = useRef({});

  useEffect(() => {
    // Check if WebSocket is connected
    setRealtimeMode(wsConnectionStatus === 'connected');
    
    // Normalize data from backend response
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
        0,
      
      dailyPnl: 
        performance?.daily_pnl ?? 
        performance?.daily_profit ?? 
        0
    };

    // Detect which card was updated
    let updatedCardId = null;
    if (prevPerformanceRef.current) {
      const prev = prevPerformanceRef.current;
      
      if (prev.total_profit !== performance?.total_profit) {
        updatedCardId = 'total_profit';
      } else if (prev.win_rate !== performance?.win_rate) {
        updatedCardId = 'win_rate';
      } else if (prev.total_trades !== performance?.total_trades) {
        updatedCardId = 'total_trades';
      } else if (prev.sharpe_ratio !== performance?.sharpe_ratio) {
        updatedCardId = 'sharpe_ratio';
      }
    }

    // Store previous performance for comparison
    prevPerformanceRef.current = { ...performance };

    // Calculate changes
    const changes = {};
    Object.keys(normalized).forEach(key => {
      changes[key] = prevData[key] ? normalized[key] - prevData[key] : 0;
    });

    setPrevData(normalized);
    setNormalizedData({ ...normalized, changes });
    
    // If a card was updated, trigger animation
    if (updatedCardId) {
      setUpdatedCard(updatedCardId);
      setTimeout(() => setUpdatedCard(null), 500); // Clear after animation
    }
  }, [performance, wsConnectionStatus]);

  // Add pulse animation when data updates
  useEffect(() => {
    if (updatedCard) {
      const cardElement = document.querySelector(`.stat-card[data-card-id="${updatedCard}"]`);
      if (cardElement) {
        cardElement.classList.add('updated');
        setTimeout(() => {
          cardElement.classList.remove('updated');
        }, 400);
      }
    }
  }, [updatedCard]);

  const formatChange = (value) => {
    if (value > 0) return `+${value.toFixed(2)}`;
    if (value < 0) return `${value.toFixed(2)}`;
    return '0.00';
  };

  const getChangeIcon = (value) => {
    if (value > 0) return <ArrowUpRight size={10} />;
    if (value < 0) return <ArrowDownRight size={10} />;
    return null;
  };

  const getTrend = (card) => {
    if (card.id === 'total_profit') return normalizedData.totalProfit >= 0 ? 'up' : 'down';
    if (card.id === 'win_rate') return normalizedData.winRate >= 50 ? 'up' : 'neutral';
    if (card.id === 'sharpe_ratio') return normalizedData.sharpeRatio >= 1 ? 'up' : 'neutral';
    return 'neutral';
  };

  const cards = [
    {
      id: 'total_profit',
      title: 'Total P&L',
      value: `$${parseFloat(normalizedData.totalProfit || 0).toFixed(2)}`,
      change: normalizedData.changes?.totalProfit || 0,
      icon: DollarSign,
      color: normalizedData.totalProfit >= 0 ? 'success' : 'danger',
      subValue: `Daily: $${parseFloat(normalizedData.dailyPnl || 0).toFixed(2)}`,
      showRealtime: realtimeMode && updatedCard === 'total_profit'
    },
    {
      id: 'win_rate',
      title: 'Win Rate',
      value: `${parseFloat(normalizedData.winRate || 0).toFixed(1)}%`,
      change: normalizedData.changes?.winRate || 0,
      icon: Percent,
      color: 'primary',
      subValue: `${performance?.winning_trades || 0}/${performance?.completed_trades || 0}`,
      showRealtime: realtimeMode && updatedCard === 'win_rate'
    },
    {
      id: 'total_trades',
      title: 'Total Trades',
      value: normalizedData.totalTrades?.toString() || '0',
      change: normalizedData.changes?.totalTrades || 0,
      icon: BarChart3,
      color: 'info',
      subValue: `Active: ${performance?.active_trades || 0}`,
      showRealtime: realtimeMode && updatedCard === 'total_trades'
    },
    {
      id: 'sharpe_ratio',
      title: 'Sharpe Ratio',
      value: parseFloat(normalizedData.sharpeRatio || 0).toFixed(2),
      change: normalizedData.changes?.sharpeRatio || 0,
      icon: Target,
      color: 'warning',
      subValue: `Risk: ${performance?.max_drawdown?.toFixed(1) || '0.0'}%`,
      showRealtime: realtimeMode && updatedCard === 'sharpe_ratio'
    }
  ];

  return (
    <div className="stat-cards-grid">
      {cards.map((card) => {
        const Icon = card.icon;
        const trend = getTrend(card);
        const isUpdated = updatedCard === card.id;
        
        return (
          <div 
            key={card.id} 
            className={`stat-card stat-card-${card.color} ${isUpdated ? 'updated' : ''}`}
            data-card-id={card.id}
          >
            <div className="stat-card-header">
              <div className="stat-icon-wrapper">
                <Icon size={16} />
              </div>
              <span className="stat-title">{card.title}</span>
              
              {card.change !== 0 && (
                <div className={`stat-change ${card.change > 0 ? 'positive' : 'negative'}`}>
                  {getChangeIcon(card.change)}
                  <span>{formatChange(card.change)}</span>
                </div>
              )}
              
              {card.showRealtime && (
                <div className="realtime-badge">
                  <Zap size={10} />
                  <span>LIVE</span>
                </div>
              )}
            </div>
            
            <div className="stat-card-body">
              <div className={`stat-main-value ${isUpdated ? 'updated-value' : ''}`}>
                {card.value}
              </div>
              <div className="stat-trend-indicator">
                <div className={`trend-dot trend-${trend}`} />
                <span className="stat-sub-value">{card.subValue}</span>
              </div>
            </div>
            
            {/* Connection status indicator */}
            {realtimeMode && (
              <div className="connection-status-indicator">
                <div className={`status-dot ${wsConnectionStatus}`} />
                <span className="status-text">
                  {wsConnectionStatus === 'connected' ? 'LIVE' : wsConnectionStatus}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default StatCards;