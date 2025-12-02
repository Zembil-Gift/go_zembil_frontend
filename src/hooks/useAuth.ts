import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {authService} from "@/services/authService";

export function useAuth() {
  const queryClient = useQueryClient();
  
  const hasToken = authService.isAuthenticated();
  
  console.log('=== useAuth Hook ===');
  console.log('hasToken (sync check):', hasToken);
  
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      if (!authService.isAuthenticated()) {
        return null;
      }

      try {
          return await authService.fetchCurrentUser();
      } catch (error) {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            return JSON.parse(storedUser);
          } catch {
            return null;
          }
        }
        return null;
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: hasToken,
  });

  console.log('useAuth state:', { hasToken, user: !!user, isLoading, error: !!error });

  const logout = useMutation({
    mutationFn: async () => {
      queryClient.clear();
      await authService.logout();
      return Promise.resolve();
    },
  });

  const login = useMutation({
    mutationFn: async () => {
      localStorage.setItem('returnTo', window.location.pathname + window.location.search);
      return Promise.resolve();
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: hasToken, // Use synchronous token check
    logout: logout.mutate,
    login: login.mutate,
    isLoggingOut: logout.isPending,
    isLoggingIn: login.isPending,
  };
}
