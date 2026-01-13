// frontend/src/components/layout/MainLayout/MainLayout.jsx
import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../../Common/Header/Header';
import Sidebar from '../../Common/Sidebar/Sidebar';
import Footer from '../../layout/Footer/Footer';
import { useApp } from '../../../context/AppContext';

const MainLayout = () => {
  const { sidebarCollapsed, mobileMenuOpen, toggleMobileMenu } = useApp();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex h-screen bg-gray-900 text-gray-200">
      <Sidebar />

      <div className={`flex flex-col flex-1 transition-all duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
        <Header />

        <main id="main-content" className="flex-1 p-4 overflow-auto">
          <Outlet />
        </main>

        <Footer />
      </div>

      {mobileMenuOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden" onClick={toggleMobileMenu} />}
    </div>
  );
};

export default MainLayout;
