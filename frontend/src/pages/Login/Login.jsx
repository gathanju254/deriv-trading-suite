// frontend/src/pages/Login/Login.jsx
import React, { useState } from 'react';
import { derivService } from '../../services/derivService';
import { useToast } from '../../context/ToastContext';
import { Bot, LogIn, Shield, TrendingUp, Zap, ArrowRight, Globe } from 'lucide-react';
import { motion } from 'framer-motion';

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

  const features = [
    { icon: Zap, text: 'AI-Powered Trading Signals', color: 'from-yellow-500 to-orange-500' },
    { icon: TrendingUp, text: 'Real-Time Market Analytics', color: 'from-green-500 to-emerald-500' },
    { icon: Shield, text: 'Bank-Grade Security', color: 'from-blue-500 to-cyan-500' },
    { icon: Globe, text: 'Global Market Access', color: 'from-purple-500 to-pink-500' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 overflow-hidden relative">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-500/5 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-success-500/5 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-6xl flex flex-col lg:flex-row items-center justify-between gap-12"
        >
          {/* Left Column - Features & Info */}
          <div className="w-full lg:w-1/2 space-y-8">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="space-y-6"
            >
              {/* Logo & Brand */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center shadow-glow">
                  <Bot className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    Deriv Trading Suite
                  </h1>
                  <p className="text-gray-400 mt-1">Professional Trading Platform</p>
                </div>
              </div>

              {/* Tagline */}
              <div className="space-y-4">
                <h2 className="text-5xl font-bold text-white leading-tight">
                  Trade Smarter
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-accent-500">
                    Let the AI Cook
                  </span>
                </h2>
                <p className="text-xl text-gray-300 leading-relaxed">
                  Institutional-grade trading tools powered by Deriv's advanced APIs. 
                  Automated strategies, real-time analytics, and intelligent risk management.
                </p>
              </div>

              {/* Features Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                {features.map((feature, index) => (
                  <motion.div
                    key={feature.text}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
                    className="flex items-center gap-3 p-4 rounded-xl bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 hover:border-gray-700/50 transition-all duration-300 group"
                  >
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-gray-200 font-medium">{feature.text}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Stats */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex items-center justify-between pt-8 border-t border-gray-800/50"
            >
              <div className="text-center">
                <div className="text-2xl font-bold text-white">99.9%</div>
                <div className="text-sm text-gray-400">Uptime</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">24/7</div>
                <div className="text-sm text-gray-400">Monitoring</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">256-bit</div>
                <div className="text-sm text-gray-400">Encryption</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">API v2.0</div>
                <div className="text-sm text-gray-400">Integration</div>
              </div>
            </motion.div>
          </div>

          {/* Right Column - Login Card */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="w-full lg:w-1/2"
          >
            <div className="max-w-md mx-auto p-8 rounded-2xl bg-gradient-to-br from-gray-900/80 to-gray-950/80 backdrop-blur-xl border border-gray-800/50 shadow-2xl">
              {/* Card Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 mb-6 shadow-glow">
                  <LogIn className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Secure Authentication</h3>
                <p className="text-gray-400">
                  Connect your Deriv account to access the trading platform
                </p>
              </div>

              {/* Login Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleDerivLogin}
                disabled={loading}
                className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 text-white font-semibold text-lg flex items-center justify-center gap-3 shadow-lg hover:shadow-glow transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Redirecting to Deriv...
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-5 h-5" />
                    Continue with Deriv
                  </>
                )}
              </motion.button>

              {/* Info Text */}
              <div className="mt-6 p-4 rounded-lg bg-gray-900/50 border border-gray-800/50">
                <p className="text-sm text-gray-400 text-center">
                  You'll be redirected to Deriv's secure authentication portal. 
                  We never store your login credentials.
                </p>
              </div>

              {/* Divider */}
              <div className="flex items-center my-6">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent to-gray-700" />
                <span className="px-4 text-sm text-gray-500">Powered by</span>
                <div className="flex-1 h-px bg-gradient-to-l from-transparent to-gray-700" />
              </div>

              {/* Deriv Brand */}
              <div className="flex items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                  <span className="text-gray-400 text-sm">Official Partner</span>
                  <h4 className="text-lg font-bold text-white">Deriv API</h4>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-8 pt-6 border-t border-gray-800/50">
                <p className="text-sm text-gray-500 text-center">
                  New to Deriv?{' '}
                  <button
                    type="button"
                    onClick={handleDerivLogin}
                    className="text-primary-400 hover:text-primary-300 underline underline-offset-2 transition-colors"
                  >
                    Create an account during authentication
                  </button>
                </p>
                <p className="text-xs text-gray-600 text-center mt-2">
                  By continuing, you agree to our Terms & Privacy Policy
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;