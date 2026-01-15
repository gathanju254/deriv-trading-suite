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

  useEffect(() => {
    console.log('🔗 OAuthCallback mounted - URL Analysis:', {
      fullUrl: window.location.href,
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
    });

    const params = new URLSearchParams(location.search);
    console.log('🔍 Extracted parameters:');
    const allParams = {};
    for (const [key, value] of params.entries()) {
      const displayValue = key.includes('token') || key.includes('session') 
        ? (value ? '***' + value.slice(-8) : 'missing')
        : value || 'missing';
      allParams[key] = displayValue;
      console.log(`  ${key}: ${displayValue}`);
    }
    console.log('📋 All params:', allParams);
  }, [location]);

  useEffect(() => {
    const processCallback = async () => {
      try {
        setProgress(10);
        console.log('🔐 OAuthCallback: Starting authentication processing...');

        // Parse URL parameters
        const params = new URLSearchParams(location.search);
        
        const user_id = params.get('user_id');
        const session_token = params.get('session_token');
        const access_token = params.get('access_token');
        const email = params.get('email');
        const account_id = params.get('account_id');
        const error_param = params.get('error');

        console.log('📦 Parsed from URL:', {
          user_id: user_id ? '***' + user_id.slice(-8) : 'MISSING',
          session_token: session_token ? '***' + session_token.slice(-8) : 'MISSING',
          access_token: access_token ? '***' + access_token.slice(-8) : 'MISSING',
          email: email || 'MISSING',
          account_id: account_id || 'MISSING',
          error: error_param || 'none'
        });

        // Check for backend error
        if (error_param) {
          throw new Error(`Backend error: ${decodeURIComponent(error_param)}`);
        }

        // Validate required parameters
        if (!user_id || !session_token) {
          throw new Error(`Missing critical params: user_id=${!!user_id}, session_token=${!!session_token}`);
        }

        setProgress(30);
        console.log('✅ Parameters validated');

        // Call login function
        console.log('🔐 Calling login() with OAuth data...');
        setProgress(45);
        
        const loginSuccess = await login({
          user_id,
          session_token,
          access_token: access_token || '',
          email: email || '',
          deriv_account_id: account_id || '',
        });

        console.log('✅ Login function returned:', loginSuccess);

        // Verify localStorage
        const storedUserId = localStorage.getItem('user_id');
        const storedToken = localStorage.getItem('session_token');
        console.log('✅ localStorage verification:', {
          user_id_stored: storedUserId ? '***' + storedUserId.slice(-8) : 'NOT FOUND',
          token_stored: storedToken ? 'YES' : 'NO',
          token_length: storedToken ? storedToken.length : 0
        });

        if (!storedUserId || !storedToken) {
          throw new Error('Login succeeded but localStorage not updated');
        }

        setProgress(75);
        setStatus('success');
        setProgress(100);

        console.log('🎉 Authentication complete, redirecting to dashboard...');
        
        // Wait a bit to ensure state updates are processed
        await new Promise(resolve => setTimeout(resolve, 1500));
        navigate('/dashboard', { replace: true });

      } catch (err) {
        console.error('❌ OAuthCallback error:', err);
        console.error('❌ Error stack:', err.stack);
        console.error('❌ Error details:', {
          message: err.message,
          name: err.name,
          cause: err.cause
        });

        setError(err.message || 'Authentication failed');
        setStatus('error');
        addToast(err.message || 'Authentication failed', 'error');
        
        // Redirect to login after showing error
        setTimeout(() => {
          console.log('➡️  Redirecting to login due to error...');
          navigate('/login', { replace: true });
        }, 4000);
      }
    };

    if (location.search) {
      processCallback();
    } else {
      console.warn('⚠️  No search params found, redirecting to login');
      navigate('/login', { replace: true });
    }
  }, [location.search, login, navigate, addToast]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <div className="p-8 rounded-2xl bg-gradient-to-br from-gray-900/80 to-gray-950/80 backdrop-blur-xl border border-gray-800/50 shadow-2xl">
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

          {status === 'processing' && (
            <div className="text-center">
              <p className="text-gray-300 text-sm">Verifying credentials...</p>
            </div>
          )}

          {status === 'success' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <div className="text-green-400 text-sm font-medium mb-2">✅ Success!</div>
              <p className="text-gray-400 text-sm">Redirecting to dashboard...</p>
            </motion.div>
          )}

          {status === 'error' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <div className="text-red-400 text-sm font-medium mb-2">❌ Authentication Failed</div>
              <p className="text-gray-400 text-sm break-words">{error}</p>
              <p className="text-gray-500 text-xs mt-4">Returning to login...</p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default OAuthCallback;