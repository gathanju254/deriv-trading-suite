// frontend/src/components/TradingView/MarketOverview/MarketOverview.jsx
import React from 'react';
import { useTrading } from '../../../context/TradingContext';
import './MarketOverview.css';

const MarketOverview = () => {
  const { marketData } = useTrading();

  return (
    <div className="market-overview">
      <div className="overview-header">
        <h2>Market Overview</h2>
      </div>
      <div className="overview-content">
        {marketData.lastPrice ? (
          <>
            <div className="price-display">
              <span className="price">${parseFloat(marketData.lastPrice).toFixed(4)}</span>
              <span className="symbol">{marketData.symbol || 'R_100'}</span>
            </div>
            <div className="market-info">
              <p>Last Update: {new Date(marketData.lastUpdate).toLocaleTimeString()}</p>
            </div>
          </>
        ) : (
          <p className="no-data">Waiting for market data...</p>
        )}
      </div>
    </div>
  );
};

export default MarketOverview;

