import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { authService } from "@/services/authService";
import { tokenManager } from "@/services/tokenManager";

interface User {
  id: string;
  email: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
  role: string;
  emailVerified?: boolean;
  permissions?: string[];
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => void;
  logoutAll: () => void;
  refreshUser: () => Promise<void>;
  timeUntilExpiry: () => number;
  // Permission helpers
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (...permissions: string[]) => boolean;
  hasAllPermissions: (...permissions: string[]) => boolean;
  isSuperAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Global initialization state (shared across all components)
let globalInitPromise: Promise<boolean> | null = null;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(false);

  // Initialize auth - only once globally
  useEffect(() => {
    const initialize = async () => {
      // Use global promise to ensure initialization only happens once
      if (!globalInitPromise) {
        globalInitPromise = authService.initialize();
      }
      
      try {
        await globalInitPromise;
      } catch (error) {
        console.error('Failed to initialize auth:', error);
      }
      
      // After initialization, check token state
      const tokenExists = tokenManager.isAuthenticated();
      setHasToken(tokenExists);
      setIsInitialized(true);
      
      // If we have a token, fetch the user
      if (tokenExists) {
        await fetchUser();
      }
    };
    
    initialize();
  }, []);

  // Subscribe to token changes
  useEffect(() => {
    const unsubscribe = tokenManager.subscribe((_token, tokenUser) => {
      const tokenExists = tokenManager.isAuthenticated();
      setHasToken(tokenExists);
      
      if (tokenUser) {
        setUser(tokenUser as User);
      } else if (!tokenExists) {
        setUser(null);
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    });
    
    return unsubscribe;
  }, [queryClient]);

  const fetchUser = async () => {
    if (!tokenManager.isAuthenticated()) {
      setUser(null);
      return;
    }

    setIsLoadingUser(true);
    try {
      const currentUser = await authService.fetchCurrentUser();
      setUser(currentUser);
    } catch (error) {
      // On error, try to get from tokenManager or localStorage
      const storedUser = tokenManager.getUser() || authService.getCurrentUser();
      setUser(storedUser as User | null);
    } finally {
      setIsLoadingUser(false);
    }
  };

  const logout = useCallback(async () => {
    queryClient.clear();
    await authService.logout();
    setUser(null);
    setHasToken(false);
  }, [queryClient]);

  const logoutAll = useCallback(async () => {
    queryClient.clear();
    await authService.logoutAll();
    setUser(null);
    setHasToken(false);
  }, [queryClient]);

  const refreshUser = useCallback(async () => {
    await fetchUser();
  }, []);

  const timeUntilExpiry = useCallback(() => {
    return tokenManager.getTimeUntilExpiry();
  }, []);

  // Permission helper functions
  const hasPermission = useCallback((permission: string): boolean => {
    if (!user?.permissions) return false;
    return user.permissions.includes(permission);
  }, [user?.permissions]);

  const hasAnyPermission = useCallback((...permissions: string[]): boolean => {
    if (!user?.permissions) return false;
    return permissions.some(p => user.permissions?.includes(p));
  }, [user?.permissions]);

  const hasAllPermissions = useCallback((...permissions: string[]): boolean => {
    if (!user?.permissions) return false;
    return permissions.every(p => user.permissions?.includes(p));
  }, [user?.permissions]);

  const isSuperAdmin = useCallback((): boolean => {
    return user?.role === 'SUPER_ADMIN';
  }, [user?.role]);

  // Compute loading state
  const isLoading = !isInitialized || (hasToken && isLoadingUser);
  const isAuthenticated = isInitialized && hasToken;

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated,
    logout,
    logoutAll,
    refreshUser,
    timeUntilExpiry,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isSuperAdmin,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
