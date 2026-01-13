// frontend/src/components/layout/Footer/Footer.jsx
import React, { useState, useEffect } from 'react';
import { useTrading } from '../../../hooks/useTrading';
import { Activity, TrendingUp, TrendingDown } from 'lucide-react';

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
    <footer className="bg-gray-900 border-t border-gray-800 px-6 py-3 md:px-12 shadow-lg animate-fade-in">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        {/* Left: Copyright and Status */}
        <div className="flex flex-col md:flex-row items-center gap-4">
          <p className="text-gray-400 text-sm">&copy; 2024 Deriv Trading Suite. All rights reserved.</p>

          {/* Status indicators */}
          <div className="flex items-center gap-4">
            {/* Bot status */}
            <div
              className="flex items-center gap-2 cursor-help"
              title={getStatusTitle('bot', botStatus)}
            >
              <span className="text-gray-400 text-xs font-semibold uppercase">Bot:</span>
              <span
                className={`w-3 h-3 rounded-full ${getStatusColor('bot', botStatus)} ${
                  botStatus === 'running' ? 'animate-pulse-slow' : ''
                }`}
              />
            </div>

            {/* WebSocket status */}
            <div
              className="flex items-center gap-2 cursor-help"
              title={getStatusTitle('ws', wsConnectionStatus)}
            >
              <span className="text-gray-400 text-xs font-semibold uppercase">WS:</span>
              <span
                className={`w-3 h-3 rounded-full ${getStatusColor('ws', wsConnectionStatus)} ${
                  wsConnectionStatus === 'connected' ? 'animate-pulse-slow' : ''
                }`}
              />
            </div>

            {/* Uptime */}
            <div className="text-gray-400 text-xs font-mono" title="Application uptime">
              Uptime: {formatUptime(uptime)}
            </div>
          </div>
        </div>

        {/* Center: Quick Stats */}
        <div className="hidden md:flex items-center gap-6 text-sm">
          <div className="flex items-center gap-1" title="Total Profit">
            <TrendingUp size={16} className="text-green-400" />
            <span className="text-gray-300">${performance?.total_profit?.toFixed(2) || '0.00'}</span>
          </div>
          <div className="flex items-center gap-1" title="Win Rate">
            <Activity size={16} className="text-primary" />
            <span className="text-gray-300">{performance?.win_rate?.toFixed(1) || '0.0'}%</span>
          </div>
          <div className="flex items-center gap-1" title="Active Trades">
            <TrendingDown size={16} className="text-accent" />
            <span className="text-gray-300">{performance?.active_trades || 0}</span>
          </div>
        </div>

        {/* Right: Version and Symbol */}
        <div className="flex items-center gap-4">
          <span className="text-gray-500 text-sm font-mono" title="App Version">v1.0.0</span>
          {marketData?.symbol && (
            <span className="text-gray-400 text-sm font-mono" title="Trading Symbol">• Trading: {marketData.symbol}</span>
          )}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
