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
  const { user, logout, isAuthenticated } = useAuth();
  const { botStatus, wsConnectionStatus, balance } = useTrading();
  const { addToast } = useToast();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef(null);

  // Handle click outside to close profile menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close profile menu on Escape key
  useEffect(() => {
    if (!showProfileMenu) return;

    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [showProfileMenu]);

  const handleLogout = async () => {
    try {
      await logout();
      addToast('Logged out successfully', 'success');
      setShowProfileMenu(false);
    } catch (error) {
      addToast('Logout failed', 'error');
    }
  };

  const getInitials = (email) => {
    if (!email) return 'U';
    return email.charAt(0).toUpperCase();
  };

  return (
    <header className="header">
      <div className="header-left">
        <button 
          className="menu-button" 
          onClick={toggleMobileMenu}
          aria-label="Toggle mobile menu"
        >
          <Menu size={24} />
        </button>
        <button 
          className="sidebar-toggle" 
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
        >
          <Menu size={24} />
        </button>
      </div>

      <div className="header-right">
        {/* Notifications with Badge */}
        <button 
          className="icon-button notification-button" 
          aria-label="Notifications"
          onClick={() => addToast('No new notifications', 'info')}
        >
          <Bell size={20} />
          <span className="notification-badge">3</span>
        </button>

        {/* Settings */}
        <button 
          className="icon-button" 
          aria-label="Settings"
          onClick={() => window.location.href = '/settings'}
        >
          <Settings size={20} />
        </button>

        {/* User Profile with Dropdown */}
        <div className="profile-container" ref={profileMenuRef}>
          <button 
            className="profile-button"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            aria-label="User profile"
            aria-expanded={showProfileMenu}
          >
            <div className="avatar">
              {user?.email ? getInitials(user.email) : 'U'}
            </div>
            {user?.email && (
              <span className="user-email">
                {user.email.split('@')[0]}
                <ChevronDown size={16} className={`chevron ${showProfileMenu ? 'rotate-180' : ''}`} />
              </span>
            )}
          </button>

          {/* Dropdown Menu */}
          {showProfileMenu && (
            <div className="profile-dropdown">
              <div className="dropdown-header">
                <div className="dropdown-avatar">
                  {user?.email ? getInitials(user.email) : 'U'}
                </div>
                <div className="dropdown-user-info">
                  <div className="dropdown-email">{user?.email || 'User'}</div>
                  <div className="dropdown-account">
                    Account: {user?.accountId ? `${user.accountId.slice(0, 8)}...` : 'N/A'}
                  </div>
                </div>
              </div>
              
              <div className="dropdown-divider" />
              
              <div className="dropdown-section">
                <div className="dropdown-item" onClick={() => window.location.href = '/settings/profile'}>
                  <User size={16} />
                  <span>Profile Settings</span>
                </div>
                <div className="dropdown-item" onClick={() => window.location.href = '/settings/security'}>
                  <Shield size={16} />
                  <span>Security</span>
                </div>
              </div>
              
              <div className="dropdown-divider" />
              
              <button 
                className="dropdown-item logout-button" 
                onClick={handleLogout}
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;