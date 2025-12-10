// frontend/src/components/layout/MainLayout/MainLayout.jsx
import React from 'react';
import Header from '../../components/Common/Header/Header';
import Sidebar from '../../components/Common/Sidebar/Sidebar';
import Footer from './Footer';
import { useApp } from '../../context/AppContext';
import './MainLayout.css';

const MainLayout = ({ children }) => {
  const { sidebarCollapsed, mobileMenuOpen, toggleMobileMenu } = useApp();

  return (
    <div className={`main-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar />
      <div className="main-content">
        <Header />
        <main className="content-area">
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default MainLayout;