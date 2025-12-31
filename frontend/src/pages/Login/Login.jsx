// frontend/src/pages/Login.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { derivService } from '../../services/derivService';
import { useToast } from '../../context/ToastContext';
import { Bot, LogIn } from 'lucide-react';
import './Login.css';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleDerivLogin = async () => {
    setLoading(true);
    try {
      // Call backend: GET /auth/login
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
        <div className="login-header">
          <Bot size={48} className="login-logo" />
          <h1>Deriv Trading Suite</h1>
          <p className="login-subtitle">
            Trade smarter. Let the bot cook.
          </p>
        </div>

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
                Login with Deriv
              </>
            )}
          </button>

          <p className="login-footer">
            New here?{' '}
            <span className="login-link" onClick={handleDerivLogin}>
              Create an account on Deriv
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
