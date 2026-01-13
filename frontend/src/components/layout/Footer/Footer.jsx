// frontend/src/components/layout/Footer/Footer.jsx
import React from 'react';
import { useTrading } from '../../../hooks/useTrading';

const Footer = () => {
  const { botStatus, wsConnectionStatus } = useTrading();

  const getStatusColor = (type, status) => {
    const map = {
      bot: { running: 'bg-green-500', stopped: 'bg-red-500', connecting: 'bg-yellow-500' },
      ws: { connected: 'bg-green-500', disconnected: 'bg-red-500', connecting: 'bg-yellow-500' },
    };
    return map[type][status] || 'bg-gray-500';
  };

  const getStatusTitle = (type, status) =>
    `${type === 'bot' ? 'Bot' : 'WebSocket'}: ${status.charAt(0).toUpperCase() + status.slice(1)}`;

  return (
    <footer className="bg-gray-900 border-t border-gray-700 px-6 py-3 md:px-12">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        {/* Left: copyright + status */}
        <div className="flex flex-col md:flex-row items-center gap-4">
          <p className="text-gray-400 text-sm">&copy; 2024 Deriv Trading Suite. All rights reserved.</p>

          {/* Status indicators */}
          <div className="flex items-center gap-4">
            {/* Bot status */}
            <div
              className="flex items-center gap-2 cursor-help relative"
              title={getStatusTitle('bot', botStatus)}
            >
              <span className="text-gray-400 text-xs font-semibold uppercase">Bot:</span>
              <span
                className={`w-2.5 h-2.5 rounded-full ${getStatusColor('bot', botStatus)} ${
                  botStatus === 'running' ? 'animate-pulse' : ''
                }`}
              />
            </div>

            {/* WebSocket status */}
            <div
              className="flex items-center gap-2 cursor-help relative"
              title={getStatusTitle('ws', wsConnectionStatus)}
            >
              <span className="text-gray-400 text-xs font-semibold uppercase">WS:</span>
              <span
                className={`w-2.5 h-2.5 rounded-full ${getStatusColor('ws', wsConnectionStatus)} ${
                  wsConnectionStatus === 'connected' ? 'animate-pulse-slow' : ''
                }`}
              />
            </div>
          </div>
        </div>

        {/* Right: version */}
        <div>
          <span className="text-gray-500 text-sm font-mono">v1.0.0</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
