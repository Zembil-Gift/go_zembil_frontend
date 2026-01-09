import { apiService } from './apiService';
import { formatCurrency, getCurrencyDecimals } from '@/lib/currency';
import type {
  CustomOrder,
  CreateCustomOrderRequest,
  ProposePriceRequest,
  PaymentInitResponse,
  PagedCustomOrderResponse,
  CustomOrderFilters,
  CustomOrderStatus
} from '../types/customOrders';

/**
 * Service for managing custom orders
 * Handles order lifecycle from submission through delivery
 */
class CustomOrderService {
  
  // ==================== Customer Endpoints ====================

  /**
   * Create a new custom order (customer only)
   */
  async create(data: CreateCustomOrderRequest): Promise<CustomOrder> {
    return await apiService.postRequest<CustomOrder>('/api/custom-orders', data);
  }

  /**
   * Get customer's own orders
   */
  async getByCustomer(
    page: number = 0, 
    size: number = 20,
    status?: CustomOrderStatus
  ): Promise<PagedCustomOrderResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('size', size.toString());
    if (status) {
      queryParams.append('status', status);
    }
    
    const url = `/api/custom-orders/customer?${queryParams.toString()}`;
    return await apiService.getRequest<PagedCustomOrderResponse>(url);
  }

  /**
   * Accept proposed price (customer only)
   */
  async acceptPrice(orderId: number): Promise<CustomOrder> {
    return await apiService.postRequest<CustomOrder>(`/api/custom-orders/${orderId}/accept-price`);
  }

  /**
   * Reject proposed price (customer only)
   */
  async rejectPrice(orderId: number): Promise<CustomOrder> {
    return await apiService.postRequest<CustomOrder>(`/api/custom-orders/${orderId}/reject-price`);
  }

  /**
   * Initialize payment (customer only)
   * Note: provider is sent as a query parameter, not in request body
   */
  async initPayment(orderId: number, provider: string): Promise<PaymentInitResponse> {
    return await apiService.postRequest<PaymentInitResponse>(`/api/custom-orders/${orderId}/payment/init?provider=${encodeURIComponent(provider)}`);
  }

  // ==================== Vendor Endpoints ====================

  /**
   * Get vendor's orders
   */
  async getByVendor(
    page: number = 0, 
    size: number = 20,
    status?: CustomOrderStatus
  ): Promise<PagedCustomOrderResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('size', size.toString());
    if (status) {
      queryParams.append('status', status);
    }
    
    const url = `/api/custom-orders/vendor?${queryParams.toString()}`;
    return await apiService.getRequest<PagedCustomOrderResponse>(url);
  }

  /**
   * Propose final price (vendor only)
   * Price is in major units (e.g., 3000 for 3000 USD) in the vendor's currency.
   * Backend converts to platform default currency for storage.
   */
  async proposePrice(orderId: number, finalPrice: number, currencyCode?: string): Promise<CustomOrder> {
    const data: ProposePriceRequest = { finalPrice, currencyCode };
    return await apiService.postRequest<CustomOrder>(`/api/custom-orders/${orderId}/propose-price`, data);
  }

  /**
   * Mark order as in progress (vendor only)
   */
  async markInProgress(orderId: number): Promise<CustomOrder> {
    return await apiService.postRequest<CustomOrder>(`/api/custom-orders/${orderId}/in-progress`);
  }

  /**
   * Mark order as completed (vendor only)
   */
  async markCompleted(orderId: number): Promise<CustomOrder> {
    return await apiService.postRequest<CustomOrder>(`/api/custom-orders/${orderId}/complete`);
  }

  // ==================== Admin Endpoints ====================

  /**
   * Get completed orders ready for delivery assignment (admin only)
   */
  async getCompletedForDelivery(
    page: number = 0, 
    size: number = 20
  ): Promise<PagedCustomOrderResponse> {
    const url = `/api/custom-orders/completed-for-delivery?page=${page}&size=${size}`;
    return await apiService.getRequest<PagedCustomOrderResponse>(url);
  }

  /**
   * Assign delivery person (admin only)
   */
  async assignDelivery(orderId: number, deliveryPersonId: number): Promise<CustomOrder> {
    const data = { deliveryPersonId };
    return await apiService.postRequest<CustomOrder>(`/api/custom-orders/${orderId}/assign-delivery`, data);
  }

  // ==================== Delivery Person Endpoints ====================

  /**
   * Mark order as delivered (delivery person only)
   */
  async markDelivered(orderId: number): Promise<CustomOrder> {
    return await apiService.postRequest<CustomOrder>(`/api/custom-orders/${orderId}/delivered`);
  }

  // ==================== Shared Endpoints ====================

  /**
   * Get order by ID (accessible by customer, vendor, admin, delivery person)
   * @param orderId - The order ID
   * @param currency - Optional preferred currency for price conversion (e.g., 'ETB', 'USD')
   */
  async getById(orderId: number, currency?: string): Promise<CustomOrder> {
    const url = currency 
      ? `/api/custom-orders/${orderId}?currency=${currency}`
      : `/api/custom-orders/${orderId}`;
    return await apiService.getRequest<CustomOrder>(url);
  }

  /**
   * Get order by ID for vendor view.
   * Returns prices converted to the vendor's preferred currency.
   * @param orderId - The order ID
   */
  async getByIdForVendor(orderId: number): Promise<CustomOrder> {
    return await apiService.getRequest<CustomOrder>(`/api/custom-orders/vendor/${orderId}`);
  }

  /**
   * Cancel order (customer or vendor)
   */
  async cancel(orderId: number, reason?: string): Promise<CustomOrder> {
    const data = reason ? { reason } : {};
    return await apiService.postRequest<CustomOrder>(`/api/custom-orders/${orderId}/cancel`, data);
  }

  // ==================== Payment Callback (System) ====================

  /**
   * Complete payment callback (system endpoint)
   * Note: This is typically called by payment providers, not directly by frontend
   */
  async completePayment(orderId: number, paymentReference: string): Promise<CustomOrder> {
    const data = { paymentReference };
    return await apiService.postRequest<CustomOrder>(`/api/custom-orders/${orderId}/payment/complete`, data);
  }

  // ==================== Utility Methods ====================

  /**
   * Format price for display using backend-provided major units.
   * IMPORTANT: The backend now provides all prices in major units via the 'amount' fields.
   * Use order.basePrice and order.finalPrice directly instead of this method when possible.
   * 
   * @deprecated Prefer using formatCurrency(order.basePrice, order.currencyCode) directly
   */
  formatPrice(priceMinor: number, priceMajorOrCurrency?: number | string | null, currency?: string | null): string {
    let amount: number;
    let curr: string;
    
    // Handle backward compatibility: if second arg is string, it's currency (old signature)
    if (typeof priceMajorOrCurrency === 'string' || priceMajorOrCurrency === null || priceMajorOrCurrency === undefined && currency === undefined) {
      curr = (priceMajorOrCurrency as string) || 'ETB';
      console.warn('formatPrice: Using deprecated minor units conversion. Backend should provide major units.');
      const decimals = getCurrencyDecimals(curr);
      amount = priceMinor / Math.pow(10, decimals);
    } else {
      // New signature: priceMajorOrCurrency is the major units - USE THIS
      amount = priceMajorOrCurrency ?? 0;
      curr = currency || 'ETB';
    }
    
    return formatCurrency(amount, curr);
  }

  /**
   * Convert price from major units to minor units for API requests
   * Use this ONLY when submitting prices to the backend.
   */
  toMinorUnits(amount: number, currency: string): number {
    const decimals = getCurrencyDecimals(currency);
    const multiplier = Math.pow(10, decimals);
    return Math.round(amount * multiplier);
  }

  /**
   * @deprecated Do not use this for display purposes.
   * The backend now provides prices in major units via 'amount' fields.
   */
  toMajorUnits(amountMinor: number, currency: string): number {
    console.warn('toMajorUnits is deprecated. Use backend-provided amount fields instead.');
    const decimals = getCurrencyDecimals(currency);
    const divisor = Math.pow(10, decimals);
    return amountMinor / divisor;
  }

  /**
   * Get order base price in major units from backend-provided field.
   */
  getOrderBasePrice(order: CustomOrder): number {
    // Backend provides basePrice in major units - use it directly
    if (order.basePrice != null) return order.basePrice;
    // DEPRECATED: Fallback for old data
    console.warn('getOrderBasePrice: basePrice not provided by backend, falling back to conversion.');
    return this.toMajorUnits(order.basePriceMinor, order.currencyCode);
  }

  /**
   * Get order final price in major units from backend-provided field.
   */
  getOrderFinalPrice(order: CustomOrder): number | undefined {
    // Backend provides finalPrice in major units - use it directly
    if (order.finalPrice != null) return order.finalPrice;
    // DEPRECATED: Fallback for old data
    if (order.finalPriceMinor != null) {
      console.warn('getOrderFinalPrice: finalPrice not provided by backend, falling back to conversion.');
      return this.toMajorUnits(order.finalPriceMinor, order.currencyCode);
    }
    return undefined;
  }

  /**
   * Get status badge color for order status
   */
  getStatusBadgeColor(status: CustomOrderStatus): string {
    switch (status) {
      case 'SUBMITTED':
        return 'bg-blue-100 text-blue-800';
      case 'PRICE_PROPOSED':
        return 'bg-yellow-100 text-yellow-800';
      case 'CONFIRMED':
        return 'bg-purple-100 text-purple-800';
      case 'PAID':
        return 'bg-green-100 text-green-800';
      case 'IN_PROGRESS':
        return 'bg-orange-100 text-orange-800';
      case 'COMPLETED':
        return 'bg-teal-100 text-teal-800';
      case 'OUT_FOR_DELIVERY':
        return 'bg-indigo-100 text-indigo-800';
      case 'DELIVERED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  /**
   * Get human-readable status text
   */
  getStatusText(status: CustomOrderStatus): string {
    switch (status) {
      case 'SUBMITTED':
        return 'Submitted';
      case 'PRICE_PROPOSED':
        return 'Price Proposed';
      case 'CONFIRMED':
        return 'Confirmed';
      case 'PAID':
        return 'Paid';
      case 'IN_PROGRESS':
        return 'In Progress';
      case 'COMPLETED':
        return 'Completed';
      case 'OUT_FOR_DELIVERY':
        return 'Out for Delivery';
      case 'DELIVERED':
        return 'Delivered';
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return status;
    }
  }

  /**
   * Check if order can be cancelled by customer
   */
  canCustomerCancel(status: CustomOrderStatus): boolean {
    return ['SUBMITTED', 'PRICE_PROPOSED', 'CONFIRMED'].includes(status);
  }

  /**
   * Check if order can be cancelled by vendor
   */
  canVendorCancel(status: CustomOrderStatus): boolean {
    return ['SUBMITTED', 'PRICE_PROPOSED', 'CONFIRMED', 'PAID'].includes(status);
  }

  /**
   * Check if customer can accept/reject price
   */
  canCustomerRespondToPrice(status: CustomOrderStatus): boolean {
    return status === 'PRICE_PROPOSED';
  }

  /**
   * Check if vendor can propose price
   */
  canVendorProposePrice(status: CustomOrderStatus): boolean {
    return ['SUBMITTED', 'PRICE_PROPOSED'].includes(status);
  }

  /**
   * Check if customer can pay
   */
  canCustomerPay(status: CustomOrderStatus): boolean {
    return status === 'CONFIRMED';
  }

  /**
   * Check if vendor can mark in progress
   */
  canVendorMarkInProgress(status: CustomOrderStatus): boolean {
    return status === 'PAID';
  }

  /**
   * Check if vendor can mark completed
   */
  canVendorMarkCompleted(status: CustomOrderStatus): boolean {
    return status === 'IN_PROGRESS';
  }

  /**
   * Check if admin can assign delivery
   */
  canAdminAssignDelivery(status: CustomOrderStatus): boolean {
    return status === 'COMPLETED';
  }

  /**
   * Check if delivery person can mark delivered
   */
  canDeliveryPersonMarkDelivered(status: CustomOrderStatus): boolean {
    return status === 'OUT_FOR_DELIVERY';
  }

  /**
   * Get next possible actions for an order based on status and user role
   */
  getAvailableActions(order: CustomOrder, userRole: string): string[] {
    const actions: string[] = [];

    switch (userRole) {
      case 'CUSTOMER':
        if (this.canCustomerRespondToPrice(order.status)) {
          actions.push('accept_price', 'reject_price');
        }
        if (this.canCustomerPay(order.status)) {
          actions.push('pay');
        }
        if (this.canCustomerCancel(order.status)) {
          actions.push('cancel');
        }
        break;

      case 'VENDOR':
        if (this.canVendorProposePrice(order.status)) {
          actions.push('propose_price');
        }
        if (this.canVendorMarkInProgress(order.status)) {
          actions.push('mark_in_progress');
        }
        if (this.canVendorMarkCompleted(order.status)) {
          actions.push('mark_completed');
        }
        if (this.canVendorCancel(order.status)) {
          actions.push('cancel');
        }
        break;

      case 'ADMIN':
        if (this.canAdminAssignDelivery(order.status)) {
          actions.push('assign_delivery');
        }
        break;

      case 'DELIVERY_PERSON':
        if (this.canDeliveryPersonMarkDelivered(order.status)) {
          actions.push('mark_delivered');
        }
        break;
    }

    return actions;
  }

  /**
   * Validate order creation request
   */
  validateCreateRequest(data: CreateCustomOrderRequest): string[] {
    const errors: string[] = [];

    if (!data.templateId) {
      errors.push('Template ID is required');
    }

    if (!data.values || data.values.length === 0) {
      errors.push('At least one field value is required');
    }

    // Validate field values
    data.values?.forEach((value, index) => {
      if (!value.fieldId) {
        errors.push(`Value ${index + 1}: Field ID is required`);
      }
      
      // Check that at least one value type is provided
      const hasValue = value.textValue || 
                      value.numberValue !== undefined || 
                      value.fileUrl;
      
      if (!hasValue) {
        errors.push(`Value ${index + 1}: At least one value (text, number, or file) must be provided`);
      }
    });

    return errors;
  }

  /**
   * Sort status history by creation date (newest first)
   */
  sortStatusHistoryByDate(history: any[]): any[] {
    return [...history].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Sort price history by creation date (newest first)
   */
  sortPriceHistoryByDate(history: any[]): any[] {
    return [...history].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
}

// Export singleton instance
export const customOrderService = new CustomOrderService();
export default customOrderService;