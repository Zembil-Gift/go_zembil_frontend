import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MockApiService } from "@/services/mockApiService";

export function useAuth() {
  const queryClient = useQueryClient();
  
  // Use mock API service instead of real API calls
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: () => MockApiService.getCurrentUser(),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const logout = useMutation({
    mutationFn: async () => {
      // Clear all cached data first
      queryClient.clear();
      // Use mock logout
      await MockApiService.logout();
      return Promise.resolve();
    },
  });

  const login = useMutation({
    mutationFn: async () => {
      // Store current location for return after login
      localStorage.setItem('returnTo', window.location.pathname + window.location.search);
      // Use mock login
      const result = await MockApiService.login();
      return result;
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !error,
    logout: logout.mutate,
    login: login.mutate,
    isLoggingOut: logout.isPending,
    isLoggingIn: login.isPending,
  };
}
