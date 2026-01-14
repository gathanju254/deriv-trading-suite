// frontend/src/components/layout/MainLayout/MainLayout.jsx
// frontend/src/components/layout/MainLayout/MainLayout.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar, Header, LoadingSpinner } from '../../Common';
import Footer from '../Footer/Footer';
import { useApp } from '../../../context/AppContext';
import { useTrading } from '../../../hooks/useTrading';
import { useToast } from '../../../context/ToastContext';
import { Clock, RefreshCw } from 'lucide-react';

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/trading': 'Live Trading',
  '/analytics': 'Analytics',
  '/history': 'History',
  '/settings': 'Settings',
};

const MainLayout = () => {
  const { sidebarCollapsed, mobileMenuOpen, toggleMobileMenu } = useApp();
  const { loading, refreshAllData, lastUpdateTime } = useTrading();
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

  return (
    <div className="min-h-screen flex bg-gray-950 text-gray-100 overflow-hidden">
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

      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-72'}`}>
        <Header />
        
        {/* Page Header - Simplified */}
        <div className="sticky top-0 z-30 px-4 md:px-6 py-3 md:py-4 bg-gray-900/90 backdrop-blur-xl border-b border-gray-800/50">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
            {/* Page Title */}
            <div className="flex items-center gap-3">
              <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent tracking-tight">
                {pageTitle}
              </h1>
            </div>

            {/* Status Bar - Simplified */}
            <div className="flex items-center gap-3">
              {/* Last Update */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-gray-800/60 backdrop-blur-sm rounded-lg border border-gray-700/50">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-300">
                  {formatTimeSince(lastUpdateTime)}
                </span>
              </div>

              {/* Action Button */}
              <button
                onClick={refreshAllData}
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700/50 transition-all duration-200 hover:scale-105"
                aria-label="Refresh data"
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
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