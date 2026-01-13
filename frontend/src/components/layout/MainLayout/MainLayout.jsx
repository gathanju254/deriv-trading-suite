// frontend/src/components/layout/MainLayout/MainLayout.jsx
import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from '../../Common/Header/Header';
import Sidebar from '../../Common/Sidebar/Sidebar';
import Footer from '../../layout/Footer/Footer';
import { useApp } from '../../../context/AppContext';
import { useTrading } from '../../../hooks/useTrading';
import './MainLayout.css';

const MainLayout = () => {
  const { sidebarCollapsed, mobileMenuOpen, toggleMobileMenu } = useApp();
  const { loading, refreshAllData } = useTrading();
  const [isLoaded, setIsLoaded] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const location = useLocation();
  
  // Get page title from route
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard') return 'Dashboard';
    if (path === '/trading') return 'Live Trading';
    if (path === '/analytics') return 'Analytics';
    if (path === '/settings') return 'Settings';
    return 'Deriv Trading Suite';
  };

  useEffect(() => {
    // Initial load animation
    const timer = setTimeout(() => setIsLoaded(true), 100);
    
    // Refresh data on route change
    refreshAllData();
    
    return () => clearTimeout(timer);
  }, [location.pathname, refreshAllData]);

  useEffect(() => {
    // Show loading indicator when data is loading
    if (loading) {
      setShowLoading(true);
    } else {
      const timer = setTimeout(() => setShowLoading(false), 300);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-gray-100 overflow-hidden">
      {/* Loading overlay */}
      {showLoading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-medium text-gray-300">Loading...</span>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className={`
        flex flex-col min-h-screen transition-all duration-300 ease-in-out
        ${isLoaded ? 'opacity-100' : 'opacity-0'}
        ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}
      `}>
        {/* Header */}
        <Header />

        {/* Breadcrumb */}
        <div className="px-6 py-3 border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto">
            <nav className="flex items-center gap-2 text-sm">
              <span className="text-gray-400">Home</span>
              <span className="text-gray-600">/</span>
              <span className="font-medium text-gray-300">{getPageTitle()}</span>
            </nav>
            <h1 className="text-2xl font-bold mt-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              {getPageTitle()}
            </h1>
          </div>
        </div>

        {/* Main content area */}
        <main className="flex-1 p-4 md:p-6 overflow-auto custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            {/* Content wrapper with glass effect */}
            <div className={`
              bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-sm
              border border-gray-800 rounded-2xl shadow-2xl overflow-hidden
              transition-all duration-300
              ${mobileMenuOpen ? 'blur-sm md:blur-0' : ''}
            `}>
              <Outlet />
            </div>
          </div>
        </main>

        {/* Footer */}
        <Footer />
      </div>

      {/* Mobile menu backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm z-30 md:hidden transition-opacity duration-300"
          onClick={toggleMobileMenu}
        />
      )}
    </div>
  );
};

export default MainLayout;