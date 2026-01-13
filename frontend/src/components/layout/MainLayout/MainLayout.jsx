// frontend/src/components/layout/MainLayout/MainLayout.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar, Header, LoadingSpinner } from '../../Common';
import Footer from '../Footer/Footer';
import { useApp } from '../../../context/AppContext';
import { useTrading } from '../../../hooks/useTrading';
import { useToast } from '../../../context/ToastContext';
import { Clock, Wifi, WifiOff, RefreshCw, Activity } from 'lucide-react';

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/trading': 'Live Trading',
  '/analytics': 'Analytics',
  '/history': 'History',
  '/settings': 'Settings',
};

const MainLayout = () => {
  const { sidebarCollapsed, mobileMenuOpen, toggleMobileMenu } = useApp();
  const { loading, refreshAllData, lastUpdateTime, wsConnectionStatus, manualReconnect, botStatus } = useTrading();
  const { addToast } = useToast();
  const [isLoaded, setIsLoaded] = useState(false);
  const location = useLocation();

  const pageTitle = PAGE_TITLES[location.pathname] || 'Deriv Trading Suite';

  // Enhanced fade-in initial load with smoother animation
  useEffect(() => {
    setIsLoaded(false);
    const load = async () => {
      try {
        await refreshAllData();
        setTimeout(() => setIsLoaded(true), 800);
      } catch {
        addToast('Failed to load data', 'error');
        setTimeout(() => setIsLoaded(true), 800);
      }
    };
    load();
  }, []);

  const formatTimeSince = useCallback((timestamp) => {
    if (!timestamp) return '—';
    const diff = Math.floor((Date.now() - new Date(timestamp)) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  }, []);

  const StatusIndicator = ({ status }) => (
    <span className={`w-3 h-3 rounded-full ${
      status === 'connected' || status === 'running' 
        ? 'bg-success-500 animate-pulse-slow' 
        : status === 'connecting' 
          ? 'bg-accent-500 animate-pulse' 
          : 'bg-secondary-500'
    }`} />
  );

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-gray-100 overflow-hidden">
      {/* Enhanced loading overlay */}
      {!isLoaded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/95 backdrop-blur-xl">
          <div className="relative">
            <LoadingSpinner 
              size="xl" 
              text="Initializing Trading Suite..." 
              fullScreen={false}
              type="premium"
              theme="blue"
              gradient={true}
              subText="Loading market data and strategies..."
            />
          </div>
        </div>
      )}

      <Sidebar />

      <div
        className={`flex-1 flex flex-col transition-all duration-500 ease-out
        pt-16 md:pt-18
        ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}
      >

        {/* Fixed Header Container */}
        <div className="sticky top-0 z-40 bg-gray-900/90 backdrop-blur-xl border-b border-gray-800/50 shadow-2xl">
          <Header />
        </div>
        
        {/* Page Header with Status Bar */}
        <div className="px-6 py-4 bg-gray-900/80 backdrop-blur-xl border-b border-gray-800/50 shadow-2xl">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-center gap-4">
            {/* Page Title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center shadow-glow">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent tracking-tight">
                {pageTitle}
              </h1>
            </div>

            {/* Status Bar - Simplified to dots only */}
            <div className="flex items-center gap-3">
              <StatusIndicator status={botStatus} />
              <StatusIndicator status={wsConnectionStatus} />
              
              {/* Last Update */}
              <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-800/60 backdrop-blur-sm rounded-xl border border-gray-700/50">
                <Clock className="w-4 h-4 text-gray-400" />
                <div className="flex flex-col">
                  <span className="text-xs text-gray-400">Last Update</span>
                  <span className="text-sm font-semibold text-white font-mono">
                    {formatTimeSince(lastUpdateTime)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={refreshAllData}
                  className="p-2.5 rounded-xl bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 border border-gray-700/50 transition-all duration-200 hover:scale-105 hover:shadow-glow shadow-lg"
                  aria-label="Refresh data"
                  disabled={loading}
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>

                {wsConnectionStatus !== 'connected' && (
                  <button
                    onClick={manualReconnect}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 text-white text-sm font-semibold transition-all duration-200 hover:shadow-glow shadow-lg"
                    aria-label="Reconnect WebSocket"
                  >
                    Reconnect
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto">
            <div className="animate-fade-in">
              <Outlet />
            </div>
          </div>
        </main>

        <Footer />
      </div>

      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden bg-black/70 backdrop-blur-sm animate-fade-in"
          onClick={toggleMobileMenu}
          aria-hidden="true"
        />
      )}
    </div>
  );
};

export default MainLayout;