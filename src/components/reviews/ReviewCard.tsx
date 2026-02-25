import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ThumbsUp, CheckCircle, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StarRating } from './StarRating';
import { Review, reviewService } from '@/services/reviewService';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface ReviewCardProps {
  review: Review;
  showProduct?: boolean;
}

export function ReviewCard({ review, showProduct = false }: ReviewCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [localHelpfulCount, setLocalHelpfulCount] = useState(review.helpfulCount);
  const [hasMarkedHelpful, setHasMarkedHelpful] = useState(false);

  const helpfulMutation = useMutation({
    mutationFn: () => reviewService.markReviewHelpful(review.id),
    onSuccess: () => {
      setLocalHelpfulCount(prev => prev + 1);
      setHasMarkedHelpful(true);
      toast({ title: 'Thanks for your feedback!' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to mark as helpful', variant: 'destructive' });
    },
  });

  const timeAgo = formatDistanceToNow(new Date(review.createdAt), { addSuffix: true });

  return (
    <div className="border-b border-gray-100 pb-6 last:border-b-0">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-charcoal">{review.reviewer.displayName}</span>
            {review.isVerifiedPurchase && (
              <Badge variant="secondary" className="text-xs bg-green-50 text-green-700 border-green-200">
                <CheckCircle className="h-3 w-3 mr-1" />
                Verified Purchase
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <StarRating rating={review.rating} size="sm" />
            <span className="text-sm text-gray-500">{timeAgo}</span>
          </div>
        </div>
      </div>

      {showProduct && review.productName && (
        <p className="text-sm text-gray-500 mb-2">
          Product: <span className="font-medium">{review.productName}</span>
        </p>
      )}

      {review.title && (
        <h4 className="font-semibold text-charcoal mb-2">{review.title}</h4>
      )}

      {review.comment && (
        <p className="text-gray-600 leading-relaxed mb-4">{review.comment}</p>
      )}

      {/* Vendor Response */}
      {review.vendorResponse && (
        <div className="bg-gray-50 rounded-lg p-4 mb-4 border-l-4 border-viridian-green">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="h-4 w-4 text-viridian-green" />
            <span className="font-medium text-sm text-viridian-green">Vendor Response</span>
            {review.vendorResponseAt && (
              <span className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(review.vendorResponseAt), { addSuffix: true })}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600">{review.vendorResponse}</p>
        </div>
      )}

      {/* Helpful Button */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => helpfulMutation.mutate()}
          disabled={hasMarkedHelpful || helpfulMutation.isPending}
          className="text-gray-500 hover:text-viridian-green"
        >
          <ThumbsUp className={`h-4 w-4 mr-1 ${hasMarkedHelpful ? 'fill-viridian-green text-viridian-green' : ''}`} />
          Helpful ({localHelpfulCount})
        </Button>
      </div>
    </div>
  );
}
