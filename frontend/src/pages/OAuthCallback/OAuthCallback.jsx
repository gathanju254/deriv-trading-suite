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
    const processCallback = async () => {
      try {
        setProgress(10);
        console.log('OAuthCallback: Processing...');
        console.log('Search:', location.search);
        console.log('Hash:', location.hash);

        // Parse URL parameters from BOTH query string and hash
        const params = new URLSearchParams(location.search);
        
        // If no query params, try hash
        let user_id = params.get('user_id');
        let session_token = params.get('session_token');
        let access_token = params.get('access_token');
        let email = params.get('email');
        let account_id = params.get('account_id');

        if (!user_id && location.hash) {
          console.log('No query params, checking hash...');
          const hashParams = new URLSearchParams(
            location.hash.replace('#', '?')
          );
          user_id = hashParams.get('user_id');
          session_token = hashParams.get('session_token');
          access_token = hashParams.get('access_token');
          email = hashParams.get('email');
          account_id = hashParams.get('account_id');
        }

        console.log('Extracted OAuth params:', {
          user_id: user_id ? '✓' : '✗',
          session_token: session_token ? '✓' : '✗',
          access_token: access_token ? '✓' : '✗',
          email: email ? '✓' : '✗',
          account_id: account_id ? '✓' : '✗',
        });

        if (!user_id || !session_token) {
          throw new Error(
            `Missing authentication parameters: ${
              !user_id ? 'user_id ' : ''
            }${!session_token ? 'session_token' : ''}`
          );
        }

        setProgress(30);

        // Call login with OAuth data
        console.log('Calling login with OAuth data...');
        await login({
          user_id,
          session_token,
          access_token: access_token || '',
          email: email || '',
          deriv_account_id: account_id || '',
        });

        setProgress(60);
        setStatus('success');
        setProgress(100);

        // Redirect to dashboard after short delay
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 1000);

      } catch (err) {
        console.error('OAuth callback error:', err);
        setError(err.message);
        setStatus('error');
        addToast(err.message, 'error');

        // Redirect to login after delay
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 3000);
      }
    };

    processCallback();
  }, [location.search, location.hash, login, navigate, addToast]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl animate-pulse" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
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
            <div className="h-2 bg-gray-800/50 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
                className="h-full bg-gradient-to-r from-primary-600 to-primary-400"
              />
            </div>
            <p className="text-sm text-gray-400 mt-3 text-center">{progress}%</p>
          </div>

          {/* Status Messages */}
          {status === 'processing' && (
            <div className="text-center">
              <p className="text-gray-300">Verifying your account...</p>
            </div>
          )}

          {status === 'success' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <p className="text-green-400 font-semibold">✅ Authentication successful!</p>
              <p className="text-gray-400 text-sm mt-2">Redirecting to dashboard...</p>
            </motion.div>
          )}

          {status === 'error' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <p className="text-red-400 font-semibold">❌ Authentication failed</p>
              <p className="text-gray-400 text-sm mt-2">{error}</p>
              <p className="text-gray-500 text-xs mt-3">Redirecting to login...</p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default OAuthCallback;