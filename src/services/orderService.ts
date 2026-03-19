import { apiService } from "./apiService";
import { formatCurrency } from "@/lib/currency";

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
  orderId: number;
  userId: string;
  orderNumber: string;
  status:
    | "pending"
    | "confirmed"
    | "processing"
    | "shipped"
    | "delivered"
    | "cancelled"
    | "refunded";
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  tax: number;
  discount: number;
  totalAmount: number;
  currency: "ETB" | "USD";
  paymentMethod: string;
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
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
  eta?: string;
  actualDeliveryDate?: string;
  trackingCode?: string;
  notes?: string;
  deliveryPersonInfo?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  deliveryConfirmedAt?: string;
  revenueEarned?: boolean;
  totals?: {
    totalMinor?: number;
    subtotalMinor?: number;
    [key: string]: any;
  };
  lines?: any[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderRequest {
  shippingAddressId?: number;
  billingAddressId?: number;
  contactEmail?: string;
  contactPhone?: string;
  giftOptions?: {
    giftWrap?: boolean;
    cardMessage?: string | null;
  };
  itemGiftOptions?: ItemGiftOption[];
  discountCode?: string | null;
}

export interface ItemGiftOption {
  productId: number;
  productSkuId?: number;
  giftWrapping: boolean;
  giftMessage?: string | null;
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

export interface CustomOrderRequest {
  title: string;
  description: string;
  category: string;
  budget: number | null;
  deadline: string | null;
  customerNotes: string;
}

export interface CustomOrderResponse {
  success: boolean;
  orderId: string;
  message: string;
}

// Vendor Order Types
export interface VendorOrderItem {
  id: number;
  productId: number;
  productName: string;
  productImage?: string;
  skuId?: number;
  skuCode?: string;
  quantity: number;
  unitAmountMinor: number;
  totalAmountMinor: number;
  currency: string;
}

export interface VendorOrderDeliveryInfo {
  assignmentId: number;
  deliveryPersonId: number;
  deliveryPersonName: string;
  deliveryPersonPhone?: string;
  deliveryPersonEmail?: string;
  vehicleType?: string;
  vehicleNumber?: string;
  status:
    | "ASSIGNED"
    | "ACCEPTED"
    | "PICKED_UP"
    | "IN_TRANSIT"
    | "ARRIVED"
    | "DELIVERED"
    | "FAILED"
    | "RETURNED"
    | "CANCELLED";
  assignedAt?: string;
  expectedDeliveryAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  proofImageUrl?: string;
  pickupImageUrl?: string;
  notes?: string;
}

export interface VendorOrder {
  orderId: number;
  orderNumber: string;
  status:
    | "PENDING"
    | "PLACED"
    | "CONFIRMED"
    | "PROCESSING"
    | "SHIPPED"
    | "DELIVERED"
    | "CANCELLED"
    | "REFUNDED"
    | "REJECTED";
  paymentStatus:
    | "PENDING"
    | "PAID"
    | "COMPLETED"
    | "SUCCESS"
    | "FAILED"
    | "REFUNDED";
  rejectionReason?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  items: VendorOrderItem[];
  subtotalMinor: number;
  totalAmountMinor: number;
  vendorAmountMinor: number;
  platformFeeMinor?: number;
  vatAmountMinor?: number;
  deliveryFeeMinor?: number;
  discountMinor?: number;
  commissionBonusMinor?: number;
  campaignRewardApplied?: boolean;
  currency: string;
  shippingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipcode?: string;
    addressLine1?: string;
    addressLine2?: string;
  };
  deliveryInfo?: VendorOrderDeliveryInfo;
  giftWrap?: boolean;
  cardMessage?: string;
  trackingCode?: string;
  notes?: string;
  deliveryConfirmedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VendorOrdersResponse {
  content?: VendorOrder[];
  items?: VendorOrder[];
  totalElements?: number;
  totalPages?: number;
  size?: number;
  number?: number;
  first?: boolean;
  last?: boolean;
  pagination?: {
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

class OrderService {
  async placeOrder(
    orderData: CreateOrderRequest,
    idempotencyKey: string
  ): Promise<Order> {
    return await apiService.postRequest<Order>("/api/orders", orderData, {
      "Idempotency-Key": idempotencyKey,
    });
  }

  /**
   * Get user orders with pagination
   */
  async getUserOrders(
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<OrdersResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append("page", page.toString());
    queryParams.append("limit", limit.toString());

    return await apiService.getRequest<OrdersResponse>(
      `/api/users/${userId}/orders?${queryParams.toString()}`
    );
  }

  /**
   * Get current user's orders
   */
  async getMyOrders(
    page: number = 1,
    limit: number = 10
  ): Promise<OrdersResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append("page", page.toString());
    queryParams.append("limit", limit.toString());

    return await apiService.getRequest<OrdersResponse>(
      `/api/orders/my?${queryParams.toString()}`
    );
  }

  /**
   * Get order details by ID
   */
  async getOrderDetails(orderId: number): Promise<Order> {
    return await apiService.getRequest<Order>(`/api/orders/${orderId}`);
  }

  /**
   * Get order by order number
   */
  async getOrderByNumber(orderNumber: string): Promise<Order> {
    return await apiService.getRequest<Order>(
      `/api/orders/number/${orderNumber}`
    );
  }

  /**
   * Track order
   */
  async trackOrder(orderNumber: string): Promise<OrderTrackingInfo> {
    return await apiService.getRequest<OrderTrackingInfo>(
      `/api/orders/track/${orderNumber}`
    );
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId: number, reason?: string): Promise<Order> {
    const queryParams = reason ? `?reason=${encodeURIComponent(reason)}` : "";
    return await apiService.postRequest<Order>(
      `/api/orders/${orderId}/cancel${queryParams}`
    );
  }

  /**
   * Update order status (admin/vendor only)
   */
  async updateOrderStatus(
    orderId: number,
    status: Order["status"],
    trackingCode?: string
  ): Promise<Order> {
    const data = { status, trackingCode };
    return await apiService.putRequest<Order>(
      `/api/orders/${orderId}/status`,
      data
    );
  }

  /**
   * Process refund (admin only)
   */
  async processRefund(
    orderId: number,
    amount?: number,
    reason?: string
  ): Promise<{ message: string }> {
    const data = { amount, reason };
    return await apiService.postRequest(`/api/orders/${orderId}/refund`, data);
  }

  /**
   * Get all orders (admin only)
   */
  async getAllOrders(
    page: number = 1,
    limit: number = 20,
    status?: Order["status"],
    paymentStatus?: Order["paymentStatus"]
  ): Promise<OrdersResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append("page", page.toString());
    queryParams.append("limit", limit.toString());
    if (status) queryParams.append("status", status);
    if (paymentStatus) queryParams.append("paymentStatus", paymentStatus);

    return await apiService.getRequest<OrdersResponse>(
      `/api/orders/all?${queryParams.toString()}`
    );
  }

  /**
   * Get order statistics (admin only)
   */
  async getOrderStats(
    startDate?: string,
    endDate?: string
  ): Promise<OrderStats> {
    const queryParams = new URLSearchParams();
    if (startDate) queryParams.append("startDate", startDate);
    if (endDate) queryParams.append("endDate", endDate);

    const url = `/api/orders/stats${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;
    return await apiService.getRequest<OrderStats>(url);
  }

  /**
   * Search orders (admin only)
   */
  async searchOrders(
    query: string,
    page: number = 1,
    limit: number = 20
  ): Promise<OrdersResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append("q", query);
    queryParams.append("page", page.toString());
    queryParams.append("limit", limit.toString());

    return await apiService.getRequest<OrdersResponse>(
      `/api/orders/search?${queryParams.toString()}`
    );
  }

  /**
   * Export orders (admin only)
   */
  async exportOrders(
    startDate?: string,
    endDate?: string,
    format: "csv" | "excel" = "csv"
  ): Promise<Blob> {
    const queryParams = new URLSearchParams();
    if (startDate) queryParams.append("startDate", startDate);
    if (endDate) queryParams.append("endDate", endDate);
    queryParams.append("format", format);

    // This would need special handling for blob response
    const url = `/api/orders/export${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;
    return await apiService.getRequest<Blob>(url);
  }

  /**
   * Submit a custom order request
   */
  async submitCustomOrder(
    orderData: CustomOrderRequest
  ): Promise<CustomOrderResponse> {
    try {
      return await apiService.postRequest<CustomOrderResponse>(
        "/api/custom-orders",
        orderData
      );
    } catch (error: any) {
      console.error("Failed to submit custom order:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to submit custom order"
      );
    }
  }

  // ==================== Vendor Order Operations ====================

  /**
   * Get vendor's product orders (orders containing vendor's products)
   */
  async getVendorOrders(
    page: number = 0,
    size: number = 20,
    status?: string
  ): Promise<VendorOrdersResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append("page", page.toString());
    queryParams.append("size", size.toString());
    if (status) queryParams.append("status", status);

    return await apiService.getRequest<VendorOrdersResponse>(
      `/api/vendor/orders?${queryParams.toString()}`
    );
  }

  /**
   * Get a specific vendor order by ID
   */
  async getVendorOrderById(orderId: number): Promise<VendorOrder> {
    return await apiService.getRequest<VendorOrder>(
      `/api/vendor/orders/${orderId}`
    );
  }

  /**
   * Update vendor order status (mark as ready for delivery, etc.)
   */
  async updateVendorOrderStatus(
    orderId: number,
    status: string,
    notes?: string
  ): Promise<VendorOrder> {
    const queryParams = new URLSearchParams({ status });
    if (notes) {
      queryParams.append("notes", notes);
    }
    return await apiService.putRequest<VendorOrder>(
      `/api/vendor/orders/${orderId}/status?${queryParams.toString()}`,
      null
    );
  }

  /**
   * Accept a placed order (moves to CONFIRMED status)
   */
  async acceptOrder(orderId: number): Promise<VendorOrder> {
    return await apiService.postRequest<VendorOrder>(
      `/api/vendor/orders/${orderId}/accept`,
      {}
    );
  }

  /**
   * Deny a placed order with a reason (moves to CANCELLED status)
   */
  async denyOrder(orderId: number, reason: string): Promise<VendorOrder> {
    const queryParams = new URLSearchParams();
    queryParams.append("reason", reason);
    return await apiService.postRequest<VendorOrder>(
      `/api/vendor/orders/${orderId}/deny?${queryParams.toString()}`,
      {}
    );
  }

  // Note: Delivery confirmation is now handled by admin via adminService.confirmOrderDelivery()
  // Admin reviews delivery proof images before confirming delivery and recognizing revenue.

  // ==================== Helper Methods ====================

  /**
   * Format price for display. Converts minor units to major units.
   */
  formatPrice(
    amountMinor: number | undefined | null,
    currency: string = "USD"
  ): string {
    const amount = (amountMinor ?? 0) / 100;
    return formatCurrency(amount, currency);
  }

  /**
   * Get order status display info
   */
  getStatusDisplay(status: string): {
    text: string;
    bgColor: string;
    color: string;
  } {
    const statusMap: Record<
      string,
      { text: string; bgColor: string; color: string }
    > = {
      PENDING: {
        text: "Pending",
        bgColor: "bg-yellow-100",
        color: "text-yellow-700",
      },
      PLACED: {
        text: "Awaiting Approval",
        bgColor: "bg-purple-100",
        color: "text-purple-700",
      },
      CONFIRMED: {
        text: "Confirmed",
        bgColor: "bg-blue-100",
        color: "text-blue-700",
      },
      PROCESSING: {
        text: "Processing",
        bgColor: "bg-purple-100",
        color: "text-purple-700",
      },
      SHIPPED: {
        text: "Shipped",
        bgColor: "bg-indigo-100",
        color: "text-indigo-700",
      },
      DELIVERED: {
        text: "Delivered",
        bgColor: "bg-green-100",
        color: "text-green-700",
      },
      CANCELLED: {
        text: "Cancelled",
        bgColor: "bg-red-100",
        color: "text-red-700",
      },
      REFUNDED: {
        text: "Refunded",
        bgColor: "bg-gray-100",
        color: "text-gray-700",
      },
      REJECTED: {
        text: "Rejected",
        bgColor: "bg-red-100",
        color: "text-red-700",
      },
    };
    return (
      statusMap[status] || {
        text: status,
        bgColor: "bg-gray-100",
        color: "text-gray-700",
      }
    );
  }

  /**
   * Get delivery status display info
   */
  getDeliveryStatusDisplay(status: string): {
    text: string;
    bgColor: string;
    color: string;
  } {
    const statusMap: Record<
      string,
      { text: string; bgColor: string; color: string }
    > = {
      ASSIGNED: {
        text: "Assigned",
        bgColor: "bg-blue-100",
        color: "text-blue-700",
      },
      ACCEPTED: {
        text: "Accepted",
        bgColor: "bg-cyan-100",
        color: "text-cyan-700",
      },
      PICKED_UP: {
        text: "Picked Up",
        bgColor: "bg-purple-100",
        color: "text-purple-700",
      },
      IN_TRANSIT: {
        text: "In Transit",
        bgColor: "bg-indigo-100",
        color: "text-indigo-700",
      },
      ARRIVED: {
        text: "Arrived",
        bgColor: "bg-orange-100",
        color: "text-orange-700",
      },
      DELIVERED: {
        text: "Delivered",
        bgColor: "bg-green-100",
        color: "text-green-700",
      },
      FAILED: { text: "Failed", bgColor: "bg-red-100", color: "text-red-700" },
      RETURNED: {
        text: "Returned",
        bgColor: "bg-amber-100",
        color: "text-amber-700",
      },
      CANCELLED: {
        text: "Cancelled",
        bgColor: "bg-gray-100",
        color: "text-gray-700",
      },
    };
    return (
      statusMap[status] || {
        text: status,
        bgColor: "bg-gray-100",
        color: "text-gray-700",
      }
    );
  }

  /**
   * Get payment status display info
   */
  getPaymentStatusDisplay(status: string): {
    text: string;
    bgColor: string;
    color: string;
  } {
    const statusMap: Record<
      string,
      { text: string; bgColor: string; color: string }
    > = {
      PENDING: {
        text: "Pending",
        bgColor: "bg-yellow-100",
        color: "text-yellow-700",
      },
      PAID: { text: "Paid", bgColor: "bg-green-100", color: "text-green-700" },
      COMPLETED: {
        text: "Paid",
        bgColor: "bg-green-100",
        color: "text-green-700",
      },
      FAILED: { text: "Failed", bgColor: "bg-red-100", color: "text-red-700" },
      REFUNDED: {
        text: "Refunded",
        bgColor: "bg-gray-100",
        color: "text-gray-700",
      },
    };
    return (
      statusMap[status] || {
        text: status,
        bgColor: "bg-gray-100",
        color: "text-gray-700",
      }
    );
  }

  /**
   * Format date
   */
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  /**
   * Format date and time
   */
  formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
}

// Export singleton instance
export const orderService = new OrderService();
export default orderService;
