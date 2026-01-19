/**
 * TokenAuthManager - Manages access tokens in memory with automatic refresh
 * 
 * Security Features:
 * - Access tokens stored in memory only (not localStorage)
 * - Refresh tokens stored in HttpOnly cookies (handled by browser)
 * - Automatic token refresh before expiration
 * - Retry failed requests after token refresh
 * - Token expiration tracking
 * 
 * @example
 * // Initialize on app start
 * await tokenManager.initialize();
 * 
 * // Get current access token for API calls
 * const token = tokenManager.getAccessToken();
 * 
 * // Manually trigger refresh if needed
 * await tokenManager.refreshAccessToken();
 */

import api from './api';

// Token refresh buffer - refresh this many seconds before expiry
const REFRESH_BUFFER_SECONDS = 120; // 2 minutes before expiry

// Minimum interval between refresh attempts to prevent rapid loops
const MIN_REFRESH_INTERVAL_MS = 5000; // 5 seconds

interface TokenData {
  accessToken: string;
  expiresAt: number; // Unix timestamp in milliseconds
  user: {
    id: string;
    email: string;
    phoneNumber: string;
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
    role: string;
  };
}

interface RefreshResponse {
  accessToken: string;
  expiresIn: number; // Seconds until expiry
  user: {
    id: string;
    email: string;
    phoneNumber: string;
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
    role: string;
  };
}

type TokenChangeListener = (token: string | null, user: TokenData['user'] | null) => void;

class TokenAuthManager {
  private tokenData: TokenData | null = null;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private isRefreshing = false;
  private refreshPromise: Promise<boolean> | null = null;
  private lastRefreshAttempt = 0;
  private listeners: Set<TokenChangeListener> = new Set();
  private initialized = false;

  /**
   * Initialize the token manager.
   * Attempts to refresh the token if a refresh cookie exists.
   * Call this on app startup.
   */
  async initialize(): Promise<boolean> {
    if (this.initialized) {
      return this.isAuthenticated();
    }

    this.initialized = true;

    // Try to get a new access token using the refresh token cookie
    // The cookie is sent automatically with credentials: 'include'
    try {
      const success = await this.refreshAccessToken();
      return success;
    } catch (error) {
      console.log('TokenAuthManager: No valid session found');
      return false;
    }
  }

  /**
   * Set token data after successful login.
   * This should be called after login/OAuth2 login.
   */
  setTokenData(accessToken: string, expiresIn: number, user: TokenData['user']): void {
    const expiresAt = Date.now() + (expiresIn * 1000);
    
    this.tokenData = {
      accessToken,
      expiresAt,
      user,
    };

    // Store user in localStorage for UI access (not sensitive)
    localStorage.setItem('user', JSON.stringify(user));
    
    // Schedule refresh before expiry
    this.scheduleRefresh();
    
    // Notify listeners
    this.notifyListeners();
    
    console.log('TokenAuthManager: Token set, expires at', new Date(expiresAt).toISOString());
  }

  /**
   * Get the current access token.
   * Returns null if not authenticated or token expired.
   */
  getAccessToken(): string | null {
    if (!this.tokenData) {
      return null;
    }

    // Check if token is expired (with buffer)
    if (this.isTokenExpired()) {
      console.log('TokenAuthManager: Token expired');
      return null;
    }

    return this.tokenData.accessToken;
  }

  /**
   * Get the current user data.
   */
  getUser(): TokenData['user'] | null {
    return this.tokenData?.user ?? null;
  }

  /**
   * Check if the user is authenticated.
   */
  isAuthenticated(): boolean {
    return this.getAccessToken() !== null;
  }

  /**
   * Check if the token is expired or about to expire.
   */
  isTokenExpired(bufferSeconds: number = 0): boolean {
    if (!this.tokenData) {
      return true;
    }
    const bufferMs = bufferSeconds * 1000;
    return Date.now() >= (this.tokenData.expiresAt - bufferMs);
  }

  /**
   * Get time until token expires in seconds.
   */
  getTimeUntilExpiry(): number {
    if (!this.tokenData) {
      return 0;
    }
    return Math.max(0, Math.floor((this.tokenData.expiresAt - Date.now()) / 1000));
  }

