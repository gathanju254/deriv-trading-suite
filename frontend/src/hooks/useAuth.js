// frontend/src/hooks/useAuth.js
import { useState } from 'react';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const login = async (credentials) => {
    try {
      // For demo purposes, accept any credentials
      // In production, make API call to backend
      setUser({ email: credentials.email, name: 'Demo User' });
      setIsAuthenticated(true);
      localStorage.setItem('auth_token', 'demo_token');
      return { success: true };
    } catch (error) {
      throw new Error('Login failed');
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('auth_token');
  };

  return {
    user,
    isAuthenticated,
    login,
    logout
  };
};