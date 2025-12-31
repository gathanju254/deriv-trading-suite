// frontend/src/services/api.js
import axios from 'axios';

// Use dynamic base URL - IMPORTANT: Always include /api
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (import.meta.env.PROD 
    ? 'https://deriv-trading-backend.onrender.com/api'  // Render backend
    : 'http://localhost:8000/api');

console.log('API Base URL:', API_BASE_URL); // Debug log

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Increase timeout to 30 seconds for Render free tier
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
});

// ==========================
// Request Interceptor
// ==========================
api.interceptors.request.use(
  (config) => {
    console.log('API Request:', config.method, config.url); // Debug log
    
    // Prefer session_token, fallback to auth_token if needed
    const token = localStorage.getItem('session_token') || localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ==========================
// Response Interceptor
// ==========================
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.status, response.config.url); // Debug log
    return response;
  },
  (error) => {
    console.error('API Error:', error.message, error.config?.url);

    // Network / backend unreachable
    if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') {
      error.message = 'Unable to connect to the server. The backend might be spinning up (Render free tier). Please wait a moment and try again.';
      
      // Try to ping the backend health endpoint
      axios.get('https://deriv-trading-backend.onrender.com/')
        .then(() => {
          console.log('Backend is alive, retrying...');
        })
        .catch(() => {
          console.log('Backend still not responding');
        });
    }

    // 404 Not Found
    if (error.response?.status === 404) {
      error.message = `Requested endpoint not found: ${error.config?.url}`;
    }

    // 401 Unauthorized
    if (error.response?.status === 401) {
      console.warn('Unauthorized - clearing session and redirecting to login.');
      localStorage.removeItem('user_id');
      localStorage.removeItem('session_token');
      localStorage.removeItem('deriv_access_token');
      localStorage.removeItem('email');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default api;