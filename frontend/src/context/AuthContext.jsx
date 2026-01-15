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
  const [initialized, setInitialized] = useState(false);

  /* -------------------------------------------
     Restore session on app load
  -------------------------------------------- */
  useEffect(() => {
    console.log('🔄 AuthProvider: Initializing session check...');
    
    try {
      const userId = localStorage.getItem('user_id');
      const sessionToken = localStorage.getItem('session_token');

      console.log('📦 AuthProvider: Found in localStorage:', {
        user_id: userId ? '***' + userId.slice(-8) : 'NOT FOUND',
        session_token: sessionToken ? '***' + sessionToken.slice(-8) : 'NOT FOUND'
      });

      if (userId && sessionToken) {
        console.log('✅ AuthProvider: Restoring session from localStorage');
        const user_obj = {
          id: userId,
          email: localStorage.getItem('email') || '',
          accountId: localStorage.getItem('deriv_account_id') || '',
        };
        console.log('🔐 Setting user state:', {
          id: user_obj.id ? '***' + user_obj.id.slice(-8) : 'missing',
          email: user_obj.email,
          accountId: user_obj.accountId
        });
        setUser(user_obj);
      } else {
        console.log('ℹ️  AuthProvider: No existing session in localStorage');
        setUser(null);
      }
    } catch (err) {
      console.error('❌ AuthProvider: Error during initialization:', err);
      setUser(null);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, []);

  // Debug effect
  useEffect(() => {
    console.log('🔍 AuthContext state:', {
      hasUser: !!user,
      userId: user?.id ? '***' + user.id.slice(-8) : 'none',
      loading,
      initialized,
      localStorageUserId: localStorage.getItem('user_id') ? 'present' : 'missing'
    });
  }, [user, loading, initialized]);

  /* -------------------------------------------
     LOGIN - Updated with useCallback
  -------------------------------------------- */
  const login = useCallback(async (payload) => {
    try {
      console.log('🔐 AuthContext.login() called');
      console.log('📦 Payload received:', {
        user_id: payload?.user_id ? '***' + payload.user_id.slice(-8) : 'MISSING',
        session_token: payload?.session_token ? '***' + payload.session_token.slice(-8) : 'MISSING',
        email: payload?.email || 'MISSING',
        deriv_account_id: payload?.deriv_account_id || 'MISSING'
      });

      if (!payload || typeof payload !== 'object') {
        throw new Error('Invalid login payload: not an object');
      }

      const {
        user_id,
        session_token,
        access_token = '',
        email = '',
        deriv_account_id = '',
      } = payload;

      if (!user_id) throw new Error('Missing user_id in payload');
      if (!session_token) throw new Error('Missing session_token in payload');

      console.log('💾 Storing credentials in localStorage...');
      
      // Store all values
      localStorage.setItem('user_id', user_id);
      localStorage.setItem('session_token', session_token);
      localStorage.setItem('auth_token', session_token);
      localStorage.setItem('deriv_access_token', access_token);
      localStorage.setItem('email', email);
      localStorage.setItem('deriv_account_id', deriv_account_id);

      // Immediately verify they were stored
      const verify = {
        user_id_stored: localStorage.getItem('user_id') === user_id,
        session_token_stored: localStorage.getItem('session_token') === session_token,
        email_stored: localStorage.getItem('email') === email,
      };

      console.log('✅ localStorage verification:', verify);

      if (!verify.user_id_stored || !verify.session_token_stored) {
        throw new Error('Failed to store credentials in localStorage');
      }

      // Update React state
      const userObj = {
        id: user_id,
        email,
        accountId: deriv_account_id,
      };

      console.log('🔐 Updating React state with user:', {
        id: userObj.id ? '***' + userObj.id.slice(-8) : 'missing',
        email: userObj.email,
        accountId: userObj.accountId
      });

      setUser(userObj);

      console.log('✅ AuthContext.login() completed successfully');
      return true;

    } catch (err) {
      console.error('❌ AuthContext.login() failed:', err.message);
      console.error('❌ Error details:', {
        message: err.message,
        stack: err.stack
      });
      throw err;
    }
  }, []); // Empty dependency array - derivService is imported

  /* -------------------------------------------
     LOGOUT
  -------------------------------------------- */
  const logout = useCallback(async () => {
    try {
      console.log('👋 AuthContext.logout() called');
      await derivService.logout();
    } catch (err) {
      console.warn('⚠️  Backend logout warning:', err.message);
    }

    localStorage.clear();
    setUser(null);
    console.log('✅ Logout complete');
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