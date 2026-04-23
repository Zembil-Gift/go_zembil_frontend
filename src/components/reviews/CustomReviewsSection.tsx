import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageSquarePlus, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReviewCard } from "./ReviewCard";
import { CustomReviewForm } from "./ReviewForm";
import { StarRating } from "./StarRating";
import { reviewService } from "@/services/reviewService";
import { useAuth } from "@/hooks/useAuth";

interface CustomReviewsSectionProps {
  customOrderId: number;
  title?: string;
}

export function CustomReviewsSection({
  customOrderId,
  title = "Custom Order Reviews",
}: CustomReviewsSectionProps) {
  const { isAuthenticated } = useAuth();
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [page, setPage] = useState(0);

  const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: ["custom-reviews", customOrderId, page],
    queryFn: () => reviewService.getCustomReviews(customOrderId, page, 5),
    enabled: customOrderId > 0,
  });

  const { data: canReview } = useQuery({
    queryKey: ["can-review-custom", customOrderId],
    queryFn: () => reviewService.canReviewCustom(customOrderId),
    enabled: isAuthenticated && customOrderId > 0,
  });

  const reviews = reviewsData?.content || [];
  const totalPages = reviewsData?.totalPages || 0;
  const totalReviews = reviewsData?.totalElements || 0;
  const averageRating =
    totalReviews > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl font-bold text-charcoal">
          {title}
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
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <StarRating rating={averageRating} size="sm" />
            <span className="text-sm text-gray-700 font-medium">
              {totalReviews > 0 ? averageRating.toFixed(1) : "0.0"} average
              rating
            </span>
            <span className="text-sm text-gray-500">
              ({totalReviews} {totalReviews === 1 ? "review" : "reviews"})
            </span>
          </div>
        </div>

        {showReviewForm && (
          <div className="border-t pt-6">
            <h3 className="font-semibold text-charcoal mb-4">
              Write Your Review
            </h3>
            <CustomReviewForm
              customOrderId={customOrderId}
              onSuccess={() => setShowReviewForm(false)}
              onCancel={() => setShowReviewForm(false)}
            />
          </div>
        )}

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

              {totalPages > 1 && (
                <div className="flex justify-center gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
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
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= totalPages - 1}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No reviews yet. Be the first to review this custom order!</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
