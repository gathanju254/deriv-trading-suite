// frontend/src/components/Common/Sidebar/Sidebar.jsx
import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  TrendingUp,
  BarChart3,
  Settings,
  Clock,
  Wallet,
  Bot,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import { useApp } from '../../../context/AppContext';
import { useTrading } from '../../../hooks/useTrading';

const Sidebar = () => {
  const { sidebarCollapsed, toggleSidebar, mobileMenuOpen, toggleMobileMenu } = useApp();
  const { balance, botStatus, wsConnectionStatus } = useTrading();
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
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden animate-fade-in"
          onClick={toggleMobileMenu}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 z-50 h-full bg-gradient-to-b from-gray-900 to-gray-950
          border-r border-gray-800 shadow-xl transition-all duration-300 ease-in-out
          ${sidebarCollapsed ? 'w-20' : 'w-64'}
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          flex flex-col justify-between
        `}
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
              <Bot size={22} className="text-white" />
            </div>
            {!sidebarCollapsed && (
              <span className="font-bold text-lg text-primary">Deriv Suite</span>
            )}
          </div>

          {!sidebarCollapsed && (
            <button onClick={toggleSidebar} className="p-1 hover:bg-gray-800 rounded transition-colors duration-200" aria-label="Collapse sidebar">
              <ChevronLeft size={18} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 space-y-1">
          {menu.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => window.innerWidth < 768 && toggleMobileMenu()}
              className={({ isActive }) =>
                `mx-2 flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
                 ${isActive ? 'bg-primary/30 text-white shadow-md' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}
                 ${sidebarCollapsed ? 'justify-center' : ''}`
              }
            >
              <Icon size={20} />
              {!sidebarCollapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 space-y-3 relative">
          {/* Connection Status */}
          <div className={`flex items-center gap-3 ${sidebarCollapsed && 'justify-center'}`} title={`Connection: ${wsConnectionStatus}`}>
            <span
              className={`w-3 h-3 rounded-full ${
                wsConnectionStatus === 'connected' ? 'bg-green-500 animate-pulse-slow' : 'bg-red-500'
              }`}
            />
            {!sidebarCollapsed && (
              <span className="text-sm capitalize text-gray-300">{wsConnectionStatus}</span>
            )}
          </div>

          {/* Balance */}
          <div
            className={`flex items-center gap-3 p-3 rounded-xl bg-gray-900 transition-all duration-200 shadow-md
                        ${pulse && 'animate-pulse'} ${sidebarCollapsed && 'justify-center'}`}
            title="Account Balance"
          >
            <Wallet size={18} className="text-accent" />
            {!sidebarCollapsed && (
              <div>
                <p className="text-xs text-gray-400">Balance</p>
                <p className="font-bold text-primary">
                  ${balance?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
            )}
          </div>

          {/* Expand button when collapsed */}
          {sidebarCollapsed && (
            <button
              onClick={toggleSidebar}
              className="absolute -right-3 top-1/2 w-6 h-12 bg-gray-900 border border-gray-700 rounded-r-lg flex items-center justify-center hover:bg-gray-800 transition-colors duration-200"
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
