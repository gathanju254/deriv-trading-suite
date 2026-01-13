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

import Dashboard from './pages/Dashboard/Dashboard';
import Trading from './pages/Trading/Trading';
import Analytics from './pages/Analytics/Analytics';
import Settings from './pages/Settings/Settings';

import Login from './pages/Login/Login';
import OAuthCallback from './pages/OAuthCallback/OAuthCallback';

//import './App.css';

/* -------------------------------------------
   Protected Route (bouncer at the door)
-------------------------------------------- */
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="app-loading">Loading…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

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

  return user ? <Navigate to="/dashboard" replace /> : children;
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

  // Fix for OAuth callback from backend redirect
  useEffect(() => {
    console.log('Current path:', location.pathname);
    
    // Check if we're coming from backend OAuth redirect
    if (location.pathname === '/oauth/callback' && location.search) {
      console.log('OAuth callback detected with params:', location.search);
      // React Router should handle this automatically
      // No need to manually redirect
    }
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

      {/* IMPORTANT: OAuth callback route MUST be defined before protected routes */}
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
      
      {/* Catch-all route - redirect to login if not authenticated */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

/* -------------------------------------------
   Root App (clean provider stack)
-------------------------------------------- */
function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <AuthProvider>
          <TradingProvider>
            {/* Add basename="/" for proper routing on Render */}
            <Router basename="/">
              <AppRoutes />
            </Router>
          </TradingProvider>
        </AuthProvider>
      </ToastProvider>
    </AppProvider>
  );
}

export default App;