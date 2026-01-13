// frontend/src/components/layout/MainLayout/MainLayout.jsx
import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../../../components/Common/Header/Header';
import Sidebar from '../../../components/Common/Sidebar/Sidebar';
import Footer from '../Footer/Footer';
import { useApp } from '../../../context/AppContext';
import './MainLayout.css';

const MainLayout = () => {
  const { sidebarCollapsed, mobileMenuOpen, toggleMobileMenu } = useApp();
  const [isLoaded, setIsLoaded] = useState(false);
  const [contentLoaded, setContentLoaded] = useState(false);

  // Trigger staggered fade-in on mount
  useEffect(() => {
    setIsLoaded(true);
    const timer = setTimeout(() => setContentLoaded(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // Handle Escape key to close mobile menu
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        toggleMobileMenu();
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [mobileMenuOpen, toggleMobileMenu]);

  return (
    <div
      className={`main-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${mobileMenuOpen ? 'mobile-menu-open' : ''} ${isLoaded ? 'loaded' : ''}`}
      role="application"
      aria-label="Main application layout"
    >
      {/* Skip link for accessibility */}
      <a
        href="#main-content"
        className="skip-link"
        aria-label="Skip to main content"
      >
        Skip to main content
      </a>

      {/* Sidebar */}
      <Sidebar />

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="mobile-overlay"
          onClick={toggleMobileMenu}
          role="presentation"
          aria-hidden="true"
          tabIndex={-1}
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
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default MainLayout;
