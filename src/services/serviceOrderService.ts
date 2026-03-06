import { apiService } from './apiService';
import { ServiceResponse } from './serviceService';
import { getCurrencyDecimals, formatCurrency } from '@/lib/currency';
import { toInstantISOString } from '@/lib/instant';

/**
 * Service Order types matching the backend ServiceOrderResponse DTO
 */

export type ServiceOrderStatus = 
  | 'BOOKED'
  | 'CONFIRMED_BY_VENDOR'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'RESCHEDULED'
  | 'NO_SHOW';

export type PaymentStatus = 
  | 'PENDING'
  | 'PAID'
  | 'FAILED'
  | 'REFUNDED';

export interface CancellationInfo {
  cancelledAt?: string;
  reason?: string;
  cancelledBy?: 'CUSTOMER' | 'VENDOR' | 'SYSTEM';
  refundAmountMinor?: number;
  refundPercentage?: number;
}

export interface RescheduleInfo {
  originalDateTime?: string;
  rescheduledAt?: string;
  rescheduledBy?: 'CUSTOMER' | 'VENDOR';
  rescheduleCount?: number;
  pendingRescheduleDateTime?: string;
}

export interface RefundEligibility {
  canCancel: boolean;
  refundTier?: 'FULL' | 'PARTIAL' | 'NONE';
  refundPercentage?: number;
  estimatedRefundMinor?: number;
  reason?: string;
}

export interface ServiceOrderResponse {
  id: number;
  orderNumber: string;
  
  // Customer info
  customerId: number;
  customerName?: string;
  contactEmail?: string;
  contactPhone?: string;
  
  // Vendor info
  vendorId: number;
  vendorName?: string;
  
  // Service info
  service?: ServiceResponse;
  
  // Package info (if booked with a specific package)
  packageId?: number;
  packageName?: string;
  packageCode?: string;
  
  // Booking details
  scheduledDateTime: string;
  
  // Pricing (all in minor units)
  subtotalMinor: number;
  discountMinor?: number;
  vatAmountMinor?: number;
  platformFeeMinor?: number;
  totalAmountMinor: number;
  currency: string;
  
  // Vendor earnings (vendor-specific fields)
  vendorAmountMinor?: number;      // Vendor's final payout amount
  vendorSubtotalMinor?: number;    // Vendor's subtotal after discount
  
  // Gift details
  giftMessage?: string;
  recipientName?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  
  // Payment info
  paymentStatus: PaymentStatus;
  paymentProvider?: string;
  paymentReference?: string;
  paidAt?: string;
  
  // Order status
  status: ServiceOrderStatus;
  
  // Cancellation info
  cancellationInfo?: CancellationInfo;
  
  // Reschedule info
  rescheduleInfo?: RescheduleInfo;
  
  // Refund eligibility
  refundEligibility?: RefundEligibility;
  
  // Timestamps
  createdAt: string;
  updatedAt?: string;
  
  // Checkout URL (for payment initialization)
  checkoutUrl?: string;
  
  // Discount validation info (if discount code was provided but not applied)
  discountCode?: string;
  discountValidationError?: string;
}

export interface CreateServiceOrderRequest {
  serviceId: number;
  packageId?: number; // Optional - uses default package if not specified
  scheduledDateTime: string; // ISO date-time string
  contactEmail: string;
  contactPhone?: string;
  giftMessage?: string;
  recipientName?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  paymentProvider: 'STRIPE' | 'CHAPA';
  discountCode?: string;
}

export interface PaymentInitResponse {
  provider: string;
  paymentId: string;
  checkoutUrl?: string;
  clientSecret?: string;
  publishableKey?: string;
}

