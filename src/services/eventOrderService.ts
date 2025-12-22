import { apiService } from './apiService';

export interface CurrencyInfo {
  id: number;
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
  isActive: boolean;
  isDefault: boolean;
}

export interface TicketType {
  id: number;
  name: string;
  description?: string;
  priceMinor: number;
  currency: string;
  originalCurrency?: string;
  originalPriceMinor?: number;
  capacity: number;
  soldCount: number;
  availableCount: number;
  isActive: boolean;
  sortOrder: number;
}

export interface ImageDto {
  id: number;
  url: string;
  originalFilename?: string;
  altText?: string;
  sortOrder: number;
  isPrimary: boolean;
  fileSize?: number;
  contentType?: string;
  createdAt?: string;
}

export interface EventResponse {
  id: number;
  title: string;
  description: string;
  location: string;
  city: string;
  bannerImageUrl?: string;
  eventDate: string;
  eventEndDate?: string;
  organizerContact?: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  isFeatured: boolean;
  isSoldOut: boolean;
  ticketTypes: TicketType[];
  startingPriceMinor?: number;
  vendorId: number;
  vendorName?: string;
  eventTypeId?: number;
  eventTypeName?: string;
  categoryId?: number;
  categoryName?: string;
  currency?: string;
  totalCapacity?: number;
  totalAvailable?: number;
  totalSold?: number;
  images?: ImageDto[];
  createdAt: string;
  updatedAt: string;
}

export interface TicketPurchaseItem {
  ticketTypeId: number;
  recipientName: string;
  recipientEmail: string;
  recipientPhone: string;
}

export interface CreateEventOrderRequest {
  eventId: number;
  tickets: TicketPurchaseItem[];
  contactEmail: string;
  contactPhone: string;
  giftMessage?: string;
  discountCode?: string;
  paymentProvider: 'STRIPE' | 'CHAPA';
}

export interface TicketResponse {
  id: number;
  ticketCode: string;
  ticketTypeId: number;
  ticketTypeName: string;
  recipientName: string;
  recipientEmail: string;
  recipientPhone?: string;
  pricePaidMinor: number;
  pricePaid?: number;
  currency: string;
  status: 'RESERVED' | 'ISSUED' | 'CHECKED_IN' | 'CANCELLED' | 'EXPIRED';
  checkedInAt?: string;
}

export interface EventOrderResponse {
  id: number;
  orderNumber: string;
  customerId: number;
  customerName: string;
  contactEmail: string;
  contactPhone?: string;
  eventId: number;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  tickets: TicketResponse[];
  totalTicketCount: number;
  checkedInCount: number;
  subtotalMinor: number;
  discountMinor: number;
  taxMinor: number;
  totalAmountMinor: number;
  currency: string;
  giftMessage?: string;
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  paymentProvider?: string;
  paymentReference?: string;
  paidAt?: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  cancelledAt?: string;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
  checkoutUrl?: string;
}

export interface PaymentInitResponse {
  provider: string;
  paymentId: string;
  checkoutUrl?: string;
  clientSecret?: string;
  publishableKey?: string;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

class EventOrderService {
  private currencyCache: Map<string, CurrencyInfo> = new Map();
  private currencyCachePromise: Promise<void> | null = null;

  private async loadCurrencies(): Promise<void> {
    if (this.currencyCache.size > 0) return;
    if (this.currencyCachePromise) return this.currencyCachePromise;

    this.currencyCachePromise = apiService
      .getRequest<CurrencyInfo[]>('/api/currencies')
      .then((currencies) => {
        currencies.forEach((c) => this.currencyCache.set(c.code.toUpperCase(), c));
      })
      .catch(() => {});

    return this.currencyCachePromise;
  }

  private getDecimalPlaces(currency: string): number {
    const info = this.currencyCache.get(currency.toUpperCase());
    return info?.decimalPlaces ?? 2;
  }

  async getEvents(page = 0, size = 12, currency?: string): Promise<PaginatedResponse<EventResponse>> {
    await this.loadCurrencies();
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('size', size.toString());
    if (currency) params.append('currency', currency);
    
    return apiService.getRequest<PaginatedResponse<EventResponse>>(
      `/api/events?${params.toString()}`
    );
  }

