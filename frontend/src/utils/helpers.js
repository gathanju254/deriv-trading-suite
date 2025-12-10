// frontend/src/utils/helpers.js
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export const throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

export const generateTradeId = () => {
  return `TRADE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const calculateRiskAmount = (balance, riskPercentage, stopLossPips) => {
  const riskAmount = balance * (riskPercentage / 100);
  return riskAmount / (stopLossPips || 1);
};

export const validateTradeAmount = (amount, min = 0.1, max = 1000) => {
  if (amount < min) return `Minimum trade amount is ${min}`;
  if (amount > max) return `Maximum trade amount is ${max}`;
  return null;
};

export const getSignalColor = (direction, strength = 1) => {
  const opacity = Math.max(0.3, strength);
  
  if (direction === 1) {
    return `rgba(16, 185, 129, ${opacity})`;
  } else if (direction === -1) {
    return `rgba(239, 68, 68, ${opacity})`;
  } else {
    return `rgba(107, 114, 128, ${opacity})`;
  }
};

export const isMarketOpen = () => {
  // Simple implementation - assume 24/5 market for volatility indices
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  
  // Monday to Friday, 24 hours
  return day >= 1 && day <= 5;
};

export const formatError = (error) => {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  if (error?.response?.data?.detail) return error.response.data.detail;
  return 'An unexpected error occurred';
};