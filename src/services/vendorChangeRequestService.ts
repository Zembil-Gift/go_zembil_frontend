import { apiService } from './apiService';

// Types for the unified VendorChangeRequest system
export type EntityType = 'PRODUCT' | 'EVENT' | 'SERVICE';
export type RequestType = 'PRICE_UPDATE' | 'CATEGORY_CHANGE';
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface PriceDto {
  id?: number;
  currencyCode?: string;
  currencyId?: number;
  unitAmountMinor?: number;
  vendorAmountMinor?: number;
  amount?: number;
  vendorAmount?: number;
  useExchangeRate?: boolean;
  active?: boolean;
}

export interface VendorChangeRequestDto {
  id: number;
  entityType: EntityType;
  entityId: number;
  entityName?: string;
  entityImageUrl?: string;
  requestType: RequestType;
  vendorId: number;
  vendorName?: string;
  
  // For price updates - vendor prices (what vendor submitted)
  currentVendorPrice?: PriceDto;
  newVendorPrice?: PriceDto;
  
  // For price updates - customer prices (what customers will pay - for admin review)
  currentCustomerPrice?: PriceDto;
  newCustomerPrice?: PriceDto;
  
  // For category changes
  currentSubCategoryId?: number;
  currentSubCategoryName?: string;
  currentCategoryName?: string;
  newSubCategoryId?: number;
  newSubCategoryName?: string;
  newCategoryName?: string;
  
  reason?: string;
  status: RequestStatus;
  reviewedBy?: number;
  reviewedByName?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreatePriceUpdateRequest {
  newPrice: PriceDto;
  reason?: string;
}

export interface CreateCategoryChangeRequest {
  newSubCategoryId: number;
  reason?: string;
}

export interface EditChangeRequest {
  newPrice?: PriceDto;
  newSubCategoryId?: number;
  reason?: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

class VendorChangeRequestService {
  // ==================== VENDOR ENDPOINTS ====================

  // Product change requests
  async createProductPriceUpdateRequest(productId: number, request: CreatePriceUpdateRequest): Promise<VendorChangeRequestDto> {
    return apiService.postRequest<VendorChangeRequestDto>(
      `/api/vendor/change-requests/products/${productId}/price`,
      request
    );
  }

  async createProductSkuPriceUpdateRequest(productId: number, skuId: number, request: CreatePriceUpdateRequest): Promise<VendorChangeRequestDto> {
    return apiService.postRequest<VendorChangeRequestDto>(
      `/api/vendor/change-requests/products/${productId}/skus/${skuId}/price`,
      request
    );
  }

  async createProductCategoryChangeRequest(productId: number, request: CreateCategoryChangeRequest): Promise<VendorChangeRequestDto> {
    return apiService.postRequest<VendorChangeRequestDto>(
      `/api/vendor/change-requests/products/${productId}/category`,
      request
    );
  }

  // Service change requests
  async createServicePriceUpdateRequest(serviceId: number, request: CreatePriceUpdateRequest): Promise<VendorChangeRequestDto> {
    return apiService.postRequest<VendorChangeRequestDto>(
      `/api/vendor/change-requests/services/${serviceId}/price`,
      request
    );
  }

  async createServiceCategoryChangeRequest(serviceId: number, request: CreateCategoryChangeRequest): Promise<VendorChangeRequestDto> {
    return apiService.postRequest<VendorChangeRequestDto>(
      `/api/vendor/change-requests/services/${serviceId}/category`,
      request
    );
  }

  // Event change requests
  async createEventPriceUpdateRequest(eventId: number, ticketTypeId: number, request: CreatePriceUpdateRequest): Promise<VendorChangeRequestDto> {
    return apiService.postRequest<VendorChangeRequestDto>(
      `/api/vendor/change-requests/events/${eventId}/ticket-types/${ticketTypeId}/price`,
      request
    );
  }

  async createEventCategoryChangeRequest(eventId: number, request: CreateCategoryChangeRequest): Promise<VendorChangeRequestDto> {
    return apiService.postRequest<VendorChangeRequestDto>(
      `/api/vendor/change-requests/events/${eventId}/category`,
      request
    );
  }

  // Common vendor operations
  async getMyChangeRequests(page = 0, size = 20): Promise<PageResponse<VendorChangeRequestDto>> {
    return apiService.getRequest<PageResponse<VendorChangeRequestDto>>(
      `/api/vendor/change-requests?page=${page}&size=${size}`
    );
  }

  async getMyChangeRequestsByEntityType(entityType: EntityType, page = 0, size = 20): Promise<PageResponse<VendorChangeRequestDto>> {
    return apiService.getRequest<PageResponse<VendorChangeRequestDto>>(
      `/api/vendor/change-requests/entity-type/${entityType}?page=${page}&size=${size}`
    );
  }

  async getChangeRequest(requestId: number): Promise<VendorChangeRequestDto> {
    return apiService.getRequest<VendorChangeRequestDto>(
      `/api/vendor/change-requests/${requestId}`
    );
  }

