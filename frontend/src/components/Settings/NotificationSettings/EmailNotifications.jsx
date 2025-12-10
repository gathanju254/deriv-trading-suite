
// frontend/src/components/Settings/NotificationSettings/EmailNotifications.jsx
import React, { useState } from 'react';
import { Mail } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import './NotificationSettings.css';

const EmailNotifications = () => {
  const { addToast } = useToast();
  const [email, setEmail] = useState('');
  const [enabled, setEnabled] = useState(false);

  const handleSave = () => {
    addToast('Email notification settings saved', 'success');
  };

  return (
    <div className="settings-card">
      <h3 className="settings-title">
        <Mail size={20} />
        Email Notifications
      </h3>

      <div className="settings-body">
        <label className="setting-row">
          <input
            type="checkbox"
            checked={enabled}
            onChange={() => setEnabled(v => !v)}
          />
          <span>Enable email notifications</span>
        </label>

        <div className="form-group">
          <label>Email address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={!enabled}
          />
        </div>

        <div className="settings-actions">
          <button className="btn btn-primary" onClick={handleSave} disabled={!enabled}>Save</button>
        </div>
      </div>
    </div>
  );
};

export default EmailNotifications;
