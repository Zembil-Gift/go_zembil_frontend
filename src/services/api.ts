import axios from 'axios';

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
      // Don't redirect if already on auth pages or public pages
      const currentPath = window.location.pathname;
      const authPages = ['/signin', '/signup', '/forgot-password', '/reset-password', '/vendor-signup'];
      const publicPages = ['/', '/about', '/contact', '/gifts', '/shop', '/search', '/occasions', '/collections', '/events', '/product'];
      
      const isOnAuthPage = authPages.some(page => currentPath.startsWith(page));
      const isOnPublicPage = publicPages.some(page => currentPath === page || currentPath.startsWith(page + '/'));

      // Only redirect to signin for protected pages, not public ones
      if (!isOnAuthPage && !isOnPublicPage) {
        // Handle unauthorized access - only redirect if not on auth or public pages
        localStorage.removeItem('token');
        window.location.href = '/signin';
      } else if (!isOnAuthPage) {
        // On public pages, just clear the invalid token without redirecting
        localStorage.removeItem('token');
      }
    }
    return Promise.reject(error);
  }
);

export default api;