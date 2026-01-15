// frontend/src/services/api.js - UPDATED
import axios from 'axios';

// Use dynamic base URL - NO /api suffix for auth routes
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (import.meta.env.PROD 
    ? 'https://deriv-trading-backend.onrender.com'  // NO /api suffix
    : 'http://localhost:8000');

console.log('✅ API Base URL:', API_BASE_URL);

// ✅ CORRECT - Separate instances with explicit baseURL
// Auth routes: NO /api prefix
export const authApi = axios.create({
  baseURL: `${API_BASE_URL}`,  // Direct to backend root
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
});

// Trading API routes: WITH /api prefix
export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,  // With /api prefix
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
});

// Setup interceptors
const setupInterceptor = (axiosInstance, isAuthApi = false) => {
  axiosInstance.interceptors.request.use(
    (config) => {
      const routeType = isAuthApi ? 'AUTH' : 'API';
      console.log(`[${routeType}] Request:`, config.method.toUpperCase(), config.url);
      
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
      const routeType = isAuthApi ? 'AUTH' : 'API';
      console.log(`[${routeType}] Response:`, response.status, response.config.url);
      return response;
    },
    (error) => {
      console.error('API Error:', error.message, error.config?.url);

      if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') {
        error.message = 'Unable to connect to the server. Please check your connection.';
      }

      if (error.response?.status === 401) {
        console.warn('Unauthorized - redirecting to login.');
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

setupInterceptor(authApi, true);  // true = isAuthApi
setupInterceptor(api, false);     // false = isApiRoute

export default api;