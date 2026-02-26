import React from 'react';
import { DiscountInfo } from '@/types/discount';
import { getCurrencySymbol, calculateDiscountedPrice } from '@/lib/currency';

interface PriceWithDiscountProps {
  originalPrice: number; // in major units
  currency: string;
  discount?: DiscountInfo | null;
  size?: 'small' | 'medium' | 'large';
  showSavings?: boolean;
  theme?: 'default' | 'onRed';
}

export const PriceWithDiscount: React.FC<PriceWithDiscountProps> = ({
  originalPrice,
  currency,
  discount,
  size = 'medium',
  showSavings = true,
  theme = 'default'
}) => {
  let discountedPrice = originalPrice;
  try {
    discountedPrice = calculateDiscountedPrice(originalPrice, currency, discount);
  } catch (error) {
    console.warn('PriceWithDiscount: discount conversion unavailable, falling back to original price display.', error);
  }
  const savings = originalPrice - discountedPrice;
  const hasDiscount = discount && savings > 0;
  const decimals = 2;

  const sizeClasses = {
    small: {
      original: 'text-xs',
      discounted: 'text-base font-bold',
      savings: 'text-xs'
    },
    medium: {
      original: 'text-base',
      discounted: 'text-xl font-bold',
      savings: 'text-sm'
    },
    large: {
      original: 'text-lg',
      discounted: 'text-3xl font-bold',
      savings: 'text-base'
    }
  };

  const classes = sizeClasses[size];

  if (!hasDiscount) {
    return (
      <div className={`${classes.discounted} ${theme === 'onRed' ? 'text-white' : 'text-charcoal'}`}>
        {getCurrencySymbol(currency)}{originalPrice.toFixed(decimals)}
      </div>
    );
  }

  if (!showSavings) {
    return (
      <div className="flex items-center gap-3 whitespace-nowrap">
        <div className={`${classes.discounted} ${theme === 'onRed' ? 'text-white' : 'text-red-600'}`}>
          {getCurrencySymbol(currency)}{discountedPrice.toFixed(decimals)}
        </div>
        <div className={`${classes.original} ${theme === 'onRed' ? 'text-white/80' : 'text-gray-500'} line-through`}>
          {getCurrencySymbol(currency)}{originalPrice.toFixed(decimals)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-3 whitespace-nowrap">
        <div className={`${classes.discounted} ${theme === 'onRed' ? 'text-white' : 'text-red-600'}`}>
          {getCurrencySymbol(currency)}{discountedPrice.toFixed(decimals)}
        </div>
        <div className={`${classes.original} ${theme === 'onRed' ? 'text-white/80' : 'text-gray-500'} line-through`}>
          {getCurrencySymbol(currency)}{originalPrice.toFixed(decimals)}
        </div>
      </div>
      {showSavings && savings > 0 && (
        <div className={`${classes.savings} ${theme === 'onRed' ? 'text-white/90' : 'text-green-600'} font-medium flex flex-wrap items-center gap-1`}>
          <span>Save {getCurrencySymbol(currency)}{savings.toFixed(decimals)}</span>
          {discount.discountType === 'PERCENTAGE' && discount.discountPercentage && (
            <span className={`${theme === 'onRed' ? 'text-white/80' : 'text-gray-500'} text-xs`}>
              {(savings / originalPrice) * 100 < discount.discountPercentage - 0.1 ? (
                <span>(Capped at max)</span>
              ) : (
                <span>({discount.discountPercentage}% off)</span>
              )}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
