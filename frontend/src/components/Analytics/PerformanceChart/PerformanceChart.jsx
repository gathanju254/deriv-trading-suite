// frontend/src/components/Analytics/PerformanceChart/PerformanceChart.jsx
import React, { useRef, useEffect } from 'react';
import { useTrading } from '../../../context/TradingContext';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import './PerformanceChart.css';


const PerformanceChart = () => {
  const { performance, tradeHistory } = useTrading();
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!tradeHistory || tradeHistory.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Prepare data: cumulative PnL over time
    const data = tradeHistory
      .filter(t => t.contract?.profit !== undefined)
      .map((t, i) => ({
        x: i,
        y: tradeHistory.slice(0, i + 1).reduce((sum, trade) => sum + (trade.contract?.profit || 0), 0)
      }));

    if (data.length < 2) return;

    // Scale data
    const minY = Math.min(...data.map(d => d.y));
    const maxY = Math.max(...data.map(d => d.y));
    const rangeY = maxY - minY || 1;
    const scaleX = width / (data.length - 1);
    const scaleY = height / rangeY;

    // Draw grid
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 3]);
    for (let i = 0; i <= 5; i++) {
      const y = (height / 5) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Draw line
    ctx.strokeStyle = data[data.length - 1].y >= 0 ? '#10b981' : '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    data.forEach((point, i) => {
      const x = i * scaleX;
      const y = height - ((point.y - minY) * scaleY);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw points
    ctx.fillStyle = data[data.length - 1].y >= 0 ? '#10b981' : '#ef4444';
    data.forEach((point, i) => {
      const x = i * scaleX;
      const y = height - ((point.y - minY) * scaleY);
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

  }, [tradeHistory]);

  const totalPnl = performance?.pnl || 0;
  const winRate = performance?.win_rate || 0;

  return (
    <div className="performance-chart">
      <div className="chart-header">
        <h3>
          <TrendingUp size={20} />
          Performance Chart
        </h3>
        <div className="chart-stats">
          <div className="stat">
            <DollarSign size={16} />
            <span>Total P&L: ${totalPnl.toFixed(2)}</span>
          </div>
          <div className="stat">
            <TrendingUp size={16} />
            <span>Win Rate: {winRate.toFixed(1)}%</span>
          </div>
        </div>
      </div>
      <div className="chart-container">
        <canvas ref={canvasRef} width={600} height={300} />
        {tradeHistory.length === 0 && (
          <div className="no-data">
            <p>No trade data available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceChart;