// frontend/src/hooks/useWebSocket.js
import { useEffect, useState, useCallback } from 'react';
import { websocketService } from '../services/websocket';
import { useToast } from '../context/ToastContext';

export const useWebSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const { addToast } = useToast();

  const connect = useCallback(async (url) => {
    try {
      await websocketService.connect(url);
      setIsConnected(true);
      setConnectionStatus('connected');
      addToast('WebSocket connected', 'success');
    } catch (error) {
      setIsConnected(false);
      setConnectionStatus('disconnected');
      addToast('WebSocket connection failed', 'error');
    }
  }, [addToast]);

  const disconnect = useCallback(() => {
    websocketService.disconnect();
    setIsConnected(false);
    setConnectionStatus('disconnected');
    addToast('WebSocket disconnected', 'info');
  }, [addToast]);

  const subscribe = useCallback((messageType, callback) => {
    return websocketService.subscribe(messageType, callback);
  }, []);

  const send = useCallback((message) => {
    websocketService.send(message);
  }, []);

  useEffect(() => {
    const updateStatus = () => {
      setConnectionStatus(websocketService.getConnectionStatus());
    };

    const interval = setInterval(updateStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  return {
    isConnected,
    connectionStatus,
    connect,
    disconnect,
    subscribe,
    send
  };
};