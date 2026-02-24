import { useCallback, useRef, useState, useEffect } from 'react';
import { GoogleMap, Marker } from '@react-google-maps/api';
import { useGoogleMaps } from './GoogleMapsProvider';
import { geocodingService, type GeocodeResponse } from '@/services/geocodingService.ts';
import { MapPin, Loader2, Search, LocateFixed } from 'lucide-react';

interface LocationPickerProps {
  /** Current latitude (controlled) */
  latitude?: number;
  /** Current longitude (controlled) */
  longitude?: number;
  /** Called when user selects a location */
  onLocationSelect: (location: LocationData) => void;
  /** Map height */
  height?: string;
  /** Placeholder text for search input */
  placeholder?: string;
  /** Whether to show the search bar */
  showSearch?: boolean;
  /** Whether the picker is disabled */
  disabled?: boolean;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  placeId: string;
  country: string;
  countryCode: string;
  city: string;
  state: string;
  postalCode: string;
  streetAddress: string;
}

const DEFAULT_CENTER = { lat: 9.0192, lng: 38.7525 }; // Addis Ababa
const DEFAULT_ZOOM = 13;

const mapContainerStyle = {
  width: '100%',
  borderRadius: '0.75rem',
};

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
  clickableIcons: false,
  gestureHandling: 'greedy',
};

/**
 * Interactive map component for vendor registration location selection.
 * 
 * Features:
 * - Click/tap to drop a pin anywhere on the map
 * - Search bar with Google Places Autocomplete
 * - "Use my location" button for browser geolocation
 * - Reverse geocoding to resolve address from pin location
 * - Displays resolved address below the map
 */
export function LocationPicker({
  latitude,
  longitude,
  onLocationSelect,
  height = '400px',
  placeholder = 'Search for your business location...',
  showSearch = true,
  disabled = false,
}: LocationPickerProps) {
  const { isLoaded, loadError } = useGoogleMaps();
  const mapRef = useRef<google.maps.Map | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const [markerPosition, setMarkerPosition] = useState<google.maps.LatLngLiteral | null>(
    latitude && longitude ? { lat: latitude, lng: longitude } : null
  );
  const [resolvedAddress, setResolvedAddress] = useState<string>('');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Update marker when props change
  useEffect(() => {
    if (latitude && longitude) {
      setMarkerPosition({ lat: latitude, lng: longitude });
    }
  }, [latitude, longitude]);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;

    // Set up Places Autocomplete on search input
    if (searchInputRef.current && showSearch) {
      autocompleteRef.current = new google.maps.places.Autocomplete(searchInputRef.current, {
        types: ['geocode', 'establishment'],
      });

      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();
        if (place?.geometry?.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          const newPos = { lat, lng };
          setMarkerPosition(newPos);
          map.panTo(newPos);
          map.setZoom(16);
          handleReverseGeocode(lat, lng);
        }
      });
    }
  }, [showSearch]);

  /**
   * Handle map click: drop pin and reverse geocode.
   */
  const handleMapClick = useCallback(
    (event: google.maps.MapMouseEvent) => {
      if (disabled) return;
      const lat = event.latLng?.lat();
      const lng = event.latLng?.lng();
      if (lat !== undefined && lng !== undefined) {
        setMarkerPosition({ lat, lng });
        handleReverseGeocode(lat, lng);
      }
    },
    [disabled]
  );

  /**
   * Reverse geocode coordinates and notify parent.
   */
  const handleReverseGeocode = async (lat: number, lng: number) => {
    setIsGeocoding(true);
    try {
      const result: GeocodeResponse = await geocodingService.reverseGeocode({
        latitude: lat,
        longitude: lng,
      });
      setResolvedAddress(result.formattedAddress || '');
      onLocationSelect({
        latitude: lat,
        longitude: lng,
        formattedAddress: result.formattedAddress || '',
        placeId: result.placeId || '',
        country: result.country || '',
        countryCode: result.countryCode || '',
        city: result.city || '',
        state: result.state || '',
        postalCode: result.postalCode || '',
        streetAddress: result.streetAddress || '',
      });
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      setResolvedAddress('Could not resolve address');
      // Still send coordinates even if geocoding fails
      onLocationSelect({
        latitude: lat,
        longitude: lng,
        formattedAddress: '',
        placeId: '',
        country: '',
        countryCode: '',
        city: '',
        state: '',
        postalCode: '',
        streetAddress: '',
      });
    } finally {
      setIsGeocoding(false);
    }
  };

  /**
   * Use browser geolocation to get current position.
   */
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const newPos = { lat, lng };
        setMarkerPosition(newPos);
        mapRef.current?.panTo(newPos);
        mapRef.current?.setZoom(16);
        handleReverseGeocode(lat, lng);
        setIsLocating(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Could not get your location. Please allow location access or drop a pin manually.');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Loading / error states
  if (loadError) {
    return (
      <div className="flex items-center justify-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-8" style={{ height }}>
        <div className="text-center text-gray-500">
          <MapPin className="w-8 h-8 mx-auto mb-2 text-red-400" />
          <p className="font-medium">Failed to load Google Maps</p>
          <p className="text-sm mt-1">Please check your internet connection and try again.</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-8" style={{ height }}>
        <div className="text-center text-gray-500">
          <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-primary-blue" />
          <p>Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search bar + Use My Location */}
      {showSearch && (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={placeholder}
              disabled={disabled}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-primary-blue disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>
          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={disabled || isLocating}
            className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-primary-blue border border-primary-blue rounded-lg hover:bg-primary-blue/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            {isLocating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LocateFixed className="w-4 h-4" />
            )}
            My Location
          </button>
        </div>
      )}

      {/* Map */}
      <div className="relative rounded-xl overflow-hidden border border-gray-200 shadow-sm">
        <GoogleMap
          mapContainerStyle={{ ...mapContainerStyle, height }}
          center={markerPosition || DEFAULT_CENTER}
          zoom={markerPosition ? 16 : DEFAULT_ZOOM}
          onClick={handleMapClick}
          onLoad={onMapLoad}
          options={mapOptions}
        >
          {markerPosition && (
            <Marker
              position={markerPosition}
              draggable={!disabled}
              onDragEnd={(e) => {
                const lat = e.latLng?.lat();
                const lng = e.latLng?.lng();
                if (lat !== undefined && lng !== undefined) {
                  setMarkerPosition({ lat, lng });
                  handleReverseGeocode(lat, lng);
                }
              }}
              animation={google.maps.Animation.DROP}
            />
          )}
        </GoogleMap>

        {/* Instruction overlay when no pin is placed */}
        {!markerPosition && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-white/90 backdrop-blur-sm rounded-lg px-4 py-3 shadow-lg border">
              <p className="text-sm text-gray-700 font-medium flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary-blue" />
                Click on the map to drop a pin at your business location
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Resolved address display */}
      {(resolvedAddress || isGeocoding) && (
        <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
          {isGeocoding ? (
            <>
              <Loader2 className="w-4 h-4 mt-0.5 animate-spin text-primary-blue flex-shrink-0" />
              <span className="text-sm text-gray-600">Resolving address...</span>
            </>
          ) : (
            <>
              <MapPin className="w-4 h-4 mt-0.5 text-primary-blue flex-shrink-0" />
              <span className="text-sm text-gray-700">{resolvedAddress}</span>
            </>
          )}
        </div>
      )}

      {/* Coordinates display */}
      {markerPosition && (
        <p className="text-xs text-gray-400">
          Coordinates: {markerPosition.lat.toFixed(6)}, {markerPosition.lng.toFixed(6)}
        </p>
      )}
    </div>
  );
}
