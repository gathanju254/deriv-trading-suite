// frontend/src/components/Settings/NotificationSettings/Alerts.jsx

import React, { useState } from 'react';
import { Bell, Volume } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import './NotificationSettings.css';

const Alerts = () => {
  const { addToast } = useToast();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const handleSave = () => {
    addToast('Alert settings saved', 'success');
  };

  return (
    <div className="settings-card">
      <h3 className="settings-title">
        <Bell size={20} />
        Alerts
      </h3>

      <div className="settings-body">
        <label className="setting-row">
          <input
            type="checkbox"
            checked={pushEnabled}
            onChange={() => setPushEnabled(v => !v)}
          />
          <span>Push notifications</span>
        </label>

        <label className="setting-row">
          <input
            type="checkbox"
            checked={soundEnabled}
            onChange={() => setSoundEnabled(v => !v)}
          />
          <span><Volume size={14} /> Play sound on alert</span>
        </label>

        <div className="settings-actions">
          <button className="btn btn-primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
};

export default Alerts;
