// frontend/src/components/Common/Header/Header.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Bell, Settings, User, Menu, LogOut, ChevronDown, Shield, Sun, Moon, Database } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { useTrading } from '../../../hooks/useTrading';
import { useToast } from '../../../context/ToastContext';

const Header = () => {
  const { darkMode, toggleDarkMode, toggleSidebar, toggleMobileMenu } = useApp();
  const { user, logout } = useAuth();
  const { botStatus, wsConnectionStatus, balance } = useTrading();
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

  const unreadCount = notifications.filter(n => !n.read).length;
  const getInitials = (email) => email ? email[0].toUpperCase() : 'U';

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) setShowProfileMenu(false);
      if (notificationsRef.current && !notificationsRef.current.contains(e.target)) setShowNotifications(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') { setShowProfileMenu(false); setShowNotifications(false); } };
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

  const statusColor = (type, status) => {
    const map = {
      bot: { running: 'bg-green-500 animate-pulse', stopped: 'bg-red-500', connecting: 'bg-yellow-500' },
      ws: { connected: 'bg-blue-500 animate-pulse-slow', disconnected: 'bg-red-500', connecting: 'bg-yellow-500' },
    };
    return map[type][status] || 'bg-gray-500';
  };

  return (
    <header className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-md border-b border-gray-800 shadow-lg">
      <div className="px-4 md:px-6 py-2 flex justify-between items-center">
        
        {/* Left: Menu button */}
        <button
          onClick={window.innerWidth <= 768 ? toggleMobileMenu : toggleSidebar}
          className="p-2 rounded hover:bg-gray-800/50 transition-all"
        >
          <Menu size={24} className="text-gray-200" />
        </button>

        {/* Right: Actions */}
        <div className="flex items-center gap-4">

          {/* Dark mode toggle */}
          <button onClick={toggleDarkMode} className="p-2 rounded hover:bg-gray-800/50 transition">
            {darkMode ? <Sun size={20} className="text-yellow-400"/> : <Moon size={20} className="text-blue-400"/>}
          </button>

          {/* Status dots */}
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${statusColor('bot', botStatus)}`} title={`Bot: ${botStatus}`}/>
            <span className={`w-3 h-3 rounded-full ${statusColor('ws', wsConnectionStatus)}`} title={`WS: ${wsConnectionStatus}`}/>
          </div>

          {/* Notifications */}
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded hover:bg-gray-800/50 transition"
            >
              <Bell size={20} className="text-gray-200" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-lg overflow-hidden z-50">
                <div className="p-3 border-b border-gray-700 font-semibold text-white">Notifications</div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.map(n => (
                    <div key={n.id} className={`p-3 border-b border-gray-700 hover:bg-gray-700/50 ${!n.read ? 'bg-gray-900/30' : ''}`}>
                      <p className="text-sm text-white">{n.message}</p>
                      <p className="text-xs text-gray-400">{n.time}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Profile dropdown */}
          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => setShowProfileMenu(v => !v)}
              className="flex items-center gap-2 p-1 rounded hover:bg-gray-800/50 transition"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold">
                {getInitials(user?.email)}
              </div>
              <ChevronDown size={16} className={`text-gray-200 ${showProfileMenu ? 'rotate-180' : ''}`} />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-lg overflow-hidden z-50 animate-scale-in">
                <div className="p-3 border-b border-gray-700 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold">{getInitials(user?.email)}</div>
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
                <button className="w-full text-left px-3 py-2 hover:bg-red-900/30 flex items-center gap-2 text-red-400" onClick={handleLogout}>
                  <LogOut size={16}/> Logout
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


