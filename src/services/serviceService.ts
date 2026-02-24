import { apiService } from './apiService';
import type { DiscountInfo } from '@/types/discount';

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
  name?: string;
  description?: string;
  summary?: string;
  tags?: string[];
  location?: string;
  city?: string;
  categoryId?: number;
  categoryName?: string;
  vendorId?: number;
  vendorName?: string;
  basePriceMinor: number;
  vendorPriceMinor?: number;
  basePrice?: number;
  vendorPrice?: number;
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
  // Package support
  packages?: ServicePackageResponse[];
  defaultPackage?: ServicePackageResponse;
  hasPackages?: boolean;
  activeDiscount?: DiscountInfo;
}

export type ServicePackageStatus = 
  | 'PENDING' 
  | 'APPROVED' 
  | 'REJECTED' 
  | 'SUSPENDED' 
  | 'ARCHIVED';

export interface ServicePackageAttribute {
  id: number;
  name?: string;
  value: string;
  sortOrder: number;
}

export interface ServicePackageResponse {
  id: number;
  serviceId: number;
  serviceName?: string;
  packageCode: string;
  name: string;
  description?: string;
  durationMinutes?: number;
  sessionDuration?: number;
  features?: string[];
  isDefault: boolean;
  isFeatured?: boolean;
  isAd?: boolean;
  status: ServicePackageStatus;
  rejectionReason?: string;
  approvedAt?: string;
  maxBookingsPerDay?: number;
  sortOrder: number;
  basePriceMinor: number;      // Minor units (backward compatibility)
  vendorPriceMinor?: number;   // Minor units (backward compatibility)
  basePrice?: number;          // Major units for display (from backend)
  vendorPrice?: number;        // Major units for display (from backend)
  currency: string;
  availabilityType?: AvailabilityType;
  availabilityConfig?: AvailabilityConfig;
  attributes?: ServicePackageAttribute[];
  images?: ServiceImage[];
  primaryImageUrl?: string;
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
  location?: string;
  city?: string;
  // Note: availability settings are now at package level, not service level
  policiesConfig?: PoliciesConfig;
}

export interface UpdateServiceRequest {
  title?: string;
  description?: string;
  categoryId?: number;
  location?: string;
  city?: string;
  policiesConfig?: PoliciesConfig;
}

// ==================== Service Package Types ====================

export interface CreateServicePackageRequest {
  packageCode?: string;
  name: string;
  description?: string;
  durationMinutes?: number;
  basePrice: number;  // Vendor price in major units
  currency?: string;  // 3-letter code, defaults to ETB
  isDefault?: boolean;
  maxBookingsPerDay?: number;
  sortOrder?: number;
  availabilityType: AvailabilityType;
  availabilityConfig: AvailabilityConfig;
  attributes?: { name?: string; value: string; sortOrder?: number }[];
}

export interface UpdateServicePackageRequest {
  name?: string;
  description?: string;
  durationMinutes?: number;
  basePrice?: number;  // Vendor price in major units
  currency?: string;
  isDefault?: boolean;
  maxBookingsPerDay?: number;
  sortOrder?: number;
  availabilityType?: AvailabilityType;
  availabilityConfig?: AvailabilityConfig;
  attributes?: { name?: string; value: string; sortOrder?: number }[];
}

class ServiceService {
  private readonly MAX_REJECTION_REASON_LENGTH = 500;

