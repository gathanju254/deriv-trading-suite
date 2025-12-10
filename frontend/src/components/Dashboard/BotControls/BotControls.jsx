// frontend/src/components/Dashboard/BotControls/BotControls.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useTrading } from '../../../context/TradingContext';
import { useToast } from '../../../context/ToastContext';
import { Play, StopCircle, RotateCcw, Clock, Trophy, AlertTriangle, Activity } from 'lucide-react';
import './BotControls.css';

const BotControls = () => {
  const { botStatus, startBot, stopBot, loading, performance, tradeHistory } = useTrading();
  const { addToast } = useToast();
  
  const [sessionTime, setSessionTime] = useState(0);
  const [isCounting, setIsCounting] = useState(false);
  const timerRef = useRef(null);
  const sessionStartTimeRef = useRef(null);

  // Calculate session statistics
  const calculateSessionStats = () => {
    if (!tradeHistory || tradeHistory.length === 0) return { wins: 0, losses: 0, total: 0, netPnl: 0 };
    
    const sessionTrades = tradeHistory.filter(trade => {
      if (!sessionStartTimeRef.current) return false;
      const tradeTime = new Date(trade.timestamp || trade.time).getTime();
      return tradeTime >= sessionStartTimeRef.current;
    });
    
    const wins = sessionTrades.filter(trade => trade.result === 'WON' || trade.profit > 0).length;
    const losses = sessionTrades.filter(trade => trade.result === 'LOST' || trade.profit < 0).length;
    const netPnl = sessionTrades.reduce((sum, trade) => sum + (trade.profit || 0), 0);
    
    return {
      wins,
      losses,
      total: sessionTrades.length,
      netPnl: netPnl.toFixed(2)
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
      addToast('Trading bot started', 'success');
    } catch (error) {
      addToast('Failed to start bot', 'error');
    }
  };

  // Handle bot stop
  const handleStop = async () => {
    try {
      await stopBot();
      setIsCounting(false);
      const stats = calculateSessionStats();
      addToast(
        `Session ended - ${stats.total} trades | Net P&L: $${stats.netPnl}`,
        'info',
        4000
      );
    } catch (error) {
      addToast('Failed to stop bot', 'error');
    }
  };

  // Handle reset
  const handleReset = () => {
    setSessionTime(0);
    setIsCounting(false);
    sessionStartTimeRef.current = null;
    addToast('Session timer reset', 'info');
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

  const sessionStats = calculateSessionStats();

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
            <div className="stat-label">Wins</div>
            <div className="stat-value">{sessionStats.wins}</div>
          </div>
        </div>
        
        <div className="stat-item">
          <div className="stat-icon loss">
            <AlertTriangle size={14} />
          </div>
          <div className="stat-content">
            <div className="stat-label">Losses</div>
            <div className="stat-value">{sessionStats.losses}</div>
          </div>
        </div>
        
        <div className="stat-item">
          <div className="stat-icon total">
            <Activity size={14} />
          </div>
          <div className="stat-content">
            <div className="stat-label">Total</div>
            <div className="stat-value">{sessionStats.total}</div>
          </div>
        </div>
        
        <div className="stat-item">
          <div className="stat-icon pnl">
            <span>$</span>
          </div>
          <div className="stat-content">
            <div className="stat-label">Net P&L</div>
            <div className={`stat-value ${sessionStats.netPnl >= 0 ? 'positive' : 'negative'}`}>
              ${sessionStats.netPnl}
            </div>
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

      {/* Status Information */}
      <div className="bot-status-info">
        <div className="status-row">
          <span className="status-label">Bot Status:</span>
          <span className={`status-value status-${botStatus}`}>
            {botStatus.toUpperCase()}
          </span>
        </div>
        <div className="status-row">
          <span className="status-label">Overall Win Rate:</span>
          <span className="status-value">
            {performance.win_rate?.toFixed(1) || '0.0'}%
          </span>
        </div>
        {sessionStartTimeRef.current && (
          <div className="session-start">
            Session started: {new Date(sessionStartTimeRef.current).toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
};

export default BotControls;