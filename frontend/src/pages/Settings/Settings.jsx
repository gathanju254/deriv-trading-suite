// frontend/src/pages/Settings.jsx
import React, { useState } from 'react';
import Alerts from '../components/Settings/NotificationSettings/Alerts';
import EmailNotifications from '../components/Settings/NotificationSettings/EmailNotifications';
import APIKeys from '../components/Settings/AccountSettings/APIKeys';
import Profile from '../components/Settings/AccountSettings/ProfileSetting';
import RiskParameters from '../components/Settings/TradingSettings/RiskParameters';
import TradingLimits from '../components/Settings/TradingSettings/TradeLimits'; 
import { Save, RefreshCw } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import './Settings.css';

const Settings = () => {
  const [isSaving, setIsSaving] = useState(false);
  const { addToast } = useToast();

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    addToast('Settings saved successfully', 'success');
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <div className="header-content">
          <div>
            <h1>Settings</h1>
            <p>Configure your trading preferences and account settings</p>
          </div>
          <div className="header-actions">
            <button className="btn btn-secondary" disabled={isSaving}>
              <RefreshCw size={16} />
              Reset
            </button>
            <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : (
                <>
                  <Save size={16} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="settings-content">
        <div className="settings-grid">
          <div className="settings-column">
            <TradingLimits />
            <RiskParameters />
          </div>
          <div className="settings-column">
            {/* Replace NotificationSettings with Alerts and EmailNotifications */}
            <Alerts />
            <EmailNotifications />
            {/* Replace AccountSettings with Profile and APIKeys */}
            <Profile />
            <APIKeys />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;