  private normalizeRejectionReason(reason: string): string {
    const trimmedReason = reason?.trim();

    if (!trimmedReason) {
      throw new Error('Rejection reason is required');
    }

    if (trimmedReason.length > this.MAX_REJECTION_REASON_LENGTH) {
      throw new Error(`Rejection reason must be ${this.MAX_REJECTION_REASON_LENGTH} characters or fewer`);
    }

    return trimmedReason;
  }

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
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('size', size.toString());
    const url = `/api/services/featured?${params.toString()}`;
    return await apiService.getRequest<PagedServiceResponse>(url);
  }

  /**
   * Get ad service packages
   */
  async getAdServicePackages(limit: number = 5): Promise<ServicePackageResponse[]> {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    const url = `/api/packages/ads?${params.toString()}`;
    return await apiService.getRequest<ServicePackageResponse[]>(url);
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
  async getMyServices(status?: ServiceStatus, page: number = 0, size: number = 20, query?: string): Promise<PagedServiceResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('size', size.toString());
    if (status) {
      queryParams.append('status', status);
    }
    if (query?.trim()) {
      queryParams.append('query', query.trim());
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
   * Get service by ID
   */
  async getServiceById(serviceId: number): Promise<ServiceResponse> {
    return await apiService.getRequest<ServiceResponse>(`/api/services/${serviceId}`);
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

  // ==================== Package Endpoints ====================

  /**
   * Create a new package for a service (vendor only)
   */
  async createPackage(serviceId: number, data: CreateServicePackageRequest): Promise<ServicePackageResponse> {
    return await apiService.postRequest<ServicePackageResponse>(`/api/vendor/services/${serviceId}/packages`, data);
  }

  /**
   * Update a package (vendor only)
   */
  async updatePackage(packageId: number, data: UpdateServicePackageRequest): Promise<ServicePackageResponse> {
    return await apiService.putRequest<ServicePackageResponse>(`/api/vendor/packages/${packageId}`, data);
  }

  /**
   * Get vendor's package by ID
   */
  async getVendorPackage(packageId: number): Promise<ServicePackageResponse> {
    return await apiService.getRequest<ServicePackageResponse>(`/api/vendor/packages/${packageId}`);
  }

  /**
   * Get all packages for a service (vendor)
   */
  async getVendorServicePackages(serviceId: number): Promise<ServicePackageResponse[]> {
    return await apiService.getRequest<ServicePackageResponse[]>(`/api/vendor/services/${serviceId}/packages`);
  }

  /**
   * Archive a package (vendor only)
   */
  async archivePackage(packageId: number): Promise<ServicePackageResponse> {
    return await apiService.postRequest<ServicePackageResponse>(`/api/vendor/packages/${packageId}/archive`);
  }

  /**
   * Set a package as default for its service (vendor only)
   */
  async setDefaultPackage(serviceId: number, packageId: number): Promise<ServicePackageResponse> {
    return await apiService.postRequest<ServicePackageResponse>(`/api/vendor/services/${serviceId}/packages/${packageId}/set-default`);
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
    const normalizedReason = this.normalizeRejectionReason(reason);
    return await apiService.postRequest<ServiceResponse>(`/api/services/${id}/reject?reason=${encodeURIComponent(normalizedReason)}`);
  }

  /**
   * Suspend a service (admin only)
   */
  async suspendService(id: number, reason: string): Promise<ServiceResponse> {
    return await apiService.postRequest<ServiceResponse>(`/api/services/${id}/suspend?reason=${encodeURIComponent(reason)}`);
  }

  /**
   * Unsuspend a service (admin only)
   */
  async unsuspendService(id: number): Promise<ServiceResponse> {
    return await apiService.postRequest<ServiceResponse>(`/api/services/${id}/unsuspend`);
  }

  // ==================== Utility Methods ====================

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
   * Checks service-level config first, then falls back to default package config
   */
  parseAvailabilityConfig(service: ServiceResponse): AvailabilityConfig {
    // First check service-level availability config with workingDays
    if (service.availabilityConfig && service.availabilityConfig.workingDays) {
      return service.availabilityConfig;
    }
    
    // Fall back to default package availability config if available with workingDays
    if (service.defaultPackage?.availabilityConfig?.workingDays) {
      return service.defaultPackage.availabilityConfig;
    }
    
    // If service has availabilityConfig without workingDays, still use it (may have other settings)
    if (service.availabilityConfig) {
      return service.availabilityConfig;
    }
    
    // If default package has availabilityConfig without workingDays, use it
    if (service.defaultPackage?.availabilityConfig) {
      return service.defaultPackage.availabilityConfig;
    }
    
    // Default fallback - all days available
    return {
      workingDays: [0, 1, 2, 3, 4, 5, 6],
      blackoutDates: [],
      advanceBookingDays: 30,
      maxBookingsPerDay: 3,
      timeSlots: ['09:00', '14:00', '18:00'],
    };
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

  /**
   * Get service price in major units. Prefers backend-calculated major units if available.
   */
  getServicePrice(service: ServiceResponse): number {
    // Prefer backend-provided major units, fallback to conversion if not available
    if (service.basePrice != null) return service.basePrice;
    // Fallback: convert minor to major (default 2 decimal places)
    return service.basePriceMinor / 100;
  }

  /**
   * Get package price in major units. Prefers backend-calculated major units if available.
   */
  getPackagePrice(pkg: ServicePackageResponse): number {
    // Prefer backend-provided major units, fallback to conversion if not available
    if (pkg.basePrice != null) return pkg.basePrice;
    // Fallback: convert minor to major (default 2 decimal places)
    return pkg.basePriceMinor / 100;
  }

  /**
   * Format price for display using backend-provided major units.
   */
  formatPrice(amount: number, currency: string = 'ETB'): string {
    // Handle null or invalid currency
    let curr = currency;
    if (!curr || curr === 'null' || curr.trim() === '') {
      curr = 'USD';
    }

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  }
}

// Export singleton instance
export const serviceService = new ServiceService();
export default serviceService;
