// frontend/src/utils/constants.js
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