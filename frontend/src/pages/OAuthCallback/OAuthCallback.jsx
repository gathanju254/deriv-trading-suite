// frontend/src/pages/OAuthCallback/OAuthCallback.jsx
// frontend/src/pages/OAuthCallback/OAuthCallback.jsx
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { derivService } from '../../services/derivService';
import { CheckCircle, XCircle, Shield, Lock, Loader2 } from 'lucide-react';

const OAuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { addToast } = useToast();

  const processedRef = useRef(false);
  const [status, setStatus] = useState('processing');
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState('');
  const [error, setError] = useState('');

  const updateProgress = (value, description) => {
    setProgress(value);
    setStep(description);
  };

  const parseAuthParams = () => {
    const params = new URLSearchParams(location.search);
    const hashParams = new URLSearchParams(location.hash.substring(1));
    
    return {
      accessToken: params.get('token') || hashParams.get('access_token'),
      state: params.get('state') || hashParams.get('state') || '',
      accountId: params.get('account_id') || hashParams.get('account_id') || '',
      errorParam: params.get('error') || hashParams.get('error'),
    };
  };

  const authenticate = async () => {
    try {
      const { accessToken, state, accountId, errorParam } = parseAuthParams();

      if (errorParam) {
        throw new Error(decodeURIComponent(errorParam));
      }

      if (!accessToken) {
        throw new Error('No authentication token received');
      }

      updateProgress(20, 'Validating token...');

      // Try secure backend flow first
      try {
        updateProgress(40, 'Securing connection...');

        const response = await derivService.handleOAuthCallback({
          access_token: accessToken,
          state,
          account_id: accountId,
        });

        if (!response?.success) {
          throw new Error(response?.message || 'Authentication server error');
        }

        if (!response?.user?.id || !response?.session?.id) {
          throw new Error('Incomplete authentication response');
        }

        updateProgress(70, 'Creating session...');

        const success = await login({
          user_id: response.user.id,
          session_token: response.session.id,
          access_token: accessToken,
          email: response.user.email || '',
          deriv_account_id: response.user.deriv_account_id || '',
        });

        if (!success) {
          throw new Error('Failed to establish session');
        }

      } catch (postError) {
        // Fallback to legacy flow
        if (!accountId) {
          throw new Error('Unable to authenticate');
        }

        updateProgress(60, 'Using fallback...');

        const success = await login({
          user_id: `deriv_${accountId}`,
          session_token: accessToken,
          access_token: accessToken,
          email: `${accountId}@deriv.com`,
          deriv_account_id: accountId,
        });

        if (!success) {
          throw new Error('Fallback authentication failed');
        }
      }

      updateProgress(100, 'Success!');
      setStatus('success');

      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 800);

    } catch (err) {
      console.error('Authentication error:', err);
      
      const userMessage = err.message.includes('token') 
        ? 'Authentication token is invalid or expired'
        : err.message || 'Authentication failed';

      setError(userMessage);
      setStatus('error');
      addToast(userMessage, 'error');

      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 3000);
    }
  };

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    if (!location.search && !location.hash) {
      addToast('No authentication data found', 'error');
      navigate('/login', { replace: true });
      return;
    }

    authenticate();
  }, [location.search, location.hash, login, navigate, addToast]);

  // Processing state
  if (status === 'processing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gray-900/50 border border-gray-800 mb-6">
              <div className="relative">
                <Loader2 className="w-10 h-10 text-primary-400 animate-spin" />
                <Shield className="w-5 h-5 text-primary-300 absolute -top-1 -right-1" />
              </div>
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-2">Authenticating</h2>
            <p className="text-gray-400 mb-1">{step}</p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <Lock className="w-3 h-3 text-gray-500" />
              <span className="text-xs text-gray-500">End-to-end encrypted</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Progress</span>
              <span className="font-medium text-primary-400">{progress}%</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-success-500/10 border border-success-500/30 mb-6">
              <CheckCircle className="w-10 h-10 text-success-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Welcome!</h2>
            <p className="text-gray-400">Authentication successful</p>
          </div>
          
          <div className="p-4 rounded-xl bg-gray-900/30 border border-gray-800">
            <p className="text-sm text-gray-300 mb-3">Redirecting to dashboard...</p>
            <div className="flex justify-center gap-1">
              {[0, 1, 2].map((i) => (
                <div 
                  key={i}
                  className="w-2 h-2 rounded-full bg-primary-500 animate-pulse"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/30 mb-6">
            <XCircle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Authentication Failed</h2>
          <p className="text-gray-400">Could not verify your credentials</p>
        </div>
        
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-gray-900/30 border border-red-900/30">
            <p className="text-sm text-gray-300 break-words">
              {error || 'An unexpected error occurred'}
            </p>
          </div>
          
          <div className="text-sm text-gray-500">
            <p>Redirecting to login...</p>
            <div className="flex justify-center mt-2">
              <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OAuthCallback;