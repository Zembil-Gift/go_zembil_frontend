import { apiService } from './apiService';
import { tokenManager } from './tokenManager';

// Types for authentication
export interface LoginRequest {
  emailOrPhone: string;
  password: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  password: string;
  username: string;
  role: 'CUSTOMER' | 'VENDOR' | 'ADMIN';
  birthDate?: string;
  preferredCurrencyCode?: string;
  country?: string;
}

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    phoneNumber: string;
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
    role: string;
    preferredCurrencyCode?: string;
    country?: string;
    emailVerified?: boolean;
    hasPassword?: boolean;
  };
  expiresIn: number;
  requiresEmailVerification?: boolean;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

// OAuth2 Types
export type OAuth2Provider = 'GOOGLE' | 'FACEBOOK';

export interface OAuth2LoginRequest {
  accessToken: string;
  provider: OAuth2Provider;
}

// Email Verification Types
export interface SendOtpRequest {
  email: string;
}

export interface VerifyOtpRequest {
  email: string;
  otpCode: string;
}

export interface OtpResponse {
  success: boolean;
  message: string;
  email?: string;
  expiresInSeconds?: number;
}

export interface VerificationStatusResponse {
  email: string;
  emailVerified: boolean;
  message: string;
}

// Authentication service
class AuthService {
  /**
   * Initialize the auth service - call on app startup
   */
  async initialize(): Promise<boolean> {
    return tokenManager.initialize();
  }

  /**
   * User login
   */
  async login(emailOrPhone: string, password: string): Promise<AuthResponse> {
    const loginData: LoginRequest = { emailOrPhone, password };
    const response = await apiService.postRequest<AuthResponse>('/auth/login', loginData);

    // Store token in memory (not localStorage) using tokenManager
    if (response.accessToken) {
      // Normalize user object (backend might use 'userId' instead of 'id')
      const normalizedUser = {
        ...response.user,
        id: response.user.id || (response.user as any).userId,
      };
      
      // Set token in memory with expiration tracking
      tokenManager.setTokenData(response.accessToken, response.expiresIn, normalizedUser);
    }
    
    return response;
  }

  /**
   * OAuth2 login/signup (Google or Facebook)
   */
  async loginWithOAuth2(accessToken: string, provider: OAuth2Provider): Promise<AuthResponse> {
    const loginData: OAuth2LoginRequest = { accessToken, provider };
    const response = await apiService.postRequest<AuthResponse>('/auth/oauth2/login', loginData);

    // Store token in memory using tokenManager
    if (response.accessToken) {
      const normalizedUser = {
        ...response.user,
        id: response.user.id || (response.user as any).userId,
      };
      console.log('OAuth2 Login response user:', response.user);
      console.log('Normalized user:', normalizedUser);
      
      // Set token in memory with expiration tracking
      tokenManager.setTokenData(response.accessToken, response.expiresIn, normalizedUser);
    }
    
    return response;
  }

  /**
   * User registration
   */
  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await apiService.postRequest<AuthResponse>('/api/users/register', userData);
    
    // Store token in memory using tokenManager
    if (response.accessToken) {
      const normalizedUser = {
        ...response.user,
        id: response.user.id || (response.user as any).userId,
      };
      
      tokenManager.setTokenData(response.accessToken, response.expiresIn, normalizedUser);
    }
    
    return response;
  }

  /**
   * User logout
   */
  async logout(): Promise<void> {
    await tokenManager.logout();
    // Redirect to login page
    window.location.href = '/signin';
  }

  /**
   * Logout from all sessions
   */
  async logoutAll(): Promise<void> {
    await tokenManager.logoutAll();
    window.location.href = '/signin';
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
   * Note: This is now handled automatically by the tokenManager
   */
  async refreshToken(): Promise<AuthResponse> {
    const success = await tokenManager.refreshAccessToken();
    if (!success) {
      throw new Error('Failed to refresh token');
    }
    
    const user = tokenManager.getUser();
    const accessToken = tokenManager.getAccessToken();
    
    return {
      accessToken: accessToken || '',
      expiresIn: tokenManager.getTimeUntilExpiry(),
      user: user as any,
    };
  }

  /**
   * Get current user from memory/localStorage
   */
  getCurrentUser(): any | null {
    // First try from tokenManager (memory)
    const user = tokenManager.getUser();
    if (user) {
      return user;
    }
    // Fallback to localStorage for initial load
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }


  async fetchCurrentUser(): Promise<any> {
    try {
      const response = await apiService.getRequest<any>('/api/users/me');
      // Normalize user object (backend might use 'userId' instead of 'id')
      const normalizedUser = {
        ...response,
        id: response.id || response.userId,
      };
      // Update local storage with fresh data
      localStorage.setItem('user', JSON.stringify(normalizedUser));
      return normalizedUser;
    } catch (error: any) {
      console.error('Failed to fetch current user:', error);
      throw error;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return tokenManager.isAuthenticated();
  }

  /**
   * Get authentication token
   */
  getToken(): string | null {
    return tokenManager.getAccessToken();
  }

  /**
   * Get time until token expires in seconds
   */
  getTimeUntilExpiry(): number {
    return tokenManager.getTimeUntilExpiry();
  }

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(callback: (token: string | null, user: any) => void): () => void {
    return tokenManager.subscribe(callback);
  }

  // ==================== Email Verification Methods ====================

  /**
   * Send OTP to email for verification
   */
  async sendVerificationOtp(email: string): Promise<OtpResponse> {
    const request: SendOtpRequest = { email };
    return await apiService.postRequest<OtpResponse>('/auth/email-verification/send-otp', request);
  }

  /**
   * Verify OTP code
   */
  async verifyOtp(email: string, otpCode: string): Promise<AuthResponse> {
    const request: VerifyOtpRequest = { email, otpCode };
    const response = await apiService.postRequest<AuthResponse>('/auth/email-verification/verify-otp', request);

    // Store token on successful verification
    if (response.accessToken) {
      const normalizedUser = {
        ...response.user,
        id: response.user.id || (response.user as any).userId,
      };
      tokenManager.setTokenData(response.accessToken, response.expiresIn, normalizedUser);
    }

    return response;
  }

  /**
   * Resend OTP to email
   */
  async resendVerificationOtp(email: string): Promise<OtpResponse> {
    const request: SendOtpRequest = { email };
    return await apiService.postRequest<OtpResponse>('/auth/email-verification/resend-otp', request);
  }

  /**
   * Check email verification status
   */
  async checkVerificationStatus(email: string): Promise<VerificationStatusResponse> {
    return await apiService.getRequest<VerificationStatusResponse>(
      `/auth/email-verification/status?email=${encodeURIComponent(email)}`
    );
  }

  /**
   * Get remaining time for active OTP
   */
  async getOtpRemainingTime(email: string): Promise<{ hasActiveOtp: boolean; remainingSeconds: number }> {
    return await apiService.getRequest<{ hasActiveOtp: boolean; remainingSeconds: number }>(
      `/auth/email-verification/otp-status?email=${encodeURIComponent(email)}`
    );
  }
}


export const authService = new AuthService();
export default authService;