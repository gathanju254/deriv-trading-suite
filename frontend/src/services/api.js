// frontend/src/services/api.js - CORRECTED VERSION
import axios from 'axios';

// Get base URL from environment (WITHOUT /api suffix for auth routes)
const BASE_URL = import.meta.env.VITE_API_BASE_URL 
  ? import.meta.env.VITE_API_BASE_URL.replace('/api', '')  // Remove /api suffix
  : (import.meta.env.PROD 
    ? 'https://deriv-trading-backend.onrender.com'  // WITHOUT /api
    : 'http://localhost:8000');  // WITHOUT /api

console.log('✅ API Base URL for auth routes:', BASE_URL);
console.log('✅ API Base URL for api routes:', BASE_URL + '/api');

// ✅ Auth routes: Use BASE_URL directly (NO /api prefix)
export const authApi = axios.create({
  baseURL: `${BASE_URL}`,  // Direct to backend root for auth routes
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
});

// ✅ Trading API routes: Use BASE_URL + /api
export const api = axios.create({
  baseURL: `${BASE_URL}/api`,  // WITH /api prefix for trading endpoints
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
});

// Setup interceptors (keep your existing interceptor code)
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