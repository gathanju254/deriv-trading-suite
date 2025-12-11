// frontend/src/components/Dashboard/BotControls/BotControls.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useTrading } from '../../../context/TradingContext';
import { useToast } from '../../../context/ToastContext';
import { Play, StopCircle, RotateCcw, Clock, Trophy, AlertTriangle, Activity, TrendingUp } from 'lucide-react';
import './BotControls.css';

const BotControls = () => {
  const { botStatus, startBot, stopBot, loading, performance, tradeHistory } = useTrading();
  const { addToast } = useToast();
  
  const [sessionTime, setSessionTime] = useState(0);
  const [isCounting, setIsCounting] = useState(false);
  const timerRef = useRef(null);
  const sessionStartTimeRef = useRef(null);
  const sessionTradesRef = useRef([]);

  // Improved session statistics calculation with better timestamp handling
  const calculateSessionStats = () => {
    if (!tradeHistory || tradeHistory.length === 0) {
      return { wins: 0, losses: 0, total: 0, netPnl: '0.00', winRate: 0 };
    }
    
    const sessionTrades = tradeHistory.filter(trade => {
      if (!sessionStartTimeRef.current) return false;
      
      // Handle multiple timestamp field names
      const tradeTimestamp = trade.timestamp || trade.time || trade.created_at || Date.now();
      const tradeTime = typeof tradeTimestamp === 'string' 
        ? new Date(tradeTimestamp).getTime() 
        : tradeTimestamp;
      
      return !isNaN(tradeTime) && tradeTime >= sessionStartTimeRef.current;
    });
    
    // Update session trades ref for comparison
    sessionTradesRef.current = sessionTrades;
    
    // Count wins and losses with multiple field name support
    const wins = sessionTrades.filter(trade => {
      const result = trade.result || trade.status;
      const profit = trade.profit || trade.pnl || 0;
      return result === 'WON' || profit > 0;
    }).length;
    
    const losses = sessionTrades.filter(trade => {
      const result = trade.result || trade.status;
      const profit = trade.profit || trade.pnl || 0;
      return result === 'LOST' || profit < 0;
    }).length;
    
    const netPnl = sessionTrades.reduce((sum, trade) => {
      return sum + (trade.profit || trade.pnl || 0);
    }, 0);
    
    const sessionWinRate = sessionTrades.length > 0 
      ? ((wins / sessionTrades.length) * 100).toFixed(1)
      : 0;
    
    return {
      wins,
      losses,
      total: sessionTrades.length,
      netPnl: netPnl.toFixed(2),
      winRate: parseFloat(sessionWinRate)
    };
  };

  // Format time display
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle bot start
  const handleStart = async () => {
    try {
      await startBot();
      setIsCounting(true);
      sessionStartTimeRef.current = Date.now();
      sessionTradesRef.current = [];
      addToast('🚀 Trading bot started', 'success');
    } catch (error) {
      console.error('Start bot error:', error);
      addToast('❌ Failed to start bot', 'error');
    }
  };

  // Handle bot stop
  const handleStop = async () => {
    try {
      await stopBot();
      setIsCounting(false);
      const stats = calculateSessionStats();
      addToast(
        `✅ Session ended - ${stats.total} trades | Win Rate: ${stats.winRate}% | Net P&L: $${stats.netPnl}`,
        'success',
        5000
      );
    } catch (error) {
      console.error('Stop bot error:', error);
      addToast('❌ Failed to stop bot', 'error');
    }
  };

  // Handle reset
  const handleReset = () => {
    setSessionTime(0);
    setIsCounting(false);
    sessionStartTimeRef.current = null;
    sessionTradesRef.current = [];
    addToast('🔄 Session timer reset', 'info');
  };

  // Timer effect
  useEffect(() => {
    if (isCounting) {
      timerRef.current = setInterval(() => {
        setSessionTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isCounting]);

  // Sync with bot status
  useEffect(() => {
    if (botStatus === 'running' && !isCounting) {
      setIsCounting(true);
      if (!sessionStartTimeRef.current) {
        sessionStartTimeRef.current = Date.now();
      }
    } else if (botStatus === 'stopped' && isCounting) {
      setIsCounting(false);
    }
  }, [botStatus, isCounting]);

  // Get session stats
  const sessionStats = calculateSessionStats();
  
  // Get overall performance metrics with fallbacks
  const overallWinRate = performance?.win_rate ?? performance?.win_percent ?? 0;
  const totalProfit = performance?.total_profit ?? performance?.pnl ?? 0;
  const sharpeRatio = performance?.sharpe_ratio ?? 0;
  const totalTrades = performance?.total_trades ?? performance?.completed_trades ?? 0;

  return (
    <div className="bot-controls">
      {/* Session Timer */}
      <div className="session-timer">
        <div className="timer-header">
          <Clock size={16} />
          <span>Session Timer</span>
        </div>
        <div className="timer-display">
          <span className="time">{formatTime(sessionTime)}</span>
          <div className="timer-status">
            <div className={`timer-dot ${isCounting ? 'active' : 'inactive'}`} />
            <span>{isCounting ? 'Active' : 'Paused'}</span>
          </div>
        </div>
      </div>

      {/* Session Stats */}
      <div className="session-stats">
        <div className="stat-item">
          <div className="stat-icon win">
            <Trophy size={14} />
          </div>
          <div className="stat-content">
            <div className="stat-label">Session Wins</div>
            <div className="stat-value">{sessionStats.wins}</div>
          </div>
        </div>
        
        <div className="stat-item">
          <div className="stat-icon loss">
            <AlertTriangle size={14} />
          </div>
          <div className="stat-content">
            <div className="stat-label">Session Losses</div>
            <div className="stat-value">{sessionStats.losses}</div>
          </div>
        </div>
        
        <div className="stat-item">
          <div className="stat-icon total">
            <Activity size={14} />
          </div>
          <div className="stat-content">
            <div className="stat-label">Session Total</div>
            <div className="stat-value">{sessionStats.total}</div>
          </div>
        </div>
        
        <div className="stat-item">
          <div className="stat-icon pnl">
            <span>$</span>
          </div>
          <div className="stat-content">
            <div className="stat-label">Session P&L</div>
            <div className={`stat-value ${parseFloat(sessionStats.netPnl) >= 0 ? 'positive' : 'negative'}`}>
              {parseFloat(sessionStats.netPnl) >= 0 ? '+' : ''}{sessionStats.netPnl}
            </div>
          </div>
        </div>

        <div className="stat-item">
          <div className="stat-icon rate">
            <TrendingUp size={14} />
          </div>
          <div className="stat-content">
            <div className="stat-label">Session Win%</div>
            <div className="stat-value">{sessionStats.winRate.toFixed(1)}%</div>
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="controls-container">
        <button
          className={`control-btn ${botStatus === 'running' ? 'btn-stop' : 'btn-start'}`}
          onClick={botStatus === 'running' ? handleStop : handleStart}
          disabled={loading}
        >
          {botStatus === 'running' ? (
            <>
              <StopCircle size={18} />
              Stop Trading
            </>
          ) : (
            <>
              <Play size={18} />
              Start Trading
            </>
          )}
        </button>

        <button
          className="control-btn btn-reset"
          onClick={handleReset}
          disabled={loading || botStatus === 'running'}
          title="Reset session timer and stats"
        >
          <RotateCcw size={18} />
          Reset Session
        </button>
      </div>

      {/* Overall Performance Summary */}
      <div className="performance-summary">
        <h4>Overall Performance</h4>
        <div className="summary-grid">
          <div className="summary-item">
            <span className="summary-label">All-Time Trades:</span>
            <span className="summary-value">{totalTrades}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Overall Win Rate:</span>
            <span className="summary-value">
              {(overallWinRate).toFixed(1)}%
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Total P&L:</span>
            <span className={`summary-value ${totalProfit >= 0 ? 'positive' : 'negative'}`}>
              ${(totalProfit).toFixed(2)}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Sharpe Ratio:</span>
            <span className="summary-value">{(sharpeRatio).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Status Information */}
      <div className="bot-status-info">
        <div className="status-row">
          <span className="status-label">Bot Status:</span>
          <span className={`status-value status-${botStatus}`}>
            {botStatus === 'running' ? '🟢 RUNNING' : '🔴 STOPPED'}
          </span>
        </div>
        {sessionStartTimeRef.current && (
          <div className="session-start">
            ⏰ Session started: {new Date(sessionStartTimeRef.current).toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
};

export default BotControls;