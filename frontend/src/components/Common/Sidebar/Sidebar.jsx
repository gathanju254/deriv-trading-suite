// frontend/src/components/Common/Sidebar/Sidebar.jsx
import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, TrendingUp, BarChart3, Settings, Clock, Wallet, Bot, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { useTrading } from '../../../hooks/useTrading';

const Sidebar = () => {
  const { sidebarCollapsed, toggleSidebar, mobileMenuOpen, toggleMobileMenu } = useApp();
  const { balance, wsConnectionStatus } = useTrading();
  const [pulse, setPulse] = useState(false);

  // Pulse effect on balance update
  useEffect(() => {
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 800);
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
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/70 z-40 md:hidden animate-fade-in transition-opacity duration-300" onClick={toggleMobileMenu} aria-hidden="true" />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 h-full bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 border-r border-gray-700/50 shadow-2xl transition-all duration-500 ease-in-out
          ${sidebarCollapsed ? 'w-20' : 'w-64'} ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} flex flex-col justify-between`}
      >
        {/* Enhanced Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
              <Bot size={22} className="text-white" />
            </div>
            {!sidebarCollapsed && <span className="font-bold text-lg text-primary tracking-wide">Deriv Suite</span>}
          </div>
          {!sidebarCollapsed && (
            <button onClick={toggleSidebar} className="p-2 hover:bg-gray-700 rounded-lg transition-all duration-200 hover:scale-110" aria-label="Collapse sidebar">
              <ChevronLeft size={18} />
            </button>
          )}
        </div>

        {/* Navigation with improved hover effects */}
        <nav className="flex-1 py-6 space-y-2">
          {menu.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => window.innerWidth < 768 && toggleMobileMenu()}
              className={({ isActive }) =>
                `mx-3 flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 hover:scale-105
                 ${isActive ? 'bg-gradient-to-r from-primary/40 to-primary/20 text-white shadow-lg border-l-4 border-primary' : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'}
                 ${sidebarCollapsed ? 'justify-center' : ''}`
              }
            >
              <Icon size={20} />
              {!sidebarCollapsed && <span className="font-medium">{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Footer with enhanced balance display */}
        <div className="p-4 border-t border-gray-700/50 space-y-4 relative">
          {/* WS Status */}
          <div className={`flex items-center gap-3 ${sidebarCollapsed && 'justify-center'}`} title={`Connection: ${wsConnectionStatus}`}>
            <span className={`w-3 h-3 rounded-full ${wsConnectionStatus === 'connected' ? 'bg-green-500 animate-pulse-slow' : 'bg-red-500'} shadow-md`} />
            {!sidebarCollapsed && <span className="text-sm capitalize text-gray-300 font-medium">{wsConnectionStatus}</span>}
          </div>

          {/* Balance with better formatting */}
          <div className={`flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-gray-800 to-gray-900 shadow-lg transition-all duration-300 ${pulse && 'animate-pulse'} ${sidebarCollapsed && 'justify-center'}`} title="Account Balance">
            <Wallet size={18} className="text-accent" />
            {!sidebarCollapsed && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Balance</p>
                <p className="font-bold text-primary text-lg">${balance?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
            )}
          </div>

          {/* Expand button */}
          {sidebarCollapsed && (
            <button
              onClick={toggleSidebar}
              className="absolute -right-3 top-1/2 w-6 h-12 bg-gray-800 border border-gray-700 rounded-r-lg flex items-center justify-center hover:bg-gray-700 transition-all duration-200 hover:scale-110 shadow-md"
              aria-label="Expand sidebar"
            >
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
