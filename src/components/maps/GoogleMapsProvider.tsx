import { useJsApiLoader } from '@react-google-maps/api';
import { createContext, useContext, ReactNode } from 'react';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// Libraries needed: places for Autocomplete, geocoding for reverse geocode
const LIBRARIES: ('places' | 'geocoding' | 'marker')[] = ['places', 'geocoding', 'marker'];

interface GoogleMapsContextValue {
  isLoaded: boolean;
  loadError: Error | undefined;
}

const GoogleMapsContext = createContext<GoogleMapsContextValue>({
  isLoaded: false,
  loadError: undefined,
});

export function useGoogleMaps() {
  return useContext(GoogleMapsContext);
}

interface GoogleMapsProviderProps {
  children: ReactNode;
}

/**
 * Provider component that loads the Google Maps JavaScript API once
 * and makes it available to all child components via context.
 * 
 * Usage: Wrap your app (or specific routes) with <GoogleMapsProvider>
 * Then use useGoogleMaps() in child components to check isLoaded.
 */
export function GoogleMapsProvider({ children }: GoogleMapsProviderProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  return (
    <GoogleMapsContext.Provider value={{ isLoaded, loadError }}>
      {children}
    </GoogleMapsContext.Provider>
  );
}
