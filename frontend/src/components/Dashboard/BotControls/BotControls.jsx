// frontend/src/components/Dashboard/BotControls/BotControls.jsx
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTrading } from '../../../hooks/useTrading';

const BotControls = () => {
  const {
    botStatus,
    loading,
    startBot,
    stopBot,
    wsConnectionStatus,
    refreshPerformance,
  } = useTrading();

  const [message, setMessage] = useState(null); // { text, type }

  const showMessage = useCallback((text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  }, []);

  const isRunning = botStatus === 'running';
  const wsConnected = wsConnectionStatus === 'connected';

  /* ---------- handlers ---------- */

  const handleStart = async () => {
    if (!wsConnected) {
      showMessage('WebSocket disconnected. Cannot start bot.', 'error');
      return;
    }

    try {
      await startBot();
      showMessage('Bot started successfully.');
      setTimeout(refreshPerformance, 500);
    } catch (err) {
      showMessage(
        err.response?.data?.message || err.message || 'Failed to start bot',
        'error'
      );
    }
  };

  const handleStop = async () => {
    try {
      await stopBot();
      showMessage('Bot stopped successfully.');
      setTimeout(refreshPerformance, 500);
    } catch (err) {
      showMessage(
        err.response?.data?.message || err.message || 'Failed to stop bot',
        'error'
      );
    }
  };

  /* ---------- ui ---------- */

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4"
    >
      {/* MESSAGE */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className={`rounded-md border px-3 py-2 text-sm ${
              message.type === 'error'
                ? 'border-red-500/30 bg-red-500/10 text-red-400'
                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
            }`}
          >
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* BUTTONS */}
      <div className="flex gap-3">
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handleStart}
          disabled={isRunning || loading || !wsConnected}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition
            ${
              isRunning || !wsConnected
                ? 'cursor-not-allowed bg-slate-800 text-slate-500'
                : 'bg-emerald-600 text-white hover:bg-emerald-500'
            }`}
        >
          {loading && !isRunning ? 'Starting…' : 'Start Bot'}
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handleStop}
          disabled={!isRunning || loading}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition
            ${
              !isRunning
                ? 'cursor-not-allowed bg-slate-800 text-slate-500'
                : 'bg-red-600 text-white hover:bg-red-500'
            }`}
        >
          {loading && isRunning ? 'Stopping…' : 'Stop Bot'}
        </motion.button>
      </div>

      {/* CONNECTION STATUS */}
      {!wsConnected && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
          WebSocket disconnected. Trading is paused.
        </div>
      )}

      {/* INFO */}
      <div className="text-xs text-slate-400">
        <p>• Start initiates automated trading</p>
        <p>• Stop safely ends the current session</p>
      </div>
    </motion.div>
  );
};

export default BotControls;
