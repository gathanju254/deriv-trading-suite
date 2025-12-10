// frontend/src/components/Settings/AccountSettings/APIKeys.jsx

import React from 'react';
import { Key, RefreshCw, Plus } from 'lucide-react';
import './AccountSettings.css';

const APIKeys = () => {
  return (
    <div className="settings-card">
      <h3 className="settings-title">
        <Key size={20} />
        API Keys
      </h3>

      <div className="api-keys-list">
        <p className="info-text">No API keys found. You can generate a new demo key for testing.</p>

        <div className="api-actions">
          <button className="btn btn-primary" title="Generate new key">
            <Plus size={14} /> Generate Key
          </button>
          <button className="btn btn-secondary" title="Regenerate key">
            <RefreshCw size={14} /> Regenerate
          </button>
        </div>
      </div>
    </div>
  );
};

export default APIKeys;
