// frontend/src/components/layout/Footer/Footer.jsx
import React, { useState, useEffect } from 'react';
import { useTrading } from '../../../hooks/useTrading';
import { Activity, TrendingUp, TrendingDown, Clock } from 'lucide-react';

const Footer = () => {
  const { botStatus, wsConnectionStatus, marketData, performance } = useTrading();
  const [uptime, setUptime] = useState(0);

  // Uptime counter
  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      setUptime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  const getStatusColor = (type, status) => {
    const map = {
      bot: { running: 'bg-green-500', stopped: 'bg-red-500', connecting: 'bg-yellow-500' },
      ws: { connected: 'bg-blue-500', disconnected: 'bg-red-500', connecting: 'bg-yellow-500' },
    };
    return map[type][status] || 'bg-gray-500';
  };

  const getStatusTitle = (type, status) =>
    `${type === 'bot' ? 'Bot' : 'WebSocket'}: ${status.charAt(0).toUpperCase() + status.slice(1)}`;

  return (
    <footer className="bg-gradient-to-r from-gray-900 to-gray-800 border-t border-gray-700/50 px-6 py-4 md:px-12 shadow-xl animate-fade-in">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        {/* Left: Copyright and Status */}
        <div className="flex flex-col md:flex-row items-center gap-6">
          <p className="text-gray-400 text-sm font-medium">&copy; 2024 Deriv Trading Suite. All rights reserved.</p>

          {/* Enhanced Status indicators */}
          <div className="flex items-center gap-6">
            {/* Bot status */}
            <div
              className="flex items-center gap-3 cursor-help"
              title={getStatusTitle('bot', botStatus)}
            >
              <span className="text-gray-400 text-xs font-semibold uppercase tracking-wide">Bot:</span>
              <span
                className={`w-4 h-4 rounded-full ${getStatusColor('bot', botStatus)} shadow-lg ${
                  botStatus === 'running' ? 'animate-pulse-slow' : ''
                }`}
              />
            </div>

            {/* WebSocket status */}
            <div
              className="flex items-center gap-3 cursor-help"
              title={getStatusTitle('ws', wsConnectionStatus)}
            >
              <span className="text-gray-400 text-xs font-semibold uppercase tracking-wide">WS:</span>
              <span
                className={`w-4 h-4 rounded-full ${getStatusColor('ws', wsConnectionStatus)} shadow-lg ${
                  wsConnectionStatus === 'connected' ? 'animate-pulse-slow' : ''
                }`}
              />
            </div>

            {/* Uptime */}
            <div className="flex items-center gap-3" title="Application uptime">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-gray-400 text-sm font-mono">{formatUptime(uptime)}</span>
            </div>
          </div>
        </div>

        {/* Center: Enhanced Quick Stats */}
        <div className="hidden md:flex items-center gap-8 text-sm">
          <div className="flex items-center gap-2" title="Total Profit">
            <TrendingUp size={16} className="text-green-400" />
            <span className="text-gray-300 font-semibold">${performance?.total_profit?.toFixed(2) || '0.00'}</span>
          </div>
          <div className="flex items-center gap-2" title="Win Rate">
            <Activity size={16} className="text-primary" />
            <span className="text-gray-300 font-semibold">{performance?.win_rate?.toFixed(1) || '0.0'}%</span>
          </div>
          <div className="flex items-center gap-2" title="Active Trades">
            <TrendingDown size={16} className="text-accent" />
            <span className="text-gray-300 font-semibold">{performance?.active_trades || 0}</span>
          </div>
        </div>

        {/* Right: Version and Symbol */}
        <div className="flex items-center gap-6">
          <span className="text-gray-500 text-sm font-mono tracking-wide" title="App Version">v1.0.0</span>
          {marketData?.symbol && (
            <span className="text-gray-400 text-sm font-mono tracking-wide" title="Trading Symbol">• Trading: {marketData.symbol}</span>
          )}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
