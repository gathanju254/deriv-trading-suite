// frontend/src/components/layout/MainLayout/MainLayout.jsx
// frontend/src/components/layout/MainLayout/MainLayout.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar, Header, LoadingSpinner } from '../../Common';
import Footer from '../Footer/Footer';
import { useApp } from '../../../context/AppContext';
import { useTrading } from '../../../hooks/useTrading';
import { useToast } from '../../../context/ToastContext';
import {
  Clock,
  RefreshCw,
  Bell,
  Settings,
  Play,
  StopCircle,
  Zap,
  BarChart3,
  TrendingUp,
  Shield,
  Database,
  Wifi,
  WifiOff,
  AlertCircle,
  CheckCircle,
  XCircle,
  ChevronRight,
  Home,
  Cpu,
  Activity,
  Target,
  Rocket
} from 'lucide-react';

const MainLayout = () => {
  const { sidebarCollapsed, mobileMenuOpen, toggleMobileMenu, darkMode, toggleDarkMode } = useApp();
  const { 
    loading, 
    refreshAllData, 
    lastUpdateTime, 
    wsConnectionStatus, 
    botStatus, 
    startBot, 
    stopBot,
    balance,
    performance,
    tradeHistory,
    signals,
    marketData,
    autoRefresh,
    refreshProgress,
    manualReconnect
  } = useTrading();
  
  const { addToast } = useToast();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showQuickStats, setShowQuickStats] = useState(false);
  const [connectionHealth, setConnectionHealth] = useState(100);
  const [activeTab, setActiveTab] = useState('overview');
  const location = useLocation();
  const navigate = useNavigate();

  // Page titles with icons
  const PAGE_CONFIG = {
    '/dashboard': { title: 'Dashboard', icon: Home, color: 'from-blue-500 to-cyan-500', description: 'Real-time overview' },
    '/trading': { title: 'Live Trading', icon: Activity, color: 'from-emerald-500 to-green-500', description: 'Active trading session' },
    '/analytics': { title: 'Analytics', icon: BarChart3, color: 'from-purple-500 to-pink-500', description: 'Performance insights' },
    '/signals': { title: 'Signals', icon: TrendingUp, color: 'from-orange-500 to-amber-500', description: 'Trading signals' },
    '/settings': { title: 'Settings', icon: Settings, color: 'from-gray-500 to-slate-500', description: 'Platform configuration' },
  };

  const currentPage = PAGE_CONFIG[location.pathname] || {
    title: 'Deriv Trading Suite',
    icon: Zap,
    color: 'from-blue-500 to-purple-500',
    description: 'Professional Trading Platform'
  };

  // Initial data load
  useEffect(() => {
    setIsLoaded(false);
    const loadData = async () => {
      try {
        await refreshAllData();
        addToast('Dashboard loaded successfully', 'success');
      } catch (err) {
        addToast('Failed to load initial data', 'error');
        console.error('Data refresh failed', err);
      } finally {
        setTimeout(() => setIsLoaded(true), 800); // Smooth transition
      }
    };
    loadData();
  }, []);

  // Monitor connection health
  useEffect(() => {
    const interval = setInterval(() => {
      if (wsConnectionStatus === 'connected') {
        setConnectionHealth(prev => Math.min(100, prev + 10));
      } else {
        setConnectionHealth(prev => Math.max(0, prev - 20));
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [wsConnectionStatus]);

  // Helper functions
  const formatTimeSince = useCallback((timestamp) => {
    if (!timestamp) return '—';
    const diff = Math.floor((Date.now() - new Date(timestamp)) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  }, []);

  const handleBotToggle = async () => {
    try {
      if (botStatus === 'running') {
        await stopBot();
        addToast('Trading bot stopped', 'info');
      } else {
        await startBot();
        addToast('Trading bot started', 'success');
      }
    } catch (error) {
      addToast(`Failed to ${botStatus === 'running' ? 'stop' : 'start'} bot`, 'error');
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshAllData();
      addToast('Data refreshed successfully', 'success');
    } catch (error) {
      addToast('Refresh failed', 'error');
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleReconnect = async () => {
    try {
      await manualReconnect();
      addToast('Reconnecting...', 'info');
    } catch (error) {
      addToast('Reconnection failed', 'error');
    }
  };

  const getConnectionColor = () => {
    if (wsConnectionStatus === 'connected') {
      if (connectionHealth > 80) return 'bg-gradient-to-r from-emerald-500 to-green-500';
      if (connectionHealth > 60) return 'bg-gradient-to-r from-yellow-500 to-amber-500';
      return 'bg-gradient-to-r from-orange-500 to-red-500';
    }
    return 'bg-gradient-to-r from-red-500 to-pink-500';
  };

  const getStatusIcon = () => {
    switch (wsConnectionStatus) {
      case 'connected': return <Wifi className="w-4 h-4" />;
      case 'disconnected': return <WifiOff className="w-4 h-4" />;
      case 'connecting': return <Activity className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  // Quick stats data
  const quickStats = [
    {
      label: 'Win Rate',
      value: `${performance?.win_rate?.toFixed(1) || '0.0'}%`,
      icon: Target,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-900/30',
      change: '+2.3%',
      trend: 'up'
    },
    {
      label: 'Daily P&L',
      value: `$${performance?.daily_pnl?.toFixed(2) || '0.00'}`,
      icon: TrendingUp,
      color: performance?.daily_pnl > 0 ? 'text-emerald-400' : 'text-red-400',
      bgColor: performance?.daily_pnl > 0 ? 'bg-emerald-900/30' : 'bg-red-900/30',
      change: performance?.daily_pnl > 0 ? '+$45.67' : '-$23.45',
      trend: performance?.daily_pnl > 0 ? 'up' : 'down'
    },
    {
      label: 'Active Trades',
      value: tradeHistory?.filter(t => t.status === 'ACTIVE')?.length || 0,
      icon: Activity,
      color: 'text-blue-400',
      bgColor: 'bg-blue-900/30',
      change: '+2',
      trend: 'up'
    },
    {
      label: 'Signals Today',
      value: signals?.length || 0,
      icon: Zap,
      color: 'text-purple-400',
      bgColor: 'bg-purple-900/30',
      change: '+12',
      trend: 'up'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-gray-100 overflow-hidden">
      {/* 🔹 Fullscreen Loading Overlay */}
      {!isLoaded && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 backdrop-blur-xl">
          <LoadingSpinner 
            size="xl" 
            text="Initializing Trading Platform" 
            type="premium"
            theme="blue"
            fullScreen
            subText="Loading real-time data streams..."
            estimatedTime="5 seconds"
            showProgressRing
            currentProgress={75}
            pulsating
          />
        </div>
      )}

      {/* Sidebar */}
      <Sidebar />

      {/* Main content wrapper */}
      <div className={`
        flex flex-col min-h-screen transition-all duration-500 ease-out
        ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}
        ${mobileMenuOpen ? 'blur-sm md:blur-0' : ''}
      `}>
        
        {/* ================= HEADER ================= */}
        <Header />

        {/* ================= PAGE HEADER ================= */}
        <div className="relative overflow-hidden">
          {/* Gradient background */}
          <div className={`absolute inset-0 bg-gradient-to-r ${currentPage.color} opacity-10`} />
          
          {/* Content */}
          <div className="relative px-4 md:px-6 lg:px-8 py-6 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto">
              {/* Breadcrumb */}
              <nav className="flex items-center gap-2 text-sm mb-3">
                <button 
                  onClick={() => navigate('/dashboard')}
                  className="text-gray-400 hover:text-white transition-colors flex items-center gap-1"
                >
                  <Home className="w-4 h-4" />
                  Dashboard
                </button>
                <ChevronRight className="w-3 h-3 text-gray-600" />
                <span className="font-medium text-white">{currentPage.title}</span>
              </nav>

              {/* Main title area */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl bg-gradient-to-br ${currentPage.color} shadow-lg`}>
                    <currentPage.icon className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                      {currentPage.title}
                    </h1>
                    <p className="text-gray-400 mt-1">{currentPage.description}</p>
                  </div>
                </div>

                {/* Quick actions */}
                <div className="flex items-center gap-3">
                  {/* Bot status indicator */}
                  <div className="hidden lg:flex items-center gap-3 px-4 py-2 rounded-xl bg-gray-900/50 backdrop-blur-sm border border-gray-800">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${botStatus === 'running' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                      <span className="text-sm font-medium">
                        Bot: {botStatus === 'running' ? 'Active' : 'Paused'}
                      </span>
                    </div>
                    <div className="w-px h-4 bg-gray-700" />
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${getConnectionColor()}`} />
                      <span className="text-sm font-medium capitalize">
                        {wsConnectionStatus}
                      </span>
                    </div>
                  </div>

                  {/* Bot toggle button */}
                  <button
                    onClick={handleBotToggle}
                    disabled={loading}
                    className={`
                      flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all duration-300
                      ${botStatus === 'running' 
                        ? 'bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700' 
                        : 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700'
                      }
                      disabled:opacity-50 disabled:cursor-not-allowed
                      shadow-lg hover:shadow-xl transform hover:-translate-y-0.5
                    `}
                  >
                    {botStatus === 'running' ? (
                      <>
                        <StopCircle className="w-5 h-5" />
                        <span>Stop Bot</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5" />
                        <span>Start Bot</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Quick stats bar */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                    Performance Snapshot
                  </h3>
                  <button
                    onClick={() => setShowQuickStats(!showQuickStats)}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    {showQuickStats ? 'Hide Details' : 'Show Details'}
                  </button>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {quickStats.map((stat, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-xl border border-gray-800 transition-all duration-300 hover:scale-[1.02] hover:border-gray-700 ${
                        showQuickStats ? stat.bgColor : 'bg-gray-900/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-400">{stat.label}</span>
                        <div className={`p-1.5 rounded-lg ${stat.bgColor}`}>
                          <stat.icon className={`w-4 h-4 ${stat.color}`} />
                        </div>
                      </div>
                      <div className="flex items-end justify-between">
                        <span className={`text-2xl font-bold ${stat.color}`}>
                          {stat.value}
                        </span>
                        {showQuickStats && (
                          <span className={`text-xs font-medium ${
                            stat.trend === 'up' ? 'text-emerald-400' : 'text-red-400'
                          }`}>
                            {stat.change}
                          </span>
                        )}
                      </div>
                      {showQuickStats && (
                        <div className="mt-3 pt-3 border-t border-gray-800">
                          <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                stat.trend === 'up' 
                                  ? 'bg-gradient-to-r from-emerald-500 to-green-500' 
                                  : 'bg-gradient-to-r from-red-500 to-pink-500'
                              }`}
                              style={{ width: '75%' }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Connection status bar */}
              <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-gray-900/50 to-gray-800/50 border border-gray-800 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className={`w-3 h-3 rounded-full ${getConnectionColor()} animate-pulse`} />
                      <div className="absolute inset-0 rounded-full animate-ping bg-current opacity-20" />
                    </div>
                    <div>
                      <p className="font-medium">Connection Status</p>
                      <p className="text-sm text-gray-400">
                        {wsConnectionStatus === 'connected' 
                          ? 'Real-time data streaming active' 
                          : 'Connection interrupted'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-300">
                        Updated {formatTimeSince(lastUpdateTime)}
                      </span>
                    </div>
                    
                    <div className="hidden md:flex items-center gap-2">
                      <Database className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-300">
                        Balance: <span className="font-bold text-emerald-400">${balance?.toFixed(2)}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${getConnectionColor()} transition-all duration-500`}
                          style={{ width: `${connectionHealth}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold w-8">
                        {connectionHealth}%
                      </span>
                    </div>
                    
                    <button
                      onClick={handleReconnect}
                      disabled={wsConnectionStatus === 'connected'}
                      className="px-3 py-1.5 text-xs rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {wsConnectionStatus === 'connected' ? 'Connected' : 'Reconnect'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================= MAIN CONTENT ================= */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
          <div className="max-w-7xl mx-auto">
            {/* Content tabs (optional) */}
            <div className="mb-6">
              <div className="flex gap-1 p-1 rounded-xl bg-gray-900/50 border border-gray-800 w-fit">
                {['overview', 'performance', 'trades', 'signals'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`
                      px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 capitalize
                      ${activeTab === tab 
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' 
                        : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                      }
                    `}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Content area */}
            <div className="relative">
              {/* Floating refresh button */}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing || loading}
                className="fixed bottom-24 right-6 z-40 p-3 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 shadow-xl hover:shadow-2xl transform hover:scale-110 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Refresh data"
              >
                <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>

              {/* Auto refresh indicator */}
              {autoRefresh && (
                <div className="fixed bottom-24 right-20 z-30 flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-900/90 backdrop-blur-sm border border-gray-700 shadow-lg">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs text-gray-300">Auto-refresh</span>
                  <div className="w-16 h-1 bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-1000"
                      style={{ width: `${refreshProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Content wrapper */}
              <div className="bg-gradient-to-br from-gray-900/80 via-gray-900/60 to-gray-800/80 backdrop-blur-xl border border-gray-800 rounded-2xl shadow-2xl overflow-hidden transition-all duration-500">
                {/* Content shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
                
                {/* Actual content */}
                <Outlet />
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <Footer />
      </div>

      {/* Mobile Menu Backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-30 md:hidden bg-black/70 backdrop-blur-xl transition-all duration-500"
          onClick={toggleMobileMenu}
        />
      )}
    </div>
  );
};

// Add custom animations
const styleSheet = document.styleSheets[0];
styleSheet.insertRule(`
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  .animate-shimmer {
    animation: shimmer 2s infinite;
  }
`);

export default MainLayout;