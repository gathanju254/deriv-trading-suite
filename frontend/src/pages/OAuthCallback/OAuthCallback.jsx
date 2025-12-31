// frontend/src/pages/OAuthCallback/OAuthCallback.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Loader, CheckCircle, XCircle } from 'lucide-react';
import './OAuthCallback.css';

const OAuthCallback = () => {
  const [status, setStatus] = useState('processing'); // processing | success | error
  const [error, setError] = useState(null);
  const [hasProcessed, setHasProcessed] = useState(false); // NEW: Prevent double execution

  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const { addToast } = useToast();

  useEffect(() => {
    // NEW: Only run once
    if (hasProcessed) return;
    
    const runAuth = async () => {
      try {
        setHasProcessed(true); // NEW: Mark as processed
        
        const params = new URLSearchParams(location.search);

        const errorParam = params.get('error');
        if (errorParam) {
          throw new Error(decodeURIComponent(errorParam));
        }

        const user_id = params.get('user_id');
        const session_token = params.get('session_token');
        const access_token = params.get('access_token');
        const email = params.get('email');
        const code = params.get('code'); // fallback

        /**
         * ✅ PRIMARY FLOW — backend already authenticated
         */
        if (user_id && session_token && access_token) {
          const authData = {
            user_id,
            session_token,
            access_token,
            email,
          };

          // Persist
          localStorage.setItem('user_id', user_id);
          localStorage.setItem('session_token', session_token);
          localStorage.setItem('auth_token', session_token);
          localStorage.setItem('deriv_access_token', access_token);
          localStorage.setItem('email', email || '');

          await login(authData);
        }

        /**
         * 🔁 FALLBACK FLOW — OAuth code exchange
         */
        else if (code) {
          await login(code);
        }

        else {
          throw new Error('No authentication data received');
        }

        setStatus('success');
        addToast('Login successful 🎉', 'success');

        setTimeout(() => {
          navigate('/dashboard', { replace: true }); // NEW: Use replace
        }, 1200);

      } catch (err) {
        console.error('OAuth callback failed:', err);
        setStatus('error');
        setError(err.message);
        addToast(`Authentication failed: ${err.message}`, 'error');

        setTimeout(() => {
          navigate('/login', { replace: true }); // NEW: Use replace
        }, 2500);
      }
    };

    runAuth();
  }, [location, navigate, login, addToast, hasProcessed]); // NEW: Add hasProcessed to dependencies

  // ---------------- UI ----------------

  if (status === 'processing') {
    return (
      <div className="oauth-callback-page">
        <div className="oauth-container">
          <Loader size={48} className="spin" />
          <h2>Connecting to Deriv…</h2>
          <p>Authenticating your account. Almost there.</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="oauth-callback-page">
        <div className="oauth-container success">
          <CheckCircle size={64} />
          <h2>Authentication Successful</h2>
          <p>Redirecting to your dashboard…</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="oauth-callback-page">
        <div className="oauth-container error">
          <XCircle size={64} />
          <h2>Authentication Failed</h2>
          <p>{error}</p>
          <p>Redirecting to login…</p>
        </div>
      </div>
    );
  }

  return null;
};

export default OAuthCallback;