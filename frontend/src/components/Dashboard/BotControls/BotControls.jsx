// frontend/src/components/Dashboard/BotControls/BotControls.jsx
// frontend/src/components/Dashboard/BotControls/BotControls.jsx
import React, { useState, useCallback } from 'react';
import { useTrading } from '../../../hooks/useTrading';
import { Zap, Pause, AlertCircle } from 'lucide-react';

const BotControls = () => {
  const {
    botStatus,
    loading,
    startBot,
    stopBot,
    wsConnectionStatus,
  } = useTrading();

  const [message, setMessage] = useState(null);

  const showMessage = useCallback((text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  }, []);

  const isRunning = botStatus === 'running';
  const wsConnected = wsConnectionStatus === 'connected';

  const handleStart = async () => {
    if (!wsConnected) {
      showMessage('WebSocket disconnected. Cannot start bot.', 'error');
      return;
    }

    try {
      await startBot();
      showMessage('Bot started successfully');
    } catch (err) {
      showMessage('Failed to start bot', 'error');
    }
  };

  const handleStop = async () => {
    try {
      await stopBot();
      showMessage('Bot stopped successfully');
    } catch (err) {
      showMessage('Failed to stop bot', 'error');
    }
  };

  return (
    <div className="space-y-5">
      {/* Status Display */}
      <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <div>
            <div className="text-sm text-gray-300">Bot Status</div>
            <div className="text-lg font-semibold text-white capitalize">
              {isRunning ? 'Running' : 'Stopped'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-400">WS</span>
        </div>
      </div>

      {/* Message Alert */}
      {message && (
        <div className={`rounded-lg p-3 text-sm ${
          message.type === 'error' 
            ? 'bg-red-500/10 border border-red-500/30 text-red-400' 
            : 'bg-green-500/10 border border-green-500/30 text-green-400'
        }`}>
          {message.text}
        </div>
      )}

      {/* Control Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleStart}
          disabled={isRunning || loading || !wsConnected}
          className={`flex items-center justify-center gap-2 rounded-lg px-4 py-3 font-medium transition-all duration-200
            ${isRunning || !wsConnected
              ? 'bg-gray-800 cursor-not-allowed text-gray-500'
              : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
        >
          <Zap size={18} />
          {loading && !isRunning ? 'Starting...' : 'Start Bot'}
        </button>

        <button
          onClick={handleStop}
          disabled={!isRunning || loading}
          className={`flex items-center justify-center gap-2 rounded-lg px-4 py-3 font-medium transition-all duration-200
            ${!isRunning
              ? 'bg-gray-800 cursor-not-allowed text-gray-500'
              : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
        >
          <Pause size={18} />
          {loading && isRunning ? 'Stopping...' : 'Stop Bot'}
        </button>
      </div>

      {/* Connection Warning */}
      {!wsConnected && (
        <div className="flex items-center gap-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 p-3">
          <AlertCircle size={16} className="text-yellow-500" />
          <div className="text-sm text-yellow-400">
            WebSocket disconnected. Trading is paused.
          </div>
        </div>
      )}

      {/* Info Panel */}
      <div className="rounded-lg bg-gray-800/30 p-4">
        <div className="text-sm text-gray-400 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
            <span>Bot runs automated trading strategies</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
            <span>Stop safely ends current session</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
            <span>Requires active WebSocket connection</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BotControls;