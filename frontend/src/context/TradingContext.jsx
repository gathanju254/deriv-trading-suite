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
  const [balance, setBalance] = useState(0);
  
  // Refs to prevent unnecessary state updates
  const tradeHistoryRef = useRef([]);
  const signalsRef = useRef([]);
  const performanceRef = useRef({});

  // Initialize WebSocket connection
  const initWebSocket = useCallback(async () => {
    try {
      await websocketService.connect('ws://localhost:8000/ws');
      setWsConnectionStatus('connected');
      
      // Subscribe to all events - CORRECTED: Use raw data directly
      websocketService.subscribe('signal', handleSignal);     // Real-time signals
      websocketService.subscribe('tick', handleTick);         // Market data
      websocketService.subscribe('trade', handleTrade);       // Trade updates
      websocketService.subscribe('connection', handleConnection);
      
      console.log('✅ WebSocket initialized');
    } catch (error) {
      console.error('WebSocket initialization failed:', error);
      setWsConnectionStatus('disconnected');
    }
  }, []);

  const handleTick = (data) => {
    // Handle real-time tick data - CORRECTED: Data is already the payload
    setMarketData(prev => ({
      ...prev,
      lastPrice: data.quote,
      symbol: data.symbol,
      timestamp: data.epoch,
      lastUpdate: Date.now()
    }));
  };

  const handleTrade = (data) => {
    // Handle trade updates - CORRECTED: Data is already the payload
    console.log('Trade update:', data);
    
    // Refresh trade history when trades occur
    refreshTradeHistory();
    
    // Update performance if needed
    if (data.type === 'trade' && (data.result === 'WON' || data.result === 'LOST')) {
      refreshPerformance();
    }
  };

  const handleSignal = (data) => {
    // Handle real-time signal updates from WebSocket - CORRECTED: Data is already the payload
    console.log('📡 New signal from WebSocket:', data);
    
    // Accept raw RISE/FALL signals without transformation
    setSignals(prev => {
      const newSignal = {
        ...data,
        id: data.id || Date.now(),
        timestamp: data.timestamp || Date.now()
      };
      
      const updated = [newSignal, ...prev].slice(0, 50);
      signalsRef.current = updated;
      return updated;
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
      const response = await derivService.getSignals();
      setSignals(response.signals || []);
    } catch (error) {
      console.error('Error refreshing signals:', error);
    }
  };

  // New: Function to refresh balance
  const refreshBalance = async () => {
    try {
      const balanceData = await derivService.getBalance();
      setBalance(balanceData.balance || 0);
    } catch (error) {
      console.error('Failed to refresh balance:', error);
      setBalance(0);
    }
  };

  // CORRECTED: Update refreshAllData to fix Promise.all bug
  const refreshAllData = async () => {
    setLoading(true);
    try {
      // Fetch all data in parallel with proper destructuring
      const [performanceData, historyData, signalsData, botMetrics] = await Promise.all([
        derivService.getPerformance(),
        derivService.getTradeHistory(),
        derivService.getSignals(),
        derivService.getBotMetrics()
      ]);
      
      // Fetch balance separately to avoid Promise.all mismatch
      await refreshBalance();
      
      // Only update if data has changed
      if (JSON.stringify(performanceData) !== JSON.stringify(performanceRef.current)) {
        performanceRef.current = performanceData;
        setPerformance(performanceData);
      }
      
      if (JSON.stringify(historyData.trades) !== JSON.stringify(tradeHistoryRef.current)) {
        tradeHistoryRef.current = historyData.trades || [];
        setTradeHistory(historyData.trades || []);
      }
      
      // Signals: Accept any format from backend
      const rawSignals = signalsData.signals || [];
      signalsRef.current = rawSignals;
      setSignals(rawSignals);
      
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
    initWebSocket();
    
    // Set up more frequent balance refresh
    const balanceInterval = setInterval(refreshBalance, 30 * 1000);
    const fullRefreshInterval = setInterval(refreshAllData, 5 * 60 * 1000);
    
    return () => {
      clearInterval(balanceInterval);
      clearInterval(fullRefreshInterval);
      websocketService.disconnect();
    };
  }, [initWebSocket]);

  // Update WebSocket status
  useEffect(() => {
    const updateStatus = () => {
      const status = websocketService.getConnectionStatus();
      setWsConnectionStatus(status);
    };
    
    const interval = setInterval(updateStatus, 5000);
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
    balance,
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