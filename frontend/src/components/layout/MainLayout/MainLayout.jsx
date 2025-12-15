// frontend/src/components/layout/MainLayout/MainLayout.jsx
import React, { useEffect, useState } from 'react';
import Header from '../../../components/Common/Header/Header';
import Sidebar from '../../../components/Common/Sidebar/Sidebar';
import Footer from '../Footer/Footer';
import { useApp } from '../../../context/AppContext';
import './MainLayout.css';

const MainLayout = ({ children }) => {
  const { sidebarCollapsed, mobileMenuOpen, toggleMobileMenu } = useApp();
  const [isLoaded, setIsLoaded] = useState(false);
  const [contentLoaded, setContentLoaded] = useState(false); // New: For staggered animations

  // Trigger fade-in on mount with staggered effect
  useEffect(() => {
    setIsLoaded(true);
    const timer = setTimeout(() => setContentLoaded(true), 300); // Stagger content load
    return () => clearTimeout(timer);
  }, []);

  return (
    <div 
      className={`main-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${mobileMenuOpen ? 'mobile-menu-open' : ''} ${isLoaded ? 'loaded' : ''}`}
      role="application" // New: Better semantic role
      aria-label="Main application layout"
    >
      {/* Enhanced skip link for accessibility */}
      <a 
        href="#main-content" 
        className="skip-link"
        aria-label="Skip to main content"
      >
        Skip to main content
      </a>
      
      <Sidebar />
      
      {/* Improved mobile overlay with better interaction */}
      {mobileMenuOpen && (
        <div 
          className="mobile-overlay"
          onClick={toggleMobileMenu}
          onKeyDown={(e) => e.key === 'Escape' && toggleMobileMenu()} // New: Keyboard support
          tabIndex={-1} // New: Focus management
          aria-hidden="true"
          role="presentation"
        />
      )}
      
      <div className={`main-content ${isLoaded ? 'fade-in' : ''} ${contentLoaded ? 'content-loaded' : ''}`}>
        <Header />
        <main 
          id="main-content" 
          className="content-area" 
          role="main" 
          aria-label="Main content area"
        >
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default MainLayout;