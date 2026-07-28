import { apiService } from './apiService';

export type WalletTransactionType =
  | 'GRANT'
  | 'SPEND'
  | 'REFUND'
  | 'EXPIRY'
  | 'ADMIN_ADJUST';

export interface WalletBalance {
  /** Balance in minor units (santim/cents). Null when the wallet is not configured. */
  balanceMinor: number | null;
  currencyCode: string | null;
  /** When the soonest-expiring credits lapse, or null if nothing is due to expire. */
  nextExpiryAt: string | null;
  expiringSoonMinor: number | null;
}

export interface WalletTransaction {
  id: number;
  /** Positive for credits earned or returned, negative for spends and expiries. */
  amountMinor: number;
  type: WalletTransactionType;
  expiresAt: string | null;
  remainingMinor: number | null;
  orderType: string | null;
  orderId: number | null;
  note: string | null;
  createdAt: string;
}

export interface WalletTransactionPage {
  content: WalletTransaction[];
  number: number;
  size: number;
  totalPages: number;
  totalElements: number;
  first: boolean;
  last: boolean;
}

export const walletService = {
  getBalance: (): Promise<WalletBalance> =>
    apiService.getRequest<WalletBalance>('/api/wallet/balance'),

  getTransactions: (page = 0, size = 20): Promise<WalletTransactionPage> =>
    apiService.getRequest<WalletTransactionPage>(
      `/api/wallet/transactions?page=${page}&size=${size}`
    ),

  /**
   * Credits that would come off an order of this total, in the order's own
   * currency and after the coverage cap. Advisory: checkout debits atomically,
   * so the amount actually charged is settled at payment time.
   */
  getApplicable: (currencyCode: string, orderTotalMinor: number): Promise<number> =>
    apiService.getRequest<number>(
      `/api/wallet/applicable?currencyCode=${encodeURIComponent(
        currencyCode
      )}&orderTotalMinor=${Math.round(orderTotalMinor)}`
    ),
};

/**
 * Credits are stored in minor units; the currency helpers work in major units.
 * The backend treats minor units as hundredths everywhere (see
 * `PaymentContext.getPlatformFeeMinor`), so this matches it rather than using
 * per-currency decimals — change both together if a 0-decimal currency is added.
 */
export function minorToMajor(minor: number | null | undefined): number {
  return (minor ?? 0) / 100;
}
