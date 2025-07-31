import { apiService } from './apiService';

// Types for orders
export interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  productImage: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Order {
  id: number;
  userId: string;
  orderNumber: string;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  tax: number;
  discount: number;
  totalAmount: number;
  currency: 'ETB' | 'USD';
  paymentMethod: string;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  shippingAddress: {
    fullName: string;
    phone: string;
    email: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  billingAddress?: {
    fullName: string;
    phone: string;
    email: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  estimatedDeliveryDate?: string;
  actualDeliveryDate?: string;
  trackingCode?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderRequest {
  items: {
    productId: number;
    quantity: number;
  }[];
  shippingAddress: {
    fullName: string;
    phone: string;
    email: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  billingAddress?: {
    fullName: string;
    phone: string;
    email: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  paymentMethod: string;
  currency?: 'ETB' | 'USD';
  notes?: string;
  couponCode?: string;
}

export interface OrdersResponse {
  orders: Order[];
  total: number;
  page: number;
  totalPages: number;
}

export interface OrderTrackingInfo {
  orderId: number;
  orderNumber: string;
  status: string;
  trackingCode?: string;
  estimatedDeliveryDate?: string;
  actualDeliveryDate?: string;
  trackingHistory: {
    status: string;
    description: string;
    location?: string;
    timestamp: string;
  }[];
}

export interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  ordersByStatus: {
    [key: string]: number;
  };
  revenueByMonth: {
    month: string;
    revenue: number;
  }[];
}

// Order service
class OrderService {
  /**
   * Place new order
   */
  async placeOrder(orderData: CreateOrderRequest): Promise<Order> {
    return await apiService.postRequest<Order>('/orders', orderData);
  }

  /**
   * Get user orders with pagination
   */
  async getUserOrders(userId: string, page: number = 1, limit: number = 10): Promise<OrdersResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('limit', limit.toString());
    
    return await apiService.getRequest<OrdersResponse>(`/users/${userId}/orders?${queryParams.toString()}`);
  }

  /**
   * Get current user's orders
   */
  async getMyOrders(page: number = 1, limit: number = 10): Promise<OrdersResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('limit', limit.toString());
    
    return await apiService.getRequest<OrdersResponse>(`/orders/my?${queryParams.toString()}`);
  }

  /**
   * Get order details by ID
   */
  async getOrderDetails(orderId: number): Promise<Order> {
    return await apiService.getRequest<Order>(`/orders/${orderId}`);
  }

  /**
   * Get order by order number
   */
  async getOrderByNumber(orderNumber: string): Promise<Order> {
    return await apiService.getRequest<Order>(`/orders/number/${orderNumber}`);
  }

  /**
   * Track order
   */
  async trackOrder(orderNumber: string): Promise<OrderTrackingInfo> {
    return await apiService.getRequest<OrderTrackingInfo>(`/orders/track/${orderNumber}`);
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId: number, reason?: string): Promise<{ message: string }> {
    const data = reason ? { reason } : undefined;
    return await apiService.putRequest(`/orders/${orderId}/cancel`, data);
  }

  /**
   * Update order status (admin/vendor only)
   */
  async updateOrderStatus(
    orderId: number, 
    status: Order['status'], 
    trackingCode?: string
  ): Promise<Order> {
    const data = { status, trackingCode };
    return await apiService.putRequest<Order>(`/orders/${orderId}/status`, data);
  }

  /**
   * Process refund (admin only)
   */
  async processRefund(orderId: number, amount?: number, reason?: string): Promise<{ message: string }> {
    const data = { amount, reason };
    return await apiService.postRequest(`/orders/${orderId}/refund`, data);
  }

  /**
   * Get all orders (admin only)
   */
  async getAllOrders(
    page: number = 1, 
    limit: number = 20, 
    status?: Order['status'],
    paymentStatus?: Order['paymentStatus']
  ): Promise<OrdersResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('limit', limit.toString());
    if (status) queryParams.append('status', status);
    if (paymentStatus) queryParams.append('paymentStatus', paymentStatus);
    
    return await apiService.getRequest<OrdersResponse>(`/orders/all?${queryParams.toString()}`);
  }

  /**
   * Get order statistics (admin only)
   */
  async getOrderStats(startDate?: string, endDate?: string): Promise<OrderStats> {
    const queryParams = new URLSearchParams();
    if (startDate) queryParams.append('startDate', startDate);
    if (endDate) queryParams.append('endDate', endDate);
    
    const url = `/orders/stats${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return await apiService.getRequest<OrderStats>(url);
  }

  /**
   * Search orders (admin only)
   */
  async searchOrders(query: string, page: number = 1, limit: number = 20): Promise<OrdersResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append('q', query);
    queryParams.append('page', page.toString());
    queryParams.append('limit', limit.toString());
    
    return await apiService.getRequest<OrdersResponse>(`/orders/search?${queryParams.toString()}`);
  }

  /**
   * Export orders (admin only)
   */
  async exportOrders(
    startDate?: string, 
    endDate?: string, 
    format: 'csv' | 'excel' = 'csv'
  ): Promise<Blob> {
    const queryParams = new URLSearchParams();
    if (startDate) queryParams.append('startDate', startDate);
    if (endDate) queryParams.append('endDate', endDate);
    queryParams.append('format', format);
    
    // This would need special handling for blob response
    const url = `/orders/export${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return await apiService.getRequest<Blob>(url);
  }
}

// Export singleton instance
export const orderService = new OrderService();
export default orderService;