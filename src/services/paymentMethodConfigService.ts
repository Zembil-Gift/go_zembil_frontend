import { apiService } from './apiService';

export interface PaymentMethodConfig {
  id: number;
  paymentMethod: string;
  enabled: boolean;
  updatedAt: string;
}

class PaymentMethodConfigService {
  /**
   * Fetch all payment method configurations (public endpoint).
   * Used by checkout to determine which methods to show.
   */
  async getAllConfigs(): Promise<PaymentMethodConfig[]> {
    try {
      return await apiService.getRequest<PaymentMethodConfig[]>('/api/payment-methods');
    } catch (error: any) {
      console.error('Failed to fetch payment method configs:', error);
      throw new Error(
        error.response?.data?.message || error.message || 'Failed to fetch payment method configurations'
      );
    }
  }

  /**
   * Fetch only the names of enabled payment methods (public endpoint).
   */
  async getEnabledMethods(): Promise<string[]> {
    try {
      return await apiService.getRequest<string[]>('/api/payment-methods/enabled');
    } catch (error: any) {
      console.error('Failed to fetch enabled payment methods:', error);
      throw new Error(
        error.response?.data?.message || error.message || 'Failed to fetch enabled payment methods'
      );
    }
  }

  /**
   * Fetch all payment method configurations (admin endpoint).
   */
  async getAdminConfigs(): Promise<PaymentMethodConfig[]> {
    try {
      return await apiService.getRequest<PaymentMethodConfig[]>('/api/admin/payment-methods');
    } catch (error: any) {
      console.error('Failed to fetch admin payment method configs:', error);
      throw new Error(
        error.response?.data?.message || error.message || 'Failed to fetch payment method configurations'
      );
    }
  }

  /**
   * Enable or disable a payment method (admin only).
   */
  async togglePaymentMethod(paymentMethod: string, enabled: boolean): Promise<PaymentMethodConfig> {
    try {
      return await apiService.patchRequest<PaymentMethodConfig>(
        `/api/admin/payment-methods/${paymentMethod}?enabled=${enabled}`,
        {}
      );
    } catch (error: any) {
      console.error('Failed to toggle payment method:', error);
      throw new Error(
        error.response?.data?.message || error.message || 'Failed to update payment method configuration'
      );
    }
  }
}

export const paymentMethodConfigService = new PaymentMethodConfigService();
