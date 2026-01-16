// frontend/src/pages/OAuthCallback/OAuthCallback.jsx - SECURE OAUTH FLOW
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { derivService } from '../../services/derivService';
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
    const processCallback = async () => {
      try {
        setProgress(10);
        console.log('🔐 OAuthCallback: Starting authentication processing...');

        // CHANGED: Extract from URL fragment (hash)
        const hash = window.location.hash.substring(1);
        const searchParams = new URLSearchParams(hash || window.location.search);
        
        const access_token = searchParams.get('access_token') || searchParams.get('token');
        const state = searchParams.get('state');
        const account_id = searchParams.get('account_id') || searchParams.get('acct1') || searchParams.get('acct2');
        const error_param = searchParams.get('error') || searchParams.get('error_description');

        console.log('📦 Parsed from URL:', {
          access_token: access_token ? '***' + access_token.slice(-8) : 'MISSING',
          state: state ? '***' + state.slice(-8) : 'MISSING',
          account_id: account_id || 'MISSING',
          error: error_param || 'none'
        });

        if (error_param) {
          throw new Error(`Backend error: ${decodeURIComponent(error_param)}`);
        }

        if (!access_token) {
          throw new Error('No access token in URL. Check your backend OAuth configuration.');
        }

        setProgress(30);
        console.log('✅ Parameters extracted from URL');

        // CHANGED: POST token to secure backend endpoint
        console.log('🔐 POSTing token to /auth/callback (secure)...');
        setProgress(45);
        
        const callbackResponse = await derivService.handleOAuthCallback({
          access_token,
          state: state || '',
          account_id: account_id || '',
        });

        console.log('✅ Callback response:', {
          success: callbackResponse.success,
          user_id: callbackResponse.user?.id ? '***' + callbackResponse.user.id.slice(-8) : 'MISSING',
        });

        if (!callbackResponse.success) {
          throw new Error('Callback endpoint returned unsuccessful response');
        }

        setProgress(60);

        // CHANGED: Extract data from callback response
        const { user, session } = callbackResponse;
        
        if (!user?.id) {
          throw new Error('No user ID in callback response');
        }

        // CHANGED: Call login with response data
        console.log('🔐 Calling login() with callback data...');
        setProgress(75);
        
        const loginSuccess = await login({
          user_id: user.id,
          session_token: session.id,  // CHANGED: Use session ID as token
          access_token: '',  // Token is now stored securely in HTTP-only cookie
          email: user.email || '',
          deriv_account_id: user.deriv_account_id || '',
        });

        console.log('✅ Login function returned:', loginSuccess);

        setProgress(85);
        setStatus('success');
        setProgress(100);

        console.log('🎉 Authentication complete, redirecting to dashboard...');
        
        // CHANGED: Clear URL to prevent re-processing on refresh
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Wait a bit to ensure state updates are processed
        await new Promise(resolve => setTimeout(resolve, 1500));
        navigate('/dashboard', { replace: true });

      } catch (err) {
        console.error('❌ OAuthCallback error:', err);
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

    // Process callback if we have parameters
    if (location.hash || location.search) {
      processCallback();
    } else {
      console.warn('⚠️  No auth parameters found, redirecting to login');
      addToast('No authentication data found. Please try logging in again.', 'warning');
      setTimeout(() => navigate('/login', { replace: true }), 2000);
    }
  }, [location.hash, location.search, login, navigate, addToast]);

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