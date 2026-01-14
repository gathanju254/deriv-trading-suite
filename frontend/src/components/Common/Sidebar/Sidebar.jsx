// frontend/src/components/Common/Sidebar/Sidebar.jsx
import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, TrendingUp, BarChart3, Settings, Clock, Wallet, Bot, ChevronLeft, ChevronRight, Shield, Activity } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { useTrading } from '../../../hooks/useTrading';

const Sidebar = () => {
  const { sidebarCollapsed, toggleSidebar, mobileMenuOpen, toggleMobileMenu } = useApp();
  const { balance, wsConnectionStatus, botStatus } = useTrading();
  const [pulse, setPulse] = useState(false);
  const location = useLocation();

  // Pulse effect on balance update
  useEffect(() => {
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 1000);
    return () => clearTimeout(t);
  }, [balance]);

  const menu = [
    { to: '/dashboard', icon: Home, label: 'Dashboard' },
    { to: '/trading', icon: TrendingUp, label: 'Live Trading' },
    { to: '/analytics', icon: BarChart3, label: 'Analytics' },
    { to: '/history', icon: Clock, label: 'History' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <>
      {/* Mobile overlay - Improved for full overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/80 z-40 md:hidden animate-fade-in" 
          onClick={toggleMobileMenu} 
          aria-hidden="true"
        />
      )}

      {/* Sidebar - Fixed positioning, overlay on mobile */}
      <aside
        className={`fixed left-0 top-0 z-50 h-full bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 border-r border-gray-800/50 shadow-2xl transition-all duration-500 ease-out
          ${sidebarCollapsed ? 'w-20' : 'w-72'} ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} flex flex-col justify-between`}
      >
        {/* Enhanced Header */}
        <div className="h-18 flex items-center justify-between px-4 border-b border-gray-800/50 bg-gradient-to-r from-gray-900/50 to-gray-900/30">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 flex items-center justify-center shadow-glow">
              <Bot size={24} className="text-white" />
            </div>
            {!sidebarCollapsed && (
              <div className="flex flex-col">
                <span className="font-bold text-lg bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent tracking-tight">
                  Deriv Suite
                </span>
                <span className="text-xs text-gray-400">Trading Platform</span>
              </div>
            )}
          </div>
          {!sidebarCollapsed && (
            <button 
              onClick={toggleSidebar} 
              className="p-2 hover:bg-gray-800/50 rounded-xl transition-all duration-200 hover:scale-110 border border-gray-700/50"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft size={20} className="text-gray-400" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 space-y-1.5 px-3">
          {menu.map(({ to, icon: Icon, label }) => {
            const isActive = location.pathname === to || location.pathname.startsWith(to);
            return (
              <NavLink
                key={to}
                to={to}
                onClick={() => window.innerWidth < 768 && toggleMobileMenu()}
                className={`group flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 hover:scale-[1.02]
                  ${isActive 
                    ? 'bg-gradient-to-r from-primary-900/40 via-primary-800/30 to-primary-900/20 text-white shadow-inner-lg border-l-4 border-primary-500' 
                    : 'text-gray-400 hover:bg-gray-800/30 hover:text-white'}
                  ${sidebarCollapsed ? 'justify-center' : ''}`}
              >
                <Icon size={22} className={`${isActive ? 'text-primary-400' : 'text-gray-500 group-hover:text-primary-400'}`} />
                {!sidebarCollapsed && (
                  <span className="font-medium text-sm tracking-wide">{label}</span>
                )}
                {isActive && !sidebarCollapsed && (
                  <div className="ml-auto w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer Section */}
        <div className="p-4 border-t border-gray-800/50 space-y-4 relative">
          {/* Connection Status */}
          <div className={`flex items-center gap-3 ${sidebarCollapsed && 'justify-center'}`}>
            <div className="relative">
              <span className={`w-3 h-3 rounded-full ${
                wsConnectionStatus === 'connected' 
                  ? 'bg-success-500 animate-pulse-slow shadow-glow-success' 
                  : 'bg-secondary-500'
              } shadow-md`} />
              {wsConnectionStatus === 'connected' && (
                <span className="absolute -inset-1.5 rounded-full bg-success-500/20 animate-ping" />
              )}
            </div>
            {!sidebarCollapsed && (
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-300 capitalize">{wsConnectionStatus}</span>
                <span className="text-xs text-gray-500">WebSocket</span>
              </div>
            )}
          </div>

          {/* Balance Card */}
          <div className={`flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800/50 shadow-xl transition-all duration-300 ${pulse && 'animate-pulse-soft'} ${sidebarCollapsed && 'justify-center'}`}>
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-600 to-accent-800 flex items-center justify-center shadow-lg">
                <Wallet size={22} className="text-white" />
              </div>
              {botStatus === 'running' && (
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-success-500 animate-pulse" />
              )}
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Balance</span>
                  <Shield className="w-3.5 h-3.5 text-success-500" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    ${balance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                  </span>
                  <span className="text-xs text-gray-500">USD</span>
                </div>
              </div>
            )}
          </div>

          {/* Expand/Collapse Button */}
          {sidebarCollapsed && (
            <button
              onClick={toggleSidebar}
              className="absolute -right-3 top-1/2 transform -translate-y-1/2 w-8 h-16 bg-gradient-to-b from-gray-900 to-gray-950 border border-gray-800/50 rounded-r-xl flex items-center justify-center hover:bg-gray-800 transition-all duration-200 hover:scale-110 shadow-xl"
              aria-label="Expand sidebar"
            >
              <ChevronRight size={18} className="text-gray-400" />
            </button>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;