// frontend/src/components/Common/Header/Header.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Bell, Settings, User, Menu, LogOut, ChevronDown, Shield } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { useTrading } from '../../../hooks/useTrading';
import { useToast } from '../../../context/ToastContext';

const Header = () => {
  const { toggleSidebar, toggleMobileMenu } = useApp();
  const { user, logout } = useAuth();
  const { botStatus, wsConnectionStatus, balance } = useTrading();
  const { addToast } = useToast();

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleEsc = (e) => e.key === 'Escape' && setShowProfileMenu(false);
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

  const getInitials = (email) => (email ? email[0].toUpperCase() : 'U');
  const statusColor = (status, map) => map[status] || 'bg-gray-500';

  return (
    <header className="sticky top-0 z-50 bg-gray-900 border-b border-gray-700 px-4 py-2 flex justify-between items-center">
      {/* Left: menu */}
      <button
        className="p-2 rounded hover:bg-gray-800 transition"
        onClick={window.innerWidth <= 768 ? toggleMobileMenu : toggleSidebar}
      >
        <Menu size={24} className="text-gray-200" />
      </button>

      {/* Right: status + notifications + profile */}
      <div className="flex items-center gap-4">
        {/* Status dots */}
        <div className="flex gap-2">
          <span
            className={`w-3 h-3 rounded-full ${statusColor(botStatus, { running: 'bg-green-500 animate-pulse', stopped: 'bg-red-500', connecting: 'bg-yellow-500' })}`}
            title={`Bot: ${botStatus}`}
          />
          <span
            className={`w-3 h-3 rounded-full ${statusColor(wsConnectionStatus, { connected: 'bg-green-500 animate-pulse-slow', disconnected: 'bg-red-500', connecting: 'bg-yellow-500' })}`}
            title={`WS: ${wsConnectionStatus}`}
          />
        </div>

        {/* Notifications */}
        <button
          className="relative p-2 rounded hover:bg-gray-800 transition"
          onClick={() => addToast('No new notifications', 'info')}
        >
          <Bell size={20} className="text-gray-200" />
          <span className="absolute top-0 right-0 w-3 h-3 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">3</span>
        </button>

        {/* Profile dropdown */}
        <div className="relative" ref={profileMenuRef}>
          <button
            className="flex items-center gap-2 p-1 rounded hover:bg-gray-800 transition"
            onClick={() => setShowProfileMenu((v) => !v)}
          >
            <div className="w-7 h-7 rounded-full bg-gray-700 text-gray-200 flex items-center justify-center">{getInitials(user?.email)}</div>
            <ChevronDown size={16} className="text-gray-200" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-gray-800 text-gray-200 rounded shadow-lg border border-gray-700 overflow-hidden transition-all duration-200 origin-top scale-95 animate-scale-in">
              <div className="p-3 border-b border-gray-700 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">{getInitials(user?.email)}</div>
                <div className="text-sm">
                  <div>{user?.email}</div>
                  <div className="text-gray-400 text-xs">Balance: ${balance?.toFixed(2)}</div>
                </div>
              </div>
              <button className="w-full text-left px-3 py-2 hover:bg-gray-700 flex items-center gap-2" onClick={() => window.location.href='/settings/profile'}>
                <User size={16}/> Profile
              </button>
              <button className="w-full text-left px-3 py-2 hover:bg-gray-700 flex items-center gap-2" onClick={() => window.location.href='/settings/security'}>
                <Shield size={16}/> Security
              </button>
              <button className="w-full text-left px-3 py-2 hover:bg-gray-700 flex items-center gap-2" onClick={() => window.location.href='/settings'}>
                <Settings size={16}/> Settings
              </button>
              <button className="w-full text-left px-3 py-2 hover:bg-gray-700 flex items-center gap-2 text-red-500" onClick={handleLogout}>
                <LogOut size={16}/> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;

