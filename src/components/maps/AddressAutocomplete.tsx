import { useRef, useEffect, useState, useCallback } from 'react';
import { useGoogleMaps } from './GoogleMapsProvider';
import { MapPin, Loader2 } from 'lucide-react';

interface AddressAutocompleteProps {
  /** Called when user selects an address from suggestions */
  onAddressSelect: (address: AutocompleteAddress) => void;
  /** Default value for the input */
  defaultValue?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Restrict results to specific countries (ISO 3166-1 alpha-2 codes) */
  countryRestrictions?: string[];
  /** Input CSS classes (Tailwind) */
  className?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Error message to display */
  error?: string;
  /** Label text */
  label?: string;
  /** Whether field is required */
  required?: boolean;
}

export interface AutocompleteAddress {
  formattedAddress: string;
  placeId: string;
  latitude: number;
  longitude: number;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  countryCode: string;
}

/**
 * Google Places Autocomplete input component for shipping address capture.
 * 
 * Features:
 * - Real-time address suggestions as user types
 * - Returns structured address components + coordinates
 * - Optional country restriction for relevant suggestions
 * - Styled to match existing Zembil UI patterns
 */
export function AddressAutocomplete({
  onAddressSelect,
  defaultValue = '',
  placeholder = 'Start typing your address...',
  countryRestrictions,
  className = '',
  disabled = false,
  error,
  label,
  required = false,
}: AddressAutocompleteProps) {
  const { isLoaded } = useGoogleMaps();
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [inputValue, setInputValue] = useState(defaultValue);

  const handlePlaceChanged = useCallback(() => {
    const place = autocompleteRef.current?.getPlace();
    if (!place?.geometry?.location || !place.address_components) {
      return;
    }

    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();

    // Parse address components
    let street = '';
    let city = '';
    let state = '';
    let postalCode = '';
    let country = '';
    let countryCode = '';
    let streetNumber = '';
    let route = '';

    for (const component of place.address_components) {
      const types = component.types;
      if (types.includes('street_number')) {
        streetNumber = component.long_name;
      } else if (types.includes('route')) {
        route = component.long_name;
      } else if (types.includes('locality') || types.includes('postal_town')) {
        city = component.long_name;
      } else if (types.includes('sublocality_level_1') || types.includes('sublocality')) {
        if (!city) city = component.long_name;
      } else if (types.includes('administrative_area_level_1')) {
        state = component.long_name;
      } else if (types.includes('postal_code')) {
        postalCode = component.long_name;
      } else if (types.includes('country')) {
        country = component.long_name;
        countryCode = component.short_name;
      }
    }

    street = streetNumber ? `${streetNumber} ${route}` : route;

    const addressData: AutocompleteAddress = {
      formattedAddress: place.formatted_address || '',
      placeId: place.place_id || '',
      latitude: lat,
      longitude: lng,
      street,
      city,
      state,
      postalCode,
      country,
      countryCode,
    };

    setInputValue(place.formatted_address || '');
    onAddressSelect(addressData);
  }, [onAddressSelect]);

  // Initialize Autocomplete when Maps JS API is loaded
  useEffect(() => {
    if (!isLoaded || !inputRef.current || autocompleteRef.current) return;

    const options: google.maps.places.AutocompleteOptions = {
      types: ['address'],
      fields: ['address_components', 'formatted_address', 'geometry', 'place_id'],
    };

    if (countryRestrictions && countryRestrictions.length > 0) {
      options.componentRestrictions = {
        country: countryRestrictions,
      };
    }

    autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, options);
    autocompleteRef.current.addListener('place_changed', handlePlaceChanged);

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [isLoaded, countryRestrictions, handlePlaceChanged]);

  if (!isLoaded) {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-sm font-medium text-gray-700">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}
        <div className="relative">
          <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
          <input
            type="text"
            disabled
            placeholder="Loading address search..."
            className={`w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed ${className}`}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full pl-10 pr-4 py-2.5 text-sm border rounded-lg transition-colors focus:ring-2 focus:ring-primary-blue focus:border-primary-blue disabled:bg-gray-100 disabled:cursor-not-allowed ${
            error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
          } ${className}`}
        />
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
