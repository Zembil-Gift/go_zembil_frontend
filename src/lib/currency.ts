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
  amount?: number;
  currencyCode?: string | null;
  currencyId?: number | null;
  useExchangeRate?: boolean;
  active?: boolean;
}

const DEFAULT_CURRENCIES: Record<string, { symbol: string; decimalPlaces: number }> = {
  USD: { symbol: '$', decimalPlaces: 2 },
  ETB: { symbol: 'ETB ', decimalPlaces: 0 },
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

export function getCurrencyDecimals(currencyCode: string): number {
  const code = currencyCode.toUpperCase();
  const cached = getCurrencySync(code);
  if (cached) return cached.decimalPlaces;
  return DEFAULT_CURRENCIES[code]?.decimalPlaces ?? 2;
}

export function getCurrencySymbol(currencyCode: string): string {
  const code = currencyCode.toUpperCase();
  const cached = getCurrencySync(code);
  if (cached) return cached.symbol;
  return DEFAULT_CURRENCIES[code]?.symbol ?? `${code} `;
}

export function formatCurrency(amount: number | string, currency: string = 'USD'): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  const decimals = getCurrencyDecimals(currency);
  const symbol = getCurrencySymbol(currency);

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
  const amount = price.amount ?? (price.unitAmountMinor ? price.unitAmountMinor / 100 : 0);
  const currencyCode = price.currencyCode || fallbackCurrency;
  return formatCurrency(amount, currencyCode);
}

export function getPriceAmount(price: PriceData | null | undefined): number {
  if (!price) return 0;
  return price.amount ?? (price.unitAmountMinor ? price.unitAmountMinor / 100 : 0);
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

export { fetchCurrencies };
