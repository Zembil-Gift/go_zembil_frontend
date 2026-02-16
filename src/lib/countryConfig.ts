/**
 * Country configuration for the application
 * Maps countries to their preferred currencies and available payment methods
 */

export interface CountryConfig {
  value: string;
  label: string;
  currencyCode: string;
  currencySymbol: string;
  paymentMethods: PaymentMethod[];
}

export type PaymentMethod = 'stripe' | 'chapa' | 'telebirr';


export const SUPPORTED_COUNTRIES: CountryConfig[] = [
  { 
    value: "Ethiopia", 
    label: "Ethiopia", 
    currencyCode: "ETB", 
    currencySymbol: "Br",
    paymentMethods: ['chapa', 'telebirr']
  },
  { 
    value: "United States", 
    label: "United States", 
    currencyCode: "USD", 
    currencySymbol: "$",
    paymentMethods: ['stripe']
  },
  { 
    value: "Canada", 
    label: "Canada", 
    currencyCode: "CAD", 
    currencySymbol: "C$",
    paymentMethods: ['stripe']
  },
  { 
    value: "United Kingdom", 
    label: "United Kingdom", 
    currencyCode: "GBP", 
    currencySymbol: "£",
    paymentMethods: ['stripe']
  },
  { 
    value: "Europe", 
    label: "Europe", 
    currencyCode: "EUR", 
    currencySymbol: "€",
    paymentMethods: ['stripe']
  },
  { 
    value: "Australia", 
    label: "Australia", 
    currencyCode: "AUD", 
    currencySymbol: "A$",
    paymentMethods: ['stripe']
  },
  { 
    value: "Middle East", 
    label: "Middle East", 
    currencyCode: "USD", 
    currencySymbol: "$",
    paymentMethods: ['stripe']
  },
];

export function getCountryConfig(country: string): CountryConfig | undefined {
  return SUPPORTED_COUNTRIES.find(c => c.value === country);
}

export function getCurrencyForCountry(country: string): string {
  const config = getCountryConfig(country);
  return config?.currencyCode || 'USD';
}

export function getPaymentMethodsForCountry(country: string): PaymentMethod[] {
  const config = getCountryConfig(country);
  return config?.paymentMethods || ['stripe'];
}

export function isEthiopianCountry(country: string): boolean {
  return country === 'Ethiopia';
}

export function getDefaultPaymentMethod(country: string): PaymentMethod {
  const methods = getPaymentMethodsForCountry(country);
  return methods[0] || 'stripe';
}

export function isPaymentMethodAvailable(country: string, method: PaymentMethod): boolean {
  const methods = getPaymentMethodsForCountry(country);
  return methods.includes(method);
}
