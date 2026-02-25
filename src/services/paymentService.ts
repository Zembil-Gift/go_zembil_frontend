import { apiService } from './apiService';

export type PaymentProvider = 'STRIPE' | 'CHAPA' | 'TELEBIRR';

export interface PaymentInitResponse {
  clientSecret: string;
  paymentIntentId?: string;
  publishableKey?: string;
  checkoutUrl?: string;  // For Chapa and TeleBirr redirects
  paymentId?: string;    // Provider reference (tx_ref for Chapa, merch_order_id for TeleBirr)
  orderId: number;
  amount: number;
  currency: string;
}

export interface PaymentVerificationRequest {
  paymentIntentId: string;
  orderId: number;
}

export interface PaymentVerificationResponse {
  success: boolean;
  paymentStatus: string;
  orderId: number;
  message: string;
}

class PaymentService {
  /**
   * Initialize payment for an order
   * @param orderId - The order ID to initialize payment for
   * @param provider - Payment provider (STRIPE or CHAPA)
   */
  async initializePayment(
    orderId: number,
    provider: PaymentProvider = 'STRIPE'
  ): Promise<PaymentInitResponse> {
    try {
      console.log(`Initializing payment for order ${orderId} with provider ${provider}`);
      
      // Backend expects: POST /api/orders/{orderId}/payments/initialize?provider=STRIPE
      const response = await apiService.postRequest<PaymentInitResponse>(
        `/api/orders/${orderId}/payments/initialize?provider=${provider}`,
        {} // Empty body - provider is in query param
      );
      
      console.log('Payment initialization response:', response);
      return response;
    } catch (error: any) {
      console.error('Payment initialization failed:', error);
      throw new Error(
        error.response?.data?.message || 
        error.message || 
        'Failed to initialize payment'
      );
    }
  }

  /**
   * Verify payment status (optional - webhook handles this automatically)
   * This can be used for manual verification or status checks
   */
  async verifyPayment(
    orderId: number,
    paymentIntentId: string
  ): Promise<PaymentVerificationResponse> {
    try {
      const response = await apiService.getRequest<PaymentVerificationResponse>(
        `/api/orders/${orderId}/payments/status?paymentIntentId=${paymentIntentId}`
      );
      return response;
    } catch (error: any) {
      console.error('Payment verification failed:', error);
      throw new Error(
        error.response?.data?.message || 
        error.message || 
        'Failed to verify payment'
      );
    }
  }

  /**
   * Get payment details for an order
   */
  async getPaymentDetails(orderId: number): Promise<any> {
    try {
      const response = await apiService.getRequest<any>(
        `/api/orders/${orderId}/payments`
      );
      return response;
    } catch (error: any) {
      console.error('Failed to get payment details:', error);
      throw new Error(
        error.response?.data?.message || 
        error.message || 
        'Failed to get payment details'
      );
    }
  }
}

export const paymentService = new PaymentService();
