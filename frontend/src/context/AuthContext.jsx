// frontend/src/context/AuthContext.jsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { derivService } from '../services/derivService';

const AuthContext = createContext(null);

/* -------------------------------------------
   Hook
-------------------------------------------- */
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
};

/* -------------------------------------------
   Provider
-------------------------------------------- */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  /* -------------------------------------------
     Restore session on app load
  -------------------------------------------- */
  useEffect(() => {
    console.log('AuthProvider: Checking for existing session...');
    const userId = localStorage.getItem('user_id');
    const sessionToken = localStorage.getItem('session_token');

    if (userId && sessionToken) {
      console.log('AuthProvider: Restoring session from localStorage');
      setUser({
        id: userId,
        email: localStorage.getItem('email'),
        accountId: localStorage.getItem('deriv_account_id'),
      });
    } else {
      console.log('AuthProvider: No existing session found');
    }

    setLoading(false);
  }, []);

  // Add this debug useEffect to AuthContext.jsx
useEffect(() => {
    console.log('🔍 AuthContext Debug:', {
      hasUser: !!user,
      userId: user?.id,
      loading,
      localStorageUserId: localStorage.getItem('user_id'),
      localStorageToken: localStorage.getItem('session_token') ? 'present' : 'missing'
    });
  }, [user, loading]);

  /* -------------------------------------------
     LOGIN - Updated with useCallback
  -------------------------------------------- */
  const login = useCallback(async (payload) => {
    try {
      console.log('AuthContext: login called');

      if (typeof payload !== 'object' || !payload) {
        throw new Error('Invalid login payload');
      }

      const {
        user_id,
        session_token,
        access_token = '',
        email = '',
        deriv_account_id = '',
      } = payload;

      if (!user_id || !session_token) {
        throw new Error('Missing user_id or session_token');
      }

      // Store in localStorage
      localStorage.setItem('user_id', user_id);
      localStorage.setItem('session_token', session_token);
      localStorage.setItem('auth_token', session_token);
      localStorage.setItem('deriv_access_token', access_token);
      localStorage.setItem('email', email);
      localStorage.setItem('deriv_account_id', deriv_account_id);

      // Update state
      setUser({
        id: user_id,
        email,
        accountId: deriv_account_id,
      });

      console.log('AuthContext: Login successful');
      return true;
    } catch (err) {
      console.error('AuthContext: Login failed:', err);
      throw err;
    }
  }, []); // Empty dependency array - derivService is imported

  /* -------------------------------------------
     LOGOUT
  -------------------------------------------- */
  const logout = useCallback(async () => {
    try {
      await derivService.logout();
    } catch (err) {
      console.warn('Backend logout failed:', err);
    }

    localStorage.clear();
    setUser(null);
    console.log('AuthContext: Logout complete');
  }, []);

  /* -------------------------------------------
     Context value
  -------------------------------------------- */
  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};