// frontend/src/App.jsx
// frontend/src/App.jsx
import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
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

import './App.css';

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
  // Add a useEffect to handle initial redirect from backend
  React.useEffect(() => {
    // Check if we're at the root path with OAuth parameters
    const searchParams = new URLSearchParams(window.location.search);
    const user_id = searchParams.get('user_id');
    const session_token = searchParams.get('session_token');
    
    if (window.location.pathname === '/' && user_id && session_token) {
      // Redirect to proper OAuth callback route
      const newUrl = `/oauth/callback?${window.location.search}`;
      window.history.replaceState(null, '', newUrl);
      window.location.reload(); // Force React Router to recognize the new route
    }
  }, []);

  return (
    <Routes>
      {/* Public */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

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
        {/* Catch-all for any other protected routes */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
      
      {/* Catch-all for any unknown route */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
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