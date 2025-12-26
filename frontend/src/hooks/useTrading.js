// frontend/src/hooks/useTrading.js
import { useContext } from 'react';
import { TradingContext } from '../context/TradingContext';

export const useTrading = () => {
  const context = useContext(TradingContext);
  if (!context) {
    throw new Error('useTrading must be used within a TradingProvider');
  }
  return context;
};
