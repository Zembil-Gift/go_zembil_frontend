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
  unitAmountMinor?: number;
  amount?: number;        // Backend provides this in major units - USE THIS FOR DISPLAY
  currencyCode?: string | null;
  currencyId?: number | null;
  useExchangeRate?: boolean;
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

/**
 * Format a price amount (in MAJOR units) for display.
 * IMPORTANT: The amount should already be in major units (e.g., 100.50 for $100.50).
 * DO NOT pass minor units to this function - the backend provides amounts in major units.
 */
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

/**
 * Format a price amount (in MAJOR units) for display.
 * Alias for formatCurrency.
 */
export function formatPrice(amount: number | string, currency: string = 'USD'): string {
  return formatCurrency(amount, currency);
}

/**
 * Format a price from a PriceData DTO.
 * Uses the backend-provided 'amount' field (in major units) directly.
 * NO CONVERSION IS DONE - the backend has already converted to the preferred currency.
 */
export function formatPriceFromDto(
  price: PriceData | null | undefined,
  fallbackCurrency: string = 'USD'
): string {
  if (!price) return formatCurrency(0, fallbackCurrency);
  const currencyCode = price.currencyCode || fallbackCurrency;
  
  // IMPORTANT: Backend provides 'amount' in major units - use it directly!
  // Only fall back to unitAmountMinor conversion if amount is missing (legacy support)
  if (price.amount != null) {
    return formatCurrency(price.amount, currencyCode);
  }
  
  // DEPRECATED: Legacy fallback for old data without 'amount' field
  console.warn('formatPriceFromDto: amount field missing, falling back to unitAmountMinor conversion. This should not happen with updated backend.');
  const amount = price.unitAmountMinor != null ? price.unitAmountMinor / Math.pow(10, getCurrencyDecimals(currencyCode)) : 0;
  return formatCurrency(amount, currencyCode);
}

/**
 * Get the numeric price amount from a PriceData DTO.
 * Uses the backend-provided 'amount' field (in major units) directly.
 * NO CONVERSION IS DONE - the backend has already converted to the preferred currency.
 */
export function getPriceAmount(price: PriceData | null | undefined, fallbackCurrency: string = 'USD'): number {
  if (!price) return 0;
  
  // IMPORTANT: Backend provides 'amount' in major units - use it directly!
  if (price.amount != null) {
    return price.amount;
  }
  
  // DEPRECATED: Legacy fallback for old data without 'amount' field
  console.warn('getPriceAmount: amount field missing, falling back to unitAmountMinor conversion. This should not happen with updated backend.');
  const currencyCode = price.currencyCode || fallbackCurrency;
  return price.unitAmountMinor != null ? price.unitAmountMinor / Math.pow(10, getCurrencyDecimals(currencyCode)) : 0;
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

/**
 * Get individual parts of a formatted price for custom display.
 * Amount should be in MAJOR units (backend provides this).
 */
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

export async function initCurrencies(): Promise<void> {
  await fetchCurrencies();
}

/**
 * Convert major units to minor units for API requests.
 * Use this ONLY when submitting prices to the backend.
 */
export function toMinorUnits(amount: number, currencyCode: string): number {
  const decimals = getCurrencyDecimals(currencyCode);
  const multiplier = Math.pow(10, decimals);
  return Math.round(amount * multiplier);
}

/**
 * DEPRECATED: Do not use this for display purposes.
 * The backend now provides 'amount' field in major units directly.
 * This function should only be used for legacy data migration or debugging.
 */
export function toMajorUnits(minorAmount: number, currencyCode: string): number {
  console.warn('toMajorUnits is deprecated. Use the backend-provided amount field instead.');
  const decimals = getCurrencyDecimals(currencyCode);
  const divisor = Math.pow(10, decimals);
  return minorAmount / divisor;
}

export { fetchCurrencies };
