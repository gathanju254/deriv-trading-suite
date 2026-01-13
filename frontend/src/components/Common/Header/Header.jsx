// frontend/src/components/Common/Header/Header.jsx
import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  Menu,
  ChevronDown,
  Sun,
  Moon,
  LogOut,
  User,
  Settings,
  Shield,
  Zap, // Quick action icon
} from 'lucide-react';

import { useApp } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { useTrading } from '../../../hooks/useTrading';
import { useToast } from '../../../context/ToastContext';

const Header = () => {
  const { darkMode, toggleDarkMode, toggleSidebar, toggleMobileMenu } = useApp();
  const { user, logout } = useAuth();
  const { botStatus, wsConnectionStatus, balance, startBot, stopBot } = useTrading();
  const { addToast } = useToast();

  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const profileRef = useRef(null);
  const notifRef = useRef(null);

  const notifications = [
    { id: 1, text: 'Trade executed successfully', unread: true },
    { id: 2, text: 'High market volatility detected', unread: true },
    { id: 3, text: 'Session synced', unread: false },
  ];

  const unreadCount = notifications.filter(n => n.unread).length;
  const initials = user?.email?.[0]?.toUpperCase() || 'U';

  useEffect(() => {
    const closeMenus = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotificationsOpen(false);
    };
    document.addEventListener('mousedown', closeMenus);
    return () => document.removeEventListener('mousedown', closeMenus);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      addToast('Logged out', 'success');
    } catch {
      addToast('Logout failed', 'error');
    }
  };

  const statusDot = (status) => {
    if (status === 'running' || status === 'connected') return 'bg-green-500 animate-pulse-slow';
    if (status === 'connecting') return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const handleQuickBotToggle = async () => {
    if (botStatus === 'running') {
      await stopBot();
    } else {
      await startBot();
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-gray-900/95 backdrop-blur border-b border-gray-800 shadow-lg animate-fade-in">
      <div className="h-full px-4 md:px-6 flex items-center justify-between">
        {/* Left: Menu */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => (window.innerWidth < 768 ? toggleMobileMenu() : toggleSidebar())}
            className="p-2 rounded-lg hover:bg-gray-800 transition-colors duration-200"
            aria-label="Toggle menu"
          >
            <Menu size={22} />
          </button>
        </div>

        {/* Center: Quick Actions */}
        <div className="hidden md:flex items-center gap-4">
          <button
            onClick={handleQuickBotToggle}
            className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
              botStatus === 'running'
                ? 'bg-secondary text-white hover:bg-secondary-dark'
                : 'bg-primary text-white hover:bg-primary-dark'
            }`}
            aria-label={`Bot is ${botStatus}. Click to ${botStatus === 'running' ? 'stop' : 'start'}`}
          >
            <Zap size={16} className="inline mr-2" />
            {botStatus === 'running' ? 'Stop Bot' : 'Start Bot'}
          </button>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-4">
          {/* Dark Mode */}
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg hover:bg-gray-800 transition-colors duration-200"
            aria-label="Toggle dark mode"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Bot & Connection Status */}
          <div className="flex gap-2" title={`Bot: ${botStatus}, WebSocket: ${wsConnectionStatus}`}>
            <span className={`w-2.5 h-2.5 rounded-full ${statusDot(botStatus)}`} />
            <span className={`w-2.5 h-2.5 rounded-full ${statusDot(wsConnectionStatus)}`} />
          </div>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotificationsOpen(prev => !prev)}
              className="p-2 rounded-lg hover:bg-gray-800 transition-colors duration-200 relative"
              aria-label={`Notifications (${unreadCount} unread)`}
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 text-xs bg-accent rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-gray-800 border border-gray-700 rounded-xl shadow-xl overflow-hidden animate-fade-in">
                <div className="p-3 font-semibold border-b border-gray-700 text-primary">Notifications</div>
                {notifications.map(n => (
                  <div
                    key={n.id}
                    className={`px-3 py-2 text-sm hover:bg-gray-700 transition-colors duration-200 ${
                      n.unread ? 'bg-gray-900/50' : ''
                    }`}
                  >
                    {n.text}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Profile */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(prev => !prev)}
              className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-800 transition-colors duration-200"
              aria-label="Profile menu"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center font-bold text-white shadow-md">
                {initials}
              </div>
              <ChevronDown size={14} />
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-xl shadow-xl overflow-hidden animate-fade-in">
                <div className="p-3 border-b border-gray-700">
                  <p className="text-sm text-gray-300">{user?.email}</p>
                  <p className="text-xs text-gray-400">
                    Balance: ${balance?.toFixed(2)}
                  </p>
                </div>

                <MenuItem icon={User} label="Profile" to="/settings/profile" />
                <MenuItem icon={Shield} label="Security" to="/settings/security" />
                <MenuItem icon={Settings} label="Settings" to="/settings" />

                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-secondary hover:bg-secondary/20 flex items-center gap-2 transition-colors duration-200"
                >
                  <LogOut size={16} /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

const MenuItem = ({ icon: Icon, label, to }) => (
  <button
    onClick={() => (window.location.href = to)}
    className="w-full px-4 py-2 hover:bg-gray-700 flex items-center gap-2 transition-colors duration-200"
  >
    <Icon size={16} />
    {label}
  </button>
);

export default Header;