export interface PagedServiceOrderResponse {
  content: ServiceOrderResponse[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

class ServiceOrderService {
  // ==================== Customer Order Operations ====================

  /**
   * Create a new service order (booking)
   */
  async createOrder(request: CreateServiceOrderRequest): Promise<ServiceOrderResponse> {
    return await apiService.postRequest<ServiceOrderResponse, CreateServiceOrderRequest>(
      '/api/service-orders',
      {
        ...request,
        scheduledDateTime: toInstantISOString(request.scheduledDateTime) || request.scheduledDateTime,
      }
    );
  }

  /**
   * Get order details by ID
   */
  async getOrder(orderId: number): Promise<ServiceOrderResponse> {
    return await apiService.getRequest<ServiceOrderResponse>(`/api/service-orders/${orderId}`);
  }

  /**
   * Get order details by order number
   */
  async getOrderByNumber(orderNumber: string): Promise<ServiceOrderResponse> {
    return await apiService.getRequest<ServiceOrderResponse>(
      `/api/service-orders/by-number/${orderNumber}`
    );
  }

  /**
   * Get customer's service orders
   */
  async getCustomerOrders(page: number = 0, size: number = 10): Promise<PagedServiceOrderResponse> {
    const url = `/api/service-orders/customer?page=${page}&size=${size}`;
    return await apiService.getRequest<PagedServiceOrderResponse>(url);
  }

  // ==================== Payment Operations ====================

  /**
   * Initialize payment for a service order
   */
  async initializePayment(orderId: number, provider: 'STRIPE' | 'CHAPA'): Promise<PaymentInitResponse> {
    return await apiService.postRequest<PaymentInitResponse>(
      `/api/service-orders/${orderId}/pay?provider=${provider}`,
      {}
    );
  }

  // ==================== Vendor Order Operations ====================

  /**
   * Get vendor's service orders
   */
  async getVendorOrders(page: number = 0, size: number = 10): Promise<PagedServiceOrderResponse> {
    const url = `/api/service-orders/vendor?page=${page}&size=${size}`;
    return await apiService.getRequest<PagedServiceOrderResponse>(url);
  }

  /**
   * Get orders for a specific service (vendor)
   */
  async getServiceOrders(serviceId: number, page: number = 0, size: number = 10): Promise<PagedServiceOrderResponse> {
    const url = `/api/service-orders/vendor/service/${serviceId}?page=${page}&size=${size}`;
    return await apiService.getRequest<PagedServiceOrderResponse>(url);
  }

  /**
   * Confirm a service order (vendor)
   */
  async confirmOrder(orderId: number): Promise<ServiceOrderResponse> {
    return await apiService.postRequest<ServiceOrderResponse>(`/api/service-orders/${orderId}/confirm`, {});
  }

  /**
   * Mark service as in progress (vendor)
   */
  async markInProgress(orderId: number): Promise<ServiceOrderResponse> {
    return await apiService.postRequest<ServiceOrderResponse>(`/api/service-orders/${orderId}/in-progress`, {});
  }

  /**
   * Mark service as completed (vendor)
   */
  async completeOrder(orderId: number): Promise<ServiceOrderResponse> {
    return await apiService.postRequest<ServiceOrderResponse>(`/api/service-orders/${orderId}/complete`, {});
  }

  /**
   * Mark customer as no-show (vendor)
   */
  async markNoShow(orderId: number): Promise<ServiceOrderResponse> {
    return await apiService.postRequest<ServiceOrderResponse>(`/api/service-orders/${orderId}/no-show`, {});
  }

  /**
   * Cancel a service order (vendor)
   */
  async vendorCancelOrder(orderId: number, reason: string, validReason: boolean = false): Promise<ServiceOrderResponse> {
    const url = `/api/service-orders/${orderId}/vendor-cancel?reason=${encodeURIComponent(reason)}&validReason=${validReason}`;
    return await apiService.postRequest<ServiceOrderResponse>(url, {});
  }

  /**
   * Request reschedule (vendor)
   */
  async vendorRescheduleOrder(orderId: number, newDateTime: string): Promise<ServiceOrderResponse> {
    const instant = toInstantISOString(newDateTime) || newDateTime;
    const url = `/api/service-orders/${orderId}/vendor-reschedule?newDateTime=${encodeURIComponent(instant)}`;
    return await apiService.postRequest<ServiceOrderResponse>(url, {});
  }

  // ==================== Customer Cancellation & Rescheduling ====================

  /**
   * Cancel a service order (customer)
   */
  async cancelOrder(orderId: number, reason?: string): Promise<ServiceOrderResponse> {
    const url = reason 
      ? `/api/service-orders/${orderId}/cancel?reason=${encodeURIComponent(reason)}`
      : `/api/service-orders/${orderId}/cancel`;
    return await apiService.postRequest<ServiceOrderResponse>(url, {});
  }

  /**
   * Reschedule a service order (customer)
   */
  async rescheduleOrder(orderId: number, newDateTime: string): Promise<ServiceOrderResponse> {
    const instant = toInstantISOString(newDateTime) || newDateTime;
    const url = `/api/service-orders/${orderId}/reschedule?newDateTime=${encodeURIComponent(instant)}`;
    return await apiService.postRequest<ServiceOrderResponse>(url, {});
  }

  /**
   * Approve or reject a vendor's reschedule request
   */
  async approveReschedule(orderId: number, approved: boolean): Promise<ServiceOrderResponse> {
    const url = `/api/service-orders/${orderId}/approve-reschedule?approved=${approved}`;
    return await apiService.postRequest<ServiceOrderResponse>(url, {});
  }

  // ==================== Utility Methods ====================

  /**
   * Format price for display. Converts minor units to major units.
   */
  formatPrice(amountMinor: number, currency: string | undefined | null): string {
    const curr = currency || 'ETB';
    const decimals = getCurrencyDecimals(curr);
    const amount = amountMinor / Math.pow(10, decimals);
    return formatCurrency(amount, curr);
  }

  /**
   * Format date/time for display
   */
  formatDateTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  /**
   * Format date only for display
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * Format time only for display
   */
  formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  /**
   * Get status display text and color
   */
  getStatusDisplay(status: ServiceOrderStatus): { text: string; color: string; bgColor: string } {
    const statusMap: Record<ServiceOrderStatus, { text: string; color: string; bgColor: string }> = {
      BOOKED: { text: 'Booked', color: 'text-blue-700', bgColor: 'bg-blue-100' },
      CONFIRMED_BY_VENDOR: { text: 'Confirmed', color: 'text-green-700', bgColor: 'bg-green-100' },
      IN_PROGRESS: { text: 'In Progress', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
      COMPLETED: { text: 'Completed', color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
      CANCELLED: { text: 'Cancelled', color: 'text-red-700', bgColor: 'bg-red-100' },
      RESCHEDULED: { text: 'Rescheduled', color: 'text-purple-700', bgColor: 'bg-purple-100' },
      NO_SHOW: { text: 'No Show', color: 'text-gray-700', bgColor: 'bg-gray-100' },
    };
    return statusMap[status] || { text: status, color: 'text-gray-700', bgColor: 'bg-gray-100' };
  }

  /**
   * Get payment status display text and color
   */
  getPaymentStatusDisplay(status: PaymentStatus): { text: string; color: string; bgColor: string } {
    const statusMap: Record<PaymentStatus, { text: string; color: string; bgColor: string }> = {
      PENDING: { text: 'Pending', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
      PAID: { text: 'Paid', color: 'text-green-700', bgColor: 'bg-green-100' },
      FAILED: { text: 'Failed', color: 'text-red-700', bgColor: 'bg-red-100' },
      REFUNDED: { text: 'Refunded', color: 'text-blue-700', bgColor: 'bg-blue-100' },
    };
    return statusMap[status] || { text: status, color: 'text-gray-700', bgColor: 'bg-gray-100' };
  }

  /**
   * Check if order can be cancelled
   */
  canCancelOrder(order: ServiceOrderResponse): boolean {
    return order.refundEligibility?.canCancel ?? false;
  }

  /**
   * Check if order can be rescheduled
   */
  canRescheduleOrder(order: ServiceOrderResponse): boolean {
    // Can reschedule if status is BOOKED or CONFIRMED_BY_VENDOR
    // and reschedule count is 0 and 48+ hours before service
    if (!['BOOKED', 'CONFIRMED_BY_VENDOR'].includes(order.status)) {
      return false;
    }
    
    const rescheduleCount = order.rescheduleInfo?.rescheduleCount ?? 0;
    if (rescheduleCount >= 1) {
      return false;
    }
    
    const scheduledDate = new Date(order.scheduledDateTime);
    const now = new Date();
    const hoursUntilService = (scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    return hoursUntilService >= 48;
  }

  /**
   * Check if there's a pending reschedule request from vendor
   */
  hasPendingReschedule(order: ServiceOrderResponse): boolean {
    return !!order.rescheduleInfo?.pendingRescheduleDateTime;
  }

  /**
   * Get hours until scheduled service
   */
  getHoursUntilService(order: ServiceOrderResponse): number {
    const scheduledDate = new Date(order.scheduledDateTime);
    const now = new Date();
    return Math.floor((scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60));
  }

  /**
   * Check if service date has passed
   */
  isServiceDatePassed(order: ServiceOrderResponse): boolean {
    const scheduledDate = new Date(order.scheduledDateTime);
    return scheduledDate < new Date();
  }

  // ==================== Vendor Utility Methods ====================

  /**
   * Check if vendor can confirm the order
   */
  canVendorConfirm(order: ServiceOrderResponse): boolean {
    return order.status === 'BOOKED' && order.paymentStatus === 'PAID';
  }

  /**
   * Check if vendor can mark order as in progress
   */
  canVendorMarkInProgress(order: ServiceOrderResponse): boolean {
    return order.status === 'CONFIRMED_BY_VENDOR';
  }

  /**
   * Check if vendor can complete the order
   */
  canVendorComplete(order: ServiceOrderResponse): boolean {
    return order.status === 'IN_PROGRESS';
  }

  /**
   * Check if vendor can mark no-show
   */
  canVendorMarkNoShow(order: ServiceOrderResponse): boolean {
    if (!['BOOKED', 'CONFIRMED_BY_VENDOR'].includes(order.status)) {
      return false;
    }
    
    const scheduledDate = new Date(order.scheduledDateTime);
    const now = new Date();
    const hoursSinceService = (now.getTime() - scheduledDate.getTime()) / (1000 * 60 * 60);
    
    // Can mark no-show within 24 hours after scheduled time
    return hoursSinceService >= 0 && hoursSinceService <= 24;
  }

  /**
   * Check if vendor can cancel the order
   */
  canVendorCancel(order: ServiceOrderResponse): boolean {
    return ['BOOKED', 'CONFIRMED_BY_VENDOR'].includes(order.status) && 
           order.paymentStatus === 'PAID';
  }

  /**
   * Check if vendor can request reschedule
   */
  canVendorReschedule(order: ServiceOrderResponse): boolean {
    if (!['BOOKED', 'CONFIRMED_BY_VENDOR'].includes(order.status)) {
      return false;
    }
    
    // Check if there's already a pending reschedule
    if (order.rescheduleInfo?.pendingRescheduleDateTime) {
      return false;
    }
    
    return true;
  }

  /**
   * Get available vendor actions for an order
   */
  getVendorActions(order: ServiceOrderResponse): string[] {
    const actions: string[] = [];
    
    if (this.canVendorConfirm(order)) actions.push('confirm');
    if (this.canVendorMarkInProgress(order)) actions.push('in-progress');
    if (this.canVendorComplete(order)) actions.push('complete');
    if (this.canVendorMarkNoShow(order)) actions.push('no-show');
    if (this.canVendorCancel(order)) actions.push('cancel');
    if (this.canVendorReschedule(order)) actions.push('reschedule');
    
    return actions;
  }
}

// Export singleton instance
export const serviceOrderService = new ServiceOrderService();
export default serviceOrderService;
