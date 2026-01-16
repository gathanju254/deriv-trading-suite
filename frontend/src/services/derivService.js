// frontend/src/services/derivService.js - SECURE OAUTH VERSION
import { authApi, api } from './api';

export const derivService = {
  /* =========================
     OAUTH AUTH FLOW (SECURE)
  ========================== */
  async getOAuthRedirectUrl() {
    try {
      console.log('🔗 Requesting OAuth URL from /auth/login...');
      
      // ✅ Use authApi for /auth routes (NO /api prefix)
      const response = await authApi.get('/auth/login', {
        timeout: 10000, // 10 second timeout
      });
      
      console.log('✅ OAuth response received:', response.data);
      
      if (!response.data?.redirect_url) {
        throw new Error(
          `Invalid OAuth response. Expected redirect_url, got: ${JSON.stringify(response.data)}`
        );
      }
      
      return response.data;
    } catch (error) {
      console.error('❌ OAuth request failed:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url
      });
      
      if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        throw new Error('Cannot connect to backend server. Make sure it is running.');
      }
      if (error.response?.status === 404) {
        throw new Error('Auth endpoint not found. Backend may be down.');
      }
      
      throw error;
    }
  },

  /* =========================
     SECURE CALLBACK HANDLER
  ========================== */
  async handleOAuthCallback(callbackData) {
    try {
      console.log('🔐 Posting OAuth callback data to backend...');
      
      const response = await authApi.post('/auth/callback', {
        access_token: callbackData.access_token,
        state: callbackData.state,
        account_id: callbackData.account_id,
      });
      
      console.log('✅ OAuth callback response:', response.data);
      
      if (!response.data?.success) {
        throw new Error('OAuth callback failed');
      }
      
      return response.data;
    } catch (error) {
      console.error('❌ OAuth callback failed:', error.message);
      throw error;
    }
  },

  /* =========================
     USER AUTHENTICATION
  ========================== */
  async getCurrentUser() {
    try {
      const response = await authApi.get('/auth/me', {
        timeout: 5000,
      });
      
      console.log('✅ Current user data:', response.data);
      return response.data;
    } catch (error) {
      console.warn('⚠️  Failed to get current user:', error.message);
      throw error;
    }
  },

  async logout() {
    try {
      // Use authApi for logout (it's under /auth/logout)
      await authApi.post('/auth/logout', {});
    } catch (error) {
      console.warn('⚠️  Backend logout warning:', error.message);
      // Continue with local logout even if backend fails
    } finally {
      // Clear ALL auth-related items
      const itemsToClear = [
        'user_id', 'session_token', 'auth_token', 'deriv_access_token',
        'email', 'deriv_account_id', 'login_timestamp'
      ];
      
      itemsToClear.forEach(item => localStorage.removeItem(item));
      console.log('✅ Local logout complete');
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

  async getTradesByStatus(status, limit = 50) {
    const { data } = await api.get(`/trades/status/${status}?limit=${limit}`);
    return data;
  },

  async getTradesByDateRange(startDate, endDate) {
    const { data } = await api.get(`/trades/date-range?start_date=${startDate}&end_date=${endDate}`);
    return data;
  },

  async getTradesByDirection(direction, limit = 50) {
    const { data } = await api.get(`/trades/direction/${direction}?limit=${limit}`);
    return data;
  },

  /* =========================
     SIGNALS & METRICS
  ========================== */
  async getSignals(limit = 10) {
    try {
      const { data } = await api.get(`/trades/signals?limit=${limit}`);
      return { signals: data.signals || [] };
    } catch (error) {
      console.warn('Failed to get signals:', error.message);
      return { signals: [] };
    }
  },

  async getPerformance() {
    try {
      const { data } = await api.get('/performance/metrics');
      return data;
    } catch (error) {
      console.warn('Failed to get performance:', error.message);
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
      const { data } = await api.get('/trades/stats/summary');
      return data;
    } catch (error) {
      console.warn('Failed to get trading stats:', error.message);
      return {
        total_trades: 0,
        won_trades: 0,
        lost_trades: 0,
        win_rate: 0,
        total_profit: 0,
        total_invested: 0,
        roi_percentage: 0
      };
    }
  },

  async getRiskMetrics() {
    try {
      const { data } = await api.get('/risk/metrics');
      return data;
    } catch (error) {
      console.warn('Failed to get risk metrics:', error.message);
      return {
        next_trade_amount: 0,
        consecutive_losses: 0,
        consecutive_wins: 0,
        state: 'normal',
        daily_loss: 0,
        daily_profit: 0
      };
    }
  },

  async getLockStatus() {
    try {
      const { data } = await api.get('/risk/lock-status');
      return data;
    } catch (error) {
      console.warn('Failed to get lock status:', error.message);
      return {
        state: 'unknown',
        is_locked: false,
        locked_until: null
      };
    }
  },

  async manualUnlock() {
    const { data } = await api.post('/risk/unlock');
    return data;
  },

  async resetDailyProfit() {
    const { data } = await api.post('/risk/reset-daily-profit');
    return data;
  },

  async getMarketData() {
    try {
      const { data } = await api.get('/market/data');
      return data;
    } catch (error) {
      console.warn('Failed to get market data:', error.message);
      return {
        symbol: 'R_100',
        price: 0,
        status: 'unknown'
      };
    }
  },

  async getBalance() {
    try {
      const { data } = await api.get('/balance');
      return data;
    } catch (error) {
      console.warn('Failed to get balance:', error.message);
      return { balance: 0 };
    }
  },

  async getContractType() {
    try {
      const { data } = await api.get('/contract-type');
      return data;
    } catch (error) {
      console.warn('Failed to get contract type:', error.message);
      return {
        type: 'Rise/Fall (Up/Down)',
        description: '1-tick contract predicting price direction',
        duration_ticks: 5
      };
    }
  },

  async getRecoveryStatus() {
    try {
      const { data } = await api.get('/recovery/status');
      return data;
    } catch (error) {
      console.warn('Failed to get recovery status:', error.message);
      return { recovery_enabled: false };
    }
  },

  async resetRecovery() {
    const { data } = await api.post('/recovery/reset');
    return data;
  },

  async simulateRecovery(initialLoss = 10.0, maxStreak = 3) {
    const { data } = await api.get(`/recovery/simulate?initial_loss=${initialLoss}&max_streak=${maxStreak}`);
    return data;
  },

  async configureRecovery(config) {
    const { data } = await api.post('/recovery/configure', config);
    return data;
  },

  async getStrategiesPerformance() {
    try {
      const { data } = await api.get('/strategies/performance');
      return data;
    } catch (error) {
      console.warn('Failed to get strategies performance:', error.message);
      return {};
    }
  },

  async getMLStatus() {
    try {
      const { data } = await api.get('/ml/status');
      return data;
    } catch (error) {
      console.warn('Failed to get ML status:', error.message);
      return {
        ml_enabled: false,
        model_trained: false,
        training_samples: 0
      };
    }
  },

  async startUserBot() {
    try {
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
    } catch (error) {
      console.error('Failed to start user bot:', error);
      throw error;
    }
  },

  async stopUserBot() {
    try {
      const user_id = localStorage.getItem('user_id');

      if (!user_id) {
        throw new Error('User not authenticated');
      }

      const { data } = await api.post('/user/bot/stop', { user_id });
      return data;
    } catch (error) {
      console.error('Failed to stop user bot:', error);
      throw error;
    }
  },

  async getUserBotStatus() {
    try {
      const user_id = localStorage.getItem('user_id');

      if (!user_id) {
        throw new Error('User not authenticated');
      }

      const { data } = await api.get(`/user/bot/status/${user_id}`);
      return data;
    } catch (error) {
      console.error('Failed to get user bot status:', error);
      throw error;
    }
  },

  async getCommissionSummary() {
    try {
      const { data } = await api.get('/admin/commissions');
      return data;
    } catch (error) {
      console.warn('Failed to get commission summary:', error.message);
      return {
        total_commissions: 0,
        daily_commissions: 0,
        active_users: 0,
        markup_percentage: 2.0
      };
    }
  },

  async getDebugPositions() {
    try {
      const { data } = await api.get('/debug/positions');
      return data;
    } catch (error) {
      console.warn('Failed to get debug positions:', error.message);
      return { open_positions: 0, active_positions: {} };
    }
  },

  async getDebugBot() {
    try {
      const { data } = await api.get('/debug/bot');
      return data;
    } catch (error) {
      console.warn('Failed to get debug bot info:', error.message);
      return { bot_running: false, symbol: 'unknown' };
    }
  },

  async getHealth() {
    try {
      const { data } = await api.get('/health');
      return data;
    } catch (error) {
      console.warn('Health check failed:', error.message);
      return { status: 'unhealthy', service: 'Deriv Trading Backend' };
    }
  },

  async manualSettleTrade(tradeId, result, payout) {
    const { data } = await api.post(`/trades/manual-settle/${tradeId}`, {
      result,
      payout
    });
    return data;
  },

  async autoSettleExpiredTrades() {
    const { data } = await api.post('/trades/auto-settle-expired');
    return data;
  }
};

export default derivService;