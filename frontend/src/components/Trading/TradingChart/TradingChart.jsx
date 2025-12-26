// frontend/src/components/Trading/TradingChart/TradingChart.jsx
import React, { useEffect, useRef, useState } from 'react';
import { useTrading } from '../../../hooks/useTrading';

import { TrendingUp, TrendingDown, Maximize2, Minimize2 } from 'lucide-react';
import './TradingChart.css';

const TradingChart = () => {
  const { marketData, signals } = useTrading();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [priceHistory, setPriceHistory] = useState([]);
  const [chartType, setChartType] = useState('candlestick');

  // Build price history from real market data
  useEffect(() => {
    if (marketData.lastPrice) {
      const newPrice = parseFloat(marketData.lastPrice);
      const timestamp = Date.now();
      
      setPriceHistory(prev => {
        const updated = [...prev, {
          time: timestamp,
          price: newPrice,
          open: prev.length > 0 ? prev[prev.length - 1].price : newPrice,
          high: Math.max(newPrice, prev.length > 0 ? prev[prev.length - 1].high : newPrice),
          low: Math.min(newPrice, prev.length > 0 ? prev[prev.length - 1].low : newPrice),
          volume: 1000 + Math.random() * 500 // Simulated volume based on real data
        }].slice(-100); // Keep last 100 data points
        
        return updated;
      });
    }
  }, [marketData.lastPrice]);

  // Draw chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || priceHistory.length < 2) return;

    const ctx = canvas.getContext('2d');
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight - 60; // Account for header
    
    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    if (chartType === 'candlestick') {
      drawCandlestickChart(ctx, width, height);
    } else {
      drawLineChart(ctx, width, height);
    }

    drawGrid(ctx, width, height);
    drawSignals(ctx, width, height);

  }, [priceHistory, chartType, signals]);

  const drawCandlestickChart = (ctx, width, height) => {
    if (priceHistory.length < 2) return;

    const prices = priceHistory.map(p => p.price);
    const minPrice = Math.min(...prices) * 0.999;
    const maxPrice = Math.max(...prices) * 1.001;
    const priceRange = maxPrice - minPrice;

    const candleWidth = Math.min(20, (width - 40) / priceHistory.length);
    const padding = 40;

    priceHistory.forEach((candle, index) => {
      const x = padding + index * (candleWidth + 2);
      const candleHeight = ((candle.high - candle.low) / priceRange) * (height - 2 * padding);
      const bodyTop = ((maxPrice - Math.max(candle.open, candle.price)) / priceRange) * (height - 2 * padding);
      const bodyBottom = ((maxPrice - Math.min(candle.open, candle.price)) / priceRange) * (height - 2 * padding);
      const wickTop = ((maxPrice - candle.high) / priceRange) * (height - 2 * padding);
      const wickBottom = ((maxPrice - candle.low) / priceRange) * (height - 2 * padding);

      // Draw wick
      ctx.strokeStyle = candle.price >= candle.open ? '#10b981' : '#ef4444';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + candleWidth / 2, padding + wickTop);
      ctx.lineTo(x + candleWidth / 2, padding + wickBottom);
      ctx.stroke();

      // Draw body
      ctx.fillStyle = candle.price >= candle.open ? '#10b981' : '#ef4444';
      ctx.fillRect(x, padding + bodyTop, candleWidth, Math.max(1, bodyBottom - bodyTop));
    });
  };

  const drawLineChart = (ctx, width, height) => {
    if (priceHistory.length < 2) return;

    const prices = priceHistory.map(p => p.price);
    const minPrice = Math.min(...prices) * 0.999;
    const maxPrice = Math.max(...prices) * 1.001;
    const priceRange = maxPrice - minPrice;
    const padding = 40;

    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.beginPath();

    priceHistory.forEach((point, index) => {
      const x = padding + (index * (width - 2 * padding)) / (priceHistory.length - 1);
      const y = padding + ((maxPrice - point.price) / priceRange) * (height - 2 * padding);

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();
  };

  const drawGrid = (ctx, width, height) => {
    const padding = 40;
    
    // Grid lines
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 3]);
    
    // Horizontal lines
    for (let i = 0; i <= 4; i++) {
      const y = padding + (i * (height - 2 * padding)) / 4;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }
    
    // Vertical lines
    for (let i = 0; i <= 4; i++) {
      const x = padding + (i * (width - 2 * padding)) / 4;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
    }
    
    ctx.setLineDash([]);
  };

  const drawSignals = (ctx, width, height) => {
    if (!signals || signals.length === 0) return;

    const padding = 40;
    const prices = priceHistory.map(p => p.price);
    const minPrice = Math.min(...prices) * 0.999;
    const maxPrice = Math.max(...prices) * 1.001;
    const priceRange = maxPrice - minPrice;

    signals.slice(0, 5).forEach(signal => {
      if (!signal.timestamp || !signal.price) return;
      
      const index = priceHistory.findIndex(p => p.time >= signal.timestamp);
      if (index === -1) return;

      const x = padding + (index * (width - 2 * padding)) / (priceHistory.length - 1);
      const y = padding + ((maxPrice - signal.price) / priceRange) * (height - 2 * padding);

      ctx.fillStyle = signal.direction === 'buy' ? '#10b981' : '#ef4444';
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();

      // Draw arrow
      ctx.fillStyle = signal.direction === 'buy' ? '#10b981' : '#ef4444';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(signal.direction === 'buy' ? '↑' : '↓', x, y - 20);
    });
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  const getCurrentPrice = () => {
    return priceHistory.length > 0 
      ? `$${priceHistory[priceHistory.length - 1].price.toFixed(4)}`
      : 'Loading...';
  };

  const getPriceChange = () => {
    if (priceHistory.length < 2) return { change: 0, percent: 0 };
    
    const current = priceHistory[priceHistory.length - 1].price;
    const previous = priceHistory[priceHistory.length - 2].price;
    const change = current - previous;
    const percent = (change / previous) * 100;
    
    return { change: change.toFixed(4), percent: percent.toFixed(2) };
  };

  const priceChange = getPriceChange();

  return (
    <div className={`trading-chart ${isFullscreen ? 'fullscreen' : ''}`} ref={containerRef}>
      <div className="chart-header">
        <div className="chart-title">
          <h2>
            {marketData.symbol || 'R_100'} Chart
            <span className="chart-price">{getCurrentPrice()}</span>
          </h2>
          <div className="price-change">
            <span className={`change ${priceChange.change >= 0 ? 'positive' : 'negative'}`}>
              {priceChange.change >= 0 ? '+' : ''}{priceChange.change} ({priceChange.percent}%)
            </span>
          </div>
        </div>
        <div className="chart-controls">
          <div className="chart-type-selector">
            <button 
              className={`chart-type-btn ${chartType === 'line' ? 'active' : ''}`}
              onClick={() => setChartType('line')}
            >
              Line
            </button>
            <button 
              className={`chart-type-btn ${chartType === 'candlestick' ? 'active' : ''}`}
              onClick={() => setChartType('candlestick')}
            >
              Candles
            </button>
          </div>
          <button className="fullscreen-btn" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>
      </div>
      
      <div className="chart-content">
        <canvas ref={canvasRef} className="chart-canvas" />
        
        {priceHistory.length === 0 && (
          <div className="chart-placeholder">
            <p>Loading market data...</p>
            <small>Waiting for price updates</small>
          </div>
        )}
        
        <div className="chart-overlay">
          <div className="timeframes">
            {['1m', '5m', '15m', '1h', '4h', '1d'].map(tf => (
              <button key={tf} className="timeframe-btn">
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="chart-footer">
        <div className="chart-stats">
          <div className="stat">
            <span className="stat-label">High:</span>
            <span className="stat-value">
              ${priceHistory.length > 0 ? Math.max(...priceHistory.map(p => p.price)).toFixed(4) : '0.0000'}
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">Low:</span>
            <span className="stat-value">
              ${priceHistory.length > 0 ? Math.min(...priceHistory.map(p => p.price)).toFixed(4) : '0.0000'}
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">Volume:</span>
            <span className="stat-value">
              {priceHistory.length > 0 
                ? ((priceHistory.reduce((sum, p) => sum + p.volume, 0) / 1000).toFixed(1) + 'K')
                : '0.0K'}
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">Signals:</span>
            <span className="stat-value">{signals?.length || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradingChart;