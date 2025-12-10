// frontend/src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { TradingProvider } from './context/TradingContext';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import MainLayout from './components/Layout/MainLayout/MainLayout';
import Dashboard from './pages/Dashboard/Dashboard';
import Trading from './pages/Trading/Trading';
import Analytics from './pages/Analytics/Analytics';
import Settings from './pages/Settings/Settings';
import Login from './pages/Login/Login';
import './App.css';

function App() {
  return (
    <AppProvider>
      <AuthProvider>
        <TradingProvider>
          <ToastProvider>
            <Router>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/*" element={
                  <MainLayout>
                    <Routes>
                      <Route path="/" element={<Navigate to="/dashboard" />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/trading" element={<Trading />} />
                      <Route path="/analytics" element={<Analytics />} />
                      <Route path="/settings" element={<Settings />} />
                    </Routes>
                  </MainLayout>
                } />
              </Routes>
            </Router>
          </ToastProvider>
        </TradingProvider>
      </AuthProvider>
    </AppProvider>
  );
}

export default App;