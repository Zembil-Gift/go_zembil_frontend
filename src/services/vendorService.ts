import { apiService } from './apiService';
import { ImageDto } from './imageService';

export interface VendorProfile {
  id: number;
  userId: number;
  businessName: string;
  description?: string;
  businessEmail: string;
  businessPhone: string;
  logoUrl?: string;
  contactName?: string;
  city?: string;
  country?: string;
  countryCode?: string;
  isApproved: boolean;
  stripeAccountId?: string;
  stripeAccountStatus: string;
  chapaSubaccountId?: string;
  chapaAccountStatus: string;
  payoutEnabled: boolean;
  categoryId?: number;
  categoryName?: string;
  vatStatus?: 'VAT_REGISTERED' | 'NOT_VAT_REGISTERED' | 'VAT_EXEMPT';
  vendorType?: string;
}

export interface VendorOnboardingStatus {
  vendorId: number;
  stripeAccountId?: string;
  stripeStatus: string;
  stripeEnabled: boolean;
  chapaSubaccountId?: string;
  chapaStatus: string;
  chapaEnabled: boolean;
  payoutEnabled: boolean;
  canReceivePayments: boolean;
}

export interface VendorOnboardingResponse {
  vendorId: number;
  provider: string;
  accountId?: string;
  status: string;
  payoutsEnabled: boolean;
  onboardingUrl?: string;
  message: string;
}

export interface DashboardLinkResponse {
  url: string;
  provider: string;
}

export interface Bank {
  id: string;
  name: string;
  code: string;
}

export interface ProductPrice {
  currencyCode: string;
  amount?: number;
  vendorAmountMinor?: number;
  unitAmountMinor?: number;
}

export interface ProductSku {
  id?: number;
  skuCode: string;
  price?: {
    id?: number;
    currencyCode?: string;
    amount?: number;
    unitAmountMinor?: number;
    vendorAmount?: number;
    vendorAmountMinor?: number;
    prices?: ProductPrice[];
  };
  stockQuantity: number;
  isDefault?: boolean;
  attributes?: ProductAttribute[];
  images?: ImageDto[];
}

export interface ProductAttribute {
  id?: number;
  name: string;
  value: string;
}

