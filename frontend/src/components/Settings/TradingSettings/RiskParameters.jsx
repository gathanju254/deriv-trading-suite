// frontend/src/components/Settings/TradingSettings/RiskParameters.jsx
import React, { useState } from 'react';
import { Shield } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import './TradingSettings.css';

const RiskParameters = () => {
  const { addToast } = useToast();
  const [martingale, setMartingale] = useState(2.0);
  const [antiMartingale, setAntiMartingale] = useState(1.2);
  const [cooldownLoss, setCooldownLoss] = useState(5);

  const handleSave = () => {
    addToast('Risk parameters saved', 'success');
  };

  return (
    <div className="settings-card">
      <h3 className="settings-title">
        <Shield size={20} />
        Risk Parameters
      </h3>

      <div className="settings-body">
        <div className="form-group">
          <label>Martingale multiplier</label>
          <input type="number" step="0.1" value={martingale} onChange={(e) => setMartingale(parseFloat(e.target.value) || 0)} />
        </div>

        <div className="form-group">
          <label>Anti-martingale multiplier</label>
          <input type="number" step="0.1" value={antiMartingale} onChange={(e) => setAntiMartingale(parseFloat(e.target.value) || 0)} />
        </div>

        <div className="form-group">
          <label>Cooldown after loss (trades)</label>
          <input type="number" value={cooldownLoss} onChange={(e) => setCooldownLoss(parseInt(e.target.value) || 0)} />
        </div>

        <div className="settings-actions">
          <button className="btn btn-primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
};

export default RiskParameters;

