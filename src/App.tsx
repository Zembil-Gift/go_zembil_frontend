import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import Router from "@/components/Router";
import { queryClient } from "@/lib/queryClient";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/hooks/useAuth";
import { useGuestCurrencyStore } from "@/stores/currency-store";
import PwaUpdatePrompt from "@/components/PwaUpdatePrompt";
import {
  initAnalytics,
  identifyUser,
  clearUserIdentity,
} from "@/lib/analytics";
import { useEffect } from "react";
// Run guest currency detection immediately on module load (before first render)
// so that the very first API call already includes the X-Currency header.
useGuestCurrencyStore.getState().detectCurrency();

initAnalytics();

// Syncs the GA4 user identity with the authenticated user so events can be
// segmented by role/currency/country. Must live inside AuthProvider.
function AnalyticsIdentity() {
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      identifyUser({
        id: user.id,
        role: user.role,
        preferredCurrencyCode: user.preferredCurrencyCode,
        country: user.country,
      });
    } else {
      clearUserIdentity();
    }
  }, [isAuthenticated, user]);

  return null;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AnalyticsIdentity />
        <TooltipProvider>
          <Router />
          <Toaster />
          <PwaUpdatePrompt />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
