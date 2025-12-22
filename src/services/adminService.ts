import { apiService } from './apiService';

// Types - Dashboard Stats (matching backend AdminDashboardStatsDto)
export interface RevenueStats {
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  totalRevenue: number;
  currency: string;
}

export interface UserStats {
  total: number;
  customers: number;
  vendors: number;
  admins: number;
  newThisWeek: number;
  newThisMonth: number;
}

export interface VendorStats {
  total: number;
  active: number;
  withStripeEnabled: number;
  withChapaEnabled: number;
}

export interface ProductStats {
  total: number;
  pending: number;
  active: number;
  rejected: number;
  draft: number;
}

export interface EventStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  upcoming: number;
  completed: number;
}

export interface OrderStats {
  totalProductOrders: number;
  pendingProductOrders: number;
  completedProductOrders: number;
  cancelledProductOrders: number;
  totalEventOrders: number;
  pendingEventOrders: number;
  completedEventOrders: number;
}

export interface PendingApprovals {
  products: number;
  events: number;
  productPriceUpdates: number;
  eventPriceUpdates: number;
}

export interface AdminDashboardStats {
  revenue: RevenueStats;
  users: UserStats;
  vendors: VendorStats;
  products: ProductStats;
  events: EventStats;
  orders: OrderStats;
  pendingApprovals: PendingApprovals;
}

// Revenue Trends for charts
export interface RevenueTrendDataPoint {
  date: string;
  productRevenue: number;
  eventRevenue: number;
  totalRevenue: number;
  ordersCount: number;
  avgOrderValue: number;
}

export interface RevenueTrendDto {
  data: RevenueTrendDataPoint[];
  currency: string;
  period: string;
}

// Legacy AdminStats type for backwards compatibility
export interface AdminStats {
  totalUsers: number;
  totalVendors: number;
  approvedVendors: number;
  pendingVendors: number;
  totalOrders: number;
  completedOrders: number;
  totalRevenue: number;
  totalEvents: number;
  pendingEvents: number;
}

export interface AdminUserDto {
  userId: number;
  email: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  role: string;
  city?: string;
  country?: string;
  createdAt: string;
  isActive: boolean;
}

// Alias for backwards compatibility
export type UserResponse = AdminUserDto;

