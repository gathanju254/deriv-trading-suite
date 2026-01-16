// frontend/src/pages/Login/Login.jsx
// frontend/src/pages/Login/Login.jsx
import React, { useState, useEffect } from 'react';
import { derivService } from '../../services/derivService';
import { useToast } from '../../context/ToastContext';
import {
  Bot,
  LogIn,
  Shield,
  TrendingUp,
  Cpu,
  Globe,
  ArrowRight,
  CheckCircle,
  Zap,
  BarChart3,
  Lock,
} from 'lucide-react';
import { motion } from 'framer-motion';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile screen
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleDerivLogin = async () => {
    setLoading(true);
    try {
      console.log('🔐 Initiating OAuth login...');
      
      const { redirect_url } = await derivService.getOAuthRedirectUrl();

      if (!redirect_url) {
        throw new Error('No redirect URL received from server');
      }

      console.log('✅ Redirecting to Deriv OAuth');
      window.location.href = redirect_url;
      
    } catch (err) {
      console.error('❌ OAuth failed:', err);
      
      let errorMsg = 'Failed to initialize authentication.';
      
      if (err.response?.status === 404) {
        errorMsg = 'Authentication service unavailable.';
      } else if (err.message.includes('Network Error')) {
        errorMsg = 'Connection error. Please check your network.';
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      addToast(errorMsg, 'error');
      setLoading(false);
    }
  };

  // Features array for cleaner code
  const features = [
    {
      icon: Cpu,
      title: 'AI-Powered Signals',
      description: 'Machine learning-driven trade predictions',
      color: 'from-blue-500 to-cyan-500',
      delay: 0.1
    },
    {
      icon: TrendingUp,
      title: 'Live Analytics',
      description: 'Real-time market insights and metrics',
      color: 'from-emerald-500 to-green-500',
      delay: 0.2
    },
    {
      icon: Shield,
      title: 'Bank-Grade Security',
      description: 'OAuth 2.0 with end-to-end encryption',
      color: 'from-purple-500 to-violet-500',
      delay: 0.3
    },
    {
      icon: Globe,
      title: 'Global Access',
      description: 'Trade across international markets',
      color: 'from-amber-500 to-orange-500',
      delay: 0.4
    },
  ];

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring', stiffness: 100 }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 overflow-x-hidden">
      {/* Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-primary-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-accent-500/5 rounded-full blur-3xl" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row items-center justify-center p-4 lg:p-8">
        {/* Left Panel - Brand & Features */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full lg:w-1/2 lg:pr-12 mb-12 lg:mb-0"
        >
          {/* Logo & Brand */}
          <motion.div variants={itemVariants} className="flex items-center justify-center lg:justify-start gap-4 mb-10">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center shadow-glow">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <div className="text-center lg:text-left">
              <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Deriv Trading Suite
              </h1>
              <p className="text-gray-400 text-sm lg:text-base">Professional Trading Platform</p>
            </div>
          </motion.div>

          {/* Hero Text */}
          <motion.div variants={itemVariants} className="mb-10 text-center lg:text-left">
            <h2 className="text-4xl lg:text-5xl font-bold text-white leading-tight mb-4">
              Trade Smarter
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-accent-500">
                Powered by AI
              </span>
            </h2>
            <p className="text-lg lg:text-xl text-gray-300 leading-relaxed max-w-2xl">
              Institutional-grade trading tools with real-time analytics, 
              automated strategies, and intelligent risk management.
            </p>
          </motion.div>

          {/* Features Grid */}
          <motion.div 
            variants={containerVariants}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6"
          >
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                variants={itemVariants}
                custom={feature.delay}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="group p-4 lg:p-5 rounded-xl bg-gray-900/40 backdrop-blur-sm border border-gray-800/50 hover:border-gray-700/50 transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-400">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Stats Bar */}
          <motion.div 
            variants={itemVariants}
            className="mt-10 pt-6 border-t border-gray-800/30"
          >
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">99.9%</div>
                <div className="text-xs text-gray-400">Uptime</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">24/7</div>
                <div className="text-xs text-gray-400">Monitoring</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">256-bit</div>
                <div className="text-xs text-gray-400">Encryption</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">API v2.0</div>
                <div className="text-xs text-gray-400">Integration</div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Right Panel - Login Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="w-full lg:w-1/2 max-w-md"
        >
          <div className="p-6 lg:p-8 rounded-2xl bg-gray-900/80 backdrop-blur-xl border border-gray-800/50 shadow-2xl">
            {/* Card Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 mb-4 shadow-glow">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Secure Access</h3>
              <p className="text-gray-400">
                Connect your Deriv account to begin trading
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
                  <span>Connecting to Deriv...</span>
                </>
              ) : (
                <>
                  <ArrowRight className="w-5 h-5" />
                  <span>Continue with Deriv</span>
                </>
              )}
            </motion.button>

            {/* Security Info */}
            <div className="mt-6 p-4 rounded-lg bg-gray-900/50 border border-gray-800/50">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-primary-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-300">
                    You'll be redirected to Deriv's secure authentication portal.
                    We never store your login credentials.
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Your data is encrypted end-to-end
                  </p>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center my-6">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent to-gray-700" />
              <span className="px-4 text-sm text-gray-500">Powered by</span>
              <div className="flex-1 h-px bg-gradient-to-l from-transparent to-gray-700" />
            </div>

            {/* Deriv Brand */}
            <div className="flex flex-col items-center justify-center text-center">
              <div className="flex items-center justify-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <span className="text-lg font-bold text-white">Deriv API</span>
              </div>
              <p className="text-sm text-gray-400">Official Partner Integration</p>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-gray-800/50 text-center">
              <p className="text-sm text-gray-500">
                By continuing, you agree to our{' '}
                <button className="text-primary-400 hover:text-primary-300 underline underline-offset-2 transition-colors">
                  Terms of Service
                </button>{' '}
                and{' '}
                <button className="text-primary-400 hover:text-primary-300 underline underline-offset-2 transition-colors">
                  Privacy Policy
                </button>
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Mobile-Only Bottom Info */}
      {isMobile && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-gray-900/95 backdrop-blur-xl border-t border-gray-800/50">
          <div className="max-w-md mx-auto text-center">
            <p className="text-xs text-gray-400 mb-2">
              Optimized for mobile trading experience
            </p>
            <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Secure
              </span>
              <span className="flex items-center gap-1">
                <BarChart3 className="w-3 h-3" />
                Real-time
              </span>
              <span className="flex items-center gap-1">
                <Globe className="w-3 h-3" />
                Global
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;