// frontend/src/pages/Login.jsx
import React, { useState } from 'react';
import { derivService } from '../../services/derivService';
import { useToast } from '../../context/ToastContext';
import { Bot, LogIn } from 'lucide-react';
import './Login.css';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const handleDerivLogin = async () => {
    setLoading(true);
    try {
      const { redirect_url } = await derivService.getOAuthRedirectUrl();

      if (!redirect_url) {
        throw new Error('Missing redirect URL');
      }

      // HARD redirect to Deriv OAuth
      window.location.href = redirect_url;
    } catch (err) {
      console.error('OAuth redirect failed:', err);
      addToast('Failed to redirect to Deriv. Try again.', 'error');
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        {/* Header */}
        <div className="login-header">
          <Bot size={48} className="login-logo" />
          <h1>Deriv Trading Suite</h1>
          <p className="login-subtitle">
            Trade smarter. Let the bot cook.
          </p>
        </div>

        {/* Action */}
        <div className="login-form">
          <button
            className="login-button"
            onClick={handleDerivLogin}
            disabled={loading}
          >
            {loading ? (
              'Redirecting to Deriv...'
            ) : (
              <>
                <LogIn size={18} />
                Continue with Deriv
              </>
            )}
          </button>

          <p className="login-footer">
            New to Deriv?{' '}
            <button
              type="button"
              className="login-link"
              onClick={handleDerivLogin}
            >
              You’ll create an account in the next step.
            </button>
          </p>
        </div>

        {/* Trust / Meta */}
        <div className="login-meta">
          <span>Powered by</span>
          <strong>Deriv</strong>
        </div>
      </div>
    </div>
  );
};

export default Login;
