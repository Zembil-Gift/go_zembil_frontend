// Currency conversion utilities for goZembil

export interface CurrencyDisplay {
  etb: string;
  usd: string;
}

// Exchange rate: 1 USD = 120.5 ETB (approximate)
export const USD_TO_ETB_RATE = 120.5;

export function formatDualCurrency(usdAmount: number | string): CurrencyDisplay {
  // Ensure we have a valid number
  const numericAmount = typeof usdAmount === 'string' ? parseFloat(usdAmount) : usdAmount;
  
  // Handle invalid inputs
  if (isNaN(numericAmount) || numericAmount < 0) {
    return {
      etb: '0 ETB',
      usd: '$0.00'
    };
  }
  
  const etbAmount = numericAmount * USD_TO_ETB_RATE;
  
  return {
    etb: `${etbAmount.toFixed(0)} ETB`,
    usd: `$${numericAmount.toFixed(2)}`
  };
}

export function detectUserCurrency(): string {
  // Simple detection based on locale
  const locale = navigator.language || 'en-US';
  
  if (locale.includes('et') || locale.includes('ET')) {
    return 'ETB';
  }
  
  return 'USD';
}

export function isEthiopianUser(): boolean {
  const locale = navigator.language || 'en-US';
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  return locale.includes('et') || 
         locale.includes('ET') || 
         timezone.includes('Africa/Addis_Ababa');
}

export function convertUSDToETB(usdAmount: number | string): number {
  const numericAmount = typeof usdAmount === 'string' ? parseFloat(usdAmount) : usdAmount;
  if (isNaN(numericAmount)) return 0;
  return numericAmount * USD_TO_ETB_RATE;
}

export function convertETBToUSD(etbAmount: number | string): number {
  const numericAmount = typeof etbAmount === 'string' ? parseFloat(etbAmount) : etbAmount;
  if (isNaN(numericAmount)) return 0;
  return numericAmount / USD_TO_ETB_RATE;
}

export function formatCurrency(amount: number | string, currency: string = 'USD'): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numericAmount)) return currency === 'ETB' ? '0 ETB' : '$0.00';
  
  if (currency === 'ETB') {
    return `${Math.round(numericAmount).toLocaleString()} ETB`;
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(numericAmount);
}