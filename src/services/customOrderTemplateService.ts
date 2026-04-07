import { apiService } from './apiService';
import type {
  CustomOrderTemplate,
  CreateCustomOrderTemplateRequest,
  UpdateCustomOrderTemplateRequest,
  PagedCustomOrderTemplateResponse,
  CategoryWithTemplateCount,
  CustomOrderTemplateStatus
} from '../types/customOrders';

class CustomOrderTemplateService {
  private readonly MAX_REJECTION_REASON_LENGTH = 1000;

  private normalizeRejectionReason(reason: string): string {
    const trimmedReason = reason?.trim();

    if (!trimmedReason) {
      throw new Error('Rejection reason is required');
    }

    if (trimmedReason.length > this.MAX_REJECTION_REASON_LENGTH) {
      throw new Error(`Rejection reason must be ${this.MAX_REJECTION_REASON_LENGTH} characters or fewer`);
    }

    return trimmedReason;
  }
  
  async getById(templateId: number): Promise<CustomOrderTemplate> {
    return await apiService.getRequest<CustomOrderTemplate>(`/api/custom-order-templates/${templateId}`);
  }

  async getByCategory(
    categoryId: number, 
    page: number = 0, 
    size: number = 20
  ): Promise<PagedCustomOrderTemplateResponse> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('size', size.toString());
    const url = `/api/custom-order-templates/category/${categoryId}?${params.toString()}`;
    return await apiService.getRequest<PagedCustomOrderTemplateResponse>(url);
  }

  async searchTemplates(
    query?: string,
    categoryId?: number,
    page: number = 0,
    size: number = 20
  ): Promise<PagedCustomOrderTemplateResponse> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('size', size.toString());
    if (query) params.append('query', query);
    if (categoryId) params.append('categoryId', categoryId.toString());
    
    const url = `/api/custom-order-templates/search?${params.toString()}`;
    return await apiService.getRequest<PagedCustomOrderTemplateResponse>(url);
  }

  async getCategoriesWithTemplates(): Promise<CategoryWithTemplateCount[]> {
    return await apiService.getRequest<CategoryWithTemplateCount[]>('/api/custom-order-templates/categories');
  }

  async getApproved(page: number = 0, size: number = 20): Promise<PagedCustomOrderTemplateResponse> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('size', size.toString());
    const url = `/api/custom-order-templates/approved?${params.toString()}`;
    return await apiService.getRequest<PagedCustomOrderTemplateResponse>(url);
  }

  async create(data: CreateCustomOrderTemplateRequest): Promise<CustomOrderTemplate> {
    return await apiService.postRequest<CustomOrderTemplate>('/api/custom-order-templates', data);
  }

  async update(templateId: number, data: UpdateCustomOrderTemplateRequest): Promise<CustomOrderTemplate> {
    return await apiService.putRequest<CustomOrderTemplate>(`/api/custom-order-templates/${templateId}`, data);
  }

  async delete(templateId: number): Promise<void> {
    return await apiService.deleteRequest(`/api/custom-order-templates/${templateId}`);
  }

  async getByVendor(
    vendorId: number, 
    page: number = 0, 
    size: number = 20,
    status?: CustomOrderTemplateStatus,
    query?: string
  ): Promise<PagedCustomOrderTemplateResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('size', size.toString());
    if (status) {
      queryParams.append('status', status);
    }
    if (query?.trim()) {
      queryParams.append('query', query.trim());
    }
    
    const url = `/api/custom-order-templates/vendor/${vendorId}?${queryParams.toString()}`;
    return await apiService.getRequest<PagedCustomOrderTemplateResponse>(url);
  }

  async getPending(page: number = 0, size: number = 20): Promise<PagedCustomOrderTemplateResponse> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('size', size.toString());
    const url = `/api/custom-order-templates/pending?${params.toString()}`;
    return await apiService.getRequest<PagedCustomOrderTemplateResponse>(url);
  }

  async getAll(page: number = 0, size: number = 20, status?: string): Promise<PagedCustomOrderTemplateResponse> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('size', size.toString());
    if (status) {
      params.append('status', status);
    }
    const url = `/api/custom-order-templates/all?${params.toString()}`;
    return await apiService.getRequest<PagedCustomOrderTemplateResponse>(url);
  }

  async approve(templateId: number): Promise<CustomOrderTemplate> {
    return await apiService.postRequest<CustomOrderTemplate>(`/api/custom-order-templates/${templateId}/approve`);
  }

  async reject(templateId: number, reason: string): Promise<CustomOrderTemplate> {
    const data = { reason: this.normalizeRejectionReason(reason) };
    return await apiService.postRequest<CustomOrderTemplate>(`/api/custom-order-templates/${templateId}/reject`, data);
  }

  // Get customer-facing price (what customers pay)
  getTemplatePrice(template: CustomOrderTemplate): { amount: number; currency: string } | null {
    if (template.price?.amount != null) {
      return {
        amount: template.price.amount,
        currency: template.price.currencyCode ?? template.currencyCode ?? 'ETB'
      };
    }
    if (template.basePriceMinor != null && template.basePriceMinor > 0) {
      const currency = template.currencyCode ?? 'ETB';
      const decimals = 2; // Backend uses 2 decimal places for all currencies including ETB
      const divisor = Math.pow(10, decimals);
      return {
        amount: template.basePriceMinor / divisor,
        currency: currency
      };
    }
    return null;
  }

  // Get vendor price (what vendor receives)
  getVendorTemplatePrice(template: CustomOrderTemplate): { amount: number; currency: string } | null {
    // Try to use the vendorAmount from the price object first (converted amount)
    if (template.price?.vendorAmount != null) {
      return {
        amount: template.price.vendorAmount,
        currency: template.price.currencyCode ?? template.currencyCode ?? 'ETB'
      };
    }
    // Fallback to vendorPriceMinor field
    if (template.vendorPriceMinor != null && template.vendorPriceMinor > 0) {
      const currency = template.currencyCode ?? 'ETB';
      const decimals = 2; // Backend uses 2 decimal places for all currencies including ETB
      const divisor = Math.pow(10, decimals);
      return {
        amount: template.vendorPriceMinor / divisor,
        currency: currency
      };
    }
    // If no vendor price is set, return null
    return null;
  }

  hasPrice(template: CustomOrderTemplate): boolean {
    return this.getTemplatePrice(template) !== null;
  }

  hasVendorPrice(template: CustomOrderTemplate): boolean {
    return this.getVendorTemplatePrice(template) !== null;
  }

  // Format customer price (for customer-facing pages)
  formatTemplatePrice(template: CustomOrderTemplate): string {
    const priceInfo = this.getTemplatePrice(template);
    if (priceInfo === null) {
      return 'Price not set';
    }
    return this.formatAmount(priceInfo.amount, priceInfo.currency);
  }

  // Format vendor price (for vendor dashboard)
  formatVendorTemplatePrice(template: CustomOrderTemplate): string {
    const priceInfo = this.getVendorTemplatePrice(template);
    if (priceInfo === null) {
      return 'Price not set';
    }
    return this.formatAmount(priceInfo.amount, priceInfo.currency);
  }

  formatAmount(amount: number, currency: string): string {
    if (currency === 'ETB') {
      return `${amount.toLocaleString('en-ET', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ETB`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'ETB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  }


  getStatusBadgeColor(status: CustomOrderTemplateStatus): string {
    switch (status) {
      case 'PENDING_APPROVAL':
        return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      case 'ARCHIVED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }


  getStatusText(status: CustomOrderTemplateStatus): string {
    switch (status) {
      case 'PENDING_APPROVAL':
        return 'Pending Approval';
      case 'APPROVED':
        return 'Approved';
      case 'REJECTED':
        return 'Rejected';
      case 'ARCHIVED':
        return 'Archived';
      default:
        return status;
    }
  }

  getFieldTypeDisplayName(fieldType: string): string {
    switch (fieldType) {
      case 'TEXT':
        return 'Text';
      case 'NUMBER':
        return 'Number';
      case 'IMAGE':
        return 'Image';
      case 'VIDEO':
        return 'Video';
      default:
        return fieldType;
    }
  }
  sortFieldsBySortOrder<T extends { sortOrder: number }>(fields: T[]): T[] {
    return [...fields].sort((a, b) => a.sortOrder - b.sortOrder);
  }
}

export const customOrderTemplateService = new CustomOrderTemplateService();
export default customOrderTemplateService;