// frontend/src/App.jsx - UPDATED VERSION
import React, { useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
  useNavigate
} from 'react-router-dom';

import { AppProvider } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TradingProvider } from './context/TradingContext';
import { ToastProvider } from './context/ToastContext';

import MainLayout from './components/layout/MainLayout/MainLayout';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';

import Dashboard from './pages/Dashboard/Dashboard';
import Trading from './pages/Trading/Trading';
import Analytics from './pages/Analytics/Analytics';
import Settings from './pages/Settings/Settings';

import Login from './pages/Login/Login';
import OAuthCallback from './pages/OAuthCallback/OAuthCallback';

/* -------------------------------------------
   Protected Route (bouncer at the door)
-------------------------------------------- */
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const localUserId = localStorage.getItem('user_id');
  const localToken = localStorage.getItem('session_token');

  console.log('🔒 ProtectedRoute check:', {
    contextUser: !!user,
    localStorageUser: !!localUserId,
    localStorageToken: !!localToken,
    loading,
    userId: user?.id || localUserId ? '***' + (user?.id || localUserId).slice(-8) : 'none'
  });

  if (loading) {
    console.log('⏳ ProtectedRoute: Still loading auth state...');
    return <div className="app-loading">Loading…</div>;
  }

  // Accept if either context user OR localStorage tokens exist
  const isAuthenticated = user || (localUserId && localToken);

  if (!isAuthenticated) {
    console.log('🚫 ProtectedRoute: No authentication found, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  console.log('✅ ProtectedRoute: User authenticated, rendering content');
  return children;
};

/* -------------------------------------------
   Public Route (no reruns for logged-in users)
-------------------------------------------- */
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="app-loading">Loading…</div>;
  }

  if (user) {
    console.log('ℹ️  PublicRoute: User already authenticated, redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

/* -------------------------------------------
   Main Layout Wrapper
-------------------------------------------- */
const MainLayoutWrapper = () => {
  return (
    <MainLayout>
      <Outlet /> {/* This renders the child routes */}
    </MainLayout>
  );
};

/* -------------------------------------------
   App Routes
-------------------------------------------- */
const AppRoutes = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('📍 Route changed:', {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash
    });

    // Log auth status
    const userId = localStorage.getItem('user_id');
    const token = localStorage.getItem('session_token');
    console.log('🔍 Current auth status:', {
      hasUserId: !!userId,
      hasToken: !!token,
      path: location.pathname
    });
  }, [location]);

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      {/* ⚠️ CRITICAL: OAuth callback MUST come BEFORE protected routes */}
      <Route path="/oauth/callback" element={<OAuthCallback />} />

      {/* Protected routes with MainLayout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayoutWrapper />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="trading" element={<Trading />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

/* -------------------------------------------
   Root App (clean provider stack)
-------------------------------------------- */
function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppProvider>
          <ToastProvider>
            <TradingProvider>
              {/* Add basename="/" for proper routing on static hosting */}
              <Router basename="/">
                <AppRoutes />
              </Router>
            </TradingProvider>
          </ToastProvider>
        </AppProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;