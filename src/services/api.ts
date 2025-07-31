import axios from 'axios';
import { mockApi } from './mockApi';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001',
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
      // Handle unauthorized access
      localStorage.removeItem('token');
      window.location.href = '/signin';
    }
    return Promise.reject(error);
  }
);

// Enhanced API service with fallback to mock data
export const apiService = {
  // Products
  getProducts: async (params?: any) => {
    try {
      const response = await api.get('/api/products', { params });
      return response.data;
    } catch (error) {
      console.log('Backend not available, using mock data');
      return await mockApi.getProducts(params);
    }
  },

  getProduct: async (id: number) => {
    try {
      const response = await api.get(`/api/products/${id}`);
      return response.data;
    } catch (error) {
      console.log('Backend not available, using mock data');
      return await mockApi.getProduct(id);
    }
  },

  // Categories
  getCategories: async () => {
    try {
      const response = await api.get('/api/categories');
      return response.data;
    } catch (error) {
      console.log('Backend not available, using mock data');
      return await mockApi.getCategories();
    }
  },

  // Cart
  getCart: async () => {
    try {
      const response = await api.get('/api/cart');
      return response.data;
    } catch (error) {
      console.log('Backend not available, using local storage');
      return await mockApi.getCart();
    }
  },

  addToCart: async (productId: number, quantity: number = 1) => {
    try {
      const response = await api.post('/api/cart', { productId, quantity });
      return response.data;
    } catch (error) {
      console.log('Backend not available, using local storage');
      return await mockApi.addToCart(productId, quantity);
    }
  },

  // Wishlist
  getWishlist: async () => {
    try {
      const response = await api.get('/api/wishlist');
      return response.data;
    } catch (error) {
      console.log('Backend not available, using local storage');
      return await mockApi.getWishlist();
    }
  },

  addToWishlist: async (productId: number) => {
    try {
      const response = await api.post('/api/wishlist', { productId });
      return response.data;
    } catch (error) {
      console.log('Backend not available, using local storage');
      return await mockApi.addToWishlist(productId);
    }
  },

  removeFromWishlist: async (productId: number) => {
    try {
      const response = await api.delete(`/api/wishlist/${productId}`);
      return response.data;
    } catch (error) {
      console.log('Backend not available, using local storage');
      return await mockApi.removeFromWishlist(productId);
    }
  }
};

export default api;