// frontend/src/components/Common/Sidebar/Sidebar.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, TrendingUp, BarChart3, Settings, Bot, Wallet } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { useTrading } from '../../../hooks/useTrading';
import './Sidebar.css';

const Sidebar = () => {
  const { sidebarCollapsed, mobileMenuOpen, toggleMobileMenu } = useApp();
  const { balance } = useTrading();

  const menuItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/trading', icon: TrendingUp, label: 'Trading' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  const handleNavClick = () => {
    if (window.innerWidth <= 768) toggleMobileMenu();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && mobileMenuOpen) toggleMobileMenu();
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="sidebar-overlay"
          onClick={toggleMobileMenu}
          onKeyDown={handleKeyDown}
          tabIndex={-1}
          aria-hidden="true"
          role="presentation"
        />
      )}

      <aside
        className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}
        role="navigation"
        aria-label="Main navigation"
        onKeyDown={handleKeyDown}
      >
        <div className="sidebar-header">
          <div className="logo">
            <Bot size={32} />
            {!sidebarCollapsed && <span className="logo-text">Deriv Suite</span>}
          </div>
        </div>

        <nav className="sidebar-nav">
          <ul>
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    onClick={handleNavClick}
                    aria-label={`Navigate to ${item.label}`}
                  >
                    <Icon size={20} />
                    {!sidebarCollapsed && <span className="nav-label">{item.label}</span>}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div className="balance-widget">
            <Wallet size={16} />
            {!sidebarCollapsed && <span className="balance-text">{`$${balance.toFixed(2)}`}</span>}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
