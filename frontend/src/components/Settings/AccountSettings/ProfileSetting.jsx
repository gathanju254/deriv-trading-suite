// frontend/src/components/Settings/AccountSettings/Profile.jsx
import React from 'react';
import { User, Shield, Key } from 'lucide-react';
import './AccountSettings.css';

const Profile = () => {
  return (
    <div className="settings-card">
      <h3 className="settings-title">
        <User size={20} />
        Account Settings
      </h3>
      
      <div className="account-info">
        <div className="info-item">
          <User size={16} />
          <div>
            <div className="info-label">Username</div>
            <div className="info-value">demo_user</div>
          </div>
        </div>
        
        <div className="info-item">
          <Shield size={16} />
          <div>
            <div className="info-label">Account Type</div>
            <div className="info-value">Demo Account</div>
          </div>
        </div>
        
        <div className="info-item">
          <Key size={16} />
          <div>
            <div className="info-label">API Status</div>
            <div className="info-value status-connected">Connected</div>
          </div>
        </div>
      </div>
      
      <div className="account-actions">
        <button className="btn btn-secondary" style={{ width: '100%' }}>
          Change Password
        </button>
        <button className="btn btn-danger" style={{ width: '100%' }}>
          Logout All Devices
        </button>
      </div>
      
      <div className="account-disclaimer">
        <p className="warning-text">
          ⚠️ Demo account - Trading with virtual funds only
        </p>
        <p className="info-text">
          Connect a real Deriv account to trade with real funds
        </p>
      </div>
    </div>
  );
};

export default Profile;