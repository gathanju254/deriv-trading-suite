// frontend/src/context/AuthContext.jsx
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
    const userId = localStorage.getItem('user_id');
    const sessionToken = localStorage.getItem('session_token');
    const email = localStorage.getItem('email');
    const accountId = localStorage.getItem('deriv_account_id');

    if (userId && sessionToken) {
      setUser({
        id: userId,
        email,
        accountId,
      });
    }

    setLoading(false);
  }, []);

  /* -------------------------------------------
     LOGIN - Updated with useCallback
  -------------------------------------------- */
  const login = useCallback(async (payload) => {
    try {
      let authData = null;

      // ✅ Direct OAuth redirect flow
      if (typeof payload === 'object') {
        authData = payload;
      }

      // 🔁 Legacy OAuth code flow
      if (typeof payload === 'string') {
        authData = await derivService.handleOAuthCallback(payload);
      }

      const {
        user_id,
        session_token,
        access_token,
        email,
        deriv_account_id,
      } = authData;

      if (!user_id || !session_token) {
        throw new Error('Invalid authentication payload');
      }

      // Persist session
      localStorage.setItem('user_id', user_id);
      localStorage.setItem('session_token', session_token);
      localStorage.setItem('auth_token', session_token); // for axios
      localStorage.setItem('deriv_access_token', access_token || '');
      localStorage.setItem('email', email || '');
      localStorage.setItem('deriv_account_id', deriv_account_id || '');

      setUser({
        id: user_id,
        email,
        accountId: deriv_account_id,
      });

      return true;
    } catch (err) {
      console.error('Login failed:', err);
      throw err;
    }
  }, []); // Empty dependency array - derivService is imported

  /* -------------------------------------------
     LOGOUT
  -------------------------------------------- */
  const logout = useCallback(async () => {
    try {
      await derivService.logout();
    } catch {
      // Backend logout failure should never block UI logout
      console.warn('Backend logout failed — clearing local session');
    }

    localStorage.clear();
    setUser(null);
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