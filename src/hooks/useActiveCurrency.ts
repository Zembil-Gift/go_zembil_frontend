import { useRouteLoaderData } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import { useGuestCurrencyStore } from '@/stores/currency-store';
import type { Prefs } from '@/lib/prefs';

export function useActiveCurrency(): string {
  const { user } = useAuth();
  const guestCurrency = useGuestCurrencyStore((s) => s.guestCurrencyCode);
  // On the server the guest store is never written (it is shared by every
  // request); the root loader's per-request currency stands in for it, so
  // server and browser key their price queries identically.
  const ssrCurrency = useRouteLoaderData<{ currency?: Prefs['currency'] }>('root')?.currency;

  return user?.preferredCurrencyCode ?? guestCurrency ?? ssrCurrency ?? 'default';
}
