// frontend/src/components/Layout/Footer/Footer.jsx
import React from 'react';
import { useTrading } from '../../../hooks/useTrading'; // Or from your context
import './Footer.css';

const Footer = () => {
  const { botStatus, wsConnectionStatus } = useTrading();
  
  // Function to get color based on bot status
  const getBotStatusColor = (status) => {
    switch (status) {
      case 'running': return '#10b981'; // Green
      case 'stopped': return '#ef4444'; // Red
      case 'connecting': return '#f59e0b'; // Yellow
      default: return '#6b7280'; // Gray
    }
  };
  
  // Function to get color based on WebSocket status
  const getWsStatusColor = (status) => {
    switch (status) {
      case 'connected': return '#10b981'; // Green
      case 'disconnected': return '#ef4444'; // Red
      case 'connecting': return '#f59e0b'; // Yellow
      default: return '#6b7280'; // Gray
    }
  };
  
  // Function to get status label/title
  const getStatusTitle = (type, status) => {
    switch (type) {
      case 'bot':
        return `Bot: ${status.charAt(0).toUpperCase() + status.slice(1)}`;
      case 'ws':
        return `WebSocket: ${status.charAt(0).toUpperCase() + status.slice(1)}`;
      default:
        return status;
    }
  };

  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <p>&copy; 2024 Deriv Trading Suite. All rights reserved.</p>
          
          {/* Status Indicators */}
          <div className="status-indicators">
            {/* Bot Status Indicator */}
            <div 
              className="status-indicator" 
              title={getStatusTitle('bot', botStatus)}
            >
              <span className="status-label">Bot:</span>
              <div 
                className="status-dot bot-status"
                style={{ backgroundColor: getBotStatusColor(botStatus) }}
              />
            </div>
            
            {/* WebSocket Status Indicator */}
            <div 
              className="status-indicator" 
              title={getStatusTitle('ws', wsConnectionStatus)}
            >
              <span className="status-label">WS:</span>
              <div 
                className="status-dot ws-status"
                style={{ backgroundColor: getWsStatusColor(wsConnectionStatus) }}
              />
            </div>
          </div>
        </div>
        
        <div className="footer-section">
          <span className="version">v1.0.0</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;