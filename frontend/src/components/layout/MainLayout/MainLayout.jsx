// frontend/src/components/layout/MainLayout/MainLayout.jsx
// frontend/src/components/layout/MainLayout/MainLayout.jsx
import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar, Header, LoadingSpinner } from '../../Common';
import Footer from '../Footer/Footer';
import { useApp } from '../../../context/AppContext';
import { useTrading } from '../../../hooks/useTrading';
import { Clock, RefreshCw, Bell, Settings, Play, StopCircle } from 'lucide-react';

const MainLayout = () => {
  const { sidebarCollapsed, mobileMenuOpen, toggleMobileMenu } = useApp();
  const {
    loading,
    refreshAllData,
    lastUpdateTime,
    wsConnectionStatus,
    botStatus,
    handleQuickBotToggle,
    autoRefresh,
    refreshProgress,
    handleManualRefresh,
  } = useTrading();

  const [isLoaded, setIsLoaded] = useState(false);
  const location = useLocation();

  const PAGE_TITLES = {
    '/dashboard': 'Dashboard',
    '/trading': 'Live Trading',
    '/analytics': 'Analytics',
    '/settings': 'Settings',
  };
  const pageTitle = PAGE_TITLES[location.pathname] || 'Trading Suite';

  useEffect(() => {
    setIsLoaded(false);
    const loadData = async () => {
      try {
        await refreshAllData();
      } catch (err) {
        console.error('Data refresh failed', err);
      } finally {
        setIsLoaded(true);
      }
    };
    loadData();
  }, []);

  const formatTimeSince = (timestamp) => {
    if (!timestamp) return '—';
    const diff = Math.floor((Date.now() - new Date(timestamp)) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <div className="min-h-screen bg-bgApp text-gray-100 overflow-hidden">

      {/* 🔹 Fullscreen Loading Overlay */}
      {!isLoaded && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-md">
          <LoadingSpinner 
            size="xl"
            text="Loading dashboard..."
            type="premium"
            fullScreen
          />
        </div>
      )}

      {/* Sidebar */}
      <Sidebar />

      {/* Main content wrapper */}
      <div className={`flex flex-col min-h-screen transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>

        {/* ================= HEADER ================= */}
        <Header>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between px-4 md:px-6 py-4 bg-gray-900/50 backdrop-blur-sm border-b border-gray-800">

            {/* Title & Status */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                {pageTitle}
              </h1>
              <div className="flex items-center gap-4 text-gray-400 text-sm">
                <span className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${wsConnectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
                  {wsConnectionStatus === 'connected' ? 'Live' : wsConnectionStatus}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={14} />
                  Updated {formatTimeSince(lastUpdateTime)}
                </span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 mt-3 md:mt-0">

              {/* Start/Stop Bot */}
              <button
                className={`flex items-center gap-1 px-3 py-1 rounded-lg font-semibold transition-colors ${
                  botStatus === 'running' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                }`}
                onClick={handleQuickBotToggle}
                disabled={loading}
              >
                {botStatus === 'running' ? <StopCircle size={16} /> : <Play size={16} />}
                {botStatus === 'running' ? 'Stop Bot' : 'Start Bot'}
              </button>

              {/* Manual Refresh */}
              <button
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors relative"
                onClick={() => handleManualRefresh('all')}
                disabled={loading}
              >
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                {autoRefresh && (
                  <div
                    className="absolute bottom-0 left-0 h-1 bg-blue-500 transition-all duration-300"
                    style={{ width: `${refreshProgress}%` }}
                  />
                )}
              </button>

              {/* Notifications & Settings */}
              <button className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors">
                <Bell size={18} />
              </button>
              <button className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors">
                <Settings size={18} />
              </button>
            </div>
          </div>
        </Header>

        {/* ================= MAIN CONTENT ================= */}
        <main className="flex-1 p-4 md:p-6 overflow-auto custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-sm border border-gray-800 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300">
              <Outlet />
            </div>
          </div>
        </main>

        {/* Footer */}
        <Footer />
      </div>

      {/* Mobile Menu Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 md:hidden bg-black/70 backdrop-blur-sm transition-opacity duration-300"
          onClick={toggleMobileMenu}
        />
      )}
    </div>
  );
};

export default MainLayout;

