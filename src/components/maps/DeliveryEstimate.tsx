import { useState, useEffect } from 'react';
import { deliveryPricingService, type DeliveryEstimateResponse } from '../../services/geocodingService';
import { Truck, Clock, MapPin, AlertTriangle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

interface DeliveryEstimateProps {
  /** Vendor/pickup latitude */
  originLatitude: number;
  /** Vendor/pickup longitude */
  originLongitude: number;
  /** Shipping destination latitude */
  destinationLatitude: number;
  /** Shipping destination longitude */
  destinationLongitude: number;
  /** Country code for pricing lookup */
  countryCode?: string;
  /** Called when estimate is calculated (parent can use the fee) */
  onEstimateCalculated?: (estimate: DeliveryEstimateResponse) => void;
  /** Whether to auto-calculate on mount */
  autoCalculate?: boolean;
  /** Custom CSS class */
  className?: string;
}

/**
 * Dynamic delivery fee estimation component for checkout.
 * 
 * Shows:
 * - Estimated distance and travel time
 * - Traffic conditions (heavy traffic warning)
 * - Calculated delivery fee with optional breakdown
 * - Route information
 */
export function DeliveryEstimate({
  originLatitude,
  originLongitude,
  destinationLatitude,
  destinationLongitude,
  countryCode,
  onEstimateCalculated,
  autoCalculate = true,
  className = '',
}: DeliveryEstimateProps) {
  const [estimate, setEstimate] = useState<DeliveryEstimateResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const calculateEstimate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await deliveryPricingService.calculateEstimate({
        originLatitude,
        originLongitude,
        destinationLatitude,
        destinationLongitude,
        countryCode,
      });
      setEstimate(result);
      onEstimateCalculated?.(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to calculate delivery estimate';
      setError(message);
      console.error('Delivery estimate error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-calculate when coordinates change
  useEffect(() => {
    if (autoCalculate && originLatitude && originLongitude && destinationLatitude && destinationLongitude) {
      calculateEstimate();
    }
  }, [originLatitude, originLongitude, destinationLatitude, destinationLongitude, autoCalculate]);

  if (isLoading) {
    return (
      <div className={`flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200 ${className}`}>
        <Loader2 className="w-5 h-5 animate-spin text-primary-blue" />
        <div>
          <p className="text-sm font-medium text-gray-700">Calculating delivery fee...</p>
          <p className="text-xs text-gray-500">Checking traffic conditions and route</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 bg-red-50 rounded-xl border border-red-200 ${className}`}>
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <p className="text-sm font-medium text-red-700">Could not estimate delivery</p>
        </div>
        <p className="text-xs text-red-600">{error}</p>
        <button
          type="button"
          onClick={calculateEstimate}
          className="mt-2 text-xs text-primary-blue hover:underline font-medium"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!estimate) {
    return null;
  }

  return (
    <div className={`rounded-xl border border-gray-200 overflow-hidden ${className}`}>
      {/* Header with total fee */}
      <div className="bg-primary-blue/5 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary-blue" />
            <span className="text-sm font-semibold text-gray-800">Delivery Fee</span>
          </div>
          <span className="text-lg font-bold text-primary-blue">
            {estimate.currencyCode} {estimate.deliveryFee.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Route details */}
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {/* Distance */}
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Distance</p>
              <p className="text-sm font-medium text-gray-800">{estimate.distanceText}</p>
            </div>
          </div>

          {/* Duration */}
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Est. Time</p>
              <p className="text-sm font-medium text-gray-800">{estimate.trafficDurationText}</p>
            </div>
          </div>
        </div>

        {/* Traffic warning */}
        {estimate.heavyTraffic && (
          <div className="flex items-center gap-2 p-2.5 bg-amber-50 rounded-lg border border-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <p className="text-xs text-amber-700">
              Heavy traffic detected — delivery may take longer than usual. Fee includes traffic surcharge.
            </p>
          </div>
        )}

        {/* Fee breakdown toggle */}
        {estimate.feeBreakdown && (
          <div>
            <button
              type="button"
              onClick={() => setShowBreakdown(!showBreakdown)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-primary-blue transition-colors"
            >
              {showBreakdown ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {showBreakdown ? 'Hide' : 'Show'} fee breakdown
            </button>

            {showBreakdown && (
              <div className="mt-2 p-3 bg-gray-50 rounded-lg text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-500">Base fee</span>
                  <span className="text-gray-700">{estimate.currencyCode} {estimate.feeBreakdown.baseFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Distance fee</span>
                  <span className="text-gray-700">{estimate.currencyCode} {estimate.feeBreakdown.distanceFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Time fee</span>
                  <span className="text-gray-700">{estimate.currencyCode} {estimate.feeBreakdown.durationFee.toFixed(2)}</span>
                </div>
                {estimate.feeBreakdown.trafficSurcharge > 0 && (
                  <div className="flex justify-between text-amber-600">
                    <span>Traffic surcharge</span>
                    <span>{estimate.currencyCode} {estimate.feeBreakdown.trafficSurcharge.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-1.5 flex justify-between font-semibold">
                  <span className="text-gray-700">Total</span>
                  <span className="text-gray-900">{estimate.currencyCode} {estimate.feeBreakdown.total.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
