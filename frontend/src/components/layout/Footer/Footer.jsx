// frontend/src/components/layout/Footer/Footer.jsx
import React, { useState, useEffect } from 'react';
import { useTrading } from '../../../hooks/useTrading';
import { Activity, TrendingUp, TrendingDown, Clock, BarChart3, Shield, Globe } from 'lucide-react';

const Footer = () => {
  const { botStatus, wsConnectionStatus, marketData, performance } = useTrading();
  const [uptime, setUptime] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Uptime counter and clock
  useEffect(() => {
    const startTime = Date.now();
    
    const interval = setInterval(() => {
      setUptime(Math.floor((Date.now() - startTime) / 1000));
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getStatusConfig = (type, status) => {
    const config = {
      bot: {
        running: { color: 'bg-success-500', text: 'Running', icon: '▶️' },
        stopped: { color: 'bg-secondary-500', text: 'Stopped', icon: '⏸️' },
        connecting: { color: 'bg-accent-500', text: 'Connecting', icon: '🔄' }
      },
      ws: {
        connected: { color: 'bg-success-500', text: 'Connected', icon: '🌐' },
        disconnected: { color: 'bg-secondary-500', text: 'Disconnected', icon: '🔌' },
        connecting: { color: 'bg-accent-500', text: 'Connecting', icon: '🔄' }
      }
    };
    
    return config[type]?.[status] || { color: 'bg-gray-500', text: 'Unknown', icon: '❓' };
  };

  const StatusPill = ({ type, status }) => {
    const config = getStatusConfig(type, status);
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800/50 border border-gray-700/50">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${config.color} ${status === 'running' || status === 'connected' ? 'animate-pulse-slow' : ''}`} />
          <span className="text-xs font-medium text-gray-300 capitalize">
            {type}: {config.text}
          </span>
        </div>
      </div>
    );
  };

  const StatusDot = ({ status }) => (
    <span className={`w-3 h-3 rounded-full ${
      status === 'running' || status === 'connected'
        ? 'bg-success-500 animate-pulse-slow'
        : status === 'connecting'
          ? 'bg-accent-500 animate-pulse'
          : 'bg-secondary-500'
    }`} />
  );

  const StatCard = ({ icon: Icon, label, value, color = 'text-white', subtext = null }) => (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-gray-800/30 border border-gray-700/50 backdrop-blur-sm">
      <div className="p-2 rounded-lg bg-gradient-to-br from-gray-800 to-gray-900">
        <Icon size={16} className={color} />
      </div>
      <div className="flex flex-col">
        <span className="text-xs text-gray-400 font-medium">{label}</span>
        <div className="flex items-baseline gap-1">
          <span className={`text-sm font-bold ${color}`}>{value}</span>
          {subtext && <span className="text-xs text-gray-500">{subtext}</span>}
        </div>
      </div>
    </div>
  );

  return (
    <footer className="bg-gradient-to-t from-gray-950 via-gray-900 to-gray-950 border-t border-gray-800/50 px-6 py-4 shadow-2xl">
      <div className="max-w-7xl mx-auto">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Left: Status & Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center">
                <Shield size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white">Deriv Trading Suite</h3>
                <p className="text-sm text-gray-400">Professional Trading Platform</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <StatusDot status={botStatus} />
              <StatusDot status={wsConnectionStatus} />
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Globe size={14} />
                <span>v1.0.0</span>
              </div>
              <span className="text-gray-600">•</span>
              <div className="flex items-center gap-2">
                <Clock size={14} />
                <span>{formatTime(currentTime)}</span>
              </div>
            </div>
          </div>

          {/* Center: Performance Stats */}
          <div className="space-y-4">
            <h4 className="font-semibold text-white flex items-center gap-2">
              <BarChart3 size={16} />
              Performance Overview
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <StatCard 
                icon={TrendingUp}
                label="Total Profit"
                value={`$${performance?.total_profit?.toFixed(2) || '0.00'}`}
                color="text-success-500"
              />
              <StatCard 
                icon={Activity}
                label="Win Rate"
                value={`${performance?.win_rate?.toFixed(1) || '0.0'}%`}
                color="text-primary-400"
              />
              <StatCard 
                icon={TrendingDown}
                label="Active Trades"
                value={performance?.active_trades || '0'}
                color="text-accent-500"
              />
              <StatCard 
                icon={Clock}
                label="Uptime"
                value={formatUptime(uptime)}
                color="text-gray-300"
                subtext="HH:MM:SS"
              />
            </div>
          </div>

          {/* Right: Market Info */}
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800/50">
              <h4 className="font-semibold text-white mb-2">Market Info</h4>
              {marketData?.symbol ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Symbol:</span>
                    <span className="text-sm font-semibold text-white font-mono">{marketData.symbol}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Last Price:</span>
                    <span className="text-sm font-semibold text-success-500">
                      ${marketData.lastPrice?.toFixed(4) || '—'}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No market data available</p>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-4 border-t border-gray-800/30">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-500 text-center md:text-left">
              &copy; {new Date().getFullYear()} Deriv Trading Suite. All rights reserved. 
              <span className="hidden md:inline"> | </span>
              <span className="block md:inline mt-1 md:mt-0">This is a demonstration platform. Trading involves risk.</span>
            </p>
            
            <div className="flex items-center gap-4 text-sm">
              <button className="text-gray-400 hover:text-white transition-colors duration-200">
                Terms
              </button>
              <span className="text-gray-600">•</span>
              <button className="text-gray-400 hover:text-white transition-colors duration-200">
                Privacy
              </button>
              <span className="text-gray-600">•</span>
              <button className="text-gray-400 hover:text-white transition-colors duration-200">
                Support
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;