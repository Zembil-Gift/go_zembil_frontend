import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import Router from "@/components/Router";
import { queryClient } from "@/lib/queryClient";
import { AuthProvider } from "@/contexts/AuthContext";
import { GoogleMapsProvider } from "@/components/maps/GoogleMapsProvider";
import { useGuestCurrencyStore } from "@/stores/currency-store";

// Run guest currency detection immediately on module load (before first render)
// so that the very first API call already includes the X-Currency header.
useGuestCurrencyStore.getState().detectCurrency();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <GoogleMapsProvider>
          <TooltipProvider>
            <Router />
            <Toaster />
          </TooltipProvider>
        </GoogleMapsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
