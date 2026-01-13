// frontend/src/components/layout/MainLayout/MainLayout.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar, Header, LoadingSpinner } from '../../Common';
import Footer from '../Footer/Footer';
import { useApp } from '../../../context/AppContext';
import { useTrading } from '../../../hooks/useTrading';
import { useToast } from '../../../context/ToastContext';
import { Clock, Wifi, WifiOff, RefreshCw } from 'lucide-react';

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/trading': 'Live Trading',
  '/analytics': 'Analytics',
  '/history': 'History',
  '/settings': 'Settings',
};

const MainLayout = () => {
  const { sidebarCollapsed, mobileMenuOpen, toggleMobileMenu } = useApp();
  const { loading, refreshAllData, lastUpdateTime, wsConnectionStatus, manualReconnect } = useTrading();
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
        addToast('Data loaded successfully', 'success');
      } catch {
        addToast('Failed to load data', 'error');
      } finally {
        setTimeout(() => setIsLoaded(true), 600); // Slightly longer for smoother transition
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
    <div className="min-h-screen flex bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-100 overflow-hidden animate-fade-in">
      {/* Enhanced loading overlay with better blur and animation */}
      {!isLoaded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-lg transition-opacity duration-500">
          <LoadingSpinner size="xl" text="Initializing..." fullScreen />
        </div>
      )}

      <Sidebar />

      <div className={`flex-1 flex flex-col transition-all duration-500 ease-in-out ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
        <Header>
          <div className="flex justify-between items-center px-6 py-4 bg-gray-800/60 backdrop-blur-md border-b border-gray-700/50 shadow-xl">
            <h1 className="text-2xl font-bold text-primary tracking-wide">{pageTitle}</h1>
            <div className="flex items-center gap-6 text-sm text-gray-300">
              {/* Enhanced WS Status with better icons */}
              <div className="flex items-center gap-2" title={`WebSocket: ${wsConnectionStatus}`}>
                {wsConnectionStatus === 'connected' ? (
                  <Wifi className="w-5 h-5 text-green-400 animate-pulse-slow" />
                ) : (
                  <WifiOff className="w-5 h-5 text-red-400" />
                )}
                <span className="capitalize font-medium">{wsConnectionStatus}</span>
              </div>

              {/* Last update with improved formatting */}
              <div className="flex items-center gap-2" title="Last data update">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="font-mono">Updated {formatTimeSince(lastUpdateTime)}</span>
              </div>

              {/* Refresh button with hover effect */}
              <button
                onClick={refreshAllData}
                className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-all duration-200 hover:scale-105 shadow-md"
                aria-label="Refresh data"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              {/* Reconnect button with enhanced styling */}
              {wsConnectionStatus !== 'connected' && (
                <button
                  onClick={manualReconnect}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-primary-dark text-white text-xs font-semibold transition-all duration-200 hover:shadow-lg hover:scale-105"
                  aria-label="Reconnect WebSocket"
                >
                  Reconnect
                </button>
              )}
            </div>
          </div>
        </Header>

        <main className="flex-1 p-6 overflow-auto bg-gradient-to-br from-gray-900 to-gray-950">
          <Outlet />
        </main>

        <Footer />
      </div>

      {/* Mobile backdrop with improved animation */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden bg-black/60 backdrop-blur-sm animate-fade-in transition-opacity duration-300"
          onClick={toggleMobileMenu}
          aria-hidden="true"
        />
      )}
    </div>
  );
};

export default MainLayout;
