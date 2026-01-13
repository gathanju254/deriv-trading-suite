// frontend/src/components/Common/Header/Header.jsx
// frontend/src/components/Common/Header/Header.jsx
import React, { useState, useRef, useEffect } from 'react';
import {
  Bell, Menu, ChevronDown, Sun, Moon, LogOut,
  User, Settings, Shield, HelpCircle, ExternalLink
} from 'lucide-react';

import { useApp } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { useTrading } from '../../../hooks/useTrading';
import { useToast } from '../../../context/ToastContext';

const HEADER_HEIGHT = 'h-16 md:h-18';

const Header = () => {
  const { darkMode, toggleDarkMode, toggleSidebar, toggleMobileMenu } = useApp();
  const { user, logout } = useAuth();
  const { botStatus, balance, startBot, stopBot } = useTrading();
  const { addToast } = useToast();

  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const profileRef = useRef(null);
  const notifRef = useRef(null);
  const helpRef = useRef(null);

  const initials = user?.email?.[0]?.toUpperCase() || 'U';

  useEffect(() => {
    const closeAll = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotificationsOpen(false);
      if (helpRef.current && !helpRef.current.contains(e.target)) setHelpOpen(false);
    };
    document.addEventListener('mousedown', closeAll);
    return () => document.removeEventListener('mousedown', closeAll);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      addToast('Logged out', 'success');
    } catch {
      addToast('Logout failed', 'error');
    }
  };

  const handleBotToggle = async () => {
    try {
      botStatus === 'running' ? await stopBot() : await startBot();
    } catch {
      addToast('Bot toggle failed', 'error');
    }
  };

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 ${HEADER_HEIGHT}
      bg-gray-900/90 backdrop-blur-xl border-b border-gray-800/50`}
    >
      <div className="h-full px-4 md:px-6 flex items-center justify-between">

        {/* LEFT */}
        <button
          onClick={() =>
            window.innerWidth < 768 ? toggleMobileMenu() : toggleSidebar()
          }
          className="p-2 rounded-xl hover:bg-gray-800/60 border border-gray-700/50"
        >
          <Menu size={20} />
        </button>

        {/* CENTER – Bot Control (hidden on small screens) */}
        <div className="hidden md:flex">
          <button
            onClick={handleBotToggle}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition
              ${botStatus === 'running'
                ? 'bg-secondary-600 text-white'
                : 'bg-success-600 text-white'}
            `}
          >
            {botStatus === 'running' ? 'Stop Bot' : 'Start Bot'}
          </button>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-2 md:gap-3">

          {/* Dark Mode */}
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-xl hover:bg-gray-800/60 border border-gray-700/50"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotificationsOpen(v => !v)}
              className="p-2 rounded-xl hover:bg-gray-800/60 border border-gray-700/50"
            >
              <Bell size={18} />
            </button>
          </div>

          {/* Profile */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(v => !v)}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-800/60 border border-gray-700/50"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center font-bold">
                {initials}
              </div>
              <ChevronDown size={14} className="hidden md:block" />
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-3 w-60 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden">
                <div className="p-4 border-b border-gray-800">
                  <p className="text-sm font-semibold">{user?.email}</p>
                  <p className="text-xs text-gray-400">${balance?.toFixed(2)}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-3 flex items-center gap-2 hover:bg-gray-800"
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

export default Header;
