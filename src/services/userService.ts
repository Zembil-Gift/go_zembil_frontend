import { apiService } from './apiService';

// Types for user management
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  profileImageUrl?: string;
  role: 'customer' | 'vendor' | 'admin' | 'delivery';
  isActive: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  addresses: Address[];
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface Address {
  id: number;
  type: 'home' | 'work' | 'other';
  isDefault: boolean;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

export interface UserPreferences {
  currency: 'ETB' | 'USD';
  language: 'en' | 'am';
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
    marketing: boolean;
  };
  privacy: {
    profileVisible: boolean;
    showOrderHistory: boolean;
  };
}

export interface UpdateUserProfileRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  profileImageUrl?: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UpdatePreferencesRequest {
  currency?: 'ETB' | 'USD';
  language?: 'en' | 'am';
  notifications?: {
    email?: boolean;
    sms?: boolean;
    push?: boolean;
    marketing?: boolean;
  };
  privacy?: {
    profileVisible?: boolean;
    showOrderHistory?: boolean;
  };
}

export interface CreateAddressRequest {
  type: 'home' | 'work' | 'other';
  isDefault?: boolean;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
  usersByRole: {
    [key: string]: number;
  };
  usersByCountry: {
    country: string;
    count: number;
  }[];
}

// User service
class UserService {
  /**
   * Get user profile
   */
  async getUserProfile(): Promise<User> {
    return await apiService.getRequest<User>('/users/profile');
  }

  /**
   * Get user by ID (admin only)
   */
  async getUserById(userId: string): Promise<User> {
    return await apiService.getRequest<User>(`/users/${userId}`);
  }

  /**
   * Update user profile
   */
  async updateUserProfile(data: UpdateUserProfileRequest): Promise<User> {
    return await apiService.putRequest<User>('/users/profile', data);
  }

  /**
   * Change password
   */
  async changePassword(oldPassword: string, newPassword: string, confirmPassword: string): Promise<{ message: string }> {
    const data: ChangePasswordRequest = { oldPassword, newPassword, confirmPassword };
    return await apiService.putRequest('/users/change-password', data);
  }

  /**
   * Update user preferences
   */
  async updatePreferences(preferences: UpdatePreferencesRequest): Promise<UserPreferences> {
    return await apiService.putRequest<UserPreferences>('/users/preferences', preferences);
  }

  /**
   * Upload profile image
   */
  async uploadProfileImage(file: File): Promise<{ imageUrl: string }> {
    const formData = new FormData();
    formData.append('image', file);
    
    // Note: This would need special handling for FormData in apiService
    return await apiService.postRequest('/users/upload-image', formData);
  }

  /**
   * Delete user account
   */
  async deleteAccount(password: string): Promise<{ message: string }> {
    return await apiService.postRequest('/users/delete-account', { password });
  }

  /**
   * Get user addresses
   */
  async getUserAddresses(): Promise<Address[]> {
    return await apiService.getRequest<Address[]>('/users/addresses');
  }

  /**
   * Add new address
   */
  async addAddress(address: CreateAddressRequest): Promise<Address> {
    return await apiService.postRequest<Address>('/users/addresses', address);
  }

  /**
   * Update address
   */
  async updateAddress(addressId: number, address: Partial<CreateAddressRequest>): Promise<Address> {
    return await apiService.putRequest<Address>(`/users/addresses/${addressId}`, address);
  }

  /**
   * Delete address
   */
  async deleteAddress(addressId: number): Promise<{ message: string }> {
    return await apiService.deleteRequest(`/users/addresses/${addressId}`);
  }

  /**
   * Set default address
   */
  async setDefaultAddress(addressId: number): Promise<{ message: string }> {
    return await apiService.putRequest(`/users/addresses/${addressId}/default`);
  }

  /**
   * Verify email
   */
  async verifyEmail(token: string): Promise<{ message: string }> {
    return await apiService.postRequest('/users/verify-email', { token });
  }

  /**
   * Resend email verification
   */
  async resendEmailVerification(): Promise<{ message: string }> {
    return await apiService.postRequest('/users/resend-verification');
  }

  /**
   * Verify phone number
   */
  async verifyPhone(code: string): Promise<{ message: string }> {
    return await apiService.postRequest('/users/verify-phone', { code });
  }

  /**
   * Send phone verification code
   */
  async sendPhoneVerification(): Promise<{ message: string }> {
    return await apiService.postRequest('/users/send-phone-verification');
  }

  /**
   * Get all users (admin only)
   */
  async getAllUsers(
    page: number = 1, 
    limit: number = 20, 
    role?: User['role'],
    isActive?: boolean
  ): Promise<{ users: User[]; total: number; page: number; totalPages: number }> {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('limit', limit.toString());
    if (role) queryParams.append('role', role);
    if (isActive !== undefined) queryParams.append('isActive', isActive.toString());
    
    return await apiService.getRequest(`/users/all?${queryParams.toString()}`);
  }

  /**
   * Search users (admin only)
   */
  async searchUsers(
    query: string, 
    page: number = 1, 
    limit: number = 20
  ): Promise<{ users: User[]; total: number; page: number; totalPages: number }> {
    const queryParams = new URLSearchParams();
    queryParams.append('q', query);
    queryParams.append('page', page.toString());
    queryParams.append('limit', limit.toString());
    
    return await apiService.getRequest(`/users/search?${queryParams.toString()}`);
  }

  /**
   * Update user status (admin only)
   */
  async updateUserStatus(userId: string, isActive: boolean): Promise<User> {
    return await apiService.putRequest<User>(`/users/${userId}/status`, { isActive });
  }

  /**
   * Update user role (admin only)
   */
  async updateUserRole(userId: string, role: User['role']): Promise<User> {
    return await apiService.putRequest<User>(`/users/${userId}/role`, { role });
  }

  /**
   * Get user statistics (admin only)
   */
  async getUserStats(): Promise<UserStats> {
    return await apiService.getRequest<UserStats>('/users/stats');
  }

  /**
   * Export users (admin only)
   */
  async exportUsers(format: 'csv' | 'excel' = 'csv'): Promise<Blob> {
    const queryParams = new URLSearchParams();
    queryParams.append('format', format);
    
    // This would need special handling for blob response
    return await apiService.getRequest<Blob>(`/users/export?${queryParams.toString()}`);
  }

  /**
   * Get user activity log (admin only)
   */
  async getUserActivityLog(
    userId: string, 
    page: number = 1, 
    limit: number = 20
  ): Promise<{
    activities: {
      id: number;
      action: string;
      description: string;
      ipAddress: string;
      userAgent: string;
      createdAt: string;
    }[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('limit', limit.toString());
    
    return await apiService.getRequest(`/users/${userId}/activity?${queryParams.toString()}`);
  }
}

// Export singleton instance
export const userService = new UserService();
export default userService;