// frontend/src/components/Common/Sidebar/Sidebar.jsx
import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  TrendingUp, 
  BarChart3, 
  Settings,
  Bot,
  Wallet,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { useTrading } from '../../../hooks/useTrading';
import './Sidebar.css';

const Sidebar = () => {
  const { sidebarCollapsed, mobileMenuOpen, toggleMobileMenu, toggleSidebar } = useApp();
  const { balance } = useTrading();

  const menuItems = [
    { path: '/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/trading', icon: TrendingUp, label: 'Trading' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  const handleNavClick = () => {
    if (window.innerWidth <= 768) {
      toggleMobileMenu();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && mobileMenuOpen) {
      toggleMobileMenu();
    }
  };

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    if (!mobileMenuOpen) return;

    const handleClickOutside = (e) => {
      const sidebar = document.querySelector('.sidebar');
      if (sidebar && !sidebar.contains(e.target)) {
        toggleMobileMenu();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileMenuOpen]);

  return (
    <>
      {/* Mobile overlay */}
      <div 
        className={`sidebar-overlay ${mobileMenuOpen ? 'visible' : ''}`}
        onClick={toggleMobileMenu}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
        aria-hidden="true"
        role="presentation"
      />

      <aside 
        className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}
        role="navigation"
        aria-label="Main navigation"
        onKeyDown={handleKeyDown}
      >
        <div className="sidebar-header">
          <div className="logo">
            <Bot size={28} />
            {!sidebarCollapsed && (
              <span className="logo-text">Deriv Suite</span>
            )}
          </div>
          
          {/* Desktop collapse toggle */}
          <button
            className={`collapse-toggle ${sidebarCollapsed ? 'collapsed' : ''}`}
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={sidebarCollapsed ? 'Expand' : 'Collapse'}
          >
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
          
          {/* Mobile close button */}
          {mobileMenuOpen && (
            <button
              className="collapse-toggle"
              onClick={toggleMobileMenu}
              aria-label="Close sidebar"
              style={{ marginLeft: '8px' }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        <nav className="sidebar-nav">
          <ul>
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.path === '/dashboard'}
                    className={({ isActive }) => 
                      `nav-link ${isActive ? 'active' : ''}`
                    }
                    onClick={handleNavClick}
                    aria-label={`Navigate to ${item.label}`}
                  >
                    <Icon size={20} />
                    {!sidebarCollapsed && (
                      <span className="nav-label">{item.label}</span>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div 
            className="balance-widget"
            onClick={() => window.location.href = '/trading'}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                window.location.href = '/trading';
              }
            }}
            aria-label={`Current balance: $${balance.toFixed(2)}. Click to go to trading.`}
          >
            <Wallet size={18} />
            {!sidebarCollapsed && (
              <span className="balance-text">{balance.toFixed(2)}</span>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;