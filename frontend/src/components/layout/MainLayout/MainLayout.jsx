// frontend/src/components/layout/MainLayout/MainLayout.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar, Header, LoadingSpinner } from '../../Common';
import Footer from '../Footer/Footer';
import { useApp } from '../../../context/AppContext';
import { useTrading } from '../../../hooks/useTrading';
import { useToast } from '../../../context/ToastContext';
import { Clock, Wifi, WifiOff, Activity, RefreshCw } from 'lucide-react';

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/trading': 'Live Trading',
  '/analytics': 'Analytics',
  '/settings': 'Settings',
};

const MainLayout = () => {
  const { sidebarCollapsed, mobileMenuOpen, toggleMobileMenu } = useApp();
  const { loading, refreshAllData, lastUpdateTime, wsConnectionStatus, manualReconnect } = useTrading();
  const { addToast } = useToast();
  const [isLoaded, setIsLoaded] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const pageTitle = PAGE_TITLES[location.pathname] || 'Deriv Trading Suite';

  // Initial load with fade-in animation
  useEffect(() => {
    setIsLoaded(false);
    const load = async () => {
      try {
        await refreshAllData();
        addToast('Data loaded', 'success');
      } catch {
        addToast('Failed to load data', 'error');
      } finally {
        setTimeout(() => setIsLoaded(true), 500); // Allow time for fade-in
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

  return (
    <div className="min-h-screen bg-bgApp text-gray-100 flex overflow-hidden animate-fade-in">
      {/* Loading overlay with professional spinner */}
      {!isLoaded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
          <LoadingSpinner size="xl" text="Loading..." fullScreen />
        </div>
      )}

      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
        {/* Header with enhanced controls */}
        <Header>
          <div className="flex justify-between items-center px-4 py-3 bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 shadow-lg">
            <h1 className="text-xl font-bold text-primary">{pageTitle}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-300">
              {/* Connection status with tooltip */}
              <div className="flex items-center gap-1" title={`WebSocket: ${wsConnectionStatus}`}>
                {wsConnectionStatus === 'connected' ? <Wifi className="w-4 h-4 text-green-400 animate-pulse-slow" /> : <WifiOff className="w-4 h-4 text-red-400" />}
                <span className="capitalize">{wsConnectionStatus}</span>
              </div>

              {/* Last update */}
              <div className="flex items-center gap-1" title="Last data update">
                <Clock className="w-4 h-4" />
                <span>Updated {formatTimeSince(lastUpdateTime)}</span>
              </div>

              {/* Refresh button */}
              <button
                onClick={refreshAllData}
                className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors duration-200"
                aria-label="Refresh data"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              {/* Reconnect button (only if disconnected) */}
              {wsConnectionStatus !== 'connected' && (
                <button
                  onClick={manualReconnect}
                  className="px-3 py-1 rounded-lg bg-primary hover:bg-primary-dark text-white text-xs transition-colors duration-200"
                  aria-label="Reconnect WebSocket"
                >
                  Reconnect
                </button>
              )}
            </div>
          </div>
        </Header>

        {/* Page content with scroll */}
        <main className="flex-1 p-4 overflow-auto bg-gradient-to-br from-gray-900 to-gray-950">
          <Outlet />
        </main>

        {/* Footer */}
        <Footer />
      </div>

      {/* Mobile backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={toggleMobileMenu}
          aria-hidden="true"
        />
      )}
    </div>
  );
};

export default MainLayout;
