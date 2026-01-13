// frontend/src/components/Common/Sidebar/Sidebar.jsx
// frontend/src/components/common/Sidebar/Sidebar.jsx
import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  TrendingUp,
  BarChart3,
  Settings,
  Bot,
  Wallet,
  ChevronLeft,
  ChevronRight,
  Users,
  Shield,
  Clock,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { useTrading } from '../../../hooks/useTrading';
import { useAuth } from '../../../context/AuthContext';
import './Sidebar.css';

const Sidebar = () => {
  const { sidebarCollapsed, toggleSidebar, mobileMenuOpen, toggleMobileMenu } = useApp();
  const { balance, botStatus, wsConnectionStatus } = useTrading();
  const { user } = useAuth();
  const location = useLocation();
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [balanceAnimation, setBalanceAnimation] = useState(false);

  // Animate balance when it changes
  useEffect(() => {
    if (balance > 0) {
      setBalanceAnimation(true);
      const timer = setTimeout(() => setBalanceAnimation(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [balance]);

  // Define menu categories & items
  const menuItems = [
    {
      category: 'Trading',
      items: [
        { path: '/dashboard', icon: Home, label: 'Dashboard', badge: null },
        { path: '/trading', icon: TrendingUp, label: 'Live Trading', badge: botStatus === 'running' ? 'Live' : null },
        { path: '/analytics', icon: BarChart3, label: 'Analytics', badge: null },
      ],
    },
    {
      category: 'Management',
      items: [
        { path: '/history', icon: Clock, label: 'Trade History', badge: null },
        { path: '/users', icon: Users, label: 'Users', badge: null },
        { path: '/security', icon: Shield, label: 'Security', badge: null },
        { path: '/settings', icon: Settings, label: 'Settings', badge: null },
      ],
    },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'running': return 'bg-gradient-to-r from-green-500 to-emerald-600';
      case 'connected': return 'bg-gradient-to-r from-blue-500 to-cyan-600';
      case 'disconnected': return 'bg-gradient-to-r from-red-500 to-pink-600';
      case 'connecting': return 'bg-gradient-to-r from-yellow-500 to-orange-600';
      default: return 'bg-gray-500';
    }
  };

  const handleNavClick = () => {
    if (window.innerWidth <= 768) toggleMobileMenu();
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={toggleMobileMenu}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full z-50 bg-gradient-to-b from-gray-900 to-gray-950
          shadow-2xl transition-all duration-300 ease-in-out border-r border-gray-800
          ${sidebarCollapsed ? 'w-20' : 'w-64'}
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg">
                <Bot size={24} className="text-white" />
              </div>
              {botStatus === 'running' && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse ring-2 ring-gray-900" />
              )}
            </div>
            {!sidebarCollapsed && (
              <div>
                <h1 className="font-bold text-lg bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Deriv Suite
                </h1>
                <p className="text-xs text-gray-400">Pro Trading</p>
              </div>
            )}
          </div>
          
          {!sidebarCollapsed && (
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-lg hover:bg-gray-800 transition-all duration-200"
              title="Collapse sidebar"
            >
              <ChevronLeft size={18} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto custom-scrollbar">
          {menuItems.map((category, catIndex) => (
            <div key={catIndex} className="mb-6">
              {!sidebarCollapsed && (
                <div className="px-4 mb-2">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {category.category}
                  </span>
                </div>
              )}
              <ul className="space-y-1">
                {category.items.map(({ path, icon: Icon, label, badge }) => {
                  const isActive = location.pathname === path;
                  return (
                    <li key={path} className="px-2">
                      <NavLink
                        to={path}
                        onClick={handleNavClick}
                        onMouseEnter={() => setActiveTooltip(label)}
                        onMouseLeave={() => setActiveTooltip(null)}
                        className={({ isActive }) => `
                          group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
                          ${isActive 
                            ? 'bg-gradient-to-r from-blue-900/30 to-purple-900/30 border-l-2 border-blue-500 text-white'
                            : 'hover:bg-gray-800/50 text-gray-300'}
                          ${sidebarCollapsed ? 'justify-center' : ''}
                        `}
                      >
                        <div className={`
                          p-2 rounded-lg transition-all duration-200
                          ${isActive 
                            ? 'bg-gradient-to-br from-blue-500 to-purple-500 text-white shadow-lg'
                            : 'bg-gray-800 group-hover:bg-gray-700'}
                        `}>
                          <Icon size={20} />
                        </div>
                        {!sidebarCollapsed && (
                          <>
                            <span className="flex-1 font-medium">{label}</span>
                            {badge && (
                              <span className="px-2 py-0.5 text-xs rounded-full bg-gradient-to-r from-green-600 to-emerald-700 text-white">
                                {badge}
                              </span>
                            )}
                          </>
                        )}

                        {sidebarCollapsed && activeTooltip === label && (
                          <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-xl border border-gray-700 whitespace-nowrap z-50">
                            {label}
                            <div className="absolute top-1/2 -left-1 w-2 h-2 bg-gray-900 transform -translate-y-1/2 rotate-45" />
                          </div>
                        )}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer: Balance & WebSocket */}
        <div className="border-t border-gray-800 p-4 relative">
          {/* WebSocket status */}
          <div className={`flex items-center gap-3 mb-4 p-3 rounded-xl bg-gray-900/50 ${sidebarCollapsed ? 'justify-center' : ''}`}>
            <div className="relative">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(wsConnectionStatus)} animate-pulse`} />
              <div className="absolute inset-0 rounded-full animate-ping bg-current opacity-20" />
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1">
                <p className="text-sm font-medium">WebSocket</p>
                <p className="text-xs text-gray-400 capitalize">{wsConnectionStatus}</p>
              </div>
            )}
          </div>

          {/* Balance */}
          <div className={`
            flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-gray-900 to-gray-800
            ${sidebarCollapsed ? 'justify-center' : ''} ${balanceAnimation ? 'animate-pulse-once' : ''}
          `}>
            <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-700 shadow-lg">
              <Wallet size={18} className="text-white" />
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 overflow-hidden">
                <p className="text-xs text-gray-400">Balance</p>
                <p className="text-lg font-bold bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent truncate">
                  ${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            )}
          </div>

          {/* Expand button */}
          {sidebarCollapsed && (
            <button
              onClick={toggleSidebar}
              className="absolute -right-3 top-1/2 transform -translate-y-1/2 w-6 h-12 bg-gray-900 border border-gray-700 rounded-r-lg flex items-center justify-center hover:bg-gray-800 transition-all duration-200"
              title="Expand sidebar"
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
