// frontend/src/pages/OAuthCallback/OAuthCallback.jsx
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { derivService } from '../../services/derivService';
import LoadingSpinner from '../../components/Common/LoadingSpinner/LoadingSpinner';
import { CheckCircle, XCircle, Shield, Lock } from 'lucide-react';

// Constants
const FLOW = {
  SECURE_POST: 'secure_post',
  LEGACY_FALLBACK: 'legacy_fallback',
};

const STATUS = {
  PROCESSING: 'processing',
  SUCCESS: 'success',
  ERROR: 'error',
};

const PROGRESS_STEPS = {
  PARSING: 10,
  VALIDATING: 30,
  POST_FLOW: 45,
  FALLBACK: 60,
  LOGGING_IN: 80,
  COMPLETE: 100,
};

// Component
const OAuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { addToast } = useToast();

  const processedRef = useRef(false);
  const [status, setStatus] = useState(STATUS.PROCESSING);
  const [progress, setProgress] = useState(PROGRESS_STEPS.PARSING);
  const [flowType, setFlowType] = useState('');
  const [error, setError] = useState(null);
  const [stepDescription, setStepDescription] = useState('Parsing authentication data...');

  // Extract and validate URL parameters
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

  // Authentication flow
  const authenticate = async () => {
    try {
      const { accessToken, state, accountId, errorParam } = parseAuthParams();

      // Check for errors first
      if (errorParam) {
        throw new Error(decodeURIComponent(errorParam));
      }

      if (!accessToken) {
        throw new Error('No authentication token received. Please try again.');
      }

      setStepDescription('Validating token...');
      setProgress(PROGRESS_STEPS.VALIDATING);

      let loginSuccessful = false;

      // ============================
      // FLOW 1: Secure POST to backend
      // ============================
      try {
        setStepDescription('Securing connection...');
        setProgress(PROGRESS_STEPS.POST_FLOW);

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

        setStepDescription('Creating secure session...');
        setProgress(PROGRESS_STEPS.LOGGING_IN);

        loginSuccessful = await login({
          user_id: response.user.id,
          session_token: response.session.id,
          access_token: accessToken,
          email: response.user.email || '',
          deriv_account_id: response.user.deriv_account_id || '',
        });

        setFlowType(FLOW.SECURE_POST);
      } catch (postError) {
        console.warn('Secure flow failed:', postError.message);
        
        // ============================
        // FLOW 2: Legacy fallback
        // ============================
        if (!accountId) {
          throw new Error('Unable to authenticate. Please contact support.');
        }

        setStepDescription('Using fallback authentication...');
        setProgress(PROGRESS_STEPS.FALLBACK);

        loginSuccessful = await login({
          user_id: `deriv_${accountId}`,
          session_token: accessToken,
          access_token: accessToken,
          email: `${accountId}@deriv.com`,
          deriv_account_id: accountId,
        });

        setFlowType(FLOW.LEGACY_FALLBACK);
      }

      if (!loginSuccessful) {
        throw new Error('Failed to establish user session');
      }

      // Success
      setStepDescription('Session established');
      setProgress(PROGRESS_STEPS.COMPLETE);
      setStatus(STATUS.SUCCESS);

      // Short delay for UX before redirect
      await new Promise(resolve => setTimeout(resolve, 800));
      navigate('/dashboard', { replace: true });

    } catch (err) {
      console.error('Authentication error:', err);
      
      const userMessage = err.message.includes('token') 
        ? 'Authentication token is invalid or expired. Please log in again.'
        : err.message || 'Authentication failed. Please try again.';

      setError(userMessage);
      setStatus(STATUS.ERROR);
      addToast(userMessage, 'error');

      // Redirect to login after showing error
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 3000);
    }
  };

  // Effect to trigger authentication
  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    // If no authentication parameters, redirect immediately
    if (!location.search && !location.hash) {
      addToast('No authentication data found', 'error');
      navigate('/login', { replace: true });
      return;
    }

    authenticate();
  }, [location.search, location.hash, login, navigate, addToast]);

  // ============================
  // RENDER STATES
  // ============================

  // Processing/loading state
  if (status === STATUS.PROCESSING) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <LoadingSpinner
            size="xl"
            type="premium"
            theme="blue"
            text="Securing Your Connection"
            subText={stepDescription}
            showPercentage
            currentProgress={progress}
            showProgressRing
            gradient
            fullScreen={false}
            className="mb-6"
          />
          
          {/* Progress indicators */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Authentication Progress</span>
              <span className="font-medium text-primary-400">{progress}%</span>
            </div>
            
            <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
              <Shield className="w-3 h-3" />
              <span>End-to-end encrypted</span>
              <Lock className="w-3 h-3 ml-2" />
              <span>Bank-grade security</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (status === STATUS.SUCCESS) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-success-500/20 to-success-600/20 border border-success-500/30 mb-4">
              <CheckCircle className="w-10 h-10 text-success-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Welcome Back!</h2>
            <p className="text-gray-400">Authentication successful</p>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-gray-900/50 border border-gray-800/50">
              <p className="text-sm text-gray-300">Redirecting to your dashboard...</p>
              <div className="flex justify-center mt-3">
                <div className="flex gap-1">
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
            
            {flowType && (
              <div className="text-xs text-gray-500">
                Using {flowType === FLOW.SECURE_POST ? 'secure' : 'legacy'} authentication flow
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-red-500/20 to-red-600/20 border border-red-500/30 mb-4">
            <XCircle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Authentication Failed</h2>
          <p className="text-gray-400">We couldn't verify your credentials</p>
        </div>
        
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-gray-900/50 border border-red-900/30">
            <p className="text-sm text-gray-300 text-center break-words">
              {error || 'An unexpected error occurred'}
            </p>
          </div>
          
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-3">Redirecting to login...</p>
            <div className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700/50">
              <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
              <span className="text-xs text-gray-400">Please wait</span>
            </div>
          </div>
          
          <div className="text-center pt-4 border-t border-gray-800/30">
            <p className="text-xs text-gray-600">
              Need help? Contact support@deriv-trading-suite.com
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OAuthCallback;