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

  // Initial load
  useEffect(() => {
    setIsLoaded(false);
    const load = async () => {
      try {
        await refreshAllData();
        addToast('Data loaded', 'success');
      } catch {
        addToast('Failed to load data', 'error');
      } finally {
        setTimeout(() => setIsLoaded(true), 500);
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
    <div className="min-h-screen bg-gray-900 text-gray-100 flex overflow-hidden">

      {/* Loading overlay */}
      {!isLoaded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
          <LoadingSpinner size="xl" text="Loading..." fullScreen />
        </div>
      )}

      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>

        {/* Header */}
        <Header>
          <div className="flex justify-between items-center px-4 py-3 bg-gray-800/50 backdrop-blur-sm border-b border-gray-700">
            <h1 className="text-xl font-bold">{pageTitle}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-300">

              {/* Connection */}
              <div className="flex items-center gap-1">
                {wsConnectionStatus === 'connected' ? <Wifi className="w-4 h-4 text-green-400" /> : <WifiOff className="w-4 h-4 text-red-400" />}
                <span>{wsConnectionStatus}</span>
              </div>

              {/* Last update */}
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>Updated {formatTimeSince(lastUpdateTime)}</span>
              </div>

              {/* Refresh */}
              <button
                onClick={refreshAllData}
                className="p-1 rounded bg-gray-700 hover:bg-gray-600 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              {/* Reconnect */}
              {wsConnectionStatus !== 'connected' && (
                <button
                  onClick={manualReconnect}
                  className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-xs"
                >
                  Reconnect
                </button>
              )}

            </div>
          </div>
        </Header>

        {/* Page content */}
        <main className="flex-1 p-4 overflow-auto">
          <Outlet />
        </main>

        {/* Footer */}
        <Footer />
      </div>

      {/* Mobile backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden bg-black/50 backdrop-blur-sm"
          onClick={toggleMobileMenu}
        />
      )}
    </div>
  );
};

export default MainLayout;
