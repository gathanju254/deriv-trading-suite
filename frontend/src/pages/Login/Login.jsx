// frontend/src/pages/Login/Login.jsx
// frontend/src/pages/Login/Login.jsx
import React, { useState, useEffect } from 'react';
import { derivService } from '../../services/derivService';
import { useToast } from '../../context/ToastContext';
import {
  Bot,
  Shield,
  TrendingUp,
  Globe,
  ArrowRight,
  CheckCircle,
  Cpu,
  Lock,
  BarChart3,
  Zap,
  Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  // Feature cards data
  const features = [
    {
      icon: Cpu,
      title: 'AI-Powered Engine',
      description: 'Machine learning-driven trading signals',
      color: 'from-blue-500 to-cyan-500',
      delay: 0.1
    },
    {
      icon: BarChart3,
      title: 'Live Analytics',
      description: 'Real-time market insights',
      color: 'from-emerald-500 to-green-500',
      delay: 0.2
    },
    {
      icon: Shield,
      title: 'Secure OAuth',
      description: 'Bank-grade encryption',
      color: 'from-violet-500 to-purple-500',
      delay: 0.3
    },
    {
      icon: Globe,
      title: 'Global Markets',
      description: 'Access 24/7 trading',
      color: 'from-orange-500 to-amber-500',
      delay: 0.4
    }
  ];

  // Handle Deriv OAuth login
  const handleDerivLogin = async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      console.log('🔐 Initiating OAuth login...');
      const { redirect_url } = await derivService.getOAuthRedirectUrl();

      if (!redirect_url) {
        throw new Error('No redirect URL received');
      }

      console.log('✅ Redirecting to Deriv OAuth...');
      window.location.href = redirect_url;
      
    } catch (err) {
      console.error('❌ OAuth failed:', err);
      
      let errorMsg = 'Failed to initialize authentication';
      if (err.message?.includes('Network')) {
        errorMsg = 'Cannot connect to server. Check your connection.';
      } else if (err.message?.includes('redirect_url')) {
        errorMsg = 'Server configuration error';
      }
      
      addToast(errorMsg, 'error');
      setLoading(false);
    }
  };

  // Haptic feedback for mobile
  const triggerHaptic = () => {
    if (navigator?.vibrate) {
      navigator.vibrate(10);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 md:w-96 md:h-96 bg-primary-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 md:w-96 md:h-96 bg-accent-500/5 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 md:w-64 md:h-64 bg-success-500/5 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row items-center justify-center px-4 py-8 lg:p-8">
        {/* Left Column - Brand & Features */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full lg:w-1/2 max-w-2xl lg:pr-12 mb-12 lg:mb-0"
        >
          {/* Brand Section */}
          <div className="mb-10 lg:mb-12">
            <div className="flex items-center gap-4 mb-6">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center shadow-glow"
              >
                <Bot className="w-7 h-7 md:w-8 md:h-8 text-white" />
              </motion.div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  Deriv Trading Suite
                </h1>
                <p className="text-gray-400 text-sm md:text-base">Professional Trading Platform</p>
              </div>
            </div>

            {/* Tagline */}
            <div className="space-y-4 mb-8">
              <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight">
                Trade Smarter
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-accent-500">
                  Powered by AI
                </span>
              </h2>
              <p className="text-lg md:text-xl text-gray-300 leading-relaxed max-w-2xl">
                Institutional-grade trading tools with automated strategies, 
                real-time analytics, and intelligent risk management.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { value: '99.9%', label: 'Uptime' },
                { value: '24/7', label: 'Monitoring' },
                { value: '256-bit', label: 'Encryption' },
                { value: 'API v2', label: 'Integration' }
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className="text-center p-4 rounded-xl bg-gray-900/30 backdrop-blur-sm border border-gray-800/30"
                >
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-sm text-gray-400">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: feature.delay }}
                whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                className="group flex items-start gap-4 p-4 rounded-xl bg-gray-900/40 backdrop-blur-sm border border-gray-800/40 hover:border-gray-700/60 transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">{feature.title}</h3>
                  <p className="text-sm text-gray-400">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Trust Indicators */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-8 pt-6 border-t border-gray-800/40"
          >
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                <span>OAuth 2.0 Secure</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>PCI DSS Compliant</span>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Right Column - Login Card (Desktop) */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="hidden lg:block w-full lg:w-1/2 max-w-md"
        >
          <div className="p-8 rounded-2xl bg-gradient-to-br from-gray-900/80 to-gray-950/80 backdrop-blur-xl border border-gray-800/50 shadow-2xl">
            {/* Card Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 mb-6 shadow-glow">
                <Shield className="w-10 h-10 text-white" />
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
              onClick={() => {
                triggerHaptic();
                handleDerivLogin();
              }}
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

            {/* Security Note */}
            <div className="mt-6 p-4 rounded-lg bg-gray-900/50 border border-gray-800/50">
              <p className="text-sm text-gray-400 text-center">
                You'll be redirected to Deriv's secure authentication portal.
                We never store your login credentials.
              </p>
            </div>

            {/* Divider */}
            <div className="flex items-center my-6">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent to-gray-700" />
              <span className="px-4 text-sm text-gray-500">Official Partner</span>
              <div className="flex-1 h-px bg-gradient-to-l from-transparent to-gray-700" />
            </div>

            {/* Deriv Brand */}
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-gray-400 text-sm">Powered by</span>
                <h4 className="text-lg font-bold text-white">Deriv API</h4>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Sticky Mobile Login Button */}
      <motion.div 
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-gray-950/95 via-gray-950/90 to-gray-950/95 backdrop-blur-xl border-t border-gray-800/50"
      >
        <div className="max-w-md mx-auto">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              triggerHaptic();
              handleDerivLogin();
            }}
            disabled={loading}
            className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold text-lg flex items-center justify-center gap-3 shadow-lg"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Login with Deriv
              </>
            )}
          </motion.button>
          
          <p className="text-xs text-gray-500 text-center mt-3">
            Secure OAuth authentication
          </p>
        </div>
      </motion.div>

      {/* Bottom Gradient */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-gray-950 to-transparent pointer-events-none" />
    </div>
  );
};

export default Login;