// frontend/src/pages/OAuthCallback/OAuthCallback.jsx - UPDATED WITH FALLBACK
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
  const [flowType, setFlowType] = useState('');
  const [processed, setProcessed] = useState(false); // NEW: Prevent re-processing

  useEffect(() => {
    // Prevent re-processing if already processed
    if (processed) return;
    
    const processCallback = async () => {
      try {
        setProcessed(true); // Mark as processed
        setProgress(10);
        console.log('🔐 OAuthCallback: Starting authentication processing...');
        
        // Use location.search directly (not window.location)
        const searchParams = new URLSearchParams(location.search);
        
        const access_token = searchParams.get('token');
        const state = searchParams.get('state');
        const account_id = searchParams.get('account_id');
        const error_param = searchParams.get('error');

        console.log('📦 Parsed OAuth parameters from React Router:', {
          has_access_token: !!access_token,
          token_length: access_token?.length,
          has_state: !!state,
          account_id: account_id || 'MISSING',
          error: error_param || 'none'
        });

        // Check for backend errors
        if (error_param) {
          throw new Error(`Authentication error: ${decodeURIComponent(error_param)}`);
        }

        // Require access token
        if (!access_token) {
          throw new Error('No access token received. Deriv OAuth may have been cancelled or failed.');
        }

        setProgress(30);
        console.log('✅ OAuth parameters validated');

        // ========================================
        // ATTEMPT 1: Secure POST flow (preferred)
        // ========================================
        let loginSuccess = false;
        
        try {
          console.log('🔐 Attempting secure POST flow to /auth/callback...');
          setProgress(45);
          
          const callbackResponse = await derivService.handleOAuthCallback({
            access_token,
            state: state || '',
            account_id: account_id || '',
          });

          console.log('✅ Secure POST response received:', {
            success: callbackResponse.success,
            has_user: !!callbackResponse.user,
            has_session: !!callbackResponse.session,
          });

          if (!callbackResponse.success) {
            throw new Error(callbackResponse.message || 'Callback endpoint returned unsuccessful response');
          }

          if (!callbackResponse.user?.id) {
            throw new Error('No user ID in callback response');
          }

          const { user, session } = callbackResponse;

          console.log('🔐 Calling login() with POST response data...');
          setProgress(75);
          
          loginSuccess = await login({
            user_id: user.id,
            session_token: session.id,
            access_token: access_token,
            email: user.email || '',
            deriv_account_id: user.deriv_account_id || '',
          });

          setFlowType('secure_post');
          console.log('✅ Secure POST flow succeeded');
          
        } catch (postError) {
          console.warn('⚠️  Secure POST flow failed:', postError.message);
          
          // ========================================
          // ATTEMPT 2: Fallback to legacy flow
          // ========================================
          if (!account_id) {
            throw new Error('Cannot fallback: Missing account_id. POST flow: ' + postError.message);
          }
          
          try {
            console.log('🔄 Falling back to legacy direct auth flow...');
            setProgress(50);
            
            // For legacy flow, use account_id as the basis for user identification
            const legacy_user_id = `deriv_${account_id}`;
            
            loginSuccess = await login({
              user_id: legacy_user_id,
              session_token: access_token, // Use token as session in legacy mode
              access_token: access_token,
              email: `${account_id}@deriv.com`,
              deriv_account_id: account_id,
            });

            setFlowType('legacy_fallback');
            console.log('✅ Legacy fallback flow succeeded');
            
          } catch (legacyError) {
            console.error('❌ Both flows failed:');
            console.error('  POST flow:', postError.message);
            console.error('  Legacy flow:', legacyError.message);
            throw new Error(`Authentication failed: ${postError.message}`);
          }
        }

        if (!loginSuccess) {
          throw new Error('Login function returned false');
        }

        setProgress(85);
        setStatus('success');
        setProgress(100);

        console.log(`🎉 Authentication complete (${flowType})`);
        
        // ========================================
        // CLEANUP & REDIRECT
        // ========================================
        
        // Wait for state updates to propagate
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Redirect to dashboard - use replace to prevent back navigation
        console.log('➡️  Redirecting to dashboard...');
        navigate('/dashboard', { replace: true });

      } catch (err) {
        console.error('❌ OAuthCallback fatal error:', {
          message: err.message,
          location: location
        });

        const errorMsg = err.message || 'Authentication failed. Please try again.';
        setError(errorMsg);
        setStatus('error');
        addToast(errorMsg, 'error');
        
        // Redirect to login after showing error - use replace
        setTimeout(() => {
          console.log('➡️  Redirecting to login due to error...');
          navigate('/login', { replace: true });
        }, 3000); // Shorter timeout
      }
    };

    // Only process if we have URL parameters
    if (location.search && !processed) {
      processCallback();
    } else {
      console.warn('⚠️  No auth parameters or already processed');
      console.warn('   Search:', location.search);
      console.warn('   Processed:', processed);
      
      // If no parameters, redirect immediately to login
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 1000);
    }
  }, [location.search, login, navigate, addToast, processed]);

  // Show loading while processing
  if (status === 'processing' || !processed) {
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

            <div className="text-center">
              <p className="text-gray-300 text-sm">Verifying credentials with backend...</p>
              {flowType && (
                <p className="text-xs text-gray-500 mt-2">Flow: {flowType}</p>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Error or success state
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
      <div className="p-8 rounded-2xl bg-gradient-to-br from-gray-900/80 to-gray-950/80 backdrop-blur-xl border border-gray-800/50 shadow-2xl">
        {status === 'success' ? (
          <div className="text-center">
            <div className="text-green-400 text-sm font-medium mb-2">✅ Success!</div>
            <p className="text-gray-400 text-sm">Redirecting to dashboard...</p>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-red-400 text-sm font-medium mb-2">❌ Authentication Failed</div>
            <p className="text-gray-400 text-sm break-words">{error}</p>
            <p className="text-gray-500 text-xs mt-4">Returning to login...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OAuthCallback;