export interface VendorResponse {
  id: number;
  businessName: string;
  businessDescription?: string;
  email: string;
  phone?: string;
  city?: string;
  country: String;
  businessType?: string;
  rating?: number;
  totalOrders?: number;
  totalProducts?: number;
  payoutEnabled: boolean;
  stripeConnectedAccountId?: string;
  chapaSubaccountId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface OrderResponse {
  id: number;
  orderNumber: string;
  userId: number;
  vendorId: number;
  status: string;
  paymentStatus: string;
  totalAmountMinor: number;
  currency: string;
  recipientName?: string;
  recipientCity?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface EventResponse {
  id: number;
  title: string;
  slug: string;
  description: string;
  vendorId: number;
  vendorName?: string;
  eventDate: string;
  location: string;
  city: string;
  bannerImageUrl: string;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  isFeatured: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface EventPriceUpdateRequest {
  id: number;
  eventId: number;
  eventTitle: string;
  ticketTypeId: number;
  ticketTypeName: string;
  currentPriceMinor: number;
  requestedPriceMinor: number;
  currency: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  vendorId: number;
  vendorName?: string;
  rejectionReason?: string;
  createdAt: string;
  processedAt?: string;
}

export interface CategoryResponse {
  id: number;
  name: string;
  slug: string;
  description?: string;
  type: string;
  parentId?: number;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

export interface CreateCategoryRequest {
  name: string;
  slug: string;
  description?: string;
  type: 'occasion' | 'cultural' | 'emotion' | 'custom' | 'daily';
  parentId?: number;
  sortOrder?: number;
}

// ==================== TAX TYPES ====================
export interface TaxZoneDto {
  id: number;
  code: string;
  name: string;
  country: string;
  state?: string;
  city?: string;
  description?: string;
  active: boolean;
  priority: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface TaxCategoryDto {
  id: number;
  name: string;
  code: string;
  description?: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface TaxRateDto {
  id: number;
  taxZoneId: number;
  taxZoneName?: string;
  taxZoneCode?: string;
  taxCategoryId: number;
  taxCategoryName?: string;
  rate: number;
  isCompound: boolean;
  priority: number;
  effectiveFrom: string;
  effectiveTo?: string;
  active: boolean;
  components?: any[];
  createdAt?: string;
  updatedAt?: string;
}

export interface TaxZoneRequest {
  code: string;
  name: string;
  country: string;
  state?: string;
  city?: string;
  description?: string;
  active?: boolean;
  priority?: number;
}

export interface TaxCategoryRequest {
  name: string;
  code: string;
  description?: string;
  active?: boolean;
}

export interface TaxRateRequest {
  taxZoneId: number;
  taxCategoryId: number;
  rate: number;
  isCompound: boolean;
  priority: number;
  effectiveFrom: string;
  effectiveTo?: string;
  active: boolean;
  components?: any[];
}

// ==================== CURRENCY TYPES ====================
export interface CurrencyDto {
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
  isDefault: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CurrencyRateDto {
  sourceCurrency: string;
  targetCurrency: string;
  rate: number;
  updatedAt: string;
}

// ==================== PRODUCT PRICE UPDATE TYPES ====================
export interface ProductPriceUpdateRequestDto {
  id: number;
  productId: number;
  productName?: string;
  skuId?: number;
  skuName?: string;
  currentPriceMinor: number;
  requestedPriceMinor: number;
  currency: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  vendorId: number;
  vendorName?: string;
  rejectionReason?: string;
  createdAt: string;
  processedAt?: string;
  processedByUserId?: number;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

// Admin Order DTOs (matching backend)
export interface AdminOrderItemDto {
  productId: number;
  productName: string;
  quantity: number;
  priceMinor: number;
  currency: string;
}

export interface AdminAddressDto {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

export interface AdminOrderDto {
  id: number;
  orderNumber: string;
  userId: number;
  userEmail: string;
  vendorId: number;
  vendorName: string;
  status: string;
  paymentStatus: string;
  paymentMethod?: string;
  totalAmountMinor: number;
  currency: string;
  items: AdminOrderItemDto[];
  shippingAddress?: AdminAddressDto;
  billingAddress?: AdminAddressDto;
  recipientName?: string;
  recipientPhone?: string;
  giftMessage?: string;
  createdAt: string;
  updatedAt?: string;
}

// Admin Event Order DTOs
export interface TicketSummaryDto {
  ticketTypeId: number;
  ticketTypeName: string;
  quantity: number;
  priceMinor: number;
  currency: string;
}

export interface AdminEventOrderDto {
  id: number;
  orderNumber: string;
  userId: number;
  userEmail: string;
  eventId: number;
  eventTitle: string;
  eventDate: string;
  paymentStatus: string;
  paymentMethod?: string;
  totalAmountMinor: number;
  currency: string;
  tickets: TicketSummaryDto[];
  contactEmail?: string;
  contactPhone?: string;
  createdAt: string;
  updatedAt?: string;
}

class AdminService {
  // ==================== DASHBOARD STATS ====================
  
  // Get all dashboard statistics
  async getDashboardStats(): Promise<AdminDashboardStats> {
    return await apiService.getRequest<AdminDashboardStats>('/api/admin/dashboard/stats');
  }

  // Get revenue trends for charting
  async getRevenueTrends(period: 'daily' | 'weekly' | 'monthly' = 'monthly'): Promise<RevenueTrendDto> {
    return await apiService.getRequest<RevenueTrendDto>(`/api/admin/dashboard/revenue/trends?period=${period}`);
  }

  // Get individual stat sections
  async getRevenueStats(): Promise<RevenueStats> {
    return await apiService.getRequest<RevenueStats>('/api/admin/dashboard/stats/revenue');
  }

  async getUserStats(): Promise<UserStats> {
    return await apiService.getRequest<UserStats>('/api/admin/dashboard/stats/users');
  }

  async getVendorStats(): Promise<VendorStats> {
    return await apiService.getRequest<VendorStats>('/api/admin/dashboard/stats/vendors');
  }

  async getProductStats(): Promise<ProductStats> {
    return await apiService.getRequest<ProductStats>('/api/admin/dashboard/stats/products');
  }

  async getEventStats(): Promise<EventStats> {
    return await apiService.getRequest<EventStats>('/api/admin/dashboard/stats/events');
  }

  async getOrderStatsOnly(): Promise<OrderStats> {
    return await apiService.getRequest<OrderStats>('/api/admin/dashboard/stats/orders');
  }

  async getPendingApprovals(): Promise<PendingApprovals> {
    return await apiService.getRequest<PendingApprovals>('/api/admin/dashboard/stats/pending');
  }

  // Legacy getStats method for backwards compatibility
  async getStats(): Promise<AdminStats> {
    try {
      const stats = await this.getDashboardStats();
      return {
        totalUsers: stats.users.total,
        totalVendors: stats.vendors.total,
        approvedVendors: stats.vendors.withStripeEnabled + stats.vendors.withChapaEnabled,
        pendingVendors: 0,
        totalOrders: stats.orders.totalProductOrders,
        completedOrders: stats.orders.completedProductOrders,
        totalRevenue: stats.revenue.totalRevenue,
        totalEvents: stats.events.total,
        pendingEvents: stats.events.pending,
      };
    } catch (error) {
      console.error('Failed to fetch admin stats:', error);
      return {
        totalUsers: 0,
        totalVendors: 0,
        approvedVendors: 0,
        pendingVendors: 0,
        totalOrders: 0,
        completedOrders: 0,
        totalRevenue: 0,
        totalEvents: 0,
        pendingEvents: 0,
      };
    }
  }

  
  async getUsers(page: number = 0, size: number = 20, search?: string): Promise<PaginatedResponse<AdminUserDto>> {
    let url = `/api/users?page=${page}&size=${size}`;
    if (search) {
      url += `&search=${encodeURIComponent(search)}`;
    }
    return await apiService.getRequest<PaginatedResponse<AdminUserDto>>(url);
  }

  async getUserById(userId: number): Promise<AdminUserDto> {
    return await apiService.getRequest<AdminUserDto>(`/api/admin/users/${userId}`);
  }

  async getUsersByRole(role: string, page: number = 0, size: number = 20): Promise<PaginatedResponse<AdminUserDto>> {
    return await apiService.getRequest<PaginatedResponse<AdminUserDto>>(`/api/admin/users/role/${role}?page=${page}&size=${size}`);
  }

  async updateUserRole(userId: number, role: string): Promise<AdminUserDto> {
    return await apiService.patchRequest<AdminUserDto>(`/api/admin/users/${userId}/role?newRole=${role}`, {});
  }

  async toggleUserStatus(userId: number, isActive: boolean): Promise<AdminUserDto> {
    return await apiService.putRequest<AdminUserDto>(`/api/admin/users/${userId}/status`, { isActive });
  }

  async deleteUser(userId: number): Promise<void> {
    return await apiService.deleteRequest<void>(`/api/users/${userId}`);
  }

  
  async getVendors(page: number = 0, size: number = 20, search?: string): Promise<PaginatedResponse<VendorResponse>> {
    let url = `/api/admin/vendors?page=${page}&size=${size}`;
    if (search) {
      url += `&search=${encodeURIComponent(search)}`;
    }
    return await apiService.getRequest<PaginatedResponse<VendorResponse>>(url);
  }

  async getVendorById(vendorId: number): Promise<VendorResponse> {
    return await apiService.getRequest<VendorResponse>(`/api/admin/vendors/${vendorId}`);
  }

  async approveVendor(vendorId: number): Promise<VendorResponse> {
    return await apiService.postRequest<VendorResponse>(`/api/admin/vendors/${vendorId}/approve`, {});
  }

  async declineVendor(vendorId: number): Promise<void> {
    return await apiService.postRequest<void>(`/api/admin/vendors/${vendorId}/decline`, {});
  }

  // ==================== PRODUCT ORDER MANAGEMENT ====================
  
  async getOrders(page: number = 0, size: number = 20, status?: string, search?: string): Promise<PaginatedResponse<AdminOrderDto>> {
    let url = `/api/admin/orders?page=${page}&size=${size}`;
    if (status && status !== 'all') {
      url += `&status=${status}`;
    }
    if (search) {
      url += `&search=${encodeURIComponent(search)}`;
    }
    return await apiService.getRequest<PaginatedResponse<AdminOrderDto>>(url);
  }

  async getOrderById(orderId: number): Promise<AdminOrderDto> {
    return await apiService.getRequest<AdminOrderDto>(`/api/admin/orders/${orderId}`);
  }

  async getOrderByNumber(orderNumber: string): Promise<AdminOrderDto> {
    return await apiService.getRequest<AdminOrderDto>(`/api/admin/orders/number/${orderNumber}`);
  }

  async getOrdersByStatus(status: string, page: number = 0, size: number = 20): Promise<PaginatedResponse<AdminOrderDto>> {
    return await apiService.getRequest<PaginatedResponse<AdminOrderDto>>(`/api/admin/orders/status/${status}?page=${page}&size=${size}`);
  }

  async updateOrderStatus(orderId: number, status: string): Promise<AdminOrderDto> {
    return await apiService.patchRequest<AdminOrderDto>(`/api/admin/orders/${orderId}/status`, { status });
  }

  async cancelOrder(orderId: number, reason?: string): Promise<AdminOrderDto> {
    let url = `/api/admin/orders/${orderId}/cancel`;
    if (reason) {
      url += `?reason=${encodeURIComponent(reason)}`;
    }
    return await apiService.postRequest<AdminOrderDto>(url, {});
  }

  
  async getEventOrders(page: number = 0, size: number = 20, status?: string, search?: string): Promise<PaginatedResponse<AdminEventOrderDto>> {
    let url = `/api/admin/event-orders?page=${page}&size=${size}`;
    if (status && status !== 'all') {
      url += `&status=${status}`;
    }
    if (search) {
      url += `&search=${encodeURIComponent(search)}`;
    }
    return await apiService.getRequest<PaginatedResponse<AdminEventOrderDto>>(url);
  }

  async getEventOrderById(orderId: number): Promise<AdminEventOrderDto> {
    return await apiService.getRequest<AdminEventOrderDto>(`/api/admin/event-orders/${orderId}`);
  }

  async getEventOrderByNumber(orderNumber: string): Promise<AdminEventOrderDto> {
    return await apiService.getRequest<AdminEventOrderDto>(`/api/admin/event-orders/number/${orderNumber}`);
  }

  async getEventOrdersByStatus(status: string, page: number = 0, size: number = 20): Promise<PaginatedResponse<AdminEventOrderDto>> {
    return await apiService.getRequest<PaginatedResponse<AdminEventOrderDto>>(`/api/admin/event-orders/status/${status}?page=${page}&size=${size}`);
  }

  async getEventOrdersByEvent(eventId: number, page: number = 0, size: number = 20): Promise<PaginatedResponse<AdminEventOrderDto>> {
    return await apiService.getRequest<PaginatedResponse<AdminEventOrderDto>>(`/api/admin/event-orders/event/${eventId}?page=${page}&size=${size}`);
  }

  async cancelEventOrder(orderId: number, reason?: string): Promise<AdminEventOrderDto> {
    let url = `/api/admin/event-orders/${orderId}/cancel`;
    if (reason) {
      url += `?reason=${encodeURIComponent(reason)}`;
    }
    return await apiService.postRequest<AdminEventOrderDto>(url, {});
  }

  
  async getAllEvents(page: number = 0, size: number = 20, status?: string): Promise<PaginatedResponse<EventResponse>> {
    let url = `/api/admin/events?page=${page}&size=${size}`;
    if (status) {
      url += `&status=${status}`;
    }
    return await apiService.getRequest<PaginatedResponse<EventResponse>>(url);
  }
  
  async getPendingEvents(page: number = 0, size: number = 20): Promise<PaginatedResponse<EventResponse>> {
    return await apiService.getRequest<PaginatedResponse<EventResponse>>(`/api/admin/events/pending?page=${page}&size=${size}`);
  }

  async approveEvent(eventId: number): Promise<EventResponse> {
    return await apiService.postRequest<EventResponse>(`/api/admin/events/${eventId}/approve`, {});
  }

  async rejectEvent(eventId: number, reason: string): Promise<EventResponse> {
    return await apiService.postRequest<EventResponse>(`/api/admin/events/${eventId}/reject?reason=${encodeURIComponent(reason)}`, {});
  }

  async setEventFeatured(eventId: number, featured: boolean): Promise<EventResponse> {
    return await apiService.postRequest<EventResponse>(`/api/admin/events/${eventId}/featured?featured=${featured}`, {});
  }

  
  async getPriceUpdateRequests(page: number = 0, size: number = 20, status?: string): Promise<PaginatedResponse<EventPriceUpdateRequest>> {
    let url = `/api/admin/events/price-update-requests?page=${page}&size=${size}`;
    if (status) {
      url += `&status=${status}`;
    }
    return await apiService.getRequest<PaginatedResponse<EventPriceUpdateRequest>>(url);
  }

  async approvePriceUpdate(requestId: number): Promise<EventPriceUpdateRequest> {
    return await apiService.postRequest<EventPriceUpdateRequest>(`/api/admin/events/price-update-requests/${requestId}/approve`, {});
  }

  async rejectPriceUpdate(requestId: number, reason: string): Promise<EventPriceUpdateRequest> {
    return await apiService.postRequest<EventPriceUpdateRequest>(`/api/admin/events/price-update-requests/${requestId}/reject?reason=${encodeURIComponent(reason)}`, {});
  }

  // ==================== PRODUCT MANAGEMENT ====================
  
  async getAllProducts(page: number = 0, size: number = 20, status?: string, search?: string): Promise<PaginatedResponse<any>> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('size', size.toString());
    if (status) {
      params.append('status', status);
    }
    if (search) {
      params.append('search', search);
    }
    return await apiService.getRequest<PaginatedResponse<any>>(`/api/admin/products?${params.toString()}`);
  }
  
  async getPendingProducts(page: number = 0, size: number = 20): Promise<PaginatedResponse<any>> {
    return await apiService.getRequest<PaginatedResponse<any>>(`/api/v1/products/pending?page=${page}&size=${size}`);
  }

  async approveProduct(productId: number): Promise<any> {
    return await apiService.putRequest<any>(`/api/v1/products/${productId}/approve`, {});
  }

  async rejectProduct(productId: number, reason: string): Promise<any> {
    return await apiService.putRequest<any>(`/api/v1/products/${productId}/reject?reason=${encodeURIComponent(reason)}`, {});
  }

  
  async getCategories(): Promise<CategoryResponse[]> {
    return await apiService.getRequest<CategoryResponse[]>('/api/categories');
  }

  async createCategory(data: CreateCategoryRequest): Promise<CategoryResponse> {
    return await apiService.postRequest<CategoryResponse>('/api/categories', data);
  }

  async updateCategory(categoryId: number, data: Partial<CreateCategoryRequest>): Promise<CategoryResponse> {
    return await apiService.putRequest<CategoryResponse>(`/api/categories/${categoryId}`, data);
  }

  async deleteCategory(categoryId: number): Promise<void> {
    return await apiService.deleteRequest(`/api/categories/${categoryId}`);
  }

  // ==================== TAX ZONE MANAGEMENT ====================
  
  async getTaxZones(country?: string, active?: boolean): Promise<TaxZoneDto[]> {
    let url = '/api/admin/tax/zones';
    const params = new URLSearchParams();
    if (country) params.append('country', country);
    if (active !== undefined) params.append('active', String(active));
    if (params.toString()) url += `?${params.toString()}`;
    return await apiService.getRequest<TaxZoneDto[]>(url);
  }

  async getTaxZoneById(id: number): Promise<TaxZoneDto> {
    return await apiService.getRequest<TaxZoneDto>(`/api/admin/tax/zones/${id}`);
  }

  async createTaxZone(data: TaxZoneRequest): Promise<TaxZoneDto> {
    return await apiService.postRequest<TaxZoneDto>('/api/admin/tax/zones', data);
  }

  async updateTaxZone(id: number, data: TaxZoneRequest): Promise<TaxZoneDto> {
    return await apiService.putRequest<TaxZoneDto>(`/api/admin/tax/zones/${id}`, data);
  }

  async deleteTaxZone(id: number): Promise<void> {
    return await apiService.deleteRequest(`/api/admin/tax/zones/${id}`);
  }

  // ==================== TAX CATEGORY MANAGEMENT ====================
  
  async getTaxCategories(active?: boolean): Promise<TaxCategoryDto[]> {
    let url = '/api/admin/tax/categories';
    if (active !== undefined) url += `?active=${active}`;
    return await apiService.getRequest<TaxCategoryDto[]>(url);
  }

  async getTaxCategoryById(id: number): Promise<TaxCategoryDto> {
    return await apiService.getRequest<TaxCategoryDto>(`/api/admin/tax/categories/${id}`);
  }

  async createTaxCategory(data: TaxCategoryRequest): Promise<TaxCategoryDto> {
    return await apiService.postRequest<TaxCategoryDto>('/api/admin/tax/categories', data);
  }

  async updateTaxCategory(id: number, data: TaxCategoryRequest): Promise<TaxCategoryDto> {
    return await apiService.putRequest<TaxCategoryDto>(`/api/admin/tax/categories/${id}`, data);
  }

  async deleteTaxCategory(id: number): Promise<void> {
    return await apiService.deleteRequest(`/api/admin/tax/categories/${id}`);
  }

  // ==================== TAX RATE MANAGEMENT ====================
  
  async getTaxRates(taxZoneId?: number, taxCategoryId?: number, active?: boolean): Promise<TaxRateDto[]> {
    let url = '/api/admin/tax/rates';
    const params = new URLSearchParams();
    if (taxZoneId) params.append('taxZoneId', String(taxZoneId));
    if (taxCategoryId) params.append('taxCategoryId', String(taxCategoryId));
    if (active !== undefined) params.append('active', String(active));
    if (params.toString()) url += `?${params.toString()}`;
    return await apiService.getRequest<TaxRateDto[]>(url);
  }

  async getTaxRateById(id: number): Promise<TaxRateDto> {
    return await apiService.getRequest<TaxRateDto>(`/api/admin/tax/rates/${id}`);
  }

  async createTaxRate(data: TaxRateRequest): Promise<TaxRateDto> {
    return await apiService.postRequest<TaxRateDto>('/api/admin/tax/rates', data);
  }

  async updateTaxRate(id: number, data: TaxRateRequest): Promise<TaxRateDto> {
    return await apiService.putRequest<TaxRateDto>(`/api/admin/tax/rates/${id}`, data);
  }

  async deleteTaxRate(id: number): Promise<void> {
    return await apiService.deleteRequest(`/api/admin/tax/rates/${id}`);
  }

  // ==================== CURRENCY MANAGEMENT ====================
  
  async getAllCurrencies(): Promise<CurrencyDto[]> {
    return await apiService.getRequest<CurrencyDto[]>('/api/currencies/all');
  }

  async getActiveCurrencies(): Promise<CurrencyDto[]> {
    return await apiService.getRequest<CurrencyDto[]>('/api/currencies');
  }

  async getCurrencyByCode(code: string): Promise<CurrencyDto> {
    return await apiService.getRequest<CurrencyDto>(`/api/currencies/${code}`);
  }

  async saveCurrency(data: Omit<CurrencyDto, 'createdAt' | 'updatedAt'>): Promise<CurrencyDto> {
    return await apiService.postRequest<CurrencyDto>('/api/currencies', data);
  }

  async updateCurrencyStatus(code: string, isActive: boolean): Promise<CurrencyDto> {
    return await apiService.putRequest<CurrencyDto>(`/api/currencies/${code}/status?isActive=${isActive}`, {});
  }

  async setDefaultCurrency(code: string): Promise<CurrencyDto> {
    return await apiService.putRequest<CurrencyDto>(`/api/currencies/${code}/set-default`, {});
  }

  async deleteCurrency(code: string): Promise<void> {
    return await apiService.deleteRequest(`/api/currencies/${code}`);
  }

  async getExchangeRates(): Promise<CurrencyRateDto[]> {
    return await apiService.getRequest<CurrencyRateDto[]>('/api/currencies/rates');
  }

  // ==================== PRODUCT PRICE UPDATE REQUESTS ====================
  
  async getProductPriceUpdateRequests(page: number = 0, size: number = 20, status?: string): Promise<PaginatedResponse<ProductPriceUpdateRequestDto>> {
    let url = `/api/v1/price-update-requests?page=${page}&size=${size}`;
    if (status) url += `&status=${status}`;
    return await apiService.getRequest<PaginatedResponse<ProductPriceUpdateRequestDto>>(url);
  }

  async getProductPriceUpdateRequestById(requestId: number): Promise<ProductPriceUpdateRequestDto> {
    return await apiService.getRequest<ProductPriceUpdateRequestDto>(`/api/v1/price-update-requests/${requestId}`);
  }

  async approveProductPriceUpdate(requestId: number): Promise<ProductPriceUpdateRequestDto> {
    return await apiService.postRequest<ProductPriceUpdateRequestDto>(`/api/v1/price-update-requests/${requestId}/approve`, {});
  }

  async rejectProductPriceUpdate(requestId: number, reason: string): Promise<ProductPriceUpdateRequestDto> {
    return await apiService.postRequest<ProductPriceUpdateRequestDto>(`/api/v1/price-update-requests/${requestId}/reject?reason=${encodeURIComponent(reason)}`, {});
  }
}

export const adminService = new AdminService();
export default adminService;