  /**
   * Refresh the access token using the refresh token cookie.
   * Returns true if successful, false otherwise.
   */
  async refreshAccessToken(): Promise<boolean> {
    // Prevent concurrent refresh attempts
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    // Prevent rapid refresh attempts
    const now = Date.now();
    if (now - this.lastRefreshAttempt < MIN_REFRESH_INTERVAL_MS) {
      console.log('TokenAuthManager: Refresh throttled');
      return this.isAuthenticated();
    }
    this.lastRefreshAttempt = now;

    this.isRefreshing = true;
    this.refreshPromise = this.doRefresh();

    try {
      return await this.refreshPromise;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  private async doRefresh(): Promise<boolean> {
    try {
      console.log('TokenAuthManager: Refreshing token...');
      
      // Call refresh endpoint - the refresh token is in HttpOnly cookie
      const response = await api.post<RefreshResponse>('/auth/refresh', {}, {
        // Don't include auth header for refresh - we use the cookie
        headers: { Authorization: undefined },
      });

      const { accessToken, expiresIn, user } = response.data;

      // Normalize user object
      const normalizedUser = {
        ...user,
        id: user.id || (user as any).userId,
      };

      this.setTokenData(accessToken, expiresIn, normalizedUser);
      
      console.log('TokenAuthManager: Token refreshed successfully');
      return true;
    } catch (error: any) {
      console.error('TokenAuthManager: Refresh failed', error?.response?.status);
      
      // Clear token data on refresh failure
      this.clearTokenData();
      
      return false;
    }
  }

  /**
   * Clear all token data and cancel scheduled refresh.
   * Call this on logout.
   */
  clearTokenData(): void {
    this.tokenData = null;
    localStorage.removeItem('user');
    
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    
    this.notifyListeners();
    console.log('TokenAuthManager: Token cleared');
  }

  /**
   * Logout - clear tokens and call logout endpoint.
   */
  async logout(): Promise<void> {
    try {
      // Call logout endpoint to revoke refresh token
      await api.post('/auth/logout');
    } catch (error) {
      console.warn('TokenAuthManager: Logout request failed', error);
    } finally {
      this.clearTokenData();
    }
  }

  /**
   * Logout from all sessions.
   */
  async logoutAll(): Promise<void> {
    try {
      await api.post('/auth/logout-all');
    } catch (error) {
      console.warn('TokenAuthManager: Logout all failed', error);
    } finally {
      this.clearTokenData();
    }
  }

  /**
   * Subscribe to token changes.
   * Returns an unsubscribe function.
   */
  subscribe(listener: TokenChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const token = this.getAccessToken();
    const user = this.getUser();
    this.listeners.forEach(listener => listener(token, user));
  }

  /**
   * Schedule automatic token refresh before expiry.
   */
  private scheduleRefresh(): void {
    // Clear existing timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    if (!this.tokenData) {
      return;
    }

    // Calculate time until refresh (REFRESH_BUFFER_SECONDS before expiry)
    const timeUntilRefresh = this.tokenData.expiresAt - Date.now() - (REFRESH_BUFFER_SECONDS * 1000);
    
    if (timeUntilRefresh <= 0) {
      // Token already expired or about to expire, refresh immediately
      console.log('TokenAuthManager: Token expiring soon, refreshing now');
      this.refreshAccessToken();
      return;
    }

    console.log(`TokenAuthManager: Scheduling refresh in ${Math.floor(timeUntilRefresh / 1000)}s`);
    
    this.refreshTimer = setTimeout(() => {
      this.refreshAccessToken();
    }, timeUntilRefresh);
  }

  /**
   * Ensure we have a valid token, refreshing if necessary.
   * Use this before making API calls that require authentication.
   */
  async ensureValidToken(): Promise<string | null> {
    // If token is valid and not near expiry, return it
    if (!this.isTokenExpired(REFRESH_BUFFER_SECONDS)) {
      return this.getAccessToken();
    }

    // Try to refresh
    const success = await this.refreshAccessToken();
    return success ? this.getAccessToken() : null;
  }
}

// Export singleton instance
export const tokenManager = new TokenAuthManager();

// Export class for testing
export { TokenAuthManager };
