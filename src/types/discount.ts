export interface DiscountInfo {
  discountId: number;
  code: string;
  name: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountPercentage?: number;
  fixedAmountMinor?: number;
  fixedAmount?: number;
  currency?: string;
  currencyCode?: string;
  maxDiscountAmountMinor?: number;
  maxDiscountAmount?: number;
  displayCurrencyCode?: string;
  validUntil?: string;
  usageLimit?: number;
  usageCount?: number;
  remainingUses?: number;
}
