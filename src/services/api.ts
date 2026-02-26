import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { tokenManager } from './tokenManager';
import { getGuestCurrencyCode } from '@/stores/currency-store';

const CURRENCY_HEADER = 'X-Currency';

let isRedirecting = false;

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string | null) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
  withCredentials: true, // Important: sends cookies with requests
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (config.url?.includes('/auth/refresh')) {
      return config;
    }

    const token = tokenManager.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Send preferred currency so backend can convert prices.
    // Priority: authenticated user preference > guest auto-detected currency
    const user = tokenManager.getUser();
    if (user?.preferredCurrencyCode) {
      config.headers[CURRENCY_HEADER] = user.preferredCurrencyCode;
    } else {
      const guestCurrency = getGuestCurrencyCode();
      if (guestCurrency) {
        config.headers[CURRENCY_HEADER] = guestCurrency;
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for automatic token refresh and error handling
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const requestHadAuthHeader = Boolean((originalRequest?.headers as any)?.Authorization);
    const hasActiveAuth = tokenManager.isAuthenticated();
    const shouldHandleAuthFailure = requestHadAuthHeader || hasActiveAuth;
    
    // Skip retry for auth endpoints
    const isAuthEndpoint = originalRequest?.url?.includes('/auth/');
    
    if (error.response?.status === 401 && !originalRequest?._retry && !isAuthEndpoint && shouldHandleAuthFailure) {
      // Token expired, try to refresh
      
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (token && originalRequest) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          }
          return Promise.reject(error);
        }).catch((err) => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Attempt to refresh the token
        const success = await tokenManager.refreshAccessToken();
        
        if (success) {
          const newToken = tokenManager.getAccessToken();
          processQueue(null, newToken);
          
          // Retry original request with new token
          if (newToken && originalRequest) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          }
        }
        
        // Refresh failed, redirect to login
        processQueue(error, null);
        handleAuthFailure();
        return Promise.reject(error);
        
      } catch (refreshError) {
        processQueue(refreshError, null);
        handleAuthFailure();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // For other 401s on auth pages or non-retryable requests
    if (error.response?.status === 401 && shouldHandleAuthFailure) {
      handleAuthFailure();
    }

    return Promise.reject(error);
  }
);

function handleAuthFailure() {
  const currentPath = window.location.pathname;
  const authPages = ['/signin', '/signup', '/forgot-password', '/reset-password', '/vendor-signup', '/verify-email'];
  
  const isOnAuthPage = authPages.some(page => currentPath.startsWith(page));

  // Clear token data
  tokenManager.clearTokenData();
  
  // If not on auth page and not already redirecting, redirect to signin
  if (!isOnAuthPage && !isRedirecting) {
    isRedirecting = true;
    // Store the current URL to redirect back after login
    const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/signin?returnUrl=${returnUrl}`;
  }
}

export default api;