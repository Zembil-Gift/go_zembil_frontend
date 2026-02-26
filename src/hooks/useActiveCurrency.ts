import { useAuth } from '@/contexts/AuthContext';
import { useGuestCurrencyStore } from '@/stores/currency-store';


export function useActiveCurrency(): string {
  const { user } = useAuth();
  const guestCurrency = useGuestCurrencyStore((s) => s.guestCurrencyCode);

  return user?.preferredCurrencyCode ?? guestCurrency ?? 'default';
}