  async editChangeRequest(requestId: number, request: EditChangeRequest): Promise<VendorChangeRequestDto> {
    return apiService.putRequest<VendorChangeRequestDto>(
      `/api/vendor/change-requests/${requestId}`,
      request
    );
  }

  async deleteChangeRequest(requestId: number): Promise<void> {
    return apiService.deleteRequest<void>(`/api/vendor/change-requests/${requestId}`);
  }

  async checkPendingRequest(entityType: EntityType, entityId: number, requestType: RequestType): Promise<VendorChangeRequestDto | null> {
    try {
      return await apiService.getRequest<VendorChangeRequestDto>(
        `/api/vendor/change-requests/check/${entityType}/${entityId}/${requestType}`
      );
    } catch {
      return null;
    }
  }

  // ==================== ADMIN ENDPOINTS ====================

  async getAllChangeRequests(page = 0, size = 20): Promise<PageResponse<VendorChangeRequestDto>> {
    return apiService.getRequest<PageResponse<VendorChangeRequestDto>>(
      `/api/admin/vendor-change-requests?page=${page}&size=${size}`
    );
  }

  async getChangeRequestsByStatus(status: RequestStatus, page = 0, size = 20): Promise<PageResponse<VendorChangeRequestDto>> {
    return apiService.getRequest<PageResponse<VendorChangeRequestDto>>(
      `/api/admin/vendor-change-requests/status/${status}?page=${page}&size=${size}`
    );
  }

  async getChangeRequestsByEntityType(entityType: EntityType, page = 0, size = 20): Promise<PageResponse<VendorChangeRequestDto>> {
    return apiService.getRequest<PageResponse<VendorChangeRequestDto>>(
      `/api/admin/vendor-change-requests/entity-type/${entityType}?page=${page}&size=${size}`
    );
  }

  async getAdminChangeRequest(requestId: number): Promise<VendorChangeRequestDto> {
    return apiService.getRequest<VendorChangeRequestDto>(
      `/api/admin/vendor-change-requests/${requestId}`
    );
  }

  async approveChangeRequest(requestId: number): Promise<VendorChangeRequestDto> {
    return apiService.postRequest<VendorChangeRequestDto>(
      `/api/admin/vendor-change-requests/${requestId}/approve`,
      {}
    );
  }

  async rejectChangeRequest(requestId: number, reason: string): Promise<VendorChangeRequestDto> {
    return apiService.postRequest<VendorChangeRequestDto>(
      `/api/admin/vendor-change-requests/${requestId}/reject?reason=${encodeURIComponent(reason)}`,
      {}
    );
  }

  async getVendorChangeRequests(vendorId: number, page = 0, size = 20): Promise<PageResponse<VendorChangeRequestDto>> {
    return apiService.getRequest<PageResponse<VendorChangeRequestDto>>(
      `/api/admin/vendor-change-requests/vendor/${vendorId}?page=${page}&size=${size}`
    );
  }

  // ==================== UTILITY FUNCTIONS ====================


  formatPrice(priceDto: PriceDto | undefined, defaultCurrency: string = 'ETB'): string {
    if (!priceDto) return 'N/A';
    const currency = priceDto.currencyCode || defaultCurrency;
    const decimals = currency === 'ETB' ? 0 : currency === 'USD' ? 2 : 2;
    const symbol = currency === 'ETB' ? 'ETB ' : currency === 'USD' ? '$' : `${currency} `;
    
    if (priceDto.amount != null) {
      return `${symbol}${priceDto.amount.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
    }
    
    console.warn('formatPrice: amount field missing, falling back to unitAmountMinor conversion.');
    const divisor = Math.pow(10, decimals);
    const amount = priceDto.unitAmountMinor ? priceDto.unitAmountMinor / divisor : 0;
    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
  }

  /**
   * @deprecated Use formatPrice with PriceDto instead. Backend provides major units.
   */
  formatPriceMinor(amountMinor: number, currency: string = 'ETB'): string {
    console.warn('formatPriceMinor is deprecated. Use formatPrice with PriceDto instead.');
    const decimals = currency === 'ETB' ? 0 : currency === 'USD' ? 2 : 2;
    const divisor = Math.pow(10, decimals);
    const amount = amountMinor / divisor;
    const symbol = currency === 'ETB' ? 'ETB ' : currency === 'USD' ? '$' : `${currency} `;
    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
  }

  getEntityTypeLabel(entityType: EntityType): string {
    switch (entityType) {
      case 'PRODUCT': return 'Product';
      case 'EVENT': return 'Event';
      case 'SERVICE': return 'Service';
      default: return entityType;
    }
  }

  getRequestTypeLabel(requestType: RequestType): string {
    switch (requestType) {
      case 'PRICE_UPDATE': return 'Price Update';
      case 'CATEGORY_CHANGE': return 'Category Change';
      default: return requestType;
    }
  }

  getStatusColor(status: RequestStatus): string {
    switch (status) {
      case 'PENDING': return 'bg-amber-100 text-amber-800';
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
}

export const vendorChangeRequestService = new VendorChangeRequestService();
export default vendorChangeRequestService;
