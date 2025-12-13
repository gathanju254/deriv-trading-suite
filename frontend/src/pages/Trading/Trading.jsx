// frontend/src/pages/Trading.jsx
// frontend/src/pages/Trading/Trading.jsx
import React from 'react';
import TradingChart from '../../components/Trading/TradingChart/TradingChart';
import TradeControls from '../../components/Trading/TradeControls/TradeControls';
import MarketOverview from '../../components/Trading/MarketOverview/MarketOverview';
import './Trading.css';

const Trading = () => {
  return (
    <div className="trading-page">
      <div className="page-header">
        <h1>Trading Interface</h1>
        <p>Real-time trading charts and manual trade execution</p>
      </div>

      <div className="trading-layout">
        <div className="chart-section">
          <TradingChart />
        </div>
        <div className="controls-section">
          <TradeControls />
        </div>
        <div className="market-section">
          <MarketOverview />
        </div>
      </div>
    </div>
  );
};

export default Trading;