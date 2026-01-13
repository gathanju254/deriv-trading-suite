// frontend/src/components/layout/Footer/Footer.jsx
import React, { useState, useEffect } from 'react';
import { useTrading } from '../../../hooks/useTrading';
import {
  Heart,
  Github,
  Twitter,
  MessageSquare,
  Cpu,
  Activity,
  Wifi,
  WifiOff,
  Server
} from 'lucide-react';
import './Footer.css';

const Footer = () => {
  const { botStatus, wsConnectionStatus, performance, marketData } = useTrading();
  const [uptime, setUptime] = useState(0);
  const [latency, setLatency] = useState(0);
  
  // Simulate uptime counter
  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      setUptime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Simulate latency measurement
  useEffect(() => {
    const interval = setInterval(() => {
      const simulatedLatency = Math.floor(Math.random() * 100) + 20;
      setLatency(simulatedLatency);
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusConfig = (type, status) => {
    const configs = {
      bot: {
        running: {
          color: 'bg-gradient-to-r from-green-500 to-emerald-600',
          icon: Activity,
          label: 'Bot Active',
          description: 'Trading bot is running'
        },
        stopped: {
          color: 'bg-gradient-to-r from-red-500 to-pink-600',
          icon: Cpu,
          label: 'Bot Stopped',
          description: 'Trading bot is paused'
        },
        connecting: {
          color: 'bg-gradient-to-r from-yellow-500 to-orange-600',
          icon: Activity,
          label: 'Bot Connecting',
          description: 'Bot is initializing'
        }
      },
      ws: {
        connected: {
          color: 'bg-gradient-to-r from-blue-500 to-cyan-600',
          icon: Wifi,
          label: 'WebSocket Connected',
          description: 'Real-time data active'
        },
        disconnected: {
          color: 'bg-gradient-to-r from-red-500 to-pink-600',
          icon: WifiOff,
          label: 'WebSocket Disconnected',
          description: 'Connection lost'
        },
        connecting: {
          color: 'bg-gradient-to-r from-yellow-500 to-orange-600',
          icon: Wifi,
          label: 'WebSocket Connecting',
          description: 'Establishing connection'
        }
      }
    };
    
    return configs[type][status] || {
      color: 'bg-gradient-to-r from-gray-500 to-gray-600',
      icon: Server,
      label: 'Unknown Status',
      description: 'Status unavailable'
    };
  };

  const botConfig = getStatusConfig('bot', botStatus);
  const wsConfig = getStatusConfig('ws', wsConnectionStatus);
  
  const formatUptime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  const getPerformanceColor = (value, isPercentage = false) => {
    if (isPercentage) {
      if (value >= 70) return 'text-emerald-400';
      if (value >= 50) return 'text-yellow-400';
      return 'text-red-400';
    }
    if (value > 0) return 'text-emerald-400';
    if (value < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  return (
    <footer className="bg-gradient-to-t from-gray-900 to-gray-950 border-t border-gray-800 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        {/* Top section: System status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Status indicators */}
          <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 border border-gray-800 rounded-2xl p-5">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Server size={18} />
              System Status
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className={`w-3 h-3 rounded-full ${botConfig.color} animate-pulse`} />
                    <div className="absolute inset-0 rounded-full animate-ping bg-current opacity-20" />
                  </div>
                  <span className="text-sm font-medium text-gray-300">{botConfig.label}</span>
                </div>
                <span className="text-xs text-gray-400">{botConfig.description}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className={`w-3 h-3 rounded-full ${wsConfig.color} animate-pulse`} />
                    <div className="absolute inset-0 rounded-full animate-ping bg-current opacity-20" />
                  </div>
                  <span className="text-sm font-medium text-gray-300">{wsConfig.label}</span>
                </div>
                <span className="text-xs text-gray-400">{wsConfig.description}</span>
              </div>
            </div>
          </div>

          {/* Performance metrics */}
          <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 border border-gray-800 rounded-2xl p-5">
            <h3 className="text-lg font-bold text-white mb-4">Performance</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-400 mb-1">Win Rate</div>
                <div className={`text-xl font-bold ${getPerformanceColor(performance?.win_rate || 0, true)}`}>
                  {performance?.win_rate?.toFixed(1) || '0.0'}%
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Total P&L</div>
                <div className={`text-xl font-bold ${getPerformanceColor(performance?.pnl || 0)}`}>
                  ${performance?.pnl?.toFixed(2) || '0.00'}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Sharpe Ratio</div>
                <div className="text-xl font-bold text-blue-400">
                  {performance?.sharpe_ratio?.toFixed(2) || '0.00'}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Trades Today</div>
                <div className="text-xl font-bold text-purple-400">
                  {performance?.completed_trades || '0'}
                </div>
              </div>
            </div>
          </div>

          {/* System info */}
          <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 border border-gray-800 rounded-2xl p-5">
            <h3 className="text-lg font-bold text-white mb-4">System Info</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Uptime</span>
                <span className="text-sm font-medium text-green-400">{formatUptime(uptime)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Latency</span>
                <span className={`text-sm font-medium ${latency < 50 ? 'text-emerald-400' : latency < 100 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {latency}ms
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Last Price</span>
                <span className="text-sm font-medium text-blue-400">
                  ${marketData?.lastPrice?.toFixed(5) || '0.00000'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">API Version</span>
                <span className="text-sm font-medium text-gray-300">v2.1.5</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom section: Copyright and links */}
        <div className="border-t border-gray-800 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            {/* Left: Copyright and version */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                  <Cpu size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Deriv Trading Suite</p>
                  <p className="text-xs text-gray-400">Professional Trading Platform</p>
                </div>
              </div>
              
              <div className="hidden md:flex items-center gap-6">
                <span className="text-xs text-gray-500">•</span>
                <span className="text-xs text-gray-400 font-mono">v1.0.0</span>
                <span className="text-xs text-gray-500">•</span>
                <span className="text-xs text-gray-400">Build: 2024.01.15</span>
              </div>
            </div>

            {/* Center: Quick links */}
            <div className="flex items-center gap-6">
              <a href="#" className="text-xs text-gray-400 hover:text-blue-400 transition-colors">Terms</a>
              <a href="#" className="text-xs text-gray-400 hover:text-blue-400 transition-colors">Privacy</a>
              <a href="#" className="text-xs text-gray-400 hover:text-blue-400 transition-colors">API Docs</a>
              <a href="#" className="text-xs text-gray-400 hover:text-blue-400 transition-colors">Support</a>
            </div>

            {/* Right: Social and made with love */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span>Made with</span>
                <Heart size={12} className="text-red-500 animate-pulse" fill="currentColor" />
                <span>by Deriv Team</span>
              </div>
              
              <div className="flex items-center gap-3">
                <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors" aria-label="GitHub">
                  <Github size={16} />
                </a>
                <a href="#" className="text-gray-400 hover:text-sky-400 transition-colors" aria-label="Twitter">
                  <Twitter size={16} />
                </a>
                <a href="#" className="text-gray-400 hover:text-green-400 transition-colors" aria-label="Discord">
                  <MessageSquare size={16} />
                </a>
              </div>
            </div>
          </div>

          {/* Bottom disclaimer */}
          <div className="mt-4 pt-4 border-t border-gray-800">
            <p className="text-xs text-gray-500 text-center">
              Trading involves risk. Past performance is not indicative of future results. 
              This platform is for educational purposes only.
            </p>
            <p className="text-xs text-gray-600 text-center mt-2">
              © 2024 Deriv Trading Suite. All rights reserved. 
              {marketData?.symbol && ` Trading symbol: ${marketData.symbol}`}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;