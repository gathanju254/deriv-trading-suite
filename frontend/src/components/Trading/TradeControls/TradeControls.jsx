// frontend/src/components/Trading/TradeControls/TradeControls.jsx

import React from 'react';
import { useTrading } from '../../../context/TradingContext';
import { useToast } from '../../../context/ToastContext';
import { Send, TrendingUp, TrendingDown } from 'lucide-react';
import './TradeControls.css';

const TradeControls = () => {
  const { executeManualTrade, loading } = useTrading();
  const { addToast } = useToast();

  const handleTrade = async (side) => {
    try {
      await executeManualTrade(side);
      addToast(`${side.toUpperCase()} trade executed`, 'success');
    } catch (error) {
      addToast(`Failed to execute ${side} trade`, 'error');
    }
  };

  return (
    <div className="trade-controls">
      <div className="controls-header">
        <h2>Trade Controls</h2>
      </div>
      <div className="controls-content">
        <button
          className="btn btn-call"
          onClick={() => handleTrade('call')}
          disabled={loading}
        >
          <TrendingUp size={18} />
          Buy Call
        </button>
        <button
          className="btn btn-put"
          onClick={() => handleTrade('put')}
          disabled={loading}
        >
          <TrendingDown size={18} />
          Buy Put
        </button>
      </div>
    </div>
  );
};

export default TradeControls;
