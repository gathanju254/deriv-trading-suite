// frontend/src/context/TradingContext.jsx
// frontend/src/context/TradingContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { derivService } from '../services/derivService';
import { websocketService } from '../services/websocket';

const TradingContext = createContext();

export const useTrading = () => {
  const context = useContext(TradingContext);
  if (!context) {
    throw new Error('useTrading must be used within a TradingProvider');
  }
  return context;
};

export const TradingProvider = ({ children }) => {
  const [botStatus, setBotStatus] = useState('stopped');
  const [performance, setPerformance] = useState({});
  const [signals, setSignals] = useState([]);
  const [tradeHistory, setTradeHistory] = useState([]);
  const [wsConnectionStatus, setWsConnectionStatus] = useState('disconnected');
  const [loading, setLoading] = useState(false);
  const [marketData, setMarketData] = useState({});
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());
  
  // Refs to prevent unnecessary state updates
  const tradeHistoryRef = useRef([]);
  const signalsRef = useRef([]);
  const performanceRef = useRef({});

  // Initialize WebSocket connection
  const initWebSocket = useCallback(async () => {
    try {
      setWsConnectionStatus('connecting');
      await websocketService.connect('ws://localhost:8000/ws');
      setWsConnectionStatus('connected');
      
      // Subscribe to real-time updates
      const unsubscribeTick = websocketService.subscribe('tick', handleTick);
      const unsubscribeTrade = websocketService.subscribe('trade', handleTrade);
      const unsubscribeSignal = websocketService.subscribe('signal', handleSignal);
      const unsubscribeConnection = websocketService.subscribe('connection', handleConnection);
      
      return () => {
        unsubscribeTick();
        unsubscribeTrade();
        unsubscribeSignal();
        unsubscribeConnection();
      };
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      setWsConnectionStatus('disconnected');
    }
  }, []);

  const handleTick = (data) => {
    // Handle real-time tick data
    setMarketData(prev => ({
      ...prev,
      lastPrice: data.quote,
      symbol: data.symbol,
      timestamp: data.epoch,
      lastUpdate: Date.now()
    }));
  };

  const handleTrade = (data) => {
    // Handle trade updates - only refresh specific data
    console.log('Trade update:', data);
    
    // Only refresh trade history, not everything
    derivService.getTradeHistory(20).then(historyData => {
      if (JSON.stringify(historyData.trades) !== JSON.stringify(tradeHistoryRef.current)) {
        tradeHistoryRef.current = historyData.trades || [];
        setTradeHistory(historyData.trades || []);
      }
    });
    
    // Update performance if needed
    if (data.data?.type === 'trade' && (data.data.result === 'WON' || data.data.result === 'LOST')) {
      derivService.getPerformance().then(performanceData => {
        if (JSON.stringify(performanceData) !== JSON.stringify(performanceRef.current)) {
          performanceRef.current = performanceData;
          setPerformance(performanceData);
        }
      });
    }
  };

  const handleSignal = (data) => {
    // Handle signal updates - only update signals
    setSignals(prev => {
      const newSignals = [data.data, ...prev.slice(0, 9)];
      signalsRef.current = newSignals;
      return newSignals;
    });
  };

  const handleConnection = (data) => {
    console.log('WebSocket connection status:', data);
  };

  const startBot = async () => {
    setLoading(true);
    try {
      await derivService.startBot();
      setBotStatus('running');
      // Only refresh performance after bot start
      await refreshPerformance();
    } catch (error) {
      console.error('Failed to start bot:', error);
    } finally {
      setLoading(false);
    }
  };

  const stopBot = async () => {
    setLoading(true);
    try {
      await derivService.stopBot();
      setBotStatus('stopped');
      // Only refresh performance after bot stop
      await refreshPerformance();
    } catch (error) {
      console.error('Failed to stop bot:', error);
    } finally {
      setLoading(false);
    }
  };

  // Refresh specific data functions
  const refreshPerformance = async () => {
    try {
      const performanceData = await derivService.getPerformance();
      if (JSON.stringify(performanceData) !== JSON.stringify(performanceRef.current)) {
        performanceRef.current = performanceData;
        setPerformance(performanceData);
      }
    } catch (error) {
      console.error('Failed to refresh performance:', error);
    }
  };

  const refreshTradeHistory = async () => {
    try {
      const historyData = await derivService.getTradeHistory();
      if (JSON.stringify(historyData.trades) !== JSON.stringify(tradeHistoryRef.current)) {
        tradeHistoryRef.current = historyData.trades || [];
        setTradeHistory(historyData.trades || []);
      }
    } catch (error) {
      console.error('Failed to refresh trade history:', error);
    }
  };

  const refreshSignals = async () => {
    try {
      const signalsData = await derivService.getSignals();
      if (JSON.stringify(signalsData.signals) !== JSON.stringify(signalsRef.current)) {
        signalsRef.current = signalsData.signals || [];
        setSignals(signalsData.signals || []);
      }
    } catch (error) {
      console.error('Failed to refresh signals:', error);
    }
  };

  const refreshAllData = async () => {
    setLoading(true);
    try {
      // Fetch all data in parallel but update individually
      const [performanceData, historyData, signalsData, botMetrics] = await Promise.all([
        derivService.getPerformance(),
        derivService.getTradeHistory(),
        derivService.getSignals(),
        derivService.getBotMetrics()
      ]);
      
      // Only update if data has changed
      if (JSON.stringify(performanceData) !== JSON.stringify(performanceRef.current)) {
        performanceRef.current = performanceData;
        setPerformance(performanceData);
      }
      
      if (JSON.stringify(historyData.trades) !== JSON.stringify(tradeHistoryRef.current)) {
        tradeHistoryRef.current = historyData.trades || [];
        setTradeHistory(historyData.trades || []);
      }
      
      if (JSON.stringify(signalsData.signals) !== JSON.stringify(signalsRef.current)) {
        signalsRef.current = signalsData.signals || [];
        setSignals(signalsData.signals || []);
      }
      
      // Update bot status from metrics
      if (botMetrics.running !== undefined) {
        setBotStatus(botMetrics.running ? 'running' : 'stopped');
      }
      
      setLastUpdateTime(Date.now());
    } catch (error) {
      console.error('Failed to refresh data:', error);
    } finally {
      setLoading(false);
    }
  };

  const manualReconnect = async () => {
    setWsConnectionStatus('connecting');
    try {
      websocketService.disconnect();
      await initWebSocket();
    } catch (error) {
      setWsConnectionStatus('disconnected');
    }
  };

  // Load initial data
  useEffect(() => {
    refreshAllData();
    
    // Initialize WebSocket
    const cleanup = initWebSocket();
    
    // Set up less frequent periodic refresh (5 minutes instead of 30 seconds)
    const interval = setInterval(refreshAllData, 5 * 60 * 1000);
    
    return () => {
      clearInterval(interval);
      websocketService.disconnect();
      if (cleanup && typeof cleanup.then === 'function') {
        cleanup.then(fn => fn && fn());
      }
    };
  }, [initWebSocket]);

  // Update WebSocket status - less frequent
  useEffect(() => {
    const updateStatus = () => {
      const status = websocketService.getConnectionStatus();
      setWsConnectionStatus(status);
    };
    
    const interval = setInterval(updateStatus, 5000); // Every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const value = {
    botStatus,
    performance,
    signals,
    tradeHistory,
    wsConnectionStatus,
    loading,
    marketData,
    lastUpdateTime,
    startBot,
    stopBot,
    refreshAllData,
    refreshPerformance,
    refreshTradeHistory,
    refreshSignals,
    manualReconnect,
    executeManualTrade: derivService.executeManualTrade
  };

  return (
    <TradingContext.Provider value={value}>
      {children}
    </TradingContext.Provider>
  );
};