export interface Product {
  id?: number;
  name: string;
  description?: string;
  summary?: string;
  vendorId?: number;
  vendorName?: string;
  categoryName?: string;
  cover?: string;
  images?: ImageDto[];
  useExchangeRate?: boolean;
  status?: string;
  rejectionReason?: string;
  price?: {
    id?: number;
    currencyCode?: string;
    amount?: number;
    unitAmountMinor?: number;
    vendorAmount?: number;
    vendorAmountMinor?: number;
    prices?: ProductPrice[];
  };
  subCategoryId?: number;
  isFeatured?: boolean;
  isCustomizable?: boolean;
  tags?: string[];
  occasion?: string;
  productSku?: ProductSku[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductFilter {
  name?: string;
  categoryId?: number;
  subCategoryId?: number;
  vendorId?: number;
  status?: string;
  minPrice?: number;
  maxPrice?: number;
  isFeatured?: boolean;
}

// Matches backend PriceDto
export interface PriceDto {
  id?: number;
  variantId?: number;
  currencyCode?: string;
  currencyId?: number;
  unitAmountMinor?: number;
  vendorAmountMinor?: number;
  amount?: number;
  vendorAmount?: number;
  useExchangeRate?: boolean;
  active?: boolean;
}

export interface PriceUpdateRequest {
  id?: number;
  productId?: number;
  productSkuId?: number;
  productName?: string;
  skuCode?: string;
  vendorId?: number;
  vendorName?: string;
  // Vendor prices (what vendor submitted - vendors see these)
  currentVendorPrice?: PriceDto;
  newVendorPrice?: PriceDto;
  // Customer prices (what customers will pay - for admin review)
  currentCustomerPrice?: PriceDto;
  newCustomerPrice?: PriceDto;
  // Legacy fields for backward compatibility
  currentPrice?: PriceDto;
  newPrice: PriceDto;
  reason?: string;
  status?: string;
  reviewedBy?: number;
  reviewedByName?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CategoryChangeRequest {
  id?: number;
  productId: number;
  productName?: string;
  productCover?: string;
  vendorId?: number;
  vendorName?: string;
  currentSubCategoryId?: number;
  currentSubCategoryName?: string;
  currentCategoryName?: string;
  newSubCategoryId: number;
  newSubCategoryName?: string;
  newCategoryName?: string;
  reason?: string;
  status?: string;
  reviewedBy?: number;
  reviewedByName?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ServicePriceUpdateRequest {
  id?: number;
  serviceId?: number;
  serviceName?: string;
  vendorId?: number;
  vendorName?: string;
  // Vendor prices (what vendor submitted - vendors see these)
  currentVendorPrice?: PriceDto;
  newVendorPrice?: PriceDto;
  // Customer prices (what customers will pay - for admin review)
  currentCustomerPrice?: PriceDto;
  newCustomerPrice?: PriceDto;
  // Legacy fields for backward compatibility
  currentPrice?: PriceDto;
  newPrice: PriceDto;
  reason?: string;
  status?: string;
  reviewedBy?: number;
  reviewedByName?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ServiceCategoryChangeRequest {
  id?: number;
  serviceId: number;
  serviceName?: string;
  serviceCover?: string;
  vendorId?: number;
  vendorName?: string;
  currentSubCategoryId?: number;
  currentSubCategoryName?: string;
  currentCategoryName?: string;
  newSubCategoryId: number;
  newSubCategoryName?: string;
  newCategoryName?: string;
  reason?: string;
  status?: string;
  reviewedBy?: number;
  reviewedByName?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TicketTypePrice {
  currencyCode: string;
  amount?: number;
  vendorAmountMinor?: number;
  unitAmountMinor?: number;
}

export interface CreateTicketType {
  name: string;
  description?: string;
  capacity: number;
  price: number;      // BigDecimal - vendor's price in major units
  currency?: string;  // 3-letter currency code, defaults to ETB
  sortOrder?: number;
}

export interface CreateEventRequest {
  title: string;
  description?: string;
  location: string;        // Backend uses 'location' not 'venue'
  city: string;
  eventDate: string;       // Backend uses 'eventDate' not 'startDateTime'
  eventEndDate?: string;   // Backend uses 'eventEndDate' not 'endDateTime'
  eventTypeId?: number;    // Backend uses 'eventTypeId' not 'categoryId'
  bannerImageUrl?: string; // Backend uses 'bannerImageUrl' not 'imageUrl'
  organizerContact?: string;
  ticketTypes: CreateTicketType[];
}

export interface UpdateEventRequest {
  title?: string;
  description?: string;
  shortDescription?: string;
  startDateTime?: string;
  endDateTime?: string;
  venue?: string;
  address?: string;
  city?: string;
  country?: string;
  imageUrl?: string;
}

export interface EventResponse {
  id: number;
  title: string;
  description?: string;
  location?: string;
  city?: string;
  eventDate: string;
  eventEndDate?: string;
  bannerImageUrl?: string;
  images?: ImageDto[];
  organizerContact?: string;
  isFeatured?: boolean;
  isSoldOut?: boolean;
  eventTypeId?: number;
  eventTypeName?: string;
  vendorId: number;
  vendorName?: string;
  ticketTypes?: TicketType[];
  startingPriceMinor?: number;
  currency?: string;
  totalCapacity?: number;
  totalAvailable?: number;
  totalSold?: number;
  status: string;
  rejectionReason?: string;
  approvedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface TicketType {
  id: number;
  name: string;
  description?: string;
  capacity: number;
  soldCount: number;
  availableCount?: number;
  // Backend returns these fields directly (not nested)
  priceMinor?: number;       // Customer-facing price (includes platform commission)
  vendorPriceMinor?: number; // Vendor's price (what vendor receives)
  currency?: string;
  originalCurrency?: string;
  originalPriceMinor?: number;
  // Legacy field for compatibility
  price?: { prices: TicketTypePrice[] };
  isActive: boolean;
  isAvailable?: boolean;
  sortOrder?: number;
  salesStartDate?: string;
  salesEndDate?: string;
}

export interface EventPriceUpdateRequest {
  ticketTypeId: number;
  newPrice: number;  // Vendor's price in major units (e.g., 100.00)
  newCurrency: string;
  reason: string;
}

export interface EventPriceUpdateResponse {
  id: number;
  ticketTypeId: number;
  ticketTypeName: string;
  eventId: number;
  eventTitle: string;
  vendorId: number;
  vendorName?: string;
  currentPriceMinor: number;
  currentCurrencyCode: string;
  newPriceMinor: number;
  newCurrencyCode: string;
  reason?: string;
  status: string;
  reviewedById?: number;
  reviewedByName?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface VendorEventSummary {
  totalEvents: number;
  activeEvents: number;
  pendingEvents: number;
  totalTicketsSold: number;
  totalRevenue: number;
  revenueCurrency: string;
}

export interface VendorRevenue {
  productRevenue: number;
  eventRevenue: number;
  totalRevenue: number;
  currencyCode: string;
  currencySymbol: string;
  productOrderCount: number;
  eventOrderCount: number;
  totalOrderCount: number;
  isVatRegistered: boolean;
  vatIncluded: number;
}

export type TicketStatus = 'ISSUED' | 'CHECKED_IN' | 'CANCELLED' | 'REFUNDED' | 'EXPIRED';

export interface TicketValidationResponse {
  valid: boolean;
  message: string;
  ticketId?: number;
  ticketCode?: string;
  status?: TicketStatus;
  recipientName?: string;
  recipientEmail?: string;
  ticketTypeName?: string;
  eventId?: number;
  eventTitle?: string;
  eventDate?: string;
  eventLocation?: string;
  orderNumber?: string;
  purchaserName?: string;
  checkedInAt?: string;
  checkedInByName?: string;
}

export interface EventAnalytics {
  eventId: number;
  eventTitle: string;
  totalCapacity: number;
  totalSold: number;
  totalCheckedIn: number;
  ticketTypeStats: TicketTypeStat[];
  revenue: number;
  currency: string;
}

export interface TicketTypeStat {
  ticketTypeId: number;
  name: string;
  capacity: number;
  sold: number;
  checkedIn: number;
  revenue: number;
}

export interface EventOrder {
  id: number;
  orderNumber: string;
  eventId: number;
  eventTitle: string;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  currency: string;
  status: string;
  ticketCount: number;
  createdAt: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export const vendorService = {
  getMyProfile: () =>
    apiService.getRequest<VendorProfile>('/api/vendors/me'),

  getOnboardingStatus: () =>
    apiService.getRequest<VendorOnboardingStatus>('/api/vendors/onboarding/status'),

  startStripeOnboarding: (refreshUrl: string, returnUrl: string) =>
    apiService.postRequest<VendorOnboardingResponse>('/api/vendors/onboarding/stripe/start', {
      refreshUrl,
      returnUrl,
    }),

  refreshStripeOnboarding: (refreshUrl: string, returnUrl: string) =>
    apiService.postRequest<VendorOnboardingResponse>('/api/vendors/onboarding/stripe/refresh', {
      refreshUrl,
      returnUrl,
    }),

  checkStripeStatus: () =>
    apiService.getRequest<VendorOnboardingResponse>('/api/vendors/onboarding/stripe/status'),

  getStripeDashboard: () =>
    apiService.getRequest<DashboardLinkResponse>('/api/vendors/onboarding/stripe/dashboard'),

  setupChapaSubaccount: (bankCode: string, accountNumber: string, accountName: string) =>
    apiService.postRequest<VendorOnboardingResponse>('/api/vendors/onboarding/chapa/setup', {
      bankCode,
      accountNumber,
      accountName,
    }),

  getChapaBanks: () =>
    apiService.getRequest<{ banks: Bank[]; provider: string }>('/api/vendors/onboarding/chapa/banks'),

  checkChapaStatus: () =>
    apiService.getRequest<VendorOnboardingResponse>('/api/vendors/onboarding/chapa/status'),

  createProduct: (product: Product) =>
    apiService.postRequest<Product>('/api/v1/products', product),

  updateProduct: (productId: number, product: Product) =>
    apiService.putRequest<Product>(`/api/v1/products/${productId}`, product),

  deleteProduct: (productId: number) =>
    apiService.deleteRequest<void>(`/api/v1/products/${productId}`),

  getVendorProducts: (vendorId: number, page = 0, size = 20) =>
    apiService.getRequest<PageResponse<Product>>(`/api/v1/products/filter?vendorId=${vendorId}&page=${page}&size=${size}`),

  getMyProducts: (page = 0, size = 20) =>
    apiService.getRequest<PageResponse<Product>>(`/api/v1/products/vendor/me?page=${page}&size=${size}`),

  getMyPendingRejectedProducts: (page = 0, size = 20) =>
    apiService.getRequest<PageResponse<Product>>(`/api/v1/products/vendor/me/pending-rejected?page=${page}&size=${size}`),

  createProductPriceUpdateRequest: (productId: number, request: PriceUpdateRequest) =>
    apiService.postRequest<PriceUpdateRequest>(`/api/vendor/change-requests/products/${productId}/price`, {
      newPrice: request.newPrice,
      reason: request.reason,
    }),

  createSkuPriceUpdateRequest: (productId: number, skuId: number, request: PriceUpdateRequest) =>
    apiService.postRequest<PriceUpdateRequest>(`/api/vendor/change-requests/products/${productId}/skus/${skuId}/price`, {
      newPrice: request.newPrice,
      reason: request.reason,
    }),

  getVendorPriceUpdateRequests: (vendorId: number, page = 0, size = 20) =>
    apiService.getRequest<PageResponse<PriceUpdateRequest>>(`/api/vendor/change-requests/entity-type/PRODUCT?page=${page}&size=${size}`),

  getMyPendingRejectedPriceRequests: (page = 0, size = 20) =>
    apiService.getRequest<PageResponse<PriceUpdateRequest>>(`/api/vendor/change-requests/entity-type/PRODUCT?page=${page}&size=${size}`),

  deletePriceUpdateRequest: (requestId: number) =>
    apiService.deleteRequest<void>(`/api/vendor/change-requests/${requestId}`),

  editPriceUpdateRequest: (requestId: number, request: PriceUpdateRequest) =>
    apiService.putRequest<PriceUpdateRequest>(`/api/vendor/change-requests/${requestId}`, {
      newPrice: request.newPrice,
      reason: request.reason,
    }),

  updateProductForVendor: (productId: number, product: Product) =>
    apiService.putRequest<Product>(`/api/v1/products/vendor/${productId}`, product),

  editPendingProduct: (productId: number, product: Product) =>
    apiService.putRequest<Product>(`/api/v1/products/${productId}/edit`, product),

  createEvent: (event: CreateEventRequest) =>
    apiService.postRequest<EventResponse>('/api/vendor/events', event),

  getMyEvents: (status?: string, page = 0, size = 20) => {
    let url = `/api/vendor/events?page=${page}&size=${size}`;
    if (status) url += `&status=${status}`;
    return apiService.getRequest<PageResponse<EventResponse>>(url);
  },

  getMyPendingRejectedEvents: (page = 0, size = 20) =>
    apiService.getRequest<PageResponse<EventResponse>>(`/api/vendor/events/pending-rejected?page=${page}&size=${size}`),

  getEvent: (eventId: number) =>
    apiService.getRequest<EventResponse>(`/api/vendor/events/${eventId}`),

  getMyEvent: (eventId: number) =>
    apiService.getRequest<EventResponse>(`/api/vendor/events/${eventId}`),

  updateEvent: (eventId: number, event: UpdateEventRequest) =>
    apiService.putRequest<EventResponse>(`/api/vendor/events/${eventId}`, event),

  cancelEvent: (eventId: number, reason: string) =>
    apiService.postRequest<EventResponse>(`/api/vendor/events/${eventId}/cancel?reason=${encodeURIComponent(reason)}`, {}),

  reactivateEvent: (eventId: number) =>
    apiService.postRequest<EventResponse>(`/api/vendor/events/${eventId}/reactivate`, {}),

  // Product deactivation/reactivation (soft delete)
  deactivateProduct: (productId: number) =>
    apiService.postRequest<Product>(`/api/v1/products/vendor/${productId}/deactivate`, {}),

  reactivateProduct: (productId: number) =>
    apiService.postRequest<Product>(`/api/v1/products/vendor/${productId}/reactivate`, {}),

  // SKU deactivation/reactivation
  deactivateSku: (productId: number, skuId: number) =>
    apiService.postRequest<Product>(`/api/v1/products/vendor/${productId}/skus/${skuId}/deactivate`, {}),

  reactivateSku: (productId: number, skuId: number) =>
    apiService.postRequest<Product>(`/api/v1/products/vendor/${productId}/skus/${skuId}/reactivate`, {}),

  addTicketType: (eventId: number, ticketType: { name: string; description?: string; capacity: number; price: number; currency: string }) =>
    apiService.postRequest<EventResponse>(`/api/vendor/events/${eventId}/ticket-types`, ticketType),

  updateTicketType: (ticketTypeId: number, updates: { name?: string; description?: string; capacity?: number; isActive?: boolean }) => {
    const params = new URLSearchParams();
    if (updates.name) params.append('name', updates.name);
    if (updates.description) params.append('description', updates.description);
    if (updates.capacity !== undefined) params.append('capacity', updates.capacity.toString());
    if (updates.isActive !== undefined) params.append('isActive', updates.isActive.toString());
    return apiService.putRequest<EventResponse>(`/api/vendor/events/ticket-types/${ticketTypeId}?${params.toString()}`, {});
  },

  requestEventPriceUpdate: (request: EventPriceUpdateRequest) =>
    apiService.postRequest<EventPriceUpdateResponse>(`/api/vendor/change-requests/events/${request.ticketTypeId}/ticket-types/${request.ticketTypeId}/price`, {
      newPrice: {
        amount: request.newPrice,
        currencyCode: request.newCurrency,
      },
      reason: request.reason,
    }),

  // Legacy endpoints - these now redirect to the unified change request system
  getMyEventPriceUpdateRequests: (page = 0, size = 20) =>
    apiService.getRequest<PageResponse<EventPriceUpdateResponse>>(`/api/vendor/change-requests/entity-type/EVENT?page=${page}&size=${size}`),

  getMyPendingRejectedEventPriceRequests: (page = 0, size = 20) =>
    apiService.getRequest<PageResponse<EventPriceUpdateResponse>>(`/api/vendor/change-requests/entity-type/EVENT?page=${page}&size=${size}`),

  editPendingOrRejectedEvent: (eventId: number, event: UpdateEventRequest) =>
    apiService.putRequest<EventResponse>(`/api/vendor/events/${eventId}/edit`, event),

  editEventPriceUpdateRequest: (requestId: number, request: EventPriceUpdateRequest) =>
    apiService.putRequest<EventPriceUpdateResponse>(`/api/vendor/change-requests/${requestId}`, {
      newPrice: {
        amount: request.newPrice,
        currencyCode: request.newCurrency,
      },
      reason: request.reason,
    }),

  getEventOrders: (eventId: number, page = 0, size = 20) =>
    apiService.getRequest<PageResponse<EventOrder>>(`/api/vendor/events/${eventId}/orders?page=${page}&size=${size}`),

  getAllOrders: (page = 0, size = 20) =>
    apiService.getRequest<PageResponse<EventOrder>>(`/api/vendor/events/orders?page=${page}&size=${size}`),

  getEventAnalytics: (eventId: number) =>
    apiService.getRequest<EventAnalytics>(`/api/vendor/events/${eventId}/analytics`),

  getVendorSummary: () =>
    apiService.getRequest<VendorEventSummary>('/api/vendor/events/summary'),

  getVendorRevenue: () =>
    apiService.getRequest<VendorRevenue>('/api/vendors/me/revenue'),

  validateTicket: (ticketCode: string) =>
    apiService.getRequest<TicketValidationResponse>(`/api/vendor/events/validate/${ticketCode}`),

  checkInTicket: (ticketCode: string) =>
    apiService.postRequest<TicketValidationResponse>(`/api/vendor/events/check-in/${ticketCode}`, {}),

  // Category Change Requests (using unified VendorChangeRequest system)
  createCategoryChangeRequest: (productId: number, request: { newSubCategoryId: number; reason?: string }) =>
    apiService.postRequest<CategoryChangeRequest>(`/api/vendor/change-requests/products/${productId}/category`, request),

  getVendorCategoryChangeRequests: (vendorId: number, page = 0, size = 20) =>
    apiService.getRequest<PageResponse<CategoryChangeRequest>>(`/api/vendor/change-requests/entity-type/PRODUCT?page=${page}&size=${size}`),

  getMyPendingRejectedCategoryChangeRequests: (page = 0, size = 20) =>
    apiService.getRequest<PageResponse<CategoryChangeRequest>>(`/api/vendor/change-requests/entity-type/PRODUCT?page=${page}&size=${size}`),

  editCategoryChangeRequest: (requestId: number, request: { newSubCategoryId?: number; reason?: string }) =>
    apiService.putRequest<CategoryChangeRequest>(`/api/vendor/change-requests/${requestId}`, request),

  deleteCategoryChangeRequest: (requestId: number) =>
    apiService.deleteRequest<void>(`/api/vendor/change-requests/${requestId}`),

  getPendingCategoryChangeRequestForProduct: (productId: number) =>
    apiService.getRequest<CategoryChangeRequest | null>(`/api/vendor/change-requests/check/PRODUCT/${productId}/CATEGORY_CHANGE`),

  // ==================== Service Price Update Requests ====================
  createServicePriceUpdateRequest: (serviceId: number, request: { newPrice: PriceDto; reason?: string }) =>
    apiService.postRequest<ServicePriceUpdateRequest>(`/api/vendor/change-requests/services/${serviceId}/price`, {
      newPrice: request.newPrice,
      reason: request.reason,
    }),

  getMyServicePriceUpdateRequests: (page = 0, size = 20) =>
    apiService.getRequest<PageResponse<ServicePriceUpdateRequest>>(`/api/vendor/change-requests/entity-type/SERVICE?page=${page}&size=${size}`),

  getMyPendingRejectedServicePriceRequests: (page = 0, size = 20) =>
    apiService.getRequest<PageResponse<ServicePriceUpdateRequest>>(`/api/vendor/change-requests/entity-type/SERVICE?page=${page}&size=${size}`),

  editServicePriceUpdateRequest: (requestId: number, request: { newPrice: PriceDto; reason?: string }) =>
    apiService.putRequest<ServicePriceUpdateRequest>(`/api/vendor/change-requests/${requestId}`, {
      newPrice: request.newPrice,
      reason: request.reason,
    }),

  deleteServicePriceUpdateRequest: (requestId: number) =>
    apiService.deleteRequest<void>(`/api/vendor/change-requests/${requestId}`),

  // ==================== Service Category Change Requests ====================
  createServiceCategoryChangeRequest: (serviceId: number, request: { newSubCategoryId: number; reason?: string }) =>
    apiService.postRequest<ServiceCategoryChangeRequest>(`/api/vendor/change-requests/services/${serviceId}/category`, request),

  getMyServiceCategoryChangeRequests: (page = 0, size = 20) =>
    apiService.getRequest<PageResponse<ServiceCategoryChangeRequest>>(`/api/vendor/change-requests/entity-type/SERVICE?changeType=CATEGORY_CHANGE&page=${page}&size=${size}`),

  getMyPendingRejectedServiceCategoryRequests: (page = 0, size = 20) =>
    apiService.getRequest<PageResponse<ServiceCategoryChangeRequest>>(`/api/vendor/change-requests/entity-type/SERVICE?changeType=CATEGORY_CHANGE&page=${page}&size=${size}`),

  editServiceCategoryChangeRequest: (requestId: number, request: { newSubCategoryId?: number; reason?: string }) =>
    apiService.putRequest<ServiceCategoryChangeRequest>(`/api/vendor/change-requests/${requestId}`, request),

  deleteServiceCategoryChangeRequest: (requestId: number) =>
    apiService.deleteRequest<void>(`/api/vendor/change-requests/${requestId}`),

  getPendingCategoryChangeRequestForService: (serviceId: number) =>
    apiService.getRequest<ServiceCategoryChangeRequest | null>(`/api/vendor/change-requests/check/SERVICE/${serviceId}/CATEGORY_CHANGE`),

  // ==================== Service Package Price Update Requests ====================
  createServicePackagePriceUpdateRequest: (_serviceId: number, packageId: number, request: { newPrice: PriceDto; reason?: string }) =>
    apiService.postRequest<ServicePriceUpdateRequest>(`/api/vendor/change-requests/service-packages/${packageId}/price`, {
      newPrice: request.newPrice,
      reason: request.reason,
    }),

  getMyServicePackagePriceUpdateRequests: (page = 0, size = 20) =>
    apiService.getRequest<PageResponse<ServicePriceUpdateRequest>>(`/api/vendor/change-requests/entity-type/SERVICE_PACKAGE?page=${page}&size=${size}`),

  getPendingPriceRequestForServicePackage: (packageId: number) =>
    apiService.getRequest<ServicePriceUpdateRequest | null>(`/api/vendor/change-requests/check/SERVICE_PACKAGE/${packageId}/PRICE_UPDATE`),
};

export default vendorService;
