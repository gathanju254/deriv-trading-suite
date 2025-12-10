// frontend/src/components/Settings/TradingSettings/TradeLimits.jsx

import React, { useState } from 'react';
import { DollarSign } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import './TradingSettings.css';

const TradingLimits = () => {
  const { addToast } = useToast();
  const [tradeAmount, setTradeAmount] = useState(1.0);
  const [maxTrades, setMaxTrades] = useState(10);
  const [minConsensus, setMinConsensus] = useState(0.75);

  const handleSave = () => {
    addToast('Trading limits saved', 'success');
  };

  return (
    <div className="settings-card">
      <h3 className="settings-title">
        <DollarSign size={20} />
        Trading Limits
      </h3>

      <div className="settings-body">
        <div className="form-group">
          <label>Trade amount ({/* currency label can be added */})</label>
          <input type="number" step="0.01" value={tradeAmount} onChange={(e) => setTradeAmount(parseFloat(e.target.value) || 0)} />
        </div>

        <div className="form-group">
          <label>Max trades</label>
          <input type="number" value={maxTrades} onChange={(e) => setMaxTrades(parseInt(e.target.value) || 0)} />
        </div>

        <div className="form-group">
          <label>Min consensus score</label>
          <input type="number" step="0.01" value={minConsensus} onChange={(e) => setMinConsensus(parseFloat(e.target.value) || 0)} />
        </div>

        <div className="settings-actions">
          <button className="btn btn-primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
};

export default TradingLimits;
