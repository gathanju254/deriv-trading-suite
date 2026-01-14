// frontend/src/components/Dashboard/SignalIndicator/SignalIndicator.jsx
// frontend/src/components/Dashboard/SignalIndicator/SignalIndicator.jsx
import React, { useState } from 'react';
import { useTrading } from '../../../hooks/useTrading';
import { TrendingUp, TrendingDown, Activity, Zap, RefreshCw, AlertCircle } from 'lucide-react';

const SignalIndicator = () => {
  const { signals, loading, refreshSignals } = useTrading();
  const [expanded, setExpanded] = useState(false);

  // Process signals
  const processedSignals = Array.isArray(signals) 
    ? signals.slice(0, expanded ? 10 : 5).map(signal => ({
        id: signal.id || Math.random().toString(36),
        direction: signal.direction || 'NEUTRAL',
        confidence: Math.min(Math.max(signal.confidence || 0.5, 0), 1),
        timestamp: signal.timestamp || Date.now(),
        symbol: signal.symbol || 'R_100',
        message: signal.message || 'Signal detected'
      }))
    : [];

  // Calculate market sentiment
  const bullishSignals = processedSignals.filter(s => 
    s.direction.toUpperCase().includes('BUY') || 
    s.direction.toUpperCase().includes('RISE') ||
    s.direction.toUpperCase().includes('CALL')
  ).length;

  const bearishSignals = processedSignals.filter(s => 
    s.direction.toUpperCase().includes('SELL') || 
    s.direction.toUpperCase().includes('FALL') ||
    s.direction.toUpperCase().includes('PUT')
  ).length;

  const sentimentScore = processedSignals.length > 0 
    ? (bullishSignals - bearishSignals) / processedSignals.length 
    : 0;

  // Format time
  const formatTime = (timestamp) => {
    const now = Date.now();
    const diff = Math.floor((now - timestamp) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  // Get signal color
  const getSignalColor = (direction) => {
    const dir = direction.toUpperCase();
    if (dir.includes('BUY') || dir.includes('RISE') || dir.includes('CALL')) return 'text-green-500';
    if (dir.includes('SELL') || dir.includes('FALL') || dir.includes('PUT')) return 'text-red-500';
    return 'text-gray-400';
  };

  const getSignalBg = (direction) => {
    const dir = direction.toUpperCase();
    if (dir.includes('BUY') || dir.includes('RISE') || dir.includes('CALL')) return 'bg-green-500/10';
    if (dir.includes('SELL') || dir.includes('FALL') || dir.includes('PUT')) return 'bg-red-500/10';
    return 'bg-gray-500/10';
  };

  return (
    <div className="space-y-5">
      {/* Header with sentiment meter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <Zap size={20} className="text-blue-500" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Market Signals</h3>
            <div className="text-sm text-gray-400">
              {processedSignals.length} active signals
            </div>
          </div>
        </div>
        
        <button
          onClick={refreshSignals}
          disabled={loading}
          className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 transition-colors duration-200"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Sentiment Indicator */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-gray-300">Market Sentiment</div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${sentimentScore > 0 ? 'bg-green-500' : sentimentScore < 0 ? 'bg-red-500' : 'bg-yellow-500'}`} />
            <span className="text-sm text-gray-300">
              {sentimentScore > 0.2 ? 'Bullish' : sentimentScore < -0.2 ? 'Bearish' : 'Neutral'}
            </span>
          </div>
        </div>
        
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-300 ${sentimentScore >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
            style={{ 
              width: `${Math.abs(sentimentScore) * 50 + 50}%`,
              marginLeft: sentimentScore < 0 ? `${50 - Math.abs(sentimentScore) * 50}%` : '0'
            }}
          />
        </div>
        
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>Bearish</span>
          <span>Neutral</span>
          <span>Bullish</span>
        </div>
      </div>

      {/* Signal List */}
      <div className="space-y-3">
        {processedSignals.length === 0 ? (
          <div className="text-center py-6 border border-gray-800 rounded-xl">
            <AlertCircle className="w-8 h-8 text-gray-500 mx-auto mb-2" />
            <div className="text-gray-400">No active signals</div>
          </div>
        ) : (
          <>
            {processedSignals.map((signal) => (
              <div 
                key={signal.id}
                className={`border-l-4 rounded-lg p-3 ${getSignalBg(signal.direction)} border-gray-800`}
                style={{ borderLeftColor: getSignalColor(signal.direction).replace('text-', '') }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getSignalColor(signal.direction).replace('text-', 'bg-')}`} />
                    <span className={`font-medium ${getSignalColor(signal.direction)}`}>
                      {signal.direction.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatTime(signal.timestamp)}
                  </div>
                </div>
                
                <div className="text-sm text-gray-300">
                  {signal.message}
                </div>
                
                <div className="flex items-center justify-between mt-2 text-xs">
                  <span className="text-gray-500">{signal.symbol}</span>
                  <span className="text-gray-400">
                    {Math.round(signal.confidence * 100)}% confidence
                  </span>
                </div>
              </div>
            ))}
            
            {signals.length > 5 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="w-full py-2 text-center text-sm text-blue-500 hover:text-blue-400"
              >
                {expanded ? 'Show less' : `Show ${signals.length - 5} more signals`}
              </button>
            )}
          </>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-900/50 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-400 mb-1">Total</div>
          <div className="text-lg font-semibold text-white">
            {processedSignals.length}
          </div>
        </div>
        
        <div className="bg-gray-900/50 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-400 mb-1">Bullish</div>
          <div className="text-lg font-semibold text-green-500">
            {bullishSignals}
          </div>
        </div>
        
        <div className="bg-gray-900/50 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-400 mb-1">Bearish</div>
          <div className="text-lg font-semibold text-red-500">
            {bearishSignals}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignalIndicator;