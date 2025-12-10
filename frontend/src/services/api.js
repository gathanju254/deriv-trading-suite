// frontend/src/services/api.js
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false, // Important for CORS
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    
    // Handle CORS errors
    if (error.code === 'ERR_NETWORK') {
      error.message = 'Unable to connect to the server. Please check if the backend is running.';
    }
    
    // Handle 404 errors
    if (error.response?.status === 404) {
      error.message = 'Requested endpoint not found.';
    }
    
    return Promise.reject(error);
  }
);

export default api;