  async getFeaturedEvents(page = 0, size = 6, currency?: string): Promise<PaginatedResponse<EventResponse>> {
    await this.loadCurrencies();
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('size', size.toString());
    if (currency) params.append('currency', currency);
    
    return apiService.getRequest<PaginatedResponse<EventResponse>>(
      `/api/events/featured?${params.toString()}`
    );
  }

  async searchEvents(
    query?: string,
    city?: string,
    categoryId?: number,
    page = 0,
    size = 12,
    currency?: string
  ): Promise<PaginatedResponse<EventResponse>> {
    await this.loadCurrencies();
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('size', size.toString());
    if (query) params.append('query', query);
    if (city) params.append('city', city);
    if (categoryId) params.append('categoryId', categoryId.toString());
    if (currency) params.append('currency', currency);
    
    return apiService.getRequest<PaginatedResponse<EventResponse>>(
      `/api/events/search?${params.toString()}`
    );
  }

  async getEvent(eventId: number, currency?: string): Promise<EventResponse> {
    await this.loadCurrencies();
    const url = currency 
      ? `/api/events/${eventId}?currency=${currency}`
      : `/api/events/${eventId}`;
    return apiService.getRequest<EventResponse>(url);
  }

  async createOrder(request: CreateEventOrderRequest): Promise<EventOrderResponse> {
    return apiService.postRequest<EventOrderResponse, CreateEventOrderRequest>(
      '/api/events/orders',
      request
    );
  }

  async initializePayment(orderId: number, provider: string): Promise<PaymentInitResponse> {
    return apiService.postRequest<PaymentInitResponse>(
      `/api/events/orders/${orderId}/pay?provider=${provider}`,
      {}
    );
  }

  async getMyOrders(page = 0, size = 10): Promise<PaginatedResponse<EventOrderResponse>> {
    await this.loadCurrencies();
    return apiService.getRequest<PaginatedResponse<EventOrderResponse>>(
      `/api/events/orders?page=${page}&size=${size}`
    );
  }

  async getOrder(orderId: number): Promise<EventOrderResponse> {
    await this.loadCurrencies();
    return apiService.getRequest<EventOrderResponse>(`/api/events/orders/${orderId}`);
  }

  async getOrderByNumber(orderNumber: string): Promise<EventOrderResponse> {
    await this.loadCurrencies();
    return apiService.getRequest<EventOrderResponse>(`/api/events/orders/by-number/${orderNumber}`);
  }

  async cancelOrder(orderId: number, reason: string): Promise<EventOrderResponse> {
    return apiService.postRequest<EventOrderResponse>(
      `/api/events/orders/${orderId}/cancel?reason=${encodeURIComponent(reason)}`,
      {}
    );
  }

  minorToMajor(amountMinor: number, currency: string = 'ETB'): number {
    const decimalPlaces = this.getDecimalPlaces(currency);
    return amountMinor / Math.pow(10, decimalPlaces);
  }

  majorToMinor(amountMajor: number, currency: string = 'ETB'): number {
    const decimalPlaces = this.getDecimalPlaces(currency);
    return Math.round(amountMajor * Math.pow(10, decimalPlaces));
  }

  formatCurrency(amountMinor: number, currency: string): string {
    const amountMajor = this.minorToMajor(amountMinor, currency);
    const info = this.currencyCache.get(currency.toUpperCase());
    const decimalPlaces = info?.decimalPlaces ?? 2;
    
    return new Intl.NumberFormat(currency === 'ETB' ? 'en-ET' : 'en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: decimalPlaces,
    }).format(amountMajor);
  }

  formatEventDate(dateString: string): string {
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

  getAvailabilityStatus(ticketType: TicketType): { available: boolean; message: string } {
    if (!ticketType.isActive) {
      return { available: false, message: 'Not available' };
    }
    if (ticketType.availableCount === 0) {
      return { available: false, message: 'Sold out' };
    }
    if (ticketType.availableCount < 10) {
      return { available: true, message: `Only ${ticketType.availableCount} left!` };
    }
    return { available: true, message: 'Available' };
  }
}

export const eventOrderService = new EventOrderService();
export default eventOrderService;
