import { apiService } from './apiService';

/**
 * Which order amount a campaign's percent is taken from. Either way the server
 * caps the basis at the real money paid — credits spent never earn cashback.
 */
export type CashbackBasis = 'SUBTOTAL' | 'ORDER_TOTAL';

/** One cashback campaign, as returned by GET /api/cashback. */
export interface CashbackCampaign {
  id: number;
  /** Campaign name. */
  code: string;
  enabled: boolean;
  /** Percent of the basis credited back (5 = 5%). */
  percent: number;
  basis: CashbackBasis;
  minOrderSubtotalMinor: number;
  maxCashbackMinor: number | null;
  startsAt: string | null;
  endsAt: string | null;
  perCustomerLimit: number | null;
  creditExpiryDays: number | null;
  description: string | null;
  imageUrl: string | null;
  /** Server-computed: enabled, in window, rate above zero, customer cap not hit. */
  activeNow: boolean;
}

export const cashbackService = {
  /**
   * Campaigns currently on offer to the caller. The server already filters out
   * expired, disabled and per-customer-exhausted campaigns.
   */
  getCampaigns: (): Promise<CashbackCampaign[]> =>
    apiService.getRequest<CashbackCampaign[]>('/api/cashback'),

  /**
   * Cashback promised to the caller but not yet spendable — it becomes wallet
   * balance once the order is delivered. Amount is in the caller's currency
   * (server converts from the stored currency via the X-Currency header).
   */
  getPending: (): Promise<{ pendingMinor: number; currencyCode: string | null }> =>
    apiService.getRequest<{ pendingMinor: number; currencyCode: string | null }>(
      '/api/cashback/pending'
    ),
};

/**
 * The best cashback an order of this size would earn, or undefined.
 * Mirrors the server's rule: the highest percent whose minimum the order clears.
 * Currency-agnostic — campaigns apply to any order currency.
 */
export function pickBestCashback(
  campaigns: CashbackCampaign[] | undefined,
  subtotalMinor: number
): CashbackCampaign | undefined {
  if (!campaigns?.length) return undefined;
  return campaigns
    .filter((c) => c.activeNow && subtotalMinor >= c.minOrderSubtotalMinor)
    .sort((a, b) => b.percent - a.percent)[0];
}

/**
 * What a campaign would pay back on an order, in minor units.
 *
 * ponytail: an estimate for a cart that has not paid yet, so it assumes the whole
 * order is paid in cash. The server caps the basis at the real money actually
 * paid, so a customer who then spends wallet credits earns less than this.
 */
export function cashbackForOrder(
  campaign: CashbackCampaign,
  basisMinor: number
): number {
  if (basisMinor <= 0 || campaign.percent <= 0) return 0;
  const amount = Math.round((basisMinor * campaign.percent) / 100);
  return campaign.maxCashbackMinor === null
    ? amount
    : Math.min(amount, campaign.maxCashbackMinor);
}
