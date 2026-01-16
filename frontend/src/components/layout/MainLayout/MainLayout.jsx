// frontend/src/components/layout/MainLayout/MainLayout.jsx
// frontend/src/components/layout/MainLayout/MainLayout.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar, Header, LoadingSpinner } from '../../Common';
import Footer from '../Footer/Footer';
import FloatingContact from '../../Common/FloatingContact/FloatingContact';

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

  // Initial load
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        await refreshAllData();
      } catch {
        addToast('Failed to load data', 'error');
      } finally {
        if (mounted) {
          setTimeout(() => setIsLoaded(true), 700);
        }
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const formatTimeSince = useCallback((timestamp) => {
    if (!timestamp) return '—';
    const diff = Math.floor((Date.now() - new Date(timestamp)) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  }, []);

  return (
    <div className="relative isolate min-h-screen flex bg-gray-950 text-gray-100 overflow-hidden">
      {/* Global Loading Overlay */}
      {!isLoaded && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-950/95 backdrop-blur-xl">
          <LoadingSpinner
            size="xl"
            text="Initializing Trading Suite..."
            type="premium"
            theme="blue"
            gradient
            subText="Loading market data and strategies..."
          />
        </div>
      )}

      <Sidebar />

      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          sidebarCollapsed ? 'md:ml-20' : 'md:ml-72'
        }`}
      >
        <Header />

        {/* Page Header */}
        <div className="sticky top-0 z-30 px-4 md:px-6 py-3 md:py-4 bg-gray-900/90 backdrop-blur-xl border-b border-gray-800/50">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent tracking-tight">
              {pageTitle}
            </h1>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-gray-800/60 rounded-lg border border-gray-700/50">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-300">
                  {formatTimeSince(lastUpdateTime)}
                </span>
              </div>

              <button
                onClick={refreshAllData}
                disabled={loading}
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700/50 transition hover:scale-105 disabled:opacity-50"
                aria-label="Refresh data"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto pb-28">
          <div className="max-w-7xl mx-auto animate-fade-in">
            <Outlet />
          </div>
        </main>

        <Footer />
      </div>

      {/* Floating Contact (hidden when mobile menu is open) */}
      {!mobileMenuOpen && <FloatingContact />}

      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden bg-black/70 backdrop-blur-sm"
          onClick={toggleMobileMenu}
          aria-hidden="true"
        />
      )}
    </div>
  );
};

export default MainLayout;
