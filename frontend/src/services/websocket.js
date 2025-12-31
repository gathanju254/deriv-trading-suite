// frontend/src/services/websocket.js
class WebSocketService {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 3000;
    this.subscribers = new Map();
    this.url = null;
    this.isManualClose = false;
    this.reconnectTimer = null;
  }

  connect(url) {
    // If no URL provided, use the backend WebSocket URL
    if (!url) {
      // Use environment variable or default to backend URL
      url = import.meta.env.VITE_WS_URL || 
            (import.meta.env.PROD
              ? 'wss://deriv-trading-backend.onrender.com/ws'  // Backend WebSocket
              : 'ws://localhost:8000/ws');  // Local backend
    }

    return new Promise((resolve, reject) => {
      try {
        this.url = url;
        this.isManualClose = false;
        
        // Clear any existing reconnect timer
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
        
        console.log('🌐 Connecting to WebSocket:', url);
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          console.log('✅ WebSocket connected to:', url);
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onclose = (event) => {
          console.log('❌ WebSocket disconnected:', event.code, event.reason);
          
          // Don't attempt reconnect if manually closed
          if (!this.isManualClose && event.code !== 1000) {
            this.handleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          reject(new Error('WebSocket connection failed'));
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };
      } catch (error) {
        console.error('❌ WebSocket connection error:', error);
        reject(error);
      }
    });
  }

  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.url) {
      this.reconnectAttempts++;
      const delay = this.reconnectInterval * Math.pow(1.5, this.reconnectAttempts - 1);
      
      console.log(`🔄 Attempting to reconnect in ${Math.round(delay/1000)}s... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      this.reconnectTimer = setTimeout(() => {
        if (this.url) {
          this.connect(this.url).catch(error => {
            console.error('❌ Reconnection failed:', error);
          });
        }
      }, delay);
    } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('🚫 Max reconnection attempts reached');
    }
  }

  handleMessage(data) {
    try {
      const message = JSON.parse(data);
      
      // Debug logging (optional - comment out in production)
      // console.log('📡 WebSocket message received:', message);
      
      // Handle both formats: {type, data} or direct payload
      let messageType = message.type;
      let messageData = message.data || message;
      
      // If no type in message, try to infer from content
      if (!messageType) {
        if (message.symbol && message.quote) messageType = 'tick';
        else if (message.balance !== undefined) messageType = 'balance';
        else if (message.side || message.direction) messageType = 'trade';
        else if (message.pnl !== undefined || message.win_rate !== undefined) messageType = 'performance';
        else if (message.direction && !message.side) messageType = 'signal';
        else messageType = 'unknown';
      }
      
      // Debug: Log the inferred type (optional)
      // console.log(`📡 Inferred message type: ${messageType}`);
      
      // Notify specific type subscribers
      const subscribers = this.subscribers.get(messageType) || [];
      subscribers.forEach(callback => {
        try {
          callback(messageData);
        } catch (error) {
          console.error('Error in WebSocket callback:', error);
        }
      });
      
      // Also broadcast to 'all' subscribers
      const allSubscribers = this.subscribers.get('all') || [];
      allSubscribers.forEach(callback => {
        try {
          callback({ type: messageType, data: messageData });
        } catch (error) {
          console.error('Error in "all" WebSocket callback:', error);
        }
      });
      
    } catch (error) {
      console.error('Error parsing WebSocket message:', error, data);
    }
  }

  subscribe(messageType, callback) {
    if (!this.subscribers.has(messageType)) {
      this.subscribers.set(messageType, []);
    }
    this.subscribers.get(messageType).push(callback);
    
    console.log(`📡 Subscribed to ${messageType}, total subscribers: ${this.subscribers.get(messageType).length}`);
    
    return () => this.unsubscribe(messageType, callback);
  }

  unsubscribe(messageType, callback) {
    const subscribers = this.subscribers.get(messageType);
    if (subscribers) {
      const index = subscribers.indexOf(callback);
      if (index > -1) {
        subscribers.splice(index, 1);
        console.log(`📡 Unsubscribed from ${messageType}, remaining: ${subscribers.length}`);
      }
    }
  }

  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
      }
    } else {
      console.warn('WebSocket is not connected');
    }
  }

  disconnect() {
    this.isManualClose = true;
    
    // Clear reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnected');
      this.ws = null;
    }
    
    // Clear all subscribers
    this.subscribers.clear();
    
    console.log('👋 WebSocket disconnected');
  }

  getConnectionStatus() {
    if (!this.ws) return 'disconnected';
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CLOSING:
        return 'closing';
      case WebSocket.CLOSED:
        return 'disconnected';
      default:
        return 'unknown';
    }
  }

  // Helper method to get all subscribed types (for debugging)
  getSubscribedTypes() {
    return Array.from(this.subscribers.keys());
  }

  // New method: check if WebSocket is healthy
  isHealthy() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  // New method: force reconnection
  async forceReconnect() {
    console.log('🔁 Force reconnecting WebSocket...');
    this.disconnect();
    this.isManualClose = false;
    return this.connect(this.url);
  }
}

export const websocketService = new WebSocketService();