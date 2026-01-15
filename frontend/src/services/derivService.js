// frontend/src/services/derivService.js
import api from './api';
import axios from 'axios';

// Local helpers (boring but reliable)
const getUserId = () => localStorage.getItem('user_id');
const getAccessToken = () => localStorage.getItem('deriv_access_token');

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const derivService = {
  /* =========================
     BOT CONTROL
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

  /* =========================
     OAUTH AUTH FLOW (CLEAN)
  ========================== */

  // ✅ NEW: Fetch OAuth redirect URL from backend
  async getOAuthRedirectUrl() {
    try {
      // Get the base URL (without /api)
      const baseURL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 
        (import.meta.env.PROD 
          ? 'https://deriv-trading-backend.onrender.com'
          : 'http://localhost:8000');
      
      const response = await axios.get(`${baseURL}/auth/login`);
      
      console.log('OAuth redirect URL response:', response.data);
      
      if (!response.data?.redirect_url) {
        throw new Error('Missing redirect_url in response');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error getting OAuth redirect URL:', error.response?.data || error.message);
      throw error;
    }
  },

  // Called AFTER Deriv redirects back with ?code=
  async handleOAuthCallback(code) {
    const { data } = await api.post('/auth/callback', { code });

    const { user_id, session_token, access_token } = data;

    if (user_id) localStorage.setItem('user_id', user_id);
    if (session_token) localStorage.setItem('session_token', session_token);
    if (access_token)
      localStorage.setItem('deriv_access_token', access_token);

    return data;
  },

  async logout() {
    try {
      await api.post('/auth/logout');
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
    const user_id = getUserId();
    const access_token = getAccessToken();

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
    const user_id = getUserId();

    if (!user_id) {
      throw new Error('User not authenticated');
    }

    const { data } = await api.post('/user/bot/stop', { user_id });
    return data;
  },

  async getUserBotStatus() {
    const user_id = getUserId();

    if (!user_id) {
      throw new Error('User not authenticated');
    }

    const { data } = await api.get(`/user/bot/status/${user_id}`);
    return data;
  }
};

export default derivService;
