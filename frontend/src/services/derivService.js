// frontend/src/services/derivService.js
import api from './api';

export const derivService = {
  // Bot Control
  async getBotStatus() {
    try {
      const response = await api.get('/status');
      return response.data;
    } catch (error) {
      console.error('Error getting bot status:', error);
      throw error;
    }
  },

  async startBot() {
    try {
      const response = await api.post('/start');
      return response.data;
    } catch (error) {
      console.error('Error starting bot:', error);
      throw error;
    }
  },

  async stopBot() {
    try {
      const response = await api.post('/stop');
      return response.data;
    } catch (error) {
      console.error('Error stopping bot:', error);
      throw error;
    }
  },

  // Trading
  async executeManualTrade(side) {
    try {
      const response = await api.post(`/manual/${side}`);
      return response.data;
    } catch (error) {
      console.error('Error executing manual trade:', error);
      throw error;
    }
  },

  async getTradeHistory(limit = 50) {
    try {
      const response = await api.get(`/trades?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error getting trade history:', error);
      throw error;
    }
  },

  // Signals & Data
  async getSignals() {
    try {
      const response = await api.get('/trades/signals?limit=10');
      return { signals: response.data.signals || [] };
    } catch (error) {
      console.error('Error getting signals:', error);
      // Return empty signals instead of throwing error
      return { signals: [] };
    }
  },

  async getPerformance() {
    try {
      const response = await api.get('/performance/metrics');
      
      console.log('🔍 RAW PERFORMANCE RESPONSE:', response.data); // DEBUG LOG
      
      // Validate response structure
      if (!response.data) {
        throw new Error('No data received from performance endpoint');
      }
      
      // Log the exact field names received
      console.log('🔍 AVAILABLE KEYS:', Object.keys(response.data));
      
      return response.data;
    } catch (error) {
      console.error('Error getting performance:', error);
      
      // Return structured fallback data
      return {
        win_rate: 0,
        pnl: 0,
        sharpe_ratio: 0,
        total_trades: 0,
        daily_pnl: 0,
        max_drawdown: 0,
        completed_trades: 0,
        winning_trades: 0,
        avg_profit: 0
      };
    }
  },

  async getTradingStats() {
    try {
      const response = await api.get('/trades/stats/summary');
      return response.data;
    } catch (error) {
      console.error('Error getting trading stats:', error);
      return {};
    }
  },

  // Additional endpoints
  async getRiskMetrics() {
    try {
      const response = await api.get('/risk/metrics');
      return response.data;
    } catch (error) {
      console.error('Error getting risk metrics:', error);
      return {};
    }
  },

  async getBotMetrics() {
    try {
      const response = await api.get('/performance/metrics');
      return response.data;
    } catch (error) {
      console.error('Error getting bot metrics:', error);
      return {};
    }
  },

  async getMarketData() {
    try {
      const response = await api.get('/market/data');
      return response.data;
    } catch (error) {
      console.error('Error getting market data:', error);
      return {};
    }
  }
};

export default derivService;