// frontend/src/components/Common/Sidebar/Sidebar.jsx
// frontend/src/components/Common/Sidebar/Sidebar.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, TrendingUp, BarChart3, Settings, Bot, Wallet } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { useTrading } from '../../../hooks/useTrading';

const Sidebar = () => {
  const { sidebarCollapsed, mobileMenuOpen, toggleMobileMenu } = useApp();
  const { balance } = useTrading();

  const menuItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/trading', icon: TrendingUp, label: 'Trading' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  const handleNavClick = () => { if (window.innerWidth <= 768) toggleMobileMenu(); };

  return (
    <>
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={toggleMobileMenu} />
      )}

      <aside className={`fixed top-0 left-0 h-full bg-gray-900 text-gray-200 shadow-lg z-50 transition-all duration-300
        ${sidebarCollapsed ? 'w-16' : 'w-64'} 
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        
        {/* Logo */}
        <div className="flex items-center justify-center h-16 border-b border-gray-700 gap-2">
          <Bot size={28} />
          {!sidebarCollapsed && <span className="font-semibold text-lg">Deriv Suite</span>}
        </div>

        {/* Menu */}
        <nav className="flex-1 mt-4">
          <ul className="flex flex-col gap-1">
            {menuItems.map(({ path, icon: Icon, label }) => (
              <li key={path}>
                <NavLink
                  to={path}
                  onClick={handleNavClick}
                  className={({ isActive }) => `flex items-center gap-3 px-4 py-2 hover:bg-gray-800 transition ${
                    isActive ? 'bg-gray-800 font-semibold' : ''
                  }`}
                >
                  <Icon size={20} />
                  {!sidebarCollapsed && label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer balance */}
        <div className="flex items-center justify-center h-16 border-t border-gray-700 gap-2 px-4">
          <Wallet size={16} />
          {!sidebarCollapsed && <span>${balance.toFixed(2)}</span>}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
