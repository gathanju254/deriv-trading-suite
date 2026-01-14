// frontend/src/components/Common/Sidebar/Sidebar.jsx
// frontend/src/components/Common/Sidebar/Sidebar.jsx
import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, TrendingUp, BarChart3, Settings, Clock, Wallet, Bot, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { useTrading } from '../../../hooks/useTrading';

const Sidebar = () => {
  const { sidebarCollapsed, toggleSidebar, mobileMenuOpen, toggleMobileMenu } = useApp();
  const { balance } = useTrading();
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
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/80 z-40 md:hidden animate-fade-in" 
          onClick={toggleMobileMenu} 
          aria-hidden="true" 
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 h-full bg-gray-900 border-r border-gray-800 transition-all duration-300
          ${sidebarCollapsed ? 'w-20' : 'w-72'} ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} flex flex-col`}
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center">
              <Bot size={22} className="text-white" />
            </div>
            {!sidebarCollapsed && (
              <span className="font-bold text-lg text-white tracking-tight">
                Deriv Suite
              </span>
            )}
          </div>
          {!sidebarCollapsed && (
            <button 
              onClick={toggleSidebar} 
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors duration-200"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft size={18} className="text-gray-400" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 space-y-1 px-3">
          {menu.map(({ to, icon: Icon, label }) => {
            const isActive = location.pathname === to || location.pathname.startsWith(to);
            return (
              <NavLink
                key={to}
                to={to}
                onClick={() => window.innerWidth < 768 && toggleMobileMenu()}
                className={`group flex items-center gap-3 px-3 py-3 rounded-lg transition-colors duration-200
                  ${isActive 
                    ? 'bg-primary-900/30 text-white' 
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'}
                  ${sidebarCollapsed ? 'justify-center' : ''}`}
              >
                <Icon size={20} className={`${isActive ? 'text-primary-400' : 'text-gray-500 group-hover:text-primary-400'}`} />
                {!sidebarCollapsed && (
                  <span className="font-medium text-sm">{label}</span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer Section */}
        <div className="p-4 border-t border-gray-800">
          {/* Balance Card */}
          <div className={`flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 transition-colors duration-300 ${sidebarCollapsed && 'justify-center'}`}>
            <div className="w-10 h-10 rounded-lg bg-accent-600 flex items-center justify-center">
              <Wallet size={18} className="text-white" />
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400">Balance</span>
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  </div>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold text-white">
                    ${balance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Expand/Collapse Button */}
          {sidebarCollapsed && (
            <button
              onClick={toggleSidebar}
              className="absolute -right-3 top-1/2 transform -translate-y-1/2 w-6 h-12 bg-gray-800 border border-gray-700 rounded-r-lg flex items-center justify-center hover:bg-gray-700 transition-colors duration-200"
              aria-label="Expand sidebar"
            >
              <ChevronRight size={16} className="text-gray-400" />
            </button>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;