import { apiService } from "./apiService";

/** One free-gift tier (campaign), as returned by GET /api/free-gift. */
export interface FreeGiftTier {
  id: number;
  /** Campaign name. */
  code: string;
  enabled: boolean;
  thresholdAmountMinor: number;
  currencyCode: string;
  startsAt: string | null;
  endsAt: string | null;
  giftProductId: number | null;
  giftProductName: string | null;
  giftProductCover: string | null;
  giftStock: number | null;
  perCustomerLimit: number | null;
  description: string | null;
  imageUrl: string | null;
  /** Server-computed: enabled, in window, product set, stock left, customer cap not hit. */
  activeNow: boolean;
}

export const freeGiftService = {
  /**
   * Tiers currently on offer to the caller. The server already filters out
   * expired, sold-out, and per-customer-exhausted tiers.
   */
  getFreeGiftTiers(): Promise<FreeGiftTier[]> {
    return apiService.getRequest<FreeGiftTier[]>("/api/free-gift");
  },
};

/**
 * The best gift the cart has unlocked, or undefined. Mirrors the server's
 * checkout rule: the richest threshold the subtotal clears wins.
 *
 * ponytail: only compares when the cart currency matches the tier's currency —
 * fail-safe (never falsely promise a gift across currencies). Upgrade path: FX
 * conversion, or a backend eligibility endpoint.
 */
export function pickUnlockedGift(
  tiers: FreeGiftTier[] | undefined,
  subtotalMinor: number,
  cartCurrency: string | undefined
): FreeGiftTier | undefined {
  if (!tiers?.length || !cartCurrency) return undefined;
  return tiers
    .filter(
      (t) =>
        t.activeNow &&
        t.currencyCode === cartCurrency &&
        subtotalMinor >= t.thresholdAmountMinor
    )
    .sort((a, b) => b.thresholdAmountMinor - a.thresholdAmountMinor)[0];
}
