// frontend/src/context/TradingContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { derivService } from '../services/derivService';
import { websocketService } from '../services/websocket';
import { useToast } from './ToastContext';  // Assuming you have this for notifications

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

  // Add state for notification settings (or fetch from a global context if available)
  const [notificationSettings, setNotificationSettings] = useState({
    soundEnabled: localStorage.getItem('soundEnabled') === 'true' || true,  // Load from localStorage, default to true
  });

  // ================== WEBSOCKET HANDLERS ==================

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

  const handleSignal = (data) => {
    // Handle real-time signal updates from WebSocket
    console.log('📡 New signal from WebSocket:', data);
    
    // Accept raw RISE/FALL signals without transformation
    setSignals(prev => {
      const newSignal = {
        ...data,
        id: data.id || Date.now(),
        timestamp: data.timestamp || Date.now()
      };
      
      // Deduplicate by ID: Remove any existing signal with the same ID, then add the new one
      const filteredPrev = prev.filter(s => s.id !== newSignal.id);
      const updated = [newSignal, ...filteredPrev].slice(0, 50);
      signalsRef.current = updated;
      return updated;
    });
  };

  const handleConnection = (data) => {
    console.log('WebSocket connection status:', data);
  };

  const handleBalanceUpdate = (data) => {
    console.log('💰 Balance update:', data);
    if (data.balance !== undefined) {
      setBalance(data.balance);
      setLastUpdateTime(Date.now());
    }
  };

  const handlePerformanceUpdate = (data) => {
    console.log('📊 Performance update:', data);
    if (data) {
      performanceRef.current = data;
      setPerformance(prev => ({ ...prev, ...data }));
      setLastUpdateTime(Date.now());
    }
  };

  const handleTradeUpdate = (data) => {
    console.log('🔄 Trade update:', data);
    
    // Update trade history immediately when trades occur
    refreshTradeHistory();
    
    // Update performance stats
    refreshPerformance();
    
    // Update balance if included in trade data
    if (data.balance_after !== undefined) {
      setBalance(data.balance_after);
    }
    
    // Play sound based on trade result
    if (data.status === 'WON') {  // Changed from data.result to data.status
      playSound('win.wav');  // Also fix file extension (see below)
      addToast('Trade Won!', 'success');
    } else if (data.status === 'LOST') {  // Changed from data.result to data.status
      playSound('lose.wav');  // Also fix file extension (see below)
      addToast('Trade Lost!', 'error');
    }
    
    setLastUpdateTime(Date.now());
  };

  // ================== WEBSOCKET INITIALIZATION ==================

  const initWebSocket = useCallback(async () => {
    try {
      await websocketService.connect('ws://localhost:8000/ws');
      setWsConnectionStatus('connected');
      
      // Subscribe to ALL relevant WebSocket events
      websocketService.subscribe('balance', handleBalanceUpdate);
      websocketService.subscribe('performance', handlePerformanceUpdate);
      websocketService.subscribe('trade', handleTradeUpdate);
      websocketService.subscribe('tick', handleTick);
      websocketService.subscribe('signal', handleSignal);
      websocketService.subscribe('connection', handleConnection);
      
      // Also subscribe to 'all' for debugging and catch-all
      const unsubscribeAll = websocketService.subscribe('all', (msg) => {
        console.log('🌐 All WebSocket message:', msg);
      });
      
      console.log('✅ WebSocket initialized with real-time subscriptions');
      
      // Store unsubscribe function for cleanup
      return () => {
        unsubscribeAll();
      };
    } catch (error) {
      console.error('WebSocket initialization failed:', error);
      setWsConnectionStatus('disconnected');
    }
  }, []);

  // ================== BOT CONTROL FUNCTIONS ==================

  const startBot = async () => {
    setLoading(true);
    try {
      await derivService.startBot();
      setBotStatus('running');
      // Immediately update performance after starting
      await refreshPerformance();
      // Update all data
      await refreshAllData();
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
      // Update performance after stopping
      await refreshPerformance();
    } catch (error) {
      console.error('Failed to stop bot:', error);
    } finally {
      setLoading(false);
    }
  };

  // ================== DATA REFRESH FUNCTIONS ==================

  const refreshPerformance = async () => {
    try {
      const performanceData = await derivService.getPerformance();
      if (JSON.stringify(performanceData) !== JSON.stringify(performanceRef.current)) {
        performanceRef.current = performanceData;
        setPerformance(performanceData);
        setLastUpdateTime(Date.now());
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
        setLastUpdateTime(Date.now());
      }
    } catch (error) {
      console.error('Failed to refresh trade history:', error);
    }
  };

  const refreshSignals = async () => {
    try {
      const response = await derivService.getSignals();
      const rawSignals = response.signals || [];
      signalsRef.current = rawSignals;
      setSignals(rawSignals);
      setLastUpdateTime(Date.now());
    } catch (error) {
      console.error('Error refreshing signals:', error);
    }
  };

  const refreshBalance = async () => {
    try {
      const balanceData = await derivService.getBalance();
      const newBalance = balanceData.balance || 0;
      if (newBalance !== balance) {
        setBalance(newBalance);
        setLastUpdateTime(Date.now());
      }
    } catch (error) {
      console.error('Failed to refresh balance:', error);
      // Don't throw error, keep existing balance
    }
  };

  const refreshAllData = async () => {
    setLoading(true);
    try {
      // Fetch all data in parallel
      const [performanceData, historyData, signalsData] = await Promise.all([
        derivService.getPerformance(),
        derivService.getTradeHistory(),
        derivService.getSignals()
      ]);
      
      // Fetch balance separately to avoid Promise.all issues
      await refreshBalance();
      
      // Update performance if changed
      if (JSON.stringify(performanceData) !== JSON.stringify(performanceRef.current)) {
        performanceRef.current = performanceData;
        setPerformance(performanceData);
      }
      
      // Update trade history if changed
      if (JSON.stringify(historyData.trades) !== JSON.stringify(tradeHistoryRef.current)) {
        tradeHistoryRef.current = historyData.trades || [];
        setTradeHistory(historyData.trades || []);
      }
      
      // Update signals if changed
      const rawSignals = signalsData.signals || [];
      if (JSON.stringify(rawSignals) !== JSON.stringify(signalsRef.current)) {
        signalsRef.current = rawSignals;
        setSignals(rawSignals);
      }
      
      // Also check bot status
      try {
        const botMetrics = await derivService.getBotMetrics();
        if (botMetrics.running !== undefined) {
          setBotStatus(botMetrics.running ? 'running' : 'stopped');
        }
      } catch (error) {
        // Ignore bot metrics errors
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

  // ================== SOUND NOTIFICATIONS ==================

  // Function to play sound
  const playSound = (soundFile) => {
    if (!notificationSettings.soundEnabled) return;
    try {
      const audio = new Audio(`/sounds/${soundFile}`);
      audio.volume = 0.7;  // Adjust volume (0.0 to 1.0)
      audio.play().catch((error) => {
        console.warn('Audio play failed:', error);  // Handle browser restrictions (e.g., autoplay policy)
      });
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  };

  // ================== USE EFFECTS ==================

  // Load initial data and setup WebSocket
  useEffect(() => {
    refreshAllData();
    
    // Initialize WebSocket
    const cleanup = initWebSocket();
    
    // Set up periodic refreshes (fallback if WebSocket fails)
    const balanceInterval = setInterval(refreshBalance, 30 * 1000);
    const fullRefreshInterval = setInterval(refreshAllData, 2 * 60 * 1000); // 2 minutes
    
    return () => {
      clearInterval(balanceInterval);
      clearInterval(fullRefreshInterval);
      websocketService.disconnect();
      if (cleanup && typeof cleanup.then === 'function') {
        cleanup.then(fn => fn && fn());
      }
    };
  }, []);

  // Update WebSocket connection status periodically
  useEffect(() => {
    const updateStatus = () => {
      const status = websocketService.getConnectionStatus();
      setWsConnectionStatus(status);
      
      // Auto-reconnect if disconnected
      if (status === 'disconnected' && !websocketService.isManualClose) {
        console.log('Auto-reconnecting WebSocket...');
        initWebSocket();
      }
    };
    
    const interval = setInterval(updateStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  // Optional: Add an effect to listen for changes (if needed for real-time sync)
  useEffect(() => {
    const handleStorageChange = () => {
      setNotificationSettings(prev => ({
        ...prev,
        soundEnabled: localStorage.getItem('soundEnabled') === 'true',
      }));
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // ================== CONTEXT VALUE ==================

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
    refreshBalance,
    manualReconnect,
    executeManualTrade: derivService.executeManualTrade
  };

  return (
    <TradingContext.Provider value={value}>
      {children}
    </TradingContext.Provider>
  );
};