import { useEffect, useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authService } from "@/services/authService";
import { tokenManager } from "@/services/tokenManager";

export function useAuth() {
  const queryClient = useQueryClient();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      try {
        await authService.initialize();
      } catch (error) {
        console.error('Failed to initialize auth:', error);
      } finally {
        setIsInitialized(true);
      }
    };
    initialize();
  }, []);

  useEffect(() => {
    const unsubscribe = tokenManager.subscribe((token, user) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    });
    return unsubscribe;
  }, [queryClient]);

  const hasToken = tokenManager.isAuthenticated();

  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      if (!tokenManager.isAuthenticated()) {
        return null;
      }

      try {
        return await authService.fetchCurrentUser();
      } catch (error) {
        // On error, try to get from tokenManager or localStorage
        const storedUser = tokenManager.getUser() || authService.getCurrentUser();
        return storedUser;
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: isInitialized && hasToken,
  });

  console.log('useAuth state:', { hasToken, user: !!user, isLoading, isInitialized, error: !!error });

  const logout = useMutation({
    mutationFn: async () => {
      queryClient.clear();
      await authService.logout();
      return Promise.resolve();
    },
  });

  const logoutAll = useMutation({
    mutationFn: async () => {
      queryClient.clear();
      await authService.logoutAll();
      return Promise.resolve();
    },
  });

  const login = useMutation({
    mutationFn: async () => {
      localStorage.setItem('returnTo', window.location.pathname + window.location.search);
      return Promise.resolve();
    },
  });

  // Get time until token expires
  const timeUntilExpiry = useCallback(() => {
    return tokenManager.getTimeUntilExpiry();
  }, []);

  return {
    user,
    isLoading: !isInitialized || isLoading,
    isAuthenticated: isInitialized && hasToken,
    logout: logout.mutate,
    logoutAll: logoutAll.mutate,
    login: login.mutate,
    isLoggingOut: logout.isPending,
    isLoggingIn: login.isPending,
    timeUntilExpiry,
  };
}
