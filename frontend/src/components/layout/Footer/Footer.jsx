// frontend/src/components/layout/Footer/Footer.jsx
// frontend/src/components/layout/Footer/Footer.jsx
import React, { useState, useEffect } from 'react';
import { useTrading } from '../../../hooks/useTrading';
import { TrendingUp, Clock } from 'lucide-react';

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
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const StatusDot = ({ status, label }) => {
    const getColor = () => {
      if (status === 'running' || status === 'connected') return 'bg-green-500';
      if (status === 'connecting') return 'bg-yellow-500';
      return 'bg-red-500';
    };

    return (
      <div className="flex items-center gap-2" title={`${label}: ${status}`}>
        <span className={`w-2 h-2 rounded-full ${getColor()} ${(status === 'running' || status === 'connected') ? 'animate-pulse' : ''}`} />
        <span className="text-xs text-gray-400">{label}</span>
      </div>
    );
  };

  return (
    <footer className="bg-gray-900 border-t border-gray-800 px-4 py-3">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Left: Copyright */}
          <div className="flex flex-col items-center md:items-start">
            <p className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} Deriv Trading Suite
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Trading involves risk
            </p>
          </div>

          {/* Center: Status */}
          <div className="flex items-center gap-4">
            <StatusDot status={botStatus} label="Bot" />
            <StatusDot status={wsConnectionStatus} label="WS" />
            <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400">
              <Clock size={12} />
              <span>Uptime: {formatUptime(uptime)}</span>
            </div>
          </div>

          {/* Right: Quick Stats */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2" title="Total Profit">
              <TrendingUp size={14} className="text-green-500" />
              <span className="text-sm font-medium text-gray-300">
                ${performance?.total_profit?.toFixed(2) || '0.00'}
              </span>
            </div>
            <span className="text-xs text-gray-600 hidden md:inline">v1.0.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;