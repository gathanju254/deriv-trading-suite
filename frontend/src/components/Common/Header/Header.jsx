// frontend/src/components/Common/Header/Header.jsx
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
  Zap
} from 'lucide-react';

import { useApp } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { useTrading } from '../../../hooks/useTrading';
import { useToast } from '../../../context/ToastContext';

const HEADER_HEIGHT = 'h-16';

const Header = () => {
  const { darkMode, toggleDarkMode, toggleSidebar, toggleMobileMenu } = useApp();
  const { user, logout } = useAuth();
  const { botStatus, startBot, stopBot } = useTrading();
  const { addToast } = useToast();

  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  const initials = user?.email?.[0]?.toUpperCase() || 'U';

  useEffect(() => {
    const closeMenus = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
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
    } catch {
      addToast('Failed to toggle bot', 'error');
    }
  };

  return (
    <>
      {/* Fixed Header */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 ${HEADER_HEIGHT} bg-gray-900/95 backdrop-blur-xl border-b border-gray-800/50`}
      >
        <div className="h-full px-4 md:px-6 flex items-center justify-between">
          
          {/* Left: Menu + Brand */}
          <div className="flex items-center gap-3">
            {/* Menu Toggle */}
            <button
              onClick={() =>
                window.innerWidth < 768 ? toggleMobileMenu() : toggleSidebar()
              }
              className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
              aria-label="Toggle menu"
            >
              <Menu size={22} className="text-gray-300" />
            </button>

            {/* Brand */}
            <div className="flex items-center gap-2 select-none">
              <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center shadow-sm">
                <Zap size={16} className="text-white" />
              </div>
              <span className="hidden sm:block font-semibold text-white tracking-tight">
                Deriv Suite
              </span>
            </div>
          </div>

          {/* Bot Controls */}
          <div className="flex items-center gap-3">
            <span
              className={`w-3 h-3 rounded-full ${
                botStatus === 'running'
                  ? 'bg-green-500 animate-pulse'
                  : botStatus === 'stopped'
                  ? 'bg-red-500'
                  : 'bg-yellow-500 animate-pulse'
              }`}
            />

            <button
              onClick={handleQuickBotToggle}
              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition ${
                botStatus === 'running'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-primary-600 hover:bg-primary-700'
              } text-white`}
            >
              <Zap size={16} />
              <span className="hidden sm:inline">
                {botStatus === 'running' ? 'Stop' : 'Start'}
              </span>
            </button>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            {/* Dark Mode */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg hover:bg-gray-800"
              aria-label="Toggle dark mode"
            >
              {darkMode ? (
                <Sun size={20} className="text-accent-500" />
              ) : (
                <Moon size={20} className="text-primary-500" />
              )}
            </button>

            {/* Profile */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen((p) => !p)}
                className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-800"
              >
                <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white font-medium">
                  {initials}
                </div>
                <ChevronDown size={14} className="text-gray-400 hidden md:block" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-gray-900 border border-gray-800 rounded-lg shadow-xl overflow-hidden">
                  <div className="p-4 border-b border-gray-800">
                    <p className="text-sm text-white truncate">{user?.email}</p>
                  </div>

                  <div className="py-1">
                    <MenuItem icon={User} label="Profile" to="/settings/profile" />
                    <MenuItem icon={Settings} label="Settings" to="/settings" />
                  </div>

                  <div className="p-2 border-t border-gray-800">
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2 rounded-lg bg-gray-800 hover:bg-red-600/20 text-red-400 hover:text-white flex items-center justify-center gap-2"
                    >
                      <LogOut size={16} />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </header>

      {/* Header Spacer (prevents content overlap) */}
      <div className={HEADER_HEIGHT} />
    </>
  );
};

const MenuItem = ({ icon: Icon, label, to }) => (
  <button
    onClick={() => (window.location.href = to)}
    className="w-full px-4 py-2 text-left hover:bg-gray-800 flex items-center gap-3"
  >
    <Icon size={18} className="text-gray-400" />
    <span className="text-sm text-gray-300">{label}</span>
  </button>
);

export default Header;
