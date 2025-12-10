// frontend/src/components/Layout/Footer/Footer.jsx
import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <p>&copy; 2024 Deriv Trading Suite. All rights reserved.</p>
        </div>
        <div className="footer-section">
          <span className="version">v1.0.0</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;