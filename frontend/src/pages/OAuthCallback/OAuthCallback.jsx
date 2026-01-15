// frontend/src/pages/OAuthCallback/OAuthCallback.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Loader2, CheckCircle, XCircle, Shield, Lock, UserCheck, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const OAuthCallback = () => {
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const { addToast } = useToast();

  useEffect(() => {
    // Prevent concurrent processing
    if (isProcessing) return;

    const processCallback = async () => {
      setIsProcessing(true);

      try {
        setProgress(10);
        console.log('OAuthCallback: Starting processing');
        console.log('Location search:', location.search);
        console.log('Window hash:', window.location.hash);

        // Parse URL parameters from query string
        const params = new URLSearchParams(location.search);

        // Fallback to hash if no query params (some OAuth flows use hash)
        let user_id = params.get('user_id');
        let session_token = params.get('session_token');
        let access_token = params.get('access_token');
        let email = params.get('email');
        let account_id = params.get('account_id');

        if (!user_id && window.location.hash) {
          console.log('No query params found, checking hash...');
          const hashParams = new URLSearchParams(
            window.location.hash.replace('#', '?')
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

        addToast('✅ Login successful! Redirecting...', 'success');

        // Redirect to dashboard
        setTimeout(() => {
          console.log('Redirecting to dashboard...');
          navigate('/dashboard', { replace: true });
        }, 1500);
      } catch (err) {
        console.error('❌ OAuth callback error:', err);
        setError(err.message || 'Authentication failed');
        setStatus('error');
        addToast(err.message || 'Authentication failed', 'error');

        // Redirect to login after showing error
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 3000);
      } finally {
        setIsProcessing(false);
      }
    };

    // Only process if we're on the callback route with params
    if (location.pathname === '/oauth/callback') {
      processCallback();
    }
  }, [location.pathname, location.search, login, navigate, addToast, isProcessing]);

  // Processing State
  if (status === 'processing') {
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
              <div className="w-full bg-gray-800/50 rounded-full h-1 overflow-hidden border border-gray-700/30">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary-500 to-primary-400"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">{progress}%</p>
            </div>

            {/* Steps */}
            <div className="space-y-3">
              <div className="flex items-center gap-4 p-3 rounded-lg bg-gray-900/50 border border-gray-800/50">
                <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-primary-400" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-white">Verifying credentials</div>
                  <div className="text-xs text-gray-400">Checking authentication tokens</div>
                </div>
              </div>

              <div className="flex items-center gap-4 p-3 rounded-lg bg-gray-900/50 border border-gray-800/50">
                <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center">
                  <Lock className="w-4 h-4 text-primary-400" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-white">Securing session</div>
                  <div className="text-xs text-gray-400">Encrypting session data</div>
                </div>
              </div>

              <div className="flex items-center gap-4 p-3 rounded-lg bg-gray-900/50 border border-gray-800/50">
                <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center">
                  <UserCheck className="w-4 h-4 text-primary-400" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-white">Loading profile</div>
                  <div className="text-xs text-gray-400">Fetching account details</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Success State
  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-success-500/10 rounded-full blur-3xl animate-pulse" />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 w-full max-w-md"
        >
          <div className="p-8 rounded-2xl bg-gradient-to-br from-gray-900/80 to-gray-950/80 backdrop-blur-xl border border-success-500/20 shadow-2xl">
            {/* Success Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="flex justify-center mb-6"
            >
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-success-500 to-emerald-600 flex items-center justify-center shadow-lg">
                <CheckCircle className="w-12 h-12 text-white" />
              </div>
            </motion.div>

            {/* Message */}
            <div className="text-center mb-8">
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-2xl font-bold text-white mb-3"
              >
                Success!
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-gray-300 mb-6"
              >
                Your account has been authenticated.
              </motion.p>
            </div>

            {/* Continue Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/dashboard', { replace: true })}
              className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-success-600 to-emerald-700 text-white font-semibold flex items-center justify-center gap-2"
            >
              Continue to Dashboard
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Error State
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Error background effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-secondary-500/10 rounded-full blur-3xl animate-pulse" />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 w-full max-w-md"
        >
          <div className="p-8 rounded-2xl bg-gradient-to-br from-gray-900/80 to-gray-950/80 backdrop-blur-xl border border-secondary-500/20 shadow-2xl">
            {/* Error Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="flex justify-center mb-6"
            >
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-secondary-500 to-red-600 flex items-center justify-center shadow-lg">
                <XCircle className="w-12 h-12 text-white" />
              </div>
            </motion.div>

            {/* Error Message */}
            <div className="text-center mb-8">
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-2xl font-bold text-white mb-3"
              >
                Authentication Failed
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-gray-300 mb-4"
              >
                {error}
              </motion.p>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-sm text-gray-400"
              >
                Please try logging in again or contact support if the issue persists.
              </motion.p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/login', { replace: true })}
                className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold flex items-center justify-center gap-2"
              >
                Back to Login
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }
};

export default OAuthCallback;