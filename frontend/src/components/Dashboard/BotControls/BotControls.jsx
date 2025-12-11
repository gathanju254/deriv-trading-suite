import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTrading } from '../../../context/TradingContext';
import './BotControls.css';

const BotControls = () => {
  const {
    botStatus,
    loading,
    startBot,
    stopBot,
    wsConnectionStatus,
    refreshPerformance
  } = useTrading();

  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Utility to show temporary messages
  const showMessage = useCallback((message, type = 'success') => {
    if (type === 'success') {
      setSuccessMessage(message);
      setError(null);
    } else {
      setError(message);
      setSuccessMessage(null);
    }

    setTimeout(() => {
      setSuccessMessage(null);
      setError(null);
    }, 3000);
  }, []);

  // Start bot
  const handleStartBot = useCallback(async () => {
    try {
      setError(null);
      setSuccessMessage(null);

      if (wsConnectionStatus !== 'connected') {
        showMessage('⚠️ WebSocket not connected. Attempting to reconnect...', 'error');
        return;
      }

      await startBot();
      showMessage('✅ Trading bot started successfully!', 'success');

      setTimeout(() => refreshPerformance(), 500);
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || err.message || 'Failed to start bot';

      showMessage(`❌ ${errorMsg}`, 'error');
      console.error('Start bot error:', err);
    }
  }, [startBot, wsConnectionStatus, showMessage, refreshPerformance]);

  // Stop bot
  const handleStopBot = useCallback(async () => {
    try {
      setError(null);
      setSuccessMessage(null);

      await stopBot();
      showMessage('✅ Trading bot stopped successfully!', 'success');

      setTimeout(() => refreshPerformance(), 500);
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || err.message || 'Failed to stop bot';

      showMessage(`❌ ${errorMsg}`, 'error');
      console.error('Stop bot error:', err);
    }
  }, [stopBot, showMessage, refreshPerformance]);

  // UI state
  const isRunning = botStatus === 'running';
  const wsConnected = wsConnectionStatus === 'connected';

  const isStartDisabled =
    isRunning || loading || wsConnectionStatus !== 'connected';

  const isStopDisabled = !isRunning || loading;

  return (
    <motion.div
      className="bot-controls"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* HEADER */}
      <div className="controls-header">
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          🤖 Bot Control
        </motion.h2>

        <motion.div
          className={`ws-status ${wsConnected ? 'connected' : 'disconnected'}`}
          animate={{
            scale: wsConnected ? 1 : 1,
            opacity: 1
          }}
          transition={{ duration: 0.3 }}
        >
          <span className="status-dot" />
          <span className="status-text">
            {wsConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </span>
        </motion.div>
      </div>

      {/* BOT STATUS PANEL */}
      <motion.div
        className={`status-display ${isRunning ? 'running' : 'stopped'}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="status-label">Current Status:</div>
        <div className="status-value">
          {isRunning ? '▶️ RUNNING' : '⏹️ STOPPED'}
        </div>
      </motion.div>

      {/* MESSAGES */}
      <AnimatePresence mode="popLayout">
        {error && (
          <motion.div
            className="message error-message"
            role="alert"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
          >
            {error}
          </motion.div>
        )}

        {successMessage && (
          <motion.div
            className="message success-message"
            role="alert"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
          >
            {successMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* BUTTONS */}
      <div className="button-group">
        <motion.button
          whileTap={{ scale: 0.94 }}
          className={`btn btn-start ${isRunning ? 'disabled' : ''}`}
          onClick={handleStartBot}
          disabled={isStartDisabled}
        >
          {loading && isStartDisabled ? (
            <>
              <span className="spinner" />
              Starting...
            </>
          ) : (
            '▶️ START BOT'
          )}
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.94 }}
          className={`btn btn-stop ${!isRunning ? 'disabled' : ''}`}
          onClick={handleStopBot}
          disabled={isStopDisabled}
        >
          {loading && isStopDisabled ? (
            <>
              <span className="spinner" />
              Stopping...
            </>
          ) : (
            '⏹️ STOP BOT'
          )}
        </motion.button>
      </div>

      {/* WS WARNING */}
      {!wsConnected && (
        <motion.div
          className="warning-box"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <strong>⚠️ Connection Warning:</strong><br />
          WebSocket is disconnected. Bot cannot operate.
        </motion.div>
      )}

      {/* INFO BOX — simplified */}
      <motion.div
        className="info-box"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <strong>ℹ️ Quick Info:</strong>
        <ul>
          <li>• Start begins automated trading</li>
          <li>• Stop ends the current session</li>
        </ul>
      </motion.div>
    </motion.div>
  );
};

export default BotControls;
