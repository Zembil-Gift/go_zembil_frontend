import * as React from "react";
import { parsePhoneNumberFromString, getCountries, getCountryCallingCode, CountryCode, isValidPhoneNumber } from "libphonenumber-js";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Country data with flags and names
const COUNTRY_DATA: Record<string, { name: string; flag: string }> = {
  US: { name: "United States", flag: "🇺🇸" },
  ET: { name: "Ethiopia", flag: "🇪🇹" },
  GB: { name: "United Kingdom", flag: "🇬🇧" },
  CA: { name: "Canada", flag: "🇨🇦" },
  AU: { name: "Australia", flag: "🇦🇺" },
  DE: { name: "Germany", flag: "🇩🇪" },
  FR: { name: "France", flag: "🇫🇷" },
  IT: { name: "Italy", flag: "🇮🇹" },
  ES: { name: "Spain", flag: "🇪🇸" },
  NL: { name: "Netherlands", flag: "🇳🇱" },
  BE: { name: "Belgium", flag: "🇧🇪" },
  CH: { name: "Switzerland", flag: "🇨🇭" },
  AT: { name: "Austria", flag: "🇦🇹" },
  SE: { name: "Sweden", flag: "🇸🇪" },
  NO: { name: "Norway", flag: "🇳🇴" },
  DK: { name: "Denmark", flag: "🇩🇰" },
  FI: { name: "Finland", flag: "🇫🇮" },
  IE: { name: "Ireland", flag: "🇮🇪" },
  PT: { name: "Portugal", flag: "🇵🇹" },
  GR: { name: "Greece", flag: "🇬🇷" },
  PL: { name: "Poland", flag: "🇵🇱" },
  CZ: { name: "Czech Republic", flag: "🇨🇿" },
  AE: { name: "UAE", flag: "🇦🇪" },
  SA: { name: "Saudi Arabia", flag: "🇸🇦" },
  QA: { name: "Qatar", flag: "🇶🇦" },
  KW: { name: "Kuwait", flag: "🇰🇼" },
  BH: { name: "Bahrain", flag: "🇧🇭" },
  OM: { name: "Oman", flag: "🇴🇲" },
  EG: { name: "Egypt", flag: "🇪🇬" },
  ZA: { name: "South Africa", flag: "🇿🇦" },
  NG: { name: "Nigeria", flag: "🇳🇬" },
  KE: { name: "Kenya", flag: "🇰🇪" },
  GH: { name: "Ghana", flag: "🇬🇭" },
  IN: { name: "India", flag: "🇮🇳" },
  CN: { name: "China", flag: "🇨🇳" },
  JP: { name: "Japan", flag: "🇯🇵" },
  KR: { name: "South Korea", flag: "🇰🇷" },
  SG: { name: "Singapore", flag: "🇸🇬" },
  MY: { name: "Malaysia", flag: "🇲🇾" },
  TH: { name: "Thailand", flag: "🇹🇭" },
  ID: { name: "Indonesia", flag: "🇮🇩" },
  PH: { name: "Philippines", flag: "🇵🇭" },
  VN: { name: "Vietnam", flag: "🇻🇳" },
  BR: { name: "Brazil", flag: "🇧🇷" },
  MX: { name: "Mexico", flag: "🇲🇽" },
  AR: { name: "Argentina", flag: "🇦🇷" },
  CO: { name: "Colombia", flag: "🇨🇴" },
  CL: { name: "Chile", flag: "🇨🇱" },
  PE: { name: "Peru", flag: "🇵🇪" },
  IL: { name: "Israel", flag: "🇮🇱" },
  TR: { name: "Turkey", flag: "🇹🇷" },
  RU: { name: "Russia", flag: "🇷🇺" },
  UA: { name: "Ukraine", flag: "🇺🇦" },
  NZ: { name: "New Zealand", flag: "🇳🇿" },
};

// Priority countries shown at the top
const PRIORITY_COUNTRIES: CountryCode[] = ["ET", "US", "GB", "CA", "AU", "AE", "SA"];

// Get sorted country list with priority countries first
const getSortedCountries = (): CountryCode[] => {
  const allCountries = getCountries();
  const prioritySet = new Set(PRIORITY_COUNTRIES);
  
  const otherCountries = allCountries
    .filter(code => !prioritySet.has(code) && COUNTRY_DATA[code])
    .sort((a, b) => {
      const nameA = COUNTRY_DATA[a]?.name || a;
      const nameB = COUNTRY_DATA[b]?.name || b;
      return nameA.localeCompare(nameB);
    });
  
  return [...PRIORITY_COUNTRIES, ...otherCountries];
};

export interface PhoneInputProps {
  value?: string;
  onChange?: (value: string, isValid: boolean, e164?: string) => void;
  defaultCountry?: CountryCode;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  error?: boolean;
  id?: string;
}

