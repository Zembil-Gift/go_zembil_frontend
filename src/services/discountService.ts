import { apiService } from './apiService';
import { PageResponse } from './vendorService';
import { toInstantISOString } from '@/lib/instant';

// ===== Types =====

export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';
export type AppliesTo = 'ORDER_TOTAL' | 'SPECIFIC_PRODUCTS' | 'SPECIFIC_CATEGORIES' | 'SPECIFIC_SERVICES' | 'SPECIFIC_CUSTOM_ORDER_TEMPLATES';

export interface DiscountValidationResult {
  applicable: boolean;
  discountCode: string;
  discountId: number | null;
  discountAmountMinor: number;
  currency: string;
  reason: string;
}

export interface ValidateDiscountParams {
  discountCode: string;
  orderTotalMinor: number;
  productIds?: number[];
  categoryIds?: number[];
  serviceIds?: number[];
  customOrderTemplateIds?: number[];
}

export interface DiscountResponse {
  id: number;
  code: string;
  name: string;
  description?: string;
  discountType: DiscountType;
  discountPercentage?: number;
  fixedAmount?: number;
  fixedAmountMinor?: number;
  displayCurrencyCode?: string;
  currencyCode?: string;
  appliesTo: AppliesTo;
  minOrderAmount?: number;
  minOrderAmountMinor?: number;
  maxDiscountAmount?: number;
  maxDiscountAmountMinor?: number;
  usageLimit?: number;
  usageCount: number;
  perUserLimit?: number;
  validFrom?: string;
  validUntil?: string;
  isActive: boolean;
  isCurrentlyValid: boolean;
  hasRemainingUses: boolean;
  vendorId?: number;
  vendorName?: string;
  productIds?: number[];
  productNames?: string[];
  categoryIds?: number[];
  categoryNames?: string[];
  serviceIds?: number[];
  serviceNames?: string[];
  customOrderTemplateIds?: number[];
  customOrderTemplateNames?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateDiscountRequest {
  code: string;
  name: string;
  description?: string;
  discountType: DiscountType;
  discountPercentage?: number;
  fixedAmountMinor?: number;
  currencyCode?: string;
  appliesTo: AppliesTo;
  minOrderAmountMinor?: number;
  maxDiscountAmountMinor?: number;
  usageLimit?: number;
  perUserLimit?: number;
  validFrom?: string;
  validUntil?: string;
  productIds?: number[];
  categoryIds?: number[];
  serviceIds?: number[];
  customOrderTemplateIds?: number[];
}

export interface DiscountUsageResponse {
  id: number;
  discountId: number;
  discountCode: string;
  userId?: number;
  userName?: string;
  userEmail?: string;
  orderId?: number;
  discountAmount?: number;
  discountAmountMinor: number;
  displayCurrencyCode?: string;
  currencyCode: string;
  usedAt: string;
}

// ===== Service =====

export const discountService = {
  // ===== Public user-facing endpoints =====

  // Validate a discount code against the current order/cart
  validateDiscountCode: (params: ValidateDiscountParams) => {
    const searchParams = new URLSearchParams();
    searchParams.append('discountCode', params.discountCode);
    searchParams.append('orderTotalMinor', params.orderTotalMinor.toString());
    if (params.productIds?.length) {
      params.productIds.forEach(id => searchParams.append('productIds', id.toString()));
    }
    if (params.categoryIds?.length) {
      params.categoryIds.forEach(id => searchParams.append('categoryIds', id.toString()));
    }
    if (params.serviceIds?.length) {
      params.serviceIds.forEach(id => searchParams.append('serviceIds', id.toString()));
    }
    if (params.customOrderTemplateIds?.length) {
      params.customOrderTemplateIds.forEach(id => searchParams.append('customOrderTemplateIds', id.toString()));
    }
    return apiService.postRequest<DiscountValidationResult>(
      `/api/discounts/validate?${searchParams.toString()}`
    );
  },

  // ===== Vendor management endpoints =====

  // Get all vendor discounts (paginated)
  getVendorDiscounts: (page = 0, size = 20) =>
    apiService.getRequest<PageResponse<DiscountResponse>>(
      `/api/vendor/discounts?page=${page}&size=${size}&sort=createdAt,desc`
    ),

  // Get a specific discount
  getVendorDiscount: (discountId: number) =>
    apiService.getRequest<DiscountResponse>(`/api/vendor/discounts/${discountId}`),

  // Create a new discount
  createDiscount: (request: CreateDiscountRequest) =>
    apiService.postRequest<DiscountResponse>('/api/vendor/discounts', {
      ...request,
      validFrom: toInstantISOString(request.validFrom),
      validUntil: toInstantISOString(request.validUntil),
    }),

  // Update an existing discount
  updateDiscount: (discountId: number, request: CreateDiscountRequest) =>
    apiService.putRequest<DiscountResponse>(`/api/vendor/discounts/${discountId}`, {
      ...request,
      validFrom: toInstantISOString(request.validFrom),
      validUntil: toInstantISOString(request.validUntil),
    }),

  // Deactivate (soft delete) a discount
  deactivateDiscount: (discountId: number) =>
    apiService.deleteRequest<void>(`/api/vendor/discounts/${discountId}`),

  // Reactivate a deactivated discount
  reactivateDiscount: (discountId: number) =>
    apiService.patchRequest<DiscountResponse>(`/api/vendor/discounts/${discountId}/reactivate`, {}),

  // Get usage history for a discount
  getDiscountUsages: (discountId: number) =>
    apiService.getRequest<DiscountUsageResponse[]>(`/api/vendor/discounts/${discountId}/usages`),

  // Get allowed appliesTo types for current vendor's type
  getAllowedAppliesToTypes: () =>
    apiService.getRequest<string[]>('/api/vendor/discounts/allowed-applies-to'),
};

export default discountService;
