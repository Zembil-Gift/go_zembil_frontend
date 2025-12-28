import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RatingInput } from './StarRating';
import { reviewService, CreateProductReviewRequest, CreateVendorReviewRequest } from '@/services/reviewService';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react';

interface ProductReviewFormProps {
  productId: number;
  orderId?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
  compact?: boolean;
}

export function ProductReviewForm({ productId, orderId, onSuccess, onCancel, compact = false }: ProductReviewFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [showDetails, setShowDetails] = useState(!compact);

  const mutation = useMutation({
    mutationFn: (request: CreateProductReviewRequest) => reviewService.createProductReview(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-reviews', productId] });
      queryClient.invalidateQueries({ queryKey: ['product-rating-summary', productId] });
      toast({ title: 'Review submitted!', description: 'Thank you for your feedback.' });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to submit review',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast({ title: 'Please select a rating', variant: 'destructive' });
      return;
    }
    mutation.mutate({
      productId,
      orderId,
      rating,
      title: title.trim() || undefined,
      comment: comment.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label className="mb-2 block">Your Rating *</Label>
        <RatingInput value={rating} onChange={setRating} />
      </div>

      {compact && !showDetails && (
        <button
          type="button"
          onClick={() => setShowDetails(true)}
          className="text-sm text-viridian-green hover:underline flex items-center gap-1"
        >
          Add written review (optional)
          <ChevronDown className="h-4 w-4" />
        </button>
      )}

      {showDetails && (
        <>
          {compact && (
            <button
              type="button"
              onClick={() => setShowDetails(false)}
              className="text-sm text-gray-500 hover:underline flex items-center gap-1"
            >
              Hide written review
              <ChevronUp className="h-4 w-4" />
            </button>
          )}
          <div>
            <Label htmlFor="title">Review Title (optional)</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Summarize your experience"
              maxLength={200}
            />
          </div>

          <div>
            <Label htmlFor="comment">Your Review (optional)</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience with this product..."
              rows={4}
              maxLength={2000}
            />
          </div>
        </>
      )}

      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={mutation.isPending || rating === 0}
          className="bg-viridian-green hover:bg-viridian-green/90"
        >
          {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {showDetails ? 'Submit Review' : 'Submit Rating'}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

interface VendorReviewFormProps {
  vendorId: number;
  orderId?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
  compact?: boolean;
}

export function VendorReviewForm({ vendorId, orderId, onSuccess, onCancel, compact = false }: VendorReviewFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [showDetails, setShowDetails] = useState(!compact);

  const mutation = useMutation({
    mutationFn: (request: CreateVendorReviewRequest) => reviewService.createVendorReview(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-reviews', vendorId] });
      queryClient.invalidateQueries({ queryKey: ['vendor-rating-summary', vendorId] });
      queryClient.invalidateQueries({ queryKey: ['vendor-profile', vendorId] });
      toast({ title: 'Review submitted!', description: 'Thank you for your feedback.' });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to submit review',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast({ title: 'Please select a rating', variant: 'destructive' });
      return;
    }
    mutation.mutate({
      vendorId,
      orderId,
      rating,
      title: title.trim() || undefined,
      comment: comment.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label className="mb-2 block">Your Rating *</Label>
        <RatingInput value={rating} onChange={setRating} />
      </div>

      {compact && !showDetails && (
        <button
          type="button"
          onClick={() => setShowDetails(true)}
          className="text-sm text-viridian-green hover:underline flex items-center gap-1"
        >
          Add written review (optional)
          <ChevronDown className="h-4 w-4" />
        </button>
      )}

      {showDetails && (
        <>
          {compact && (
            <button
              type="button"
              onClick={() => setShowDetails(false)}
              className="text-sm text-gray-500 hover:underline flex items-center gap-1"
            >
              Hide written review
              <ChevronUp className="h-4 w-4" />
            </button>
          )}
          <div>
            <Label htmlFor="vendor-title">Review Title (optional)</Label>
            <Input
              id="vendor-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Summarize your experience"
              maxLength={200}
            />
          </div>

          <div>
            <Label htmlFor="vendor-comment">Your Review (optional)</Label>
            <Textarea
              id="vendor-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience with this vendor..."
              rows={4}
              maxLength={2000}
            />
          </div>
        </>
      )}

      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={mutation.isPending || rating === 0}
          className="bg-viridian-green hover:bg-viridian-green/90"
        >
          {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {showDetails ? 'Submit Review' : 'Submit Rating'}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
