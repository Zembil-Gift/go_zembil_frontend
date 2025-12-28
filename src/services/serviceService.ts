import { apiService } from './apiService';

/**
 * Service types matching the backend ServiceResponse DTO
 */
export interface ServiceImage {
  id: number;
  url: string;
  fullUrl: string;
  originalFilename?: string;
  altText?: string;
  sortOrder: number;
  isPrimary: boolean;
  fileSize?: number;
  contentType?: string;
  createdAt?: string;
}

export interface AvailabilityConfig {
  workingDays?: number[];
  blackoutDates?: string[];
  advanceBookingDays?: number;
  maxBookingsPerDay?: number;
  // For TIME_SLOTS type
  timeSlots?: string[];
  // For WORKING_HOURS type
  workingHoursStart?: string;
  workingHoursEnd?: string;
}

export type AvailabilityType = 'TIME_SLOTS' | 'WORKING_HOURS';

export interface PoliciesConfig {
  // Note: rescheduleHours and cancellationPolicy are system-enforced (48h/24h tiers)
  // and not configurable by vendors
  depositRequired?: boolean;
  depositPercentage?: number;
}

export interface ServiceResponse {
  id: number;
  title: string;
  description?: string;
  location?: string;
  city?: string;
  categoryId?: number;
  categoryName?: string;
  vendorId?: number;
  vendorName?: string;
  basePriceMinor: number;
  vendorPriceMinor?: number;
  currency: string;
  durationMinutes?: number;
  images?: ServiceImage[];
  primaryImageUrl?: string;
  availabilityType: AvailabilityType;
  availabilityConfig?: AvailabilityConfig;
  policiesConfig?: PoliciesConfig;
  status: ServiceStatus;
  rejectionReason?: string;
  approvedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type ServiceStatus = 
  | 'PENDING_APPROVAL' 
  | 'APPROVED' 
  | 'REJECTED' 
  | 'SUSPENDED' 
  | 'ARCHIVED';

export interface PagedServiceResponse {
  content: ServiceResponse[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface ServiceFilterParams {
  page?: number;
  size?: number;
  query?: string;
  city?: string;
  categoryId?: number;
  minPriceMinor?: number;
  maxPriceMinor?: number;
}

export interface CreateServiceRequest {
  title: string;
  description?: string;
  categoryId?: number;
  basePrice: number;
  currency?: string;
  durationMinutes?: number;
  location?: string;
  city?: string;
  availabilityType?: AvailabilityType;
  availabilityConfig?: AvailabilityConfig;
  policiesConfig?: PoliciesConfig;
}

export interface UpdateServiceRequest {
  title?: string;
  description?: string;
  categoryId?: number;
  basePrice?: number;
  currency?: string;
  durationMinutes?: number;
  location?: string;
  city?: string;
  availabilityType?: AvailabilityType;
  availabilityConfig?: AvailabilityConfig;
  policiesConfig?: PoliciesConfig;
}

class ServiceService {
  /**
   * Get all approved services with optional filters (public endpoint)
   */
  async getServices(params: ServiceFilterParams = {}): Promise<PagedServiceResponse> {
    const queryParams = new URLSearchParams();
    
    queryParams.append('page', (params.page ?? 0).toString());
    queryParams.append('size', (params.size ?? 20).toString());
    
    if (params.query) {
      queryParams.append('query', params.query);
    }
    if (params.city) {
      queryParams.append('city', params.city);
    }
    if (params.categoryId) {
      queryParams.append('categoryId', params.categoryId.toString());
    }
    
    const url = `/api/services?${queryParams.toString()}`;
    return await apiService.getRequest<PagedServiceResponse>(url);
  }

  /**
   * Get featured services
   */
  async getFeaturedServices(page: number = 0, size: number = 10): Promise<PagedServiceResponse> {
    const url = `/api/services/featured?page=${page}&size=${size}`;
    return await apiService.getRequest<PagedServiceResponse>(url);
  }

  /**
   * Get service by ID (public endpoint)
   */
  async getService(id: number): Promise<ServiceResponse> {
    return await apiService.getRequest<ServiceResponse>(`/api/services/${id}`);
  }

  /**
   * Check if a specific time slot is available
   */
  async checkSlotAvailability(serviceId: number, dateTime: string): Promise<boolean> {
    const url = `/api/services/${serviceId}/availability?dateTime=${encodeURIComponent(dateTime)}`;
    return await apiService.getRequest<boolean>(url);
  }

  /**
   * Get available time slots for a specific date
   */
  async getAvailableSlots(serviceId: number, date: string): Promise<string[]> {
    const url = `/api/services/${serviceId}/available-slots?date=${date}`;
    return await apiService.getRequest<string[]>(url);
  }

  /**
   * Get available dates within a date range
   */
  async getAvailableDates(serviceId: number, startDate: string, endDate: string): Promise<string[]> {
    const url = `/api/services/${serviceId}/available-dates?startDate=${startDate}&endDate=${endDate}`;
    return await apiService.getRequest<string[]>(url);
  }

  // ==================== Vendor Endpoints ====================

  /**
   * Create a new service (vendor only)
   */
  async createService(data: CreateServiceRequest): Promise<ServiceResponse> {
    return await apiService.postRequest<ServiceResponse>('/api/services', data);
  }

  /**
   * Get vendor's own services
   */
  async getMyServices(status?: ServiceStatus, page: number = 0, size: number = 20): Promise<PagedServiceResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('size', size.toString());
    if (status) {
      queryParams.append('status', status);
    }
    const url = `/api/services/vendor/me?${queryParams.toString()}`;
    return await apiService.getRequest<PagedServiceResponse>(url);
  }

  /**
   * Get vendor's specific service
   */
  async getMyService(serviceId: number): Promise<ServiceResponse> {
    return await apiService.getRequest<ServiceResponse>(`/api/services/vendor/me/${serviceId}`);
  }

  /**
   * Get vendor's pending/rejected services
   */
  async getMyPendingRejectedServices(page: number = 0, size: number = 20): Promise<PagedServiceResponse> {
    return await apiService.getRequest<PagedServiceResponse>(`/api/services/vendor/me/pending-rejected?page=${page}&size=${size}`);
  }

  /**
   * Edit a pending/rejected service (vendor only)
   */
  async editPendingService(id: number, data: UpdateServiceRequest): Promise<ServiceResponse> {
    return await apiService.putRequest<ServiceResponse>(`/api/services/${id}/edit`, data);
  }

  /**
   * Update a service (vendor only)
   */
  async updateService(id: number, data: UpdateServiceRequest): Promise<ServiceResponse> {
    return await apiService.putRequest<ServiceResponse>(`/api/services/${id}`, data);
  }

  /**
   * Archive a service (vendor only)
   */
  async archiveService(id: number): Promise<ServiceResponse> {
    return await apiService.postRequest<ServiceResponse>(`/api/services/${id}/archive`);
  }

  // ==================== Admin Endpoints ====================

  /**
   * Get all services (admin only)
   */
  async getAllServicesAdmin(
    status?: ServiceStatus, 
    search?: string, 
    page: number = 0, 
    size: number = 20
  ): Promise<PagedServiceResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('size', size.toString());
    if (status) {
      queryParams.append('status', status);
    }
    if (search) {
      queryParams.append('search', search);
    }
    const url = `/api/services/admin/all?${queryParams.toString()}`;
    return await apiService.getRequest<PagedServiceResponse>(url);
  }

