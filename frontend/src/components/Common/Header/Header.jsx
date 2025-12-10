// frontend/src/components/Common/Header/Header.jsx
import React from 'react';
import { Bell, Settings, User, Menu } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTrading } from '../../context/TradingContext';
import './Header.css';

const Header = () => {
  const { toggleSidebar, toggleMobileMenu, mobileMenuOpen } = useApp();
  const { botStatus, wsConnectionStatus, manualReconnect } = useTrading();

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected':
      case 'running':
        return 'status-connected';
      case 'connecting':
        return 'status-connecting';
      default:
        return 'status-disconnected';
    }
  };

  return (
    <header className="header">
      <div className="header-left">
        <button 
          className="menu-button" 
          onClick={toggleMobileMenu}
          aria-label="Toggle menu"
        >
          <Menu size={20} />
        </button>
        <button 
          className="sidebar-toggle" 
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
        >
          <Menu size={20} />
        </button>
      </div>

      <div className="header-center">
        <div className="status-indicators">
          <div className={`status-indicator ${getStatusColor(botStatus)}`}>
            <span>Bot: {botStatus}</span>
          </div>
          <div className={`status-indicator ${getStatusColor(wsConnectionStatus)}`}>
            <span>WS: {wsConnectionStatus}</span>
          </div>
          {wsConnectionStatus === 'disconnected' && (
            <button 
              className="reconnect-button"
              onClick={manualReconnect}
            >
              Reconnect
            </button>
          )}
        </div>
      </div>

      <div className="header-right">
        <button className="icon-button" aria-label="Notifications">
          <Bell size={20} />
        </button>
        <button className="icon-button" aria-label="Settings">
          <Settings size={20} />
        </button>
        <button className="icon-button" aria-label="User profile">
          <User size={20} />
        </button>
      </div>
    </header>
  );
};

export default Header;