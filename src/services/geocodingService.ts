import { apiService } from './apiService';

// ─── Geocoding Types ───────────────────────────────────────────────
export interface GeocodeResponse {
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

export interface ReverseGeocodeRequest {
  latitude: number;
  longitude: number;
}

export interface ForwardGeocodeRequest {
  address: string;
}

// ─── Delivery Pricing Types ────────────────────────────────────────
export interface DeliveryEstimateRequest {
  originLatitude: number;
  originLongitude: number;
  destinationLatitude: number;
  destinationLongitude: number;
  countryCode?: string;
  travelMode?: 'DRIVING' | 'BICYCLING' | 'WALKING';
}

export interface FeeBreakdown {
  baseFee: number;
  distanceFee: number;
  durationFee: number;
  trafficSurcharge: number;
  total: number;
  formula: string;
}

export interface DeliveryEstimateResponse {
  distanceMeters: number;
  distanceText: string;
  durationSeconds: number;
  durationText: string;
  trafficDurationSeconds: number;
  trafficDurationText: string;
  heavyTraffic: boolean;
  deliveryFee: number;
  currencyCode: string;
  feeBreakdown: FeeBreakdown;
  routePolyline: string;
}

// ─── Geocoding Service ─────────────────────────────────────────────
export const geocodingService = {
  /**
   * Reverse geocode: coordinates → address components.
   * Used during vendor pin-drop registration and address validation.
   */
  reverseGeocode: (request: ReverseGeocodeRequest) =>
    apiService.postRequest<GeocodeResponse>('/api/geocoding/reverse', request),

  /**
   * Forward geocode: address string → coordinates.
   */
  forwardGeocode: (request: ForwardGeocodeRequest) =>
    apiService.postRequest<GeocodeResponse>('/api/geocoding/forward', request),

  /**
   * Resolve a Google Maps Place ID to full address details.
   */
  resolvePlace: (placeId: string) =>
    apiService.getRequest<GeocodeResponse>(`/api/geocoding/place/${placeId}`),

  /**
   * Check if geocoding service is configured and available.
   */
  isAvailable: () =>
    apiService.getRequest<boolean>('/api/geocoding/status'),
};

// ─── Delivery Pricing Service ──────────────────────────────────────
export const deliveryPricingService = {
  /**
   * Calculate dynamic delivery estimate with distance, duration, and fee.
   * Uses vendor coordinates as origin and shipping address as destination.
   */
  calculateEstimate: (request: DeliveryEstimateRequest) =>
    apiService.postRequest<DeliveryEstimateResponse>('/api/delivery/estimate', request),

  /**
   * Calculate delivery estimate for an existing order.
   * Uses stored vendor and shipping address coordinates.
   */
  calculateEstimateForOrder: (orderId: number) =>
    apiService.getRequest<DeliveryEstimateResponse>(`/api/delivery/estimate/order/${orderId}`),
};
