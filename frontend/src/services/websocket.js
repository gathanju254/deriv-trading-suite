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
  }

  connect(url) {
    return new Promise((resolve, reject) => {
      try {
        this.url = url;
        this.isManualClose = false;
        
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          console.log('WebSocket connected to:', url);
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          
          // Don't attempt reconnect if manually closed
          if (!this.isManualClose && event.code !== 1000) {
            this.handleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(new Error('WebSocket connection failed'));
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };
      } catch (error) {
        console.error('WebSocket connection error:', error);
        reject(error);
      }
    });
  }

  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.url) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        if (this.url) {
          this.connect(this.url).catch(error => {
            console.error('Reconnection failed:', error);
          });
        }
      }, this.reconnectInterval * Math.pow(1.5, this.reconnectAttempts - 1)); // Exponential backoff
    } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
    }
  }

  handleMessage(data) {
    try {
      const message = JSON.parse(data);
      console.log('📡 WebSocket message received:', message); // Debug log
      
      // Handle both formats: {type, data} or direct payload
      let messageType = message.type;
      let messageData = message.data || message;
      
      // If no type in message, try to infer from content
      if (!messageType) {
        if (message.symbol && message.quote) messageType = 'tick';
        else if (message.balance !== undefined) messageType = 'balance';
        else if (message.side) messageType = 'trade';
        else if (message.pnl !== undefined || message.win_rate !== undefined) messageType = 'performance';
        else if (message.direction) messageType = 'signal';
        else messageType = 'unknown';
      }
      
      // Log the inferred type for debugging
      console.log(`📡 Inferred message type: ${messageType}`);
      
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
    
    return () => this.unsubscribe(messageType, callback); // Return unsubscribe function
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
    if (this.ws) {
      this.ws.close(1000, 'Client disconnected');
      this.ws = null;
    }
    this.subscribers.clear();
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
}

export const websocketService = new WebSocketService();