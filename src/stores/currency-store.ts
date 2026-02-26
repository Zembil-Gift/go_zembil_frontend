import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { detectGuestCurrency } from '@/lib/detectGuestCurrency';

const STORAGE_KEY = 'guest-currency';
const DETECTION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // Re-detect after 7 days

interface GuestCurrencyStore {
  guestCurrencyCode: string | null;

  detectedAt: number | null;

  detectCurrency: (force?: boolean) => void;

  setGuestCurrency: (code: string) => void;

  clearGuestCurrency: () => void;
}

export const useGuestCurrencyStore = create<GuestCurrencyStore>()(
  persist(
    (set, get) => ({
      guestCurrencyCode: null,
      detectedAt: null,

      detectCurrency: (force = false) => {
        const { detectedAt } = get();
        const isStale = !detectedAt || (Date.now() - detectedAt > DETECTION_TTL_MS);

        if (!isStale && !force) return;

        const currency = detectGuestCurrency();
        set({
          guestCurrencyCode: currency,
          detectedAt: Date.now(),
        });
      },

      setGuestCurrency: (code: string) => {
        set({
          guestCurrencyCode: code,
          detectedAt: Date.now(),
        });
      },

      clearGuestCurrency: () => {
        set({
          guestCurrencyCode: null,
          detectedAt: null,
        });
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
    }
  )
);


export function getGuestCurrencyCode(): string | null {
  return useGuestCurrencyStore.getState().guestCurrencyCode;
}
