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

  // Debug function to extract ALL parameters from URL
  const extractUrlParams = () => {
    console.log('🔗 OAuthCallback URL Analysis:');
    console.log('  Full URL:', window.location.href);
    
    // Check for hash fragment (sometimes OAuth returns tokens in hash)
    const hash = window.location.hash.substring(1);
    if (hash) {
      console.log('  Found hash fragment:', hash);
    }
    
    // Extract from hash fragment first (common for OAuth token flow)
    let params = new URLSearchParams(location.search);
    if (hash) {
      // Sometimes tokens are in hash, sometimes in query
      params = new URLSearchParams(hash);
      console.log('  Using hash parameters');
    } else if (location.search) {
      params = new URLSearchParams(location.search);
      console.log('  Using search parameters');
    }
    
    const allParams = {};
    for (const [key, value] of params.entries()) {
      allParams[key] = value;
    }
    
    // Also check for fragment-style parameters (access_token=...)
    if (hash && hash.includes('access_token')) {
      const fragmentParams = hash.split('&');
      fragmentParams.forEach(param => {
        const [key, value] = param.split('=');
        if (key && value) {
          allParams[key] = decodeURIComponent(value);
        }
      });
    }
    
    console.log('📋 All extracted parameters:', Object.keys(allParams).map(k => `${k}: ${k.includes('token') ? '***' + allParams[k]?.slice(-8) : allParams[k]}`));
    
    return allParams;
  };

  useEffect(() => {
    const processCallback = async () => {
      try {
        setProgress(10);
        console.log('🔐 OAuthCallback: Starting authentication processing...');

        // Extract parameters using our improved function
        const allParams = extractUrlParams();
        
        // Extract specific parameters (try multiple possible names)
        const user_id = allParams.user_id || allParams.userId || allParams.sub;
        const session_token = allParams.session_token || allParams.session_token || allParams.token || allParams.access_token;
        const access_token = allParams.access_token || allParams.token1 || allParams.token2;
        const email = allParams.email || allParams.email_address;
        const account_id = allParams.account_id || allParams.deriv_account_id || allParams.acct1 || allParams.acct2;
        const error_param = allParams.error || allParams.error_description;

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
          throw new Error(`Missing critical params: user_id=${!!user_id}, session_token=${!!session_token}. Check your backend callback URL.`);
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
        
        // Clear the URL parameters to prevent re-processing on refresh
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Wait a bit to ensure state updates are processed
        await new Promise(resolve => setTimeout(resolve, 1500));
        navigate('/dashboard', { replace: true });

      } catch (err) {
        console.error('❌ OAuthCallback error:', err);
        console.error('❌ Error stack:', err.stack);
        console.error('❌ Full URL was:', window.location.href);

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

    // Process callback if we have parameters OR if we're on this page (might have been redirected)
    if (location.search || window.location.hash) {
      processCallback();
    } else {
      console.warn('⚠️  No auth parameters found, redirecting to login');
      addToast('No authentication data found. Please try logging in again.', 'warning');
      setTimeout(() => navigate('/login', { replace: true }), 2000);
    }
  }, [location.search, location.hash, login, navigate, addToast]);

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