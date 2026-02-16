import React from 'react';
import { Tag, Percent, Clock } from 'lucide-react';
import { DiscountInfo } from '@/types/discount';
import { getCurrencySymbol, getCurrencyDecimals } from '@/lib/currency';

interface DiscountBadgeProps {
  discount: DiscountInfo;
  size?: 'small' | 'medium' | 'large';
  variant?: 'compact' | 'full';
  targetCurrency?: string;
}

export const DiscountBadge: React.FC<DiscountBadgeProps> = ({
  discount,
  size = 'medium',
  variant = 'compact',
  targetCurrency
}) => {
  const displayCurrency = discount.displayCurrencyCode || discount.currency || discount.currencyCode || targetCurrency || 'ETB';

  const formatDiscountValue = () => {
    if (discount.discountType === 'PERCENTAGE') {
      return `${discount.discountPercentage}% OFF`;
    } else if ((discount.fixedAmount != null || discount.fixedAmountMinor != null) && displayCurrency) {
      const amount = discount.fixedAmount != null
        ? discount.fixedAmount
        : (discount.fixedAmountMinor! / Math.pow(10, getCurrencyDecimals(displayCurrency)));
      
      const decimals = displayCurrency.toUpperCase() === 'ETB' ? 0 : 2;
      return `${getCurrencySymbol(displayCurrency)}${amount.toFixed(decimals)} OFF`;
    }
    return 'DISCOUNT';
  };
 
  const formatTimeRemaining = () => {
    if (!discount.validUntil) return null;
    
    const now = new Date();
    const endDate = new Date(discount.validUntil);
    const diffMs = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return null;
    if (diffDays === 1) return 'Ends today';
    if (diffDays <= 7) return `${diffDays} days left`;
    return null;
  };

  const sizeClasses = {
    small: 'text-xs px-2 py-1',
    medium: 'text-sm px-3 py-1.5',
    large: 'text-base px-4 py-2'
  };

  const timeRemaining = formatTimeRemaining();

  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center gap-1.5 bg-gradient-to-r from-red-500 to-pink-500 text-white font-bold rounded-md shadow-sm border border-red-500/80 ${sizeClasses[size]}`}>
        <Tag className="w-3.5 h-3.5" />
        <span>{formatDiscountValue()}</span>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-200 rounded-lg p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="flex items-center gap-1.5 bg-gradient-to-r from-red-500 to-pink-500 text-white font-bold rounded px-2.5 py-1 text-sm">
              <Tag className="w-4 h-4" />
              <span>{formatDiscountValue()}</span>
            </div>
            {discount.discountType === 'PERCENTAGE' && (discount.maxDiscountAmount != null || discount.maxDiscountAmountMinor != null) && (
              <span className="text-xs text-gray-600">
                (Max: {(() => {
                  const maxAmount = discount.maxDiscountAmount != null
                    ? discount.maxDiscountAmount
                    : (discount.maxDiscountAmountMinor ?? 0) / Math.pow(10, getCurrencyDecimals(displayCurrency));
                  const decimals = displayCurrency.toUpperCase() === 'ETB' ? 0 : 2;
                  return `${getCurrencySymbol(displayCurrency)}${maxAmount.toLocaleString(undefined, { maximumFractionDigits: decimals })}`;
                })()})
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-gray-700">{discount.name}</span>
          </div>
        </div>
        {timeRemaining && (
          <div className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
            <Clock className="w-3 h-3" />
            <span className="font-medium">{timeRemaining}</span>
          </div>
        )}
      </div>
      {discount.remainingUses !== null && discount.remainingUses !== undefined && discount.remainingUses <= 10 && (
        <div className="mt-2 text-xs text-amber-600  flex items-center gap-1">
          <Percent className="w-3 h-3" />
          <span>Only {discount.remainingUses} uses left!</span>
        </div>
      )}
    </div>
  );
};
