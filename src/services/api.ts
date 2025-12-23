import axios from 'axios';

let isRedirecting = false;

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.log('No token found in localStorage');
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      const authPages = ['/signin', '/signup', '/forgot-password', '/reset-password', '/vendor-signup'];
      
      const isOnAuthPage = authPages.some(page => currentPath.startsWith(page));

      // Clear invalid token
      localStorage.removeItem('token');
      
      // If not on auth page and not already redirecting, redirect to signin
      if (!isOnAuthPage && !isRedirecting) {
        isRedirecting = true;
        // Store the current URL to redirect back after login
        const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/signin?returnUrl=${returnUrl}`;
        
        // Return a never-resolving promise to prevent error handlers from running
        return new Promise(() => {});
      }
    }
    return Promise.reject(error);
  }
);

export default api;