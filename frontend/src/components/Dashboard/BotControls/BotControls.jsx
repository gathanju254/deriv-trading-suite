import React, { useState, useEffect, useRef } from 'react';
import { useTrading } from '../../../context/TradingContext';
import { useToast } from '../../../context/ToastContext';
import { Play, StopCircle, RotateCcw, Clock, Activity } from 'lucide-react';
import './BotControls.css';

const BotControls = () => {
  const { botStatus, startBot, stopBot, loading } = useTrading();
  const { addToast } = useToast();
  
  const [sessionTime, setSessionTime] = useState(0);
  const [isCounting, setIsCounting] = useState(false);
  const timerRef = useRef(null);
  const sessionStartTimeRef = useRef(null);

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
      addToast('✅ Trading bot stopped', 'success');
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

  return (
    <div className="bot-controls">
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
          title="Reset session timer"
        >
          <RotateCcw size={18} />
          Reset Timer
        </button>
      </div>
    </div>
  );
};

export default BotControls;