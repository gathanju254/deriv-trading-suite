// frontend/src/components/Common/Header/Header.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Bell, Menu, ChevronDown, Sun, Moon, LogOut, User, Settings, Shield, Zap, HelpCircle, ExternalLink, RefreshCw } from 'lucide-react';
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
  const [helpOpen, setHelpOpen] = useState(false);
  const profileRef = useRef(null);
  const notifRef = useRef(null);
  const helpRef = useRef(null);

  const notifications = [
    { id: 1, text: 'Trade executed: RISE position opened', time: '2 min ago', unread: true, type: 'success' },
    { id: 2, text: 'High market volatility detected', time: '15 min ago', unread: true, type: 'warning' },
    { id: 3, text: 'Session synced with Deriv API', time: '1 hour ago', unread: false, type: 'info' },
    { id: 4, text: 'Daily profit target reached', time: '3 hours ago', unread: false, type: 'success' },
  ];

  const helpItems = [
    { label: 'Documentation', icon: ExternalLink },
    { label: 'Tutorial Videos', icon: ExternalLink },
    { label: 'API Reference', icon: ExternalLink },
    { label: 'Support Ticket', icon: ExternalLink },
  ];

  const unreadCount = notifications.filter(n => n.unread).length;
  const initials = user?.email?.[0]?.toUpperCase() || 'U';

  useEffect(() => {
    const closeMenus = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotificationsOpen(false);
      if (helpRef.current && !helpRef.current.contains(e.target)) setHelpOpen(false);
    };
    document.addEventListener('mousedown', closeMenus);
    return () => document.removeEventListener('mousedown', closeMenus);
  }, []);

  const handleLogout = async () => {
    try { 
      await logout(); 
      addToast('Logged out successfully', 'success'); 
    } catch { 
      addToast('Logout failed', 'error'); 
    }
  };

  const handleQuickBotToggle = async () => {
    try {
      if (botStatus === 'running') {
        await stopBot();
        addToast('Trading bot stopped', 'info');
      } else {
        await startBot();
        addToast('Trading bot started', 'success');
      }
    } catch (error) {
      addToast('Bot toggle failed', 'error');
    }
  };

  const getStatusColor = (status) => {
    if (status === 'running' || status === 'connected') return 'text-success-500';
    if (status === 'connecting') return 'text-accent-500';
    return 'text-secondary-500';
  };

  const getStatusDot = (status) => (
    <span className={`w-3 h-3 rounded-full ml-2 ${
      status === 'running' || status === 'connected'
        ? 'bg-success-500 animate-pulse-slow'
        : status === 'connecting'
          ? 'bg-accent-500 animate-pulse'
          : 'bg-secondary-500'
    }`} />
  );

  return (
    <header className="h-18 bg-gray-900/90 backdrop-blur-xl border-b border-gray-800/50 shadow-2xl">
      <div className="h-full px-4 md:px-6 flex items-center justify-between">
        {/* Menu Toggle - More visible on mobile */}
        <button 
          onClick={() => (window.innerWidth < 768 ? toggleMobileMenu() : toggleSidebar())} 
          className="p-2.5 rounded-xl hover:bg-gray-800/50 transition-all duration-200 hover:scale-110 border border-gray-700/50 md:block"
          aria-label="Toggle menu"
        >
          <Menu size={22} className="text-gray-300" />
        </button>

        {/* Quick Bot Control - Hidden on very small screens */}
        <div className="hidden md:flex items-center gap-4">
          <button
            onClick={handleQuickBotToggle}
            className={`px-6 py-2.5 rounded-xl font-semibold transition-all duration-300 hover:scale-105 shadow-lg flex items-center gap-2 ${
              botStatus === 'running' 
                ? 'bg-gradient-to-r from-secondary-600 to-secondary-700 hover:from-secondary-500 hover:to-secondary-600 text-white'
                : 'bg-gradient-to-r from-success-600 to-success-700 hover:from-success-500 hover:to-success-600 text-white'
            }`}
          >
            {botStatus === 'running' ? 'Stop Bot' : 'Start Bot'}
            {getStatusDot(botStatus)}
          </button>
        </div>

        {/* Right Controls - Stack vertically on small screens */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Dark Mode Toggle */}
          <button 
            onClick={toggleDarkMode} 
            className="p-2.5 rounded-xl hover:bg-gray-800/50 transition-all duration-200 hover:scale-110 border border-gray-700/50"
            aria-label="Toggle dark mode"
          >
            {darkMode ? (
              <Sun size={20} className="text-accent-500" />
            ) : (
              <Moon size={20} className="text-primary-500" />
            )}
          </button>

          {/* Notifications - Hidden on very small screens */}
          <div className="relative hidden sm:block" ref={notifRef}>
            <button 
              onClick={() => setNotificationsOpen(prev => !prev)} 
              className="p-2.5 rounded-xl hover:bg-gray-800/50 transition-all duration-200 hover:scale-110 border border-gray-700/50 relative"
              aria-label={`Notifications (${unreadCount} unread)`}
            >
              <Bell size={20} className="text-gray-400" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}
            </button>
            {notificationsOpen && (
              <div className="absolute right-0 mt-3 w-96 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
                <div className="p-4 border-b border-gray-800 bg-gradient-to-r from-gray-900 to-gray-900/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell size={18} className="text-primary-500" />
                      <span className="font-semibold text-white">Notifications</span>
                    </div>
                    <span className="text-xs px-2 py-1 bg-primary-500/20 text-primary-400 rounded-lg">
                      {unreadCount} unread
                    </span>
                  </div>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.map((n) => (
                    <div 
                      key={n.id} 
                      className={`px-4 py-3 border-b border-gray-800/50 last:border-0 hover:bg-gray-800/30 transition-colors duration-200 ${n.unread ? 'bg-gray-900/50' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 mt-2 rounded-full ${
                          n.type === 'success' ? 'bg-success-500' :
                          n.type === 'warning' ? 'bg-accent-500' :
                          'bg-primary-500'
                        }`} />
                        <div className="flex-1">
                          <p className="text-sm text-gray-300">{n.text}</p>
                          <p className="text-xs text-gray-500 mt-1">{n.time}</p>
                        </div>
                        {n.unread && (
                          <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Help Menu - Hidden on very small screens */}
          <div className="relative hidden sm:block" ref={helpRef}>
            <button 
              onClick={() => setHelpOpen(prev => !prev)} 
              className="p-2.5 rounded-xl hover:bg-gray-800/50 transition-all duration-200 hover:scale-110 border border-gray-700/50"
              aria-label="Help menu"
            >
              <HelpCircle size={20} className="text-gray-400" />
            </button>
            {helpOpen && (
              <div className="absolute right-0 mt-3 w-56 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
                <div className="p-4 border-b border-gray-800 bg-gradient-to-r from-gray-900 to-gray-900/50">
                  <div className="flex items-center gap-2">
                    <HelpCircle size={18} className="text-primary-500" />
                    <span className="font-semibold text-white">Help & Support</span>
                  </div>
                </div>
                {helpItems.map((item) => (
                  <button
                    key={item.label}
                    className="w-full px-4 py-3 text-left hover:bg-gray-800 flex items-center gap-3 transition-colors duration-200 border-b border-gray-800/50 last:border-0"
                  >
                    <item.icon size={16} className="text-gray-400" />
                    <span className="text-sm text-gray-300">{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Profile Menu */}
          <div className="relative" ref={profileRef}>
            <button 
              onClick={() => setProfileOpen(prev => !prev)} 
              className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-gray-800/50 transition-all duration-200 hover:scale-105 border border-gray-700/50"
              aria-label="Profile menu"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center font-bold text-white shadow-lg">
                {initials}
              </div>
              <div className="hidden md:flex flex-col items-start">
                <span className="text-sm font-medium text-white truncate max-w-[120px]">
                  {user?.email?.split('@')[0] || 'User'}
                </span>
                <span className="text-xs text-gray-400">${balance?.toFixed(2)}</span>
              </div>
              <ChevronDown size={16} className="text-gray-400 hidden md:block" />
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-3 w-64 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
                {/* Profile Header */}
                <div className="p-4 border-b border-gray-800 bg-gradient-to-r from-gray-900 to-gray-900/50">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center font-bold text-white">
                      {initials}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white truncate">{user?.email}</p>
                      <p className="text-xs text-gray-400">Account ID: {user?.accountId?.slice(-6)}</p>
                    </div>
                  </div>
                  <div className="mt-3 p-3 rounded-lg bg-gray-800/50 border border-gray-700/50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Balance</span>
                      <span className="text-lg font-bold text-white">${balance?.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="py-2">
                  <MenuItem icon={User} label="Profile Settings" to="/settings/profile" />
                  <MenuItem icon={Shield} label="Security" to="/settings/security" />
                  <MenuItem icon={Settings} label="Preferences" to="/settings" />
                </div>

                {/* Logout Button */}
                <div className="p-3 border-t border-gray-800">
                  <button 
                    onClick={handleLogout}
                    className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-gray-800 to-gray-900 hover:from-secondary-900/30 hover:to-secondary-900/20 text-secondary-400 hover:text-white flex items-center justify-center gap-2 transition-all duration-200 border border-gray-800/50"assName="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-gray-800 to-gray-900 hover:from-secondary-900/30 hover:to-secondary-900/20 text-secondary-400 hover:text-white flex items-center justify-center gap-2 transition-all duration-200 border border-gray-800/50"
                  >                  >
                    <LogOut size={16} /> />
                    <span className="font-medium">Logout</span>>
                  </button>>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

const MenuItem = ({ icon: Icon, label, to }) => ( = ({ icon: Icon, label, to }) => (
  <button 
    onClick={() => (window.location.href = to)} () => (window.location.href = to)} 
    className="w-full px-4 py-3 text-left hover:bg-gray-800 flex items-center gap-3 transition-colors duration-200 border-b border-gray-800/50 last:border-0"className="w-full px-4 py-3 text-left hover:bg-gray-800 flex items-center gap-3 transition-colors duration-200 border-b border-gray-800/50 last:border-0"
  >>
    <Icon size={18} className="text-gray-400" />    <Icon size={18} className="text-gray-400" />
    <span className="text-sm text-gray-300">{label}</span>l}</span>
  </button>>
);

export default Header;