// frontend/src/utils/formatters.js
export const TRADING_SYMBOLS = {
  VOLATILITY_10: 'volatility_10_index',
  VOLATILITY_25: 'volatility_25_index',
  VOLATILITY_50: 'volatility_50_index',
  VOLATILITY_75: 'volatility_75_index',
  VOLATILITY_100: 'volatility_100_index'
};

export const CONTRACT_TYPES = {
  CALL: 'CALL',
  PUT: 'PUT',
  RISE: 'RISE',
  FALL: 'FALL'
};

export const DURATION_UNITS = {
  TICKS: 't',
  SECONDS: 's',
  MINUTES: 'm',
  HOURS: 'h',
  DAYS: 'd'
};

export const TRADE_STATUS = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED'
};

export const SIGNAL_DIRECTIONS = {
  BUY: 1,
  SELL: -1,
  HOLD: 0
};

export const WEBSOCKET_MESSAGE_TYPES = {
  MARKET_DATA: 'market_data',
  SIGNAL_UPDATE: 'signal_update',
  TRADE_UPDATE: 'trade_update',
  TICK: 'tick',
  CONTRACT_UPDATE: 'contract_update'
};

export const formatCurrency = (amount, currency = "USD") => {
  if (currency === "USD") {
    return `$${amount.toFixed(2)}`;
  }
  return `${amount.toFixed(2)} ${currency}`;
};

export const formatPercentage = (value) => {
  return `${(value * 100).toFixed(2)}%`;
};

export const formatNumber = (value, decimals = 2) => {
  return Number(value).toFixed(decimals);
};

export const formatTimestamp = (timestamp) => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return date.toLocaleString();
};