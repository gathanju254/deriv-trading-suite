// frontend/src/components/layout/MainLayout/MainLayout.jsx
import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from '../../common/Header/Header';
import Sidebar from '../../common/Sidebar/Sidebar';
import Footer from '../../layout/Footer/Footer';
import { useApp } from '../../../context/AppContext';
import { useTrading } from '../../../hooks/useTrading';
import './MainLayout.css';

const MainLayout = () => {
  const { sidebarCollapsed, mobileMenuOpen, toggleMobileMenu } = useApp();
  const { loading, refreshAllData } = useTrading();
  const [isLoaded, setIsLoaded] = useState(false);
  const location = useLocation();

  // Map routes to page titles
  const PAGE_TITLES = {
    '/dashboard': 'Dashboard',
    '/trading': 'Live Trading',
    '/analytics': 'Analytics',
    '/settings': 'Settings',
  };
  const pageTitle = PAGE_TITLES[location.pathname] || 'Deriv Trading Suite';

  // Initial load
  useEffect(() => {
    setIsLoaded(false);
    const load = async () => {
      try {
        await refreshAllData(); // wait until data finishes
      } catch (err) {
        console.error('Failed to refresh data', err);
      } finally {
        setIsLoaded(true);
      }
    };
    load();
  }, []); // 🔹 only once on mount

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-gray-100 overflow-hidden">

      {/* Loading Overlay */}
      {!isLoaded && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin" />
            <span className="absolute inset-0 flex items-center justify-center text-sm font-medium text-gray-300">
              Loading...
            </span>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className={`flex flex-col min-h-screen transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>

        {/* Header */}
        <Header />

        {/* Breadcrumb & Page Title */}
        <div className="px-6 py-3 border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto">
            <nav className="flex items-center gap-2 text-sm text-gray-400">
              <span>Home</span>
              <span className="text-gray-600">/</span>
              <span className="font-medium text-gray-300">{pageTitle}</span>
            </nav>
            <h1 className="text-2xl font-bold mt-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              {pageTitle}
            </h1>
          </div>
        </div>

        {/* Main Content Area */}
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
