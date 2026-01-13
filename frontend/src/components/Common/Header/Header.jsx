// frontend/src/components/Common/Header/Header.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Bell, Settings, User, Menu, LogOut, ChevronDown, Shield } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { useTrading } from '../../../hooks/useTrading';
import { useToast } from '../../../context/ToastContext';
import './Header.css';

const Header = () => {
  const { toggleSidebar, toggleMobileMenu } = useApp();
  const { user, logout } = useAuth();
  const { botStatus, wsConnectionStatus, balance } = useTrading();
  const { addToast } = useToast();

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef(null);

  const isMobile = window.innerWidth <= 768;

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

  const getInitials = (email) => email ? email[0].toUpperCase() : 'U';

  const statusColor = (status, map) => map[status] || '#6b7280';

  return (
    <header className="header">
      <div className="header-left">
        {/* Single responsive menu button */}
        <button
          className="menu-button"
          onClick={isMobile ? toggleMobileMenu : toggleSidebar}
          aria-label="Toggle navigation"
        >
          <Menu size={24} />
        </button>
      </div>

      <div className="header-right">
        {/* Status Dots */}
        <div className="header-status">
          <div
            className="status-dot bot-header-status"
            style={{ backgroundColor: statusColor(botStatus, {
              running: '#10b981',
              stopped: '#ef4444',
              connecting: '#f59e0b'
            }) }}
            title={`Bot: ${botStatus}`}
          />
          <div
            className="status-dot ws-header-status"
            style={{ backgroundColor: statusColor(wsConnectionStatus, {
              connected: '#10b981',
              disconnected: '#ef4444',
              connecting: '#f59e0b'
            }) }}
            title={`WS: ${wsConnectionStatus}`}
          />
        </div>

        {/* Notifications */}
        <button
          className="icon-button"
          onClick={() => addToast('No new notifications', 'info')}
        >
          <Bell size={20} />
          <span className="notification-badge">3</span>
        </button>

        {/* Profile */}
        <div className="profile-container" ref={profileMenuRef}>
          <button
            className="profile-button"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
          >
            <div className="avatar">{getInitials(user?.email)}</div>
            <ChevronDown
              size={16}
              className={`chevron ${showProfileMenu ? 'rotate-180' : ''}`}
            />
          </button>

          {showProfileMenu && (
            <div className="profile-dropdown">
              <div className="dropdown-header">
                <div className="dropdown-avatar">{getInitials(user?.email)}</div>
                <div className="dropdown-user-info">
                  <div>{user?.email}</div>
                  <div className="dropdown-balance">
                    Balance: ${balance?.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="dropdown-divider" />

              <div className="dropdown-item" onClick={() => window.location.href = '/settings/profile'}>
                <User size={16} /> Profile
              </div>

              <div className="dropdown-item" onClick={() => window.location.href = '/settings/security'}>
                <Shield size={16} /> Security
              </div>

              <div className="dropdown-item" onClick={() => window.location.href = '/settings'}>
                <Settings size={16} /> Settings
              </div>

              <div className="dropdown-divider" />

              <button className="dropdown-item logout-button" onClick={handleLogout}>
                <LogOut size={16} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
