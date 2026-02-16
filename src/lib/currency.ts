import { apiService } from '@/services/apiService';

export interface CurrencyDto {
  id: number;
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
  isActive: boolean;
  isDefault: boolean;
}

export interface PriceData {
  id?: number;
  amount?: number;
  currencyCode?: string | null;
  currencyId?: number | null;
  active?: boolean;
}

const DEFAULT_CURRENCIES: Record<string, { symbol: string; decimalPlaces: number }> = {
  USD: { symbol: '$', decimalPlaces: 2 },
  ETB: { symbol: 'ETB ', decimalPlaces: 2 },
  EUR: { symbol: '€', decimalPlaces: 2 },
  GBP: { symbol: '£', decimalPlaces: 2 },
  KES: { symbol: 'KSh ', decimalPlaces: 2 },
};

let currencyCache: Map<string, CurrencyDto> | null = null;
let currencyCachePromise: Promise<Map<string, CurrencyDto>> | null = null;

async function fetchCurrencies(): Promise<Map<string, CurrencyDto>> {
  if (currencyCache) return currencyCache;
  if (currencyCachePromise) return currencyCachePromise;

  currencyCachePromise = apiService
    .getRequest<CurrencyDto[]>('/api/currencies')
    .then((currencies) => {
      currencyCache = new Map(currencies.map((c) => [c.code, c]));
      return currencyCache;
    })
    .catch(() => {
      currencyCachePromise = null;
      return new Map();
    });

  return currencyCachePromise;
}

function getCurrencySync(code: string): CurrencyDto | undefined {
  return currencyCache?.get(code.toUpperCase());
}

export function getCurrencyDecimals(currencyCode: string | undefined | null): number {
  if (!currencyCode) return 2;
  const code = currencyCode.toUpperCase();
  const cached = getCurrencySync(code);
  if (cached) return cached.decimalPlaces;
  return DEFAULT_CURRENCIES[code]?.decimalPlaces ?? 2;
}

export function getCurrencySymbol(currencyCode: string | undefined | null): string {
  if (!currencyCode) return 'ETB ';
  const code = currencyCode.toUpperCase();
  const cached = getCurrencySync(code);
  if (cached) return cached.symbol;
  return DEFAULT_CURRENCIES[code]?.symbol ?? `${code} `;
}

export function formatCurrency(amount: number | string, currency: string | undefined | null = 'USD'): string {
  const curr = currency || 'ETB';
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  const decimals = getCurrencyDecimals(curr);
  const symbol = getCurrencySymbol(curr);

  if (isNaN(numericAmount)) {
    return decimals === 0 ? `${symbol}0` : `${symbol}0.${'0'.repeat(decimals)}`;
  }

  if (decimals === 0) {
    return `${symbol}${Math.round(numericAmount).toLocaleString()}`;
  }

  return `${symbol}${numericAmount.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function formatPrice(amount: number | string, currency: string = 'USD'): string {
  return formatCurrency(amount, currency);
}

export function formatPriceFromDto(
  price: PriceData | null | undefined,
  fallbackCurrency: string = 'USD'
): string {
  if (!price) return formatCurrency(0, fallbackCurrency);
  const currencyCode = price.currencyCode || fallbackCurrency;
  return formatCurrency(price.amount ?? 0, currencyCode);
}

/** Get the numeric price amount from a PriceData DTO (in major units). */
export function getPriceAmount(price: PriceData | null | undefined): number {
  return price?.amount ?? 0;
}

export function getPriceCurrency(price: PriceData | null | undefined, fallback: string = 'USD'): string {
  return price?.currencyCode || fallback;
}

export interface PriceParts {
  symbol: string;
  whole: string;
  decimal: string;
  formatted: string;
}

/** Get individual parts of a formatted price for custom display. */
export function getPriceParts(amount: number | string, currency: string = 'USD'): PriceParts {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  const symbol = getCurrencySymbol(currency);
  const decimals = getCurrencyDecimals(currency);

  if (isNaN(numericAmount)) {
    return {
      symbol,
      whole: '0',
      decimal: decimals === 0 ? '' : '0'.repeat(decimals),
      formatted: decimals === 0 ? `${symbol}0` : `${symbol}0.${'0'.repeat(decimals)}`,
    };
  }

  if (decimals === 0) {
    const whole = Math.round(numericAmount).toLocaleString();
    return { symbol, whole, decimal: '', formatted: `${symbol}${whole}` };
  }

  const whole = Math.floor(numericAmount).toLocaleString();
  const decimalPart = (numericAmount % 1).toFixed(decimals).substring(2);
  const decimal = decimalPart && !decimalPart.match(/^0+$/) ? decimalPart : '';

  return {
    symbol,
    whole,
    decimal,
    formatted: decimal ? `${symbol}${whole}.${decimal}` : `${symbol}${whole}`,
  };
}

/** Get discount amount in major units from backend validation results. */
export function getDiscountAmountForDisplay(
  discountResult: {
    applicable: boolean;
    discountAmount?: number;
    discountAmountMinor?: number;
    currency?: string;
  } | null | undefined,
  targetCurrency: string
): number {
  if (!discountResult?.applicable) return 0;
  if (discountResult.discountAmount != null) return discountResult.discountAmount;
  if (discountResult.discountAmountMinor) {
    const currency = discountResult.currency || targetCurrency;
    return discountResult.discountAmountMinor / Math.pow(10, getCurrencyDecimals(currency));
  }
  return 0;
}

/** Calculate discounted price using backend-provided discount data (all values in major units). */
export function calculateDiscountedPrice(
  originalPrice: number,
  _targetCurrency: string,
  discount?: {
    discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
    discountPercentage?: number;
    fixedAmount?: number;
    fixedAmountMinor?: number;
    currency?: string;
    maxDiscountAmount?: number;
    maxDiscountAmountMinor?: number;
  } | null
): number {
  if (!discount) return originalPrice;

  if (discount.discountType === 'PERCENTAGE' && discount.discountPercentage) {
    let discountedPrice = originalPrice * (1 - discount.discountPercentage / 100);

    const maxDiscount = discount.maxDiscountAmount
      ?? (discount.maxDiscountAmountMinor != null && discount.currency
          ? discount.maxDiscountAmountMinor / Math.pow(10, getCurrencyDecimals(discount.currency))
          : null);

    if (maxDiscount != null) {
      const actualDiscount = originalPrice - discountedPrice;
      if (actualDiscount > maxDiscount) {
        discountedPrice = originalPrice - maxDiscount;
      }
    }

    return discountedPrice;
  }

  if (discount.discountType === 'FIXED_AMOUNT') {
    const fixedDiscount = discount.fixedAmount
      ?? (discount.fixedAmountMinor != null && discount.currency
          ? discount.fixedAmountMinor / Math.pow(10, getCurrencyDecimals(discount.currency))
          : 0);
    return Math.max(0, originalPrice - fixedDiscount);
  }

  return originalPrice;
}

export async function initCurrencies(): Promise<void> {
  await fetchCurrencies();
}

/** Convert major units to minor units for API requests. */
export function toMinorUnits(amount: number, currencyCode: string): number {
  const decimals = getCurrencyDecimals(currencyCode);
  const multiplier = Math.pow(10, decimals);
  return Math.round(amount * multiplier);
}

export { fetchCurrencies };
