import axios from 'axios';

// Use dynamic base URL - IMPORTANT: Always include /api
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (import.meta.env.PROD 
    ? 'https://deriv-trading-backend.onrender.com/api'  // Render backend
    : 'http://localhost:8000/api');

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
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
  (response) => response,
  (error) => {
    console.error('API Error:', error);

    // Network / backend unreachable
    if (error.code === 'ERR_NETWORK') {
      error.message = 'Unable to connect to the server. Please check if the backend is running.';
    }

    // 404 Not Found
    if (error.response?.status === 404) {
      error.message = 'Requested endpoint not found.';
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