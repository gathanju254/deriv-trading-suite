// frontend/src/components/Common/Header/Header.jsx
import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  Settings,
  User,
  Menu,
  LogOut,
  ChevronDown,
  Shield,
  Sun,
  Moon,
  RefreshCw,
  Zap,
  AlertCircle,
  Database
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { useTrading } from '../../../hooks/useTrading';
import { useToast } from '../../../context/ToastContext';
import './Header.css';

const Header = () => {
  const { darkMode, toggleDarkMode, toggleSidebar, toggleMobileMenu } = useApp();
  const { user, logout } = useAuth();
  const { botStatus, wsConnectionStatus, balance, refreshAllData, manualReconnect, loading } = useTrading();
  const { addToast } = useToast();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications] = useState([
    { id: 1, type: 'success', message: 'Trade executed successfully', time: '2 min ago', read: false },
    { id: 2, type: 'warning', message: 'High market volatility detected', time: '15 min ago', read: false },
    { id: 3, type: 'info', message: 'New trading session started', time: '1 hour ago', read: true },
  ]);
  const profileMenuRef = useRef(null);
  const notificationsRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdowns on escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setShowProfileMenu(false);
        setShowNotifications(false);
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      addToast('Logged out successfully', 'success');
      setShowProfileMenu(false);
    } catch {
      addToast('Logout failed', 'error');
    }
  };

  const handleRefresh = async () => {
    try {
      await refreshAllData();
      addToast('Data refreshed successfully', 'success');
    } catch {
      addToast('Refresh failed', 'error');
    }
  };

  const handleReconnect = async () => {
    try {
      await manualReconnect();
      addToast('Reconnection initiated', 'info');
    } catch {
      addToast('Reconnection failed', 'error');
    }
  };

  const getInitials = (email) => (email ? email[0].toUpperCase() : 'U');
  const unreadCount = notifications.filter(n => !n.read).length;

  const getStatusColor = (type, status) => {
    const colors = {
      bot: {
        running: 'bg-gradient-to-r from-green-500 to-emerald-600',
        stopped: 'bg-gradient-to-r from-red-500 to-pink-600',
        connecting: 'bg-gradient-to-r from-yellow-500 to-orange-600'
      },
      ws: {
        connected: 'bg-gradient-to-r from-blue-500 to-cyan-600',
        disconnected: 'bg-gradient-to-r from-red-500 to-pink-600',
        connecting: 'bg-gradient-to-r from-yellow-500 to-orange-600'
      }
    };
    return colors[type][status] || 'bg-gradient-to-r from-gray-500 to-gray-600';
  };

  return (
    <header className="sticky top-0 z-40 bg-gradient-to-r from-gray-900/95 to-gray-800/95 backdrop-blur-xl border-b border-gray-800 shadow-2xl">
      <div className="px-4 md:px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Left: Menu button and title */}
          <div className="flex items-center gap-4">
            <button
              onClick={window.innerWidth <= 768 ? toggleMobileMenu : toggleSidebar}
              className="p-2 rounded-xl hover:bg-gray-800/50 transition-all duration-200 group"
              aria-label="Toggle menu"
            >
              <Menu size={24} className="text-gray-300 group-hover:text-white transition-colors" />
            </button>

            {/* Logo/brand */}
            <div className="hidden md:flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                <Zap size={18} className="text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Deriv Suite
                </h1>
                <p className="text-xs text-gray-400">Professional Trading Platform</p>
              </div>
            </div>
          </div>

          {/* Right: Actions and profile */}
          <div className="flex items-center gap-3">
            {/* Dark mode toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-xl hover:bg-gray-800/50 transition-all duration-200"
              aria-label="Toggle dark mode"
              title="Toggle theme"
            >
              {darkMode ? (
                <Sun size={20} className="text-yellow-500" />
              ) : (
                <Moon size={20} className="text-blue-500" />
              )}
            </button>

            {/* Refresh button */}
            <button
              onClick={handleRefresh}
              disabled={loading}
              className={`p-2 rounded-xl transition-all duration-200 ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-800/50'}`}
              title="Refresh data"
            >
              <RefreshCw size={20} className={`text-gray-300 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Status indicators */}
            <div className="hidden md:flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-900/50">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor('bot', botStatus)} animate-pulse`} />
                    <div className="absolute inset-0 rounded-full animate-ping bg-current opacity-20" />
                  </div>
                  <span className="text-xs font-medium text-gray-300">Bot</span>
                </div>
                <div className="w-px h-4 bg-gray-700" />
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor('ws', wsConnectionStatus)} animate-pulse`} />
                    <div className="absolute inset-0 rounded-full animate-ping bg-current opacity-20" />
                  </div>
                  <span className="text-xs font-medium text-gray-300">WS</span>
                </div>
              </div>

              {/* Balance display */}
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-900/30 to-teal-900/30 border border-emerald-800/30">
                <Database size={14} className="text-emerald-400" />
                <span className="text-sm font-bold text-emerald-300">
                  ${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Reconnect button for disconnected state */}
            {wsConnectionStatus === 'disconnected' && (
              <button
                onClick={handleReconnect}
                className="px-3 py-1.5 text-xs rounded-full bg-gradient-to-r from-yellow-600 to-orange-600 text-white font-medium hover:opacity-90 transition-opacity"
              >
                Reconnect
              </button>
            )}

            {/* Notifications */}
            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-xl hover:bg-gray-800/50 transition-all duration-200"
                aria-label="Notifications"
              >
                <Bell size={20} className="text-gray-300" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-gradient-to-r from-red-600 to-pink-600 text-xs font-bold text-white flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in">
                  <div className="p-4 border-b border-gray-700">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-lg text-white">Notifications</h3>
                      <button className="text-xs text-blue-400 hover:text-blue-300">
                        Mark all as read
                      </button>
                    </div>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 border-b border-gray-800 hover:bg-gray-800/50 transition-colors cursor-pointer ${
                          !notification.read ? 'bg-blue-900/10' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${
                            notification.type === 'success' ? 'bg-green-900/30 text-green-400' :
                            notification.type === 'warning' ? 'bg-yellow-900/30 text-yellow-400' :
                            'bg-blue-900/30 text-blue-400'
                          }`}>
                            {notification.type === 'warning' ? <AlertCircle size={16} /> : <Bell size={16} />}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-white">{notification.message}</p>
                            <p className="text-xs text-gray-400 mt-1">{notification.time}</p>
                          </div>
                          {!notification.read && (
                            <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 border-t border-gray-700">
                    <button className="w-full text-center text-sm text-blue-400 hover:text-blue-300">
                      View all notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Profile dropdown */}
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-800/50 transition-all duration-200 group"
                aria-label="Profile menu"
              >
                <div className="relative">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg">
                    <span className="font-bold text-white">{getInitials(user?.email)}</span>
                  </div>
                  {botStatus === 'running' && (
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full ring-2 ring-gray-900" />
                  )}
                </div>
                <ChevronDown size={16} className={`text-gray-400 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl shadow-2xl overflow-hidden z-50 animate-scale-in">
                  <div className="p-4 border-b border-gray-700 bg-gradient-to-r from-blue-900/20 to-purple-900/20">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                        <span className="font-bold text-white text-lg">{getInitials(user?.email)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-white truncate">{user?.email}</h3>
                        <p className="text-sm text-gray-400 mt-1">Premium Trader</p>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 w-3/4" />
                          </div>
                          <span className="text-xs font-bold text-emerald-400">75%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-2">
                    <div className="mb-2 px-2 py-1.5 rounded-lg hover:bg-gray-700/50 flex items-center justify-between cursor-pointer">
                      <span className="text-sm text-gray-300">Account Level</span>
                      <span className="text-xs font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">PRO</span>
                    </div>
                    <div className="mb-2 px-2 py-1.5 rounded-lg hover:bg-gray-700/50 flex items-center justify-between cursor-pointer">
                      <span className="text-sm text-gray-300">Total Trades</span>
                      <span className="text-xs font-bold text-emerald-400">1,234</span>
                    </div>
                    <div className="mb-2 px-2 py-1.5 rounded-lg hover:bg-gray-700/50 flex items-center justify-between cursor-pointer">
                      <span className="text-sm text-gray-300">Win Rate</span>
                      <span className="text-xs font-bold text-emerald-400">68.5%</span>
                    </div>
                  </div>

                  <div className="border-t border-gray-700 p-2">
                    <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-700/50 flex items-center gap-3 text-gray-300 hover:text-white transition-colors">
                      <User size={16} /> Profile Settings
                    </button>
                    <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-700/50 flex items-center gap-3 text-gray-300 hover:text-white transition-colors">
                      <Shield size={16} /> Security
                    </button>
                    <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-700/50 flex items-center gap-3 text-gray-300 hover:text-white transition-colors">
                      <Settings size={16} /> Preferences
                    </button>
                    <div className="border-t border-gray-700 mt-2 pt-2">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-900/30 flex items-center gap-3 text-red-400 hover:text-red-300 transition-colors"
                      >
                        <LogOut size={16} /> Logout
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;