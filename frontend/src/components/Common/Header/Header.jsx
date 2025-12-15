// frontend/src/components/Common/Header/Header.jsx
import React from 'react';
import { Bell, Settings, User, Menu } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import './Header.css';

const Header = () => {
  const { toggleSidebar, toggleMobileMenu } = useApp();

  return (
    <header className="header">
      <div className="header-left">
        <button 
          className="menu-button" 
          onClick={toggleMobileMenu}
          aria-label="Toggle mobile menu"
        >
          <Menu size={24} /> {/* Increased size for better touch targets on mobile */}
        </button>
        <button 
          className="sidebar-toggle" 
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
        >
          <Menu size={24} /> {/* Increased size for better touch targets on mobile */}
        </button>
      </div>

      {/* Removed: header-center with status indicators */}

      <div className="header-right">
        <button className="icon-button" aria-label="Notifications">
          <Bell size={24} />
        </button>
        <button className="icon-button" aria-label="Settings">
          <Settings size={24} />
        </button>
        <button className="icon-button" aria-label="User profile">
          <User size={24} />
        </button>
      </div>
    </header>
  );
};

export default Header;