export function PhoneInput({
  value = "",
  onChange,
  defaultCountry = "ET",
  placeholder = "911 234 567",
  disabled = false,
  className,
  error = false,
  id,
}: PhoneInputProps) {
  const [selectedCountry, setSelectedCountry] = React.useState<CountryCode>(defaultCountry);
  const [nationalNumber, setNationalNumber] = React.useState("");
  const [isInitialized, setIsInitialized] = React.useState(false);

  // Parse initial value if provided
  React.useEffect(() => {
    if (value && !isInitialized) {
      const parsed = parsePhoneNumberFromString(value);
      if (parsed) {
        setSelectedCountry(parsed.country as CountryCode || defaultCountry);
        setNationalNumber(parsed.nationalNumber);
      } else if (value.startsWith("+")) {
        // Try to extract country from the value
        for (const country of getCountries()) {
          const code = getCountryCallingCode(country);
          if (value.startsWith(`+${code}`)) {
            setSelectedCountry(country);
            setNationalNumber(value.slice(code.length + 1).replace(/\D/g, ""));
            break;
          }
        }
      } else {
        setNationalNumber(value.replace(/\D/g, ""));
      }
      setIsInitialized(true);
    }
  }, [value, defaultCountry, isInitialized]);

  const handleCountryChange = (country: string) => {
    const countryCode = country as CountryCode;
    setSelectedCountry(countryCode);
    
    // Re-validate with new country
    const callingCode = getCountryCallingCode(countryCode);
    const fullNumber = `+${callingCode}${nationalNumber}`;
    const isValid = nationalNumber.length > 0 && isValidPhoneNumber(fullNumber, countryCode);
    
    onChange?.(fullNumber, isValid, isValid ? fullNumber : undefined);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only digits and spaces for formatting
    const input = e.target.value.replace(/[^\d\s]/g, "");
    const digitsOnly = input.replace(/\s/g, "");
    
    setNationalNumber(digitsOnly);
    
    const callingCode = getCountryCallingCode(selectedCountry);
    const fullNumber = `+${callingCode}${digitsOnly}`;
    
    // Validate the number
    const isValid = digitsOnly.length > 0 && isValidPhoneNumber(fullNumber, selectedCountry);
    
    // Format for display
    let e164: string | undefined;
    if (isValid) {
      const parsed = parsePhoneNumberFromString(fullNumber, selectedCountry);
      e164 = parsed?.format("E.164");
    }
    
    onChange?.(fullNumber, isValid, e164);
  };

  const callingCode = getCountryCallingCode(selectedCountry);
  const countryData = COUNTRY_DATA[selectedCountry];
  const sortedCountries = React.useMemo(() => getSortedCountries(), []);

  // Format national number for display
  const formatDisplayNumber = (num: string): string => {
    if (num.length === 0) return "";
    const parsed = parsePhoneNumberFromString(`+${callingCode}${num}`, selectedCountry);
    if (parsed) {
      const formatted = parsed.formatInternational();
      // Remove the country code part for display
      return formatted.replace(`+${callingCode}`, "").trim();
    }
    return num;
  };

  return (
    <div className={cn("flex gap-2", className)}>
      {/* Country Selector */}
      <Select
        value={selectedCountry}
        onValueChange={handleCountryChange}
        disabled={disabled}
      >
        <SelectTrigger 
          className={cn(
            "w-[110px] flex-shrink-0",
            error && "border-red-500 focus:ring-red-500"
          )}
        >
          <SelectValue>
            <span className="flex items-center gap-1.5">
              <span className="text-base">{countryData?.flag || "🌍"}</span>
              <span className="text-sm text-muted-foreground">+{callingCode}</span>
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {/* Priority countries with separator */}
          {PRIORITY_COUNTRIES.map((code) => {
            const data = COUNTRY_DATA[code];
            if (!data) return null;
            const countryCallingCode = getCountryCallingCode(code);
            return (
              <SelectItem key={code} value={code}>
                <span className="flex items-center gap-2">
                  <span className="text-base">{data.flag}</span>
                  <span className="truncate">{data.name}</span>
                  <span className="text-muted-foreground ml-auto">+{countryCallingCode}</span>
                </span>
              </SelectItem>
            );
          })}
          <div className="border-t my-1" />
          {/* Other countries */}
          {sortedCountries
            .filter(code => !PRIORITY_COUNTRIES.includes(code))
            .map((code) => {
              const data = COUNTRY_DATA[code];
              if (!data) return null;
              const countryCallingCode = getCountryCallingCode(code);
              return (
                <SelectItem key={code} value={code}>
                  <span className="flex items-center gap-2">
                    <span className="text-base">{data.flag}</span>
                    <span className="truncate">{data.name}</span>
                    <span className="text-muted-foreground ml-auto">+{countryCallingCode}</span>
                  </span>
                </SelectItem>
              );
            })}
        </SelectContent>
      </Select>

      {/* Phone Number Input */}
      <Input
        id={id}
        type="tel"
        inputMode="numeric"
        value={formatDisplayNumber(nationalNumber)}
        onChange={handleNumberChange}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "flex-1",
          error && "border-red-500 focus:ring-red-500"
        )}
      />
    </div>
  );
}

// Utility functions for phone validation
export const phoneUtils = {
  /**
   * Validate a phone number string
   */
  isValid: (phoneNumber: string, countryCode?: CountryCode): boolean => {
    try {
      return isValidPhoneNumber(phoneNumber, countryCode);
    } catch {
      return false;
    }
  },

  /**
   * Parse and format phone number to E.164
   */
  toE164: (phoneNumber: string, countryCode?: CountryCode): string | null => {
    try {
      const parsed = parsePhoneNumberFromString(phoneNumber, countryCode);
      return parsed?.format("E.164") || null;
    } catch {
      return null;
    }
  },

  /**
   * Format phone number for display
   */
  formatInternational: (phoneNumber: string): string | null => {
    try {
      const parsed = parsePhoneNumberFromString(phoneNumber);
      return parsed ? parsed.formatInternational() : null;
    } catch {
      return null;
    }
  },

  /**
   * Get country code from phone number
   */
  getCountry: (phoneNumber: string): CountryCode | undefined => {
    try {
      const parsed = parsePhoneNumberFromString(phoneNumber);
      return parsed?.country;
    } catch {
      return undefined;
    }
  },
};

export default PhoneInput;
