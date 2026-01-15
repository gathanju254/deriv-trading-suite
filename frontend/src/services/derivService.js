// frontend/src/services/derivService.js - UPDATED
import { authApi, api } from './api';  // Use both instances

export const derivService = {
  /* =========================
     OAUTH AUTH FLOW
  ========================== */
  async getOAuthRedirectUrl() {
    try {
      // Use authApi (no /api prefix) for /auth routes
      const response = await authApi.get('/auth/login');
      
      console.log('✅ OAuth redirect URL response:', response.data);
      
      if (!response.data?.redirect_url) {
        throw new Error('Missing redirect_url in response');
      }
      
      return response.data;
    } catch (error) {
      console.error('❌ Error getting OAuth redirect URL:', error.response?.data || error.message);
      throw error;
    }
  },

  /* =========================
     BOT CONTROL (use api with /api prefix)
  ========================== */
  async getBotStatus() {
    const { data } = await api.get('/status');
    return data;
  },

  async startBot() {
    const { data } = await api.post('/start');
    return data;
  },

  async stopBot() {
    const { data } = await api.post('/stop');
    return data;
  },

  /* =========================
     TRADING
  ========================== */
  async executeManualTrade(side) {
    const { data } = await api.post(`/manual/${side}`);
    return data;
  },

  async getTradeHistory(limit = 50) {
    const { data } = await api.get(`/trades?limit=${limit}`);
    return data;
  },

  /* =========================
     SIGNALS & METRICS
  ========================== */
  async getSignals() {
    try {
      const { data } = await api.get('/trades/signals?limit=10');
      return { signals: data.signals || [] };
    } catch {
      return { signals: [] };
    }
  },

  async getPerformance() {
    try {
      const { data } = await api.get('/performance/metrics');
      return data;
    } catch {
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
    const { data } = await api.get('/trades/stats/summary');
    return data;
  },

  async getRiskMetrics() {
    const { data } = await api.get('/risk/metrics');
    return data;
  },

  async getMarketData() {
    const { data } = await api.get('/market/data');
    return data;
  },

  async getBalance() {
    const { data } = await api.get('/balance');
    return data;
  },

  async logout() {
    try {
      await authApi.post('/auth/logout');  // Use authApi for logout
    } finally {
      localStorage.removeItem('user_id');
      localStorage.removeItem('session_token');
      localStorage.removeItem('deriv_access_token');
    }
  },

  /* =========================
     USER BOT CONTROL
  ========================== */
  async startUserBot() {
    const user_id = localStorage.getItem('user_id');
    const access_token = localStorage.getItem('deriv_access_token');

    if (!user_id || !access_token) {
      throw new Error('User not authenticated');
    }

    const { data } = await api.post('/user/bot/start', {
      user_id,
      oauth_token: access_token
    });

    return data;
  },

  async stopUserBot() {
    const user_id = localStorage.getItem('user_id');

    if (!user_id) {
      throw new Error('User not authenticated');
    }

    const { data } = await api.post('/user/bot/stop', { user_id });
    return data;
  },

  async getUserBotStatus() {
    const user_id = localStorage.getItem('user_id');

    if (!user_id) {
      throw new Error('User not authenticated');
    }

    const { data } = await api.get(`/user/bot/status/${user_id}`);
    return data;
  }
};

export default derivService;