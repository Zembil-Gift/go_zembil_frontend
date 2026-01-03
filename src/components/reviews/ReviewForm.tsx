import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RatingInput } from './StarRating';
import { 
  reviewService, 
  CreateProductReviewRequest, 
  CreateVendorReviewRequest,
  CreateEventReviewRequest,
  CreateServiceReviewRequest 
} from '@/services/reviewService';
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

// ==================== Event Review Form ====================

interface EventReviewFormProps {
  eventId: number;
  eventOrderId?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
  compact?: boolean;
}

export function EventReviewForm({ eventId, eventOrderId, onSuccess, onCancel, compact = false }: EventReviewFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [showDetails, setShowDetails] = useState(!compact);

  const mutation = useMutation({
    mutationFn: (request: CreateEventReviewRequest) => reviewService.createEventReview(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-reviews', eventId] });
      queryClient.invalidateQueries({ queryKey: ['event-rating-summary', eventId] });
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
      eventId,
      eventOrderId,
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
            <Label htmlFor="event-title">Review Title (optional)</Label>
            <Input
              id="event-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Summarize your experience"
              maxLength={200}
            />
          </div>

          <div>
            <Label htmlFor="event-comment">Your Review (optional)</Label>
            <Textarea
              id="event-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience at this event..."
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

// ==================== Service Review Form ====================

interface ServiceReviewFormProps {
  serviceId: number;
  serviceOrderId?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
  compact?: boolean;
}

export function ServiceReviewForm({ serviceId, serviceOrderId, onSuccess, onCancel, compact = false }: ServiceReviewFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [showDetails, setShowDetails] = useState(!compact);

  const mutation = useMutation({
    mutationFn: (request: CreateServiceReviewRequest) => reviewService.createServiceReview(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-reviews', serviceId] });
      queryClient.invalidateQueries({ queryKey: ['service-rating-summary', serviceId] });
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
      serviceId,
      serviceOrderId,
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
            <Label htmlFor="service-title">Review Title (optional)</Label>
            <Input
              id="service-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Summarize your experience"
              maxLength={200}
            />
          </div>

          <div>
            <Label htmlFor="service-comment">Your Review (optional)</Label>
            <Textarea
              id="service-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience with this service..."
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
