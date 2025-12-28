import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MessageSquarePlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReviewCard } from './ReviewCard';
import { ProductReviewForm } from './ReviewForm';
import { RatingSummaryDisplay } from './RatingSummary';
import { reviewService } from '@/services/reviewService';
import { useAuth } from '@/hooks/useAuth';

interface ProductReviewsSectionProps {
  productId: number;
}

export function ProductReviewsSection({ productId }: ProductReviewsSectionProps) {
  const { isAuthenticated } = useAuth();
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [page, setPage] = useState(0);

  const { data: ratingSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ['product-rating-summary', productId],
    queryFn: () => reviewService.getProductRatingSummary(productId),
  });

  const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: ['product-reviews', productId, page],
    queryFn: () => reviewService.getProductReviews(productId, page, 5),
  });

  const { data: canReview } = useQuery({
    queryKey: ['can-review-product', productId],
    queryFn: () => reviewService.canReviewProduct(productId),
    enabled: isAuthenticated,
  });

  const reviews = reviewsData?.content || [];
  const totalPages = reviewsData?.totalPages || 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl font-bold text-charcoal">
          Customer Reviews
        </CardTitle>
        {isAuthenticated && canReview && !showReviewForm && (
          <Button
            onClick={() => setShowReviewForm(true)}
            className="bg-viridian-green hover:bg-viridian-green/90"
          >
            <MessageSquarePlus className="h-4 w-4 mr-2" />
            Write a Review
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Rating Summary */}
        {summaryLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-viridian-green" />
          </div>
        ) : ratingSummary ? (
          <RatingSummaryDisplay summary={ratingSummary} />
        ) : null}

        {/* Review Form */}
        {showReviewForm && (
          <div className="border-t pt-6">
            <h3 className="font-semibold text-charcoal mb-4">Write Your Review</h3>
            <ProductReviewForm
              productId={productId}
              onSuccess={() => setShowReviewForm(false)}
              onCancel={() => setShowReviewForm(false)}
            />
          </div>
        )}

        {/* Reviews List */}
        <div className="border-t pt-6 space-y-6">
          {reviewsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-viridian-green" />
            </div>
          ) : reviews.length > 0 ? (
            <>
              {reviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    Previous
                  </Button>
                  <span className="flex items-center px-3 text-sm text-gray-600">
                    Page {page + 1} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= totalPages - 1}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No reviews yet. Be the first to review this product!</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
