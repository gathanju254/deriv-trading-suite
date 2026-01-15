// frontend/src/pages/OAuthCallback/OAuthCallback.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const OAuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { addToast } = useToast();
  
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState(null);

  // Add this at the beginning of the component
  useEffect(() => {
    console.log('🔗 OAuthCallback URL Analysis:', {
      fullURL: window.location.href,
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      fullPath: location.pathname + location.search + location.hash
    });
    
    // Also log the parsed parameters for debugging
    const params = new URLSearchParams(location.search);
    const paramEntries = {};
    for (const [key, value] of params.entries()) {
      paramEntries[key] = key.includes('token') || key.includes('session') ? 
        (value ? '***' + value.slice(-4) : 'missing') : 
        value || 'missing';
    }
    console.log('📋 Parsed parameters:', paramEntries);
  }, [location]);

  useEffect(() => {
    const processCallback = async () => {
      try {
        setProgress(10);
        console.log('🔐 OAuthCallback: Processing...');
        console.log('Search params:', location.search);

        // Parse URL parameters from query string ONLY (backend sends as ?param=value)
        const params = new URLSearchParams(location.search);
        
        const user_id = params.get('user_id');
        const session_token = params.get('session_token');
        const access_token = params.get('access_token');
        const email = params.get('email');
        const account_id = params.get('account_id');
        const error_param = params.get('error');

        // Check for error from backend redirect
        if (error_param) {
          throw new Error(`Backend authentication error: ${decodeURIComponent(error_param)}`);
        }

        console.log('✅ Extracted params:', {
          user_id: user_id ? '***' + user_id.slice(-8) : 'missing',
          session_token: session_token ? '***' + session_token.slice(-8) : 'missing',
          access_token: access_token ? '***' + access_token.slice(-8) : 'missing',
          email: email || 'missing',
          account_id: account_id || 'missing'
        });

        if (!user_id || !session_token) {
          throw new Error(`Missing required params: user_id=${!!user_id}, session_token=${!!session_token}`);
        }

        setProgress(30);

        // Call login with OAuth data
        console.log('🔐 Calling login with OAuth data...');
        const loginResult = await login({
          user_id,
          session_token,
          access_token: access_token || '',
          email: email || '',
          deriv_account_id: account_id || '',
        });

        console.log('✅ Login result:', loginResult);
        setProgress(60);
        setStatus('success');
        setProgress(100);

        // Redirect to dashboard after short delay
        setTimeout(() => {
          console.log('➡️  Redirecting to dashboard...');
          navigate('/dashboard', { replace: true });
        }, 1000);

      } catch (err) {
        console.error('❌ OAuth callback error:', err);
        console.error('❌ Error details:', {
          message: err.message,
          stack: err.stack,
          location: location
        });
        setError(err.message);
        setStatus('error');
        addToast(err.message, 'error');
        
        // Redirect back to login after delay
        setTimeout(() => {
          console.log('➡️  Redirecting to login...');
          navigate('/login', { replace: true });
        }, 3000);
      }
    };

    processCallback();
  }, [location.search, login, navigate, addToast, location]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <div className="p-8 rounded-2xl bg-gradient-to-br from-gray-900/80 to-gray-950/80 backdrop-blur-xl border border-gray-800/50 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-600/20 to-primary-800/20 border border-primary-500/20 mb-6"
            >
              <Loader2 className="w-10 h-10 text-primary-400" />
            </motion.div>
            <h2 className="text-2xl font-bold text-white mb-2">Authenticating</h2>
            <p className="text-gray-400">Processing your Deriv credentials</p>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="w-full bg-gray-800/50 rounded-full h-1 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
                className="h-full bg-gradient-to-r from-primary-500 to-primary-600"
              />
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">{progress}%</p>
          </div>

          {/* Status Message */}
          {status === 'processing' && (
            <div className="text-center">
              <p className="text-gray-300 text-sm">Verifying your account...</p>
            </div>
          )}

          {status === 'success' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <div className="text-green-400 text-sm font-medium mb-2">✅ Authentication successful!</div>
              <p className="text-gray-400 text-sm">Redirecting to dashboard...</p>
            </motion.div>
          )}

          {status === 'error' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <div className="text-red-400 text-sm font-medium mb-2">❌ Authentication failed</div>
              <p className="text-gray-400 text-sm">{error}</p>
              <p className="text-gray-500 text-xs mt-4">Redirecting to login...</p>
            </motion.div>
          )}

          {/* Debug info (only in development) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-3 rounded-lg bg-gray-800/50 border border-gray-700">
              <p className="text-xs text-gray-400 font-mono break-all">
                Path: {location.pathname}<br/>
                Search: {location.search}<br/>
                Hash: {location.hash}
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default OAuthCallback;