  /**
   * Get pending approval services (admin only)
   */
  async getPendingServices(page: number = 0, size: number = 20): Promise<PagedServiceResponse> {
    const url = `/api/services/admin/pending?page=${page}&size=${size}`;
    return await apiService.getRequest<PagedServiceResponse>(url);
  }

  /**
   * Approve a service (admin only)
   */
  async approveService(id: number): Promise<ServiceResponse> {
    return await apiService.postRequest<ServiceResponse>(`/api/services/${id}/approve`);
  }

  /**
   * Reject a service (admin only)
   */
  async rejectService(id: number, reason: string): Promise<ServiceResponse> {
    return await apiService.postRequest<ServiceResponse>(`/api/services/${id}/reject?reason=${encodeURIComponent(reason)}`);
  }

  /**
   * Suspend a service (admin only)
   */
  async suspendService(id: number, reason: string): Promise<ServiceResponse> {
    return await apiService.postRequest<ServiceResponse>(`/api/services/${id}/suspend?reason=${encodeURIComponent(reason)}`);
  }

  // ==================== Utility Methods ====================

  /**
   * Format price from minor units to display string
   */
  formatPrice(priceMinor: number, currency: string): string {
    const amount = priceMinor / 100;
    if (currency === 'ETB') {
      return `${amount.toLocaleString('en-ET', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ETB`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  /**
   * Get primary image URL from service
   */
  getPrimaryImageUrl(service: ServiceResponse): string | undefined {
    if (service.primaryImageUrl) {
      return service.primaryImageUrl;
    }
    if (service.images && service.images.length > 0) {
      const primary = service.images.find(img => img.isPrimary);
      return primary?.fullUrl || service.images[0]?.fullUrl;
    }
    return undefined;
  }

  /**
   * Parse availability config from service
   */
  parseAvailabilityConfig(service: ServiceResponse): AvailabilityConfig {
    if (!service.availabilityConfig) {
      return {
        workingDays: [1, 2, 3, 4, 5, 6, 0],
        blackoutDates: [],
        advanceBookingDays: 30,
        maxBookingsPerDay: 3,
        timeSlots: ['09:00', '14:00', '18:00'],
      };
    }
    return service.availabilityConfig;
  }

  /**
   * Parse policies config from service
   * Note: rescheduleHours and cancellationPolicy are system-enforced (48h/24h tiers)
   */
  parsePoliciesConfig(service: ServiceResponse): PoliciesConfig {
    if (!service.policiesConfig) {
      return {
        depositRequired: false,
        depositPercentage: 0,
      };
    }
    return service.policiesConfig;
  }

  /**
   * Get system-enforced cancellation policy text
   */
  getSystemCancellationPolicy(): string {
    return 'Free cancellation up to 48 hours before service. 50% refund for cancellations 24-48 hours before. No refund for cancellations less than 24 hours before service.';
  }

  /**
   * Get system-enforced reschedule hours
   */
  getSystemRescheduleHours(): number {
    return 48;
  }
}

// Export singleton instance
export const serviceService = new ServiceService();
export default serviceService;
