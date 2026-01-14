// frontend/src/pages/Trading/Trading.jsx
import React, { useState } from 'react';
import { Activity, TrendingUp, TrendingDown, Zap, BarChart3, AlertCircle, Target } from 'lucide-react';
import TradingChart from '../../components/Trading/TradingChart/TradingChart';
import TradeControls from '../../components/Trading/TradeControls/TradeControls';
import MarketOverview from '../../components/Trading/MarketOverview/MarketOverview';
import { useTrading } from '../../hooks/useTrading';
import { useToast } from '../../context/ToastContext';
import LoadingSpinner from '../../components/Common/LoadingSpinner/LoadingSpinner';

const Trading = () => {
  const { 
    botStatus, 
    wsConnectionStatus, 
    marketData, 
    loading,
    startBot, 
    stopBot,
    executeManualTrade
  } = useTrading();
  
  const { addToast } = useToast();
  const [isTradeExecuting, setIsTradeExecuting] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState('R_100');

  const handleQuickTrade = async (direction) => {
    if (isTradeExecuting) return;
    
    setIsTradeExecuting(true);
    try {
      await executeManualTrade(direction);
      addToast(`${direction === 'RISE' ? '📈 Rise' : '📉 Fall'} trade executed`, 'success');
    } catch (error) {
      addToast(`Trade failed: ${error.message}`, 'error');
    } finally {
      setTimeout(() => setIsTradeExecuting(false), 1000);
    }
  };

  const handleToggleBot = async () => {
    try {
      if (botStatus === 'running') {
        await stopBot();
        addToast('Trading bot stopped', 'info');
      } else {
        await startBot();
        addToast('Trading bot started', 'success');
      }
    } catch (error) {
      addToast(`Failed to toggle bot: ${error.message}`, 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner 
          size="large" 
          text="Loading trading interface..." 
          type="trading"
          theme="blue"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            Live Trading Dashboard
          </h1>
          <p className="text-gray-400 mt-2">
            Real-time trading charts, manual execution, and market analytics
          </p>
        </div>
        
        {/* Quick Stats */}
        <div className="flex flex-wrap gap-3">
          <div className="px-4 py-3 bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-800/50">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                wsConnectionStatus === 'connected' 
                  ? 'bg-success-500 animate-pulse-slow' 
                  : 'bg-secondary-500'
              }`} />
              <span className="text-sm text-gray-400">Connection</span>
            </div>
            <p className="text-lg font-semibold text-white capitalize mt-1">
              {wsConnectionStatus}
            </p>
          </div>
          
          <div className="px-4 py-3 bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-800/50">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-accent-500" />
              <span className="text-sm text-gray-400">Bot Status</span>
            </div>
            <p className="text-lg font-semibold capitalize mt-1 ${
              botStatus === 'running' ? 'text-success-500' : 'text-gray-400'
            }">
              {botStatus}
            </p>
          </div>
          
          <div className="px-4 py-3 bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-800/50">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary-500" />
              <span className="text-sm text-gray-400">Symbol</span>
            </div>
            <p className="text-lg font-semibold text-white mt-1">
              {selectedSymbol}
            </p>
          </div>
        </div>
      </div>

      {/* Main Trading Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Chart & Controls */}
        <div className="lg:col-span-2 space-y-6">
          {/* Chart Container */}
          <div className="bg-gray-900/40 backdrop-blur-sm rounded-2xl border border-gray-800/50 shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-800/50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Live Trading Chart</h3>
                  <p className="text-sm text-gray-400">Real-time price movements</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <select 
                  value={selectedSymbol}
                  onChange={(e) => setSelectedSymbol(e.target.value)}
                  className="bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="R_100">Volatility 100 Index</option>
                  <option value="R_75">Volatility 75 Index</option>
                  <option value="R_50">Volatility 50 Index</option>
                  <option value="1HZ100V">Synthetic 100 Index</option>
                </select>
                
                <button
                  onClick={handleToggleBot}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
                    botStatus === 'running'
                      ? 'bg-gradient-to-r from-secondary-600 to-secondary-700 hover:from-secondary-500 hover:to-secondary-600'
                      : 'bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600'
                  } text-white hover:shadow-glow`}
                >
                  {botStatus === 'running' ? 'Stop Bot' : 'Start Bot'}
                </button>
              </div>
            </div>
            
            <div className="h-[400px] p-4">
              <TradingChart symbol={selectedSymbol} />
            </div>
          </div>

          {/* Quick Trade Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-gray-900 to-gray-950/80 backdrop-blur-sm rounded-2xl border border-gray-800/50 p-6 shadow-xl">
              <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-success-500" />
                Quick Rise Trade
              </h4>
              <p className="text-gray-400 text-sm mb-6">
                Execute a manual RISE trade with current market parameters
              </p>
              <button
                onClick={() => handleQuickTrade('RISE')}
                disabled={isTradeExecuting}
                className="w-full py-4 bg-gradient-to-r from-success-500/20 to-success-600/10 hover:from-success-500/30 hover:to-success-600/20 border border-success-500/30 rounded-xl text-success-400 font-bold text-lg transition-all duration-200 hover:scale-[1.02] hover:shadow-glow-success disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTradeExecuting ? (
                  <LoadingSpinner size="small" text="Executing..." />
                ) : (
                  '📈 RISE (BUY)'
                )}
              </button>
            </div>

            <div className="bg-gradient-to-br from-gray-900 to-gray-950/80 backdrop-blur-sm rounded-2xl border border-gray-800/50 p-6 shadow-xl">
              <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-secondary-500" />
                Quick Fall Trade
              </h4>
              <p className="text-gray-400 text-sm mb-6">
                Execute a manual FALL trade with current market parameters
              </p>
              <button
                onClick={() => handleQuickTrade('FALL')}
                disabled={isTradeExecuting}
                className="w-full py-4 bg-gradient-to-r from-secondary-500/20 to-secondary-600/10 hover:from-secondary-500/30 hover:to-secondary-600/20 border border-secondary-500/30 rounded-xl text-secondary-400 font-bold text-lg transition-all duration-200 hover:scale-[1.02] hover:shadow-glow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTradeExecuting ? (
                  <LoadingSpinner size="small" text="Executing..." />
                ) : (
                  '📉 FALL (SELL)'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Market Overview & Detailed Controls */}
        <div className="space-y-6">
          {/* Market Overview */}
          <div className="bg-gray-900/40 backdrop-blur-sm rounded-2xl border border-gray-800/50 shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-800/50">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary-500" />
                Market Overview
              </h3>
            </div>
            <div className="p-4">
              <MarketOverview />
            </div>
          </div>

          {/* Advanced Trade Controls */}
          <div className="bg-gray-900/40 backdrop-blur-sm rounded-2xl border border-gray-800/50 shadow-2xl p-6">
            <h3 className="font-semibold text-white mb-6 flex items-center gap-2">
              <Target className="w-5 h-5 text-accent-500" />
              Advanced Trading
            </h3>
            <TradeControls />
          </div>

          {/* Trading Status */}
          <div className="bg-gradient-to-br from-gray-900/60 to-gray-950/60 backdrop-blur-sm rounded-2xl border border-gray-800/50 shadow-xl p-6">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500/20 to-primary-700/20 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-primary-500" />
              </div>
              <div>
                <h4 className="font-semibold text-white">Trading Status</h4>
                <p className="text-gray-400 text-sm mt-2">
                  {wsConnectionStatus === 'connected' 
                    ? '✅ Connected to Deriv API. Real-time trading enabled.' 
                    : '❌ Connection lost. Trading functionality limited.'}
                </p>
                {marketData?.lastPrice && (
                  <div className="mt-3 p-3 bg-gray-800/30 rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Last Price:</span>
                      <span className="font-semibold text-white">
                        ${parseFloat(marketData.lastPrice).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Status Bar */}
      <div className="mt-6 p-4 bg-gray-900/30 backdrop-blur-sm rounded-xl border border-gray-800/50">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success-500 animate-pulse-slow" />
              <span className="text-sm text-gray-400">Real-time data</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary-500" />
              <span className="text-sm text-gray-400">Manual trading enabled</span>
            </div>
          </div>
          
          <div className="text-sm text-gray-400">
            Refresh rate: 1s • Data source: Deriv API
          </div>
        </div>
      </div>
    </div>
  );
};

export default Trading;