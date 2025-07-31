import { apiService } from './apiService';

// Types for authentication
export interface LoginRequest {
  emailOrPhone: string;
  password: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
  confirmPassword: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
    role: string;
  };
  expiresIn: number;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

// Authentication service
class AuthService {
  /**
   * User login
   */
  async login(emailOrPhone: string, password: string): Promise<AuthResponse> {
    const loginData: LoginRequest = { emailOrPhone, password };
    const response = await apiService.postRequest<AuthResponse>('/auth/login', loginData);
    
    // Store token and user data
    if (response.token) {
      localStorage.setItem('authToken', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    
    return response;
  }

  /**
   * User registration
   */
  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await apiService.postRequest<AuthResponse>('/auth/register', userData);
    
    // Store token and user data
    if (response.token) {
      localStorage.setItem('authToken', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    
    return response;
  }

  /**
   * User logout
   */
  async logout(): Promise<void> {
    try {
      await apiService.postRequest('/auth/logout');
    } catch (error) {
      // Even if server logout fails, clear local storage
      console.warn('Server logout failed:', error);
    } finally {
      // Clear local storage
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      
      // Redirect to login page
      window.location.href = '/api/login';
    }
  }

  /**
   * Forgot password request
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const requestData: ForgotPasswordRequest = { email };
    return await apiService.postRequest('/auth/forgot-password', requestData);
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string, confirmPassword: string): Promise<{ message: string }> {
    const resetData: ResetPasswordRequest = { token, newPassword, confirmPassword };
    return await apiService.postRequest('/auth/reset-password', resetData);
  }

  /**
   * Verify authentication token
   */
  async verifyToken(): Promise<{ valid: boolean; user?: any }> {
    try {
      const response = await apiService.getRequest<{ user: any }>('/auth/verify');
      return { valid: true, user: response.user };
    } catch (error) {
      return { valid: false };
    }
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<AuthResponse> {
    const response = await apiService.postRequest<AuthResponse>('/auth/refresh');
    
    if (response.token) {
      localStorage.setItem('authToken', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    
    return response;
  }

  /**
   * Get current user from localStorage
   */
  getCurrentUser(): any | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const token = localStorage.getItem('authToken');
    return !!token;
  }

  /**
   * Get authentication token
   */
  getToken(): string | null {
    return localStorage.getItem('authToken');
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;