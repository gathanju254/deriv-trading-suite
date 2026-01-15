// frontend/src/services/api.js - UPDATED
import axios from 'axios';

// Use dynamic base URL - NO /api suffix for auth routes
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (import.meta.env.PROD 
    ? 'https://deriv-trading-backend.onrender.com'  // NO /api suffix
    : 'http://localhost:8000');

console.log('✅ API Base URL:', API_BASE_URL);

// Create two axios instances: one for auth (no /api prefix), one for api
export const authApi = axios.create({
  baseURL: API_BASE_URL,  // Direct to backend
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
});

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,  // With /api prefix
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
});

// Request interceptor for both
const setupInterceptor = (axiosInstance) => {
  axiosInstance.interceptors.request.use(
    (config) => {
      console.log('API Request:', config.method, config.url);
      const token = localStorage.getItem('session_token') || localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  axiosInstance.interceptors.response.use(
    (response) => {
      console.log('API Response:', response.status, response.config.url);
      return response;
    },
    (error) => {
      console.error('API Error:', error.message, error.config?.url);

      if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') {
        error.message = 'Unable to connect to the server. Please wait a moment and try again.';
      }

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
};

setupInterceptor(authApi);
setupInterceptor(api);

export default api;