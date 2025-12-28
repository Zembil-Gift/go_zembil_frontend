import { StarRating } from './StarRating';
import { RatingSummary as RatingSummaryType } from '@/services/reviewService';
import { cn } from '@/lib/utils';

interface RatingSummaryProps {
  summary: RatingSummaryType;
  compact?: boolean;
  className?: string;
}

export function RatingSummaryDisplay({ summary, compact = false, className }: RatingSummaryProps) {
  const { averageRating, totalReviews, ratingDistribution } = summary;

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <StarRating rating={averageRating} size="sm" />
        <span className="text-sm font-medium text-gray-700">
          {averageRating.toFixed(1)}
        </span>
        <span className="text-sm text-gray-500">
          ({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})
        </span>
      </div>
    );
  }

  const maxCount = Math.max(...Object.values(ratingDistribution), 1);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Overall Rating */}
      <div className="flex items-center gap-4">
        <div className="text-center">
          <div className="text-4xl font-bold text-charcoal">{averageRating.toFixed(1)}</div>
          <StarRating rating={averageRating} size="md" className="justify-center mt-1" />
          <div className="text-sm text-gray-500 mt-1">
            {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
          </div>
        </div>

        {/* Rating Distribution */}
        <div className="flex-1 space-y-2">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = ratingDistribution[star] || 0;
            const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
            
            return (
              <div key={star} className="flex items-center gap-2">
                <span className="text-sm text-gray-600 w-8">{star} ★</span>
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-sm text-gray-500 w-8">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface CompactRatingProps {
  rating: number;
  reviewCount: number;
  size?: 'sm' | 'md';
  className?: string;
}

export function CompactRating({ rating, reviewCount, size = 'sm', className }: CompactRatingProps) {
  if (reviewCount === 0) {
    return (
      <span className={cn('text-sm text-gray-400', className)}>
        No reviews yet
      </span>
    );
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <StarRating rating={rating} size={size} />
      <span className={cn('font-medium text-gray-700', size === 'sm' ? 'text-sm' : 'text-base')}>
        {rating.toFixed(1)}
      </span>
      <span className={cn('text-gray-500', size === 'sm' ? 'text-xs' : 'text-sm')}>
        ({reviewCount})
      </span>
    </div>
  );
}
