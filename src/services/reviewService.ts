import { apiService } from './apiService';

export interface ReviewerInfo {
  userId: number;
  displayName: string;
}

export interface Review {
  id: number;
  reviewer: ReviewerInfo;
  productId?: number;
  productName?: string;
  vendorId?: number;
  vendorName?: string;
  eventId?: number;
  eventTitle?: string;
  serviceId?: number;
  serviceTitle?: string;
  rating: number;
  title?: string;
  comment?: string;
  reviewType: 'PRODUCT' | 'VENDOR' | 'EVENT' | 'SERVICE';
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  vendorResponse?: string;
  vendorResponseAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface RatingSummary {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<number, number>;
}

export interface VendorPublicProfile {
  id: number;
  userId: number;
  businessName: string;
  description?: string;
  logoUrl?: string;
  city?: string;
  country?: string;
  ratingSummary: RatingSummary;
  totalProducts: number;
  memberSince: string;
}

export interface CreateProductReviewRequest {
  productId: number;
  orderId?: number;
  rating: number;
  title?: string;
  comment?: string;
}

export interface CreateVendorReviewRequest {
  vendorId: number;
  orderId?: number;
  rating: number;
  title?: string;
  comment?: string;
}

export interface CreateEventReviewRequest {
  eventId: number;
  eventOrderId?: number;
  rating: number;
  title?: string;
  comment?: string;
}

export interface CreateServiceReviewRequest {
  serviceId: number;
  serviceOrderId?: number;
  rating: number;
  title?: string;
  comment?: string;
}

export interface UpdateReviewRequest {
  rating?: number;
  title?: string;
  comment?: string;
}

export interface VendorResponseRequest {
  response: string;
}

export interface PagedReviewResponse {
  content: Review[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

class ReviewService {
  // Product reviews
  async createProductReview(request: CreateProductReviewRequest): Promise<Review> {
    return apiService.postRequest<Review>('/api/v1/reviews/products', request);
  }

  async getProductReviews(productId: number, page = 0, size = 10): Promise<PagedReviewResponse> {
    return apiService.getRequest<PagedReviewResponse>(
      `/api/v1/reviews/products/${productId}?page=${page}&size=${size}`
    );
  }

  async getProductRatingSummary(productId: number): Promise<RatingSummary> {
    return apiService.getRequest<RatingSummary>(`/api/v1/reviews/products/${productId}/summary`);
  }

  async canReviewProduct(productId: number): Promise<boolean> {
    return apiService.getRequest<boolean>(`/api/v1/reviews/products/${productId}/can-review`);
  }

  // Vendor reviews
  async createVendorReview(request: CreateVendorReviewRequest): Promise<Review> {
    return apiService.postRequest<Review>('/api/v1/reviews/vendors', request);
  }

  async getVendorReviews(vendorId: number, page = 0, size = 10): Promise<PagedReviewResponse> {
    return apiService.getRequest<PagedReviewResponse>(
      `/api/v1/reviews/vendors/${vendorId}?page=${page}&size=${size}`
    );
  }

  async getVendorRatingSummary(vendorId: number): Promise<RatingSummary> {
    return apiService.getRequest<RatingSummary>(`/api/v1/reviews/vendors/${vendorId}/summary`);
  }

  async getVendorPublicProfile(vendorId: number): Promise<VendorPublicProfile> {
    return apiService.getRequest<VendorPublicProfile>(`/api/v1/reviews/vendors/${vendorId}/profile`);
  }

  async getVendorPublicProfileByUserId(userId: number): Promise<VendorPublicProfile> {
    return apiService.getRequest<VendorPublicProfile>(`/api/v1/reviews/vendors/by-user/${userId}/profile`);
  }

  async canReviewVendor(vendorId: number): Promise<boolean> {
    return apiService.getRequest<boolean>(`/api/v1/reviews/vendors/${vendorId}/can-review`);
  }

  // Event reviews
  async createEventReview(request: CreateEventReviewRequest): Promise<Review> {
    return apiService.postRequest<Review>('/api/v1/reviews/events', request);
  }

  async getEventReviews(eventId: number, page = 0, size = 10): Promise<PagedReviewResponse> {
    return apiService.getRequest<PagedReviewResponse>(
      `/api/v1/reviews/events/${eventId}?page=${page}&size=${size}`
    );
  }

  async getEventRatingSummary(eventId: number): Promise<RatingSummary> {
    return apiService.getRequest<RatingSummary>(`/api/v1/reviews/events/${eventId}/summary`);
  }

  async canReviewEvent(eventId: number): Promise<boolean> {
    return apiService.getRequest<boolean>(`/api/v1/reviews/events/${eventId}/can-review`);
  }

  // Service reviews
  async createServiceReview(request: CreateServiceReviewRequest): Promise<Review> {
    return apiService.postRequest<Review>('/api/v1/reviews/services', request);
  }

  async getServiceReviews(serviceId: number, page = 0, size = 10): Promise<PagedReviewResponse> {
    return apiService.getRequest<PagedReviewResponse>(
      `/api/v1/reviews/services/${serviceId}?page=${page}&size=${size}`
    );
  }

  async getServiceRatingSummary(serviceId: number): Promise<RatingSummary> {
    return apiService.getRequest<RatingSummary>(`/api/v1/reviews/services/${serviceId}/summary`);
  }

  async canReviewService(serviceId: number): Promise<boolean> {
    return apiService.getRequest<boolean>(`/api/v1/reviews/services/${serviceId}/can-review`);
  }

  // Common operations
  async updateReview(reviewId: number, request: UpdateReviewRequest): Promise<Review> {
    return apiService.putRequest<Review>(`/api/v1/reviews/${reviewId}`, request);
  }

  async deleteReview(reviewId: number): Promise<void> {
    return apiService.deleteRequest(`/api/v1/reviews/${reviewId}`);
  }

  async markReviewHelpful(reviewId: number): Promise<void> {
    return apiService.postRequest(`/api/v1/reviews/${reviewId}/helpful`, {});
  }

  async getMyReviews(page = 0, size = 10): Promise<PagedReviewResponse> {
    return apiService.getRequest<PagedReviewResponse>(
      `/api/v1/reviews/my-reviews?page=${page}&size=${size}`
    );
  }

  // Vendor operations
  async addVendorResponse(reviewId: number, request: VendorResponseRequest): Promise<Review> {
    return apiService.postRequest<Review>(`/api/v1/reviews/${reviewId}/vendor-response`, request);
  }
}

export const reviewService = new ReviewService();
export default reviewService;
