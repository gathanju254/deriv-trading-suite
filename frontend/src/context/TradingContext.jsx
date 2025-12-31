// frontend/src/context/TradingContext.jsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';

import { derivService } from '../services/derivService';
import { websocketService } from '../services/websocket';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';

export const TradingContext = createContext(null);

export const TradingProvider = ({ children }) => {
  const { addToast } = useToast();
  const { isAuthenticated } = useAuth();

  /* =========================
     STATE
  ========================== */
  const [botStatus, setBotStatus] = useState('stopped');
  const [performance, setPerformance] = useState({});
  const [signals, setSignals] = useState([]);
  const [tradeHistory, setTradeHistory] = useState([]);
  const [wsConnectionStatus, setWsConnectionStatus] = useState('disconnected');
  const [loading, setLoading] = useState(false);
  const [marketData, setMarketData] = useState({});
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());
  const [balance, setBalance] = useState(0);

  const tradeHistoryRef = useRef([]);
  const signalsRef = useRef([]);
  const performanceRef = useRef({});

  const [notificationSettings] = useState({
    soundEnabled: localStorage.getItem('soundEnabled') !== 'false',
  });

  /* =========================
     WEBSOCKET HANDLERS
  ========================== */

  const handleTick = useCallback((data) => {
    setMarketData({
      lastPrice: data.quote,
      symbol: data.symbol,
      timestamp: data.epoch,
      lastUpdate: Date.now(),
    });
  }, []);

  const handleSignal = useCallback((data) => {
    const newSignal = {
      ...data,
      id: data.id || Date.now(),
      timestamp: data.timestamp || Date.now(),
    };

    setSignals((prev) => {
      const updated = [
        newSignal,
        ...prev.filter((s) => s.id !== newSignal.id),
      ].slice(0, 50);

      signalsRef.current = updated;
      return updated;
    });
  }, []);

  const handleBalanceUpdate = useCallback((data) => {
    if (data.balance !== undefined) {
      setBalance(data.balance);
      setLastUpdateTime(Date.now());
    }
  }, []);

  const handlePerformanceUpdate = useCallback((data) => {
    performanceRef.current = data;
    setPerformance((prev) => ({ ...prev, ...data }));
    setLastUpdateTime(Date.now());
  }, []);

  const handleTradeUpdate = useCallback(async (data) => {
    await refreshTradeHistory();
    await refreshPerformance();

    if (data.balance_after !== undefined) {
      setBalance(data.balance_after);
    }

    if (data.status === 'WON') {
      playSound('win.mp3');
      addToast('Trade Won 💰', 'success');
    }

    if (data.status === 'LOST') {
      playSound('lose.mp3');
      addToast('Trade Lost 💀', 'error');
    }

    setLastUpdateTime(Date.now());
  }, []);

  /* =========================
     WEBSOCKET INIT (ENV-AWARE) - UPDATED
  ========================== */

  const initWebSocket = useCallback(async () => {
    try {
      // Use backend WebSocket URL from environment
      const wsUrl = import.meta.env.VITE_WS_URL || 
                    (import.meta.env.PROD
                      ? 'wss://deriv-trading-backend.onrender.com/ws'  // Backend WebSocket
                      : 'ws://localhost:8000/ws');  // Local backend

      console.log('🌐 Attempting WebSocket connection to:', wsUrl);
      
      await websocketService.connect(wsUrl);
      setWsConnectionStatus('connected');

      // Prevent duplicate subscriptions by storing unsubscribe functions
      const unsubscribeTick = websocketService.subscribe('tick', handleTick);
      const unsubscribeSignal = websocketService.subscribe('signal', handleSignal);
      const unsubscribeBalance = websocketService.subscribe('balance', handleBalanceUpdate);
      const unsubscribePerformance = websocketService.subscribe('performance', handlePerformanceUpdate);
      const unsubscribeTrade = websocketService.subscribe('trade', handleTradeUpdate);

      console.log('✅ WebSocket connected:', wsUrl);
      
      // Return cleanup function
      return () => {
        unsubscribeTick();
        unsubscribeSignal();
        unsubscribeBalance();
        unsubscribePerformance();
        unsubscribeTrade();
      };
    } catch (err) {
      console.error('❌ WebSocket connection failed:', err);
      setWsConnectionStatus('disconnected');
    }
  }, [
    handleTick,
    handleSignal,
    handleBalanceUpdate,
    handlePerformanceUpdate,
    handleTradeUpdate,
  ]);

  /* =========================
     BOT CONTROL
  ========================== */

  const startBot = async () => {
    setLoading(true);
    try {
      await derivService.startBot();
      setBotStatus('running');
      await refreshAllData();
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
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     DATA REFRESH
  ========================== */

  const refreshPerformance = async () => {
    const data = await derivService.getPerformance();
    if (JSON.stringify(data) !== JSON.stringify(performanceRef.current)) {
      performanceRef.current = data;
      setPerformance(data);
    }
  };

  const refreshTradeHistory = async () => {
    const data = await derivService.getTradeHistory();
    if (
      JSON.stringify(data.trades) !==
      JSON.stringify(tradeHistoryRef.current)
    ) {
      tradeHistoryRef.current = data.trades || [];
      setTradeHistory(data.trades || []);
    }
  };

  const refreshSignals = async () => {
    const data = await derivService.getSignals();
    signalsRef.current = data.signals || [];
    setSignals(data.signals || []);
  };

  const refreshBalance = async () => {
    const data = await derivService.getBalance();
    setBalance(data.balance || 0);
  };

  const refreshAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        refreshPerformance(),
        refreshTradeHistory(),
        refreshSignals(),
        refreshBalance(),
      ]);
      setLastUpdateTime(Date.now());
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     AUTH-AWARE EFFECT - UPDATED
  ========================== */

  useEffect(() => {
    if (!isAuthenticated) {
      websocketService.disconnect();
      setWsConnectionStatus('disconnected');
      return;
    }

    refreshAllData();
    const cleanupPromise = initWebSocket();

    const balanceInterval = setInterval(refreshBalance, 30_000);
    const refreshInterval = setInterval(refreshAllData, 120_000);

    return () => {
      clearInterval(balanceInterval);
      clearInterval(refreshInterval);
      websocketService.disconnect();
      
      // Cleanup the WebSocket subscriptions
      cleanupPromise.then(cleanup => {
        if (cleanup && typeof cleanup === 'function') {
          cleanup();
        }
      }).catch(() => {});
    };
  }, [isAuthenticated]); // REMOVED initWebSocket from dependencies to prevent loops

  /* =========================
     SOUND
  ========================== */

  const playSound = (file) => {
    if (!notificationSettings.soundEnabled) return;
    const audio = new Audio(`/sounds/${file}`);
    audio.volume = 0.5;
    audio.play().catch(() => {});
  };

  /* =========================
     MANUAL RECONNECT FUNCTION
  ========================== */

  const manualReconnect = async () => {
    setWsConnectionStatus('connecting');
    try {
      websocketService.disconnect();
      const cleanup = await initWebSocket();
      if (cleanup) {
        // Store the cleanup for later
        return cleanup;
      }
    } catch (error) {
      setWsConnectionStatus('disconnected');
      addToast('WebSocket reconnection failed', 'error');
    }
  };

  /* =========================
     CONTEXT VALUE
  ========================== */

  return (
    <TradingContext.Provider
      value={{
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
        manualReconnect, // Add manual reconnect function
        executeManualTrade: derivService.executeManualTrade,
      }}
    >
      {children}
    </TradingContext.Provider>
  );
};

export const useTrading = () => useContext(TradingContext);