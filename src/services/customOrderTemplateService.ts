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
  
  async getById(templateId: number, currency?: string): Promise<CustomOrderTemplate> {
    const url = currency 
      ? `/api/custom-order-templates/${templateId}?currency=${currency}`
      : `/api/custom-order-templates/${templateId}`;
    return await apiService.getRequest<CustomOrderTemplate>(url);
  }

  async getByCategory(
    categoryId: number, 
    page: number = 0, 
    size: number = 20,
    currency?: string
  ): Promise<PagedCustomOrderTemplateResponse> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('size', size.toString());
    if (currency) {
      params.append('currency', currency);
    }
    const url = `/api/custom-order-templates/category/${categoryId}?${params.toString()}`;
    return await apiService.getRequest<PagedCustomOrderTemplateResponse>(url);
  }

  async getCategoriesWithTemplates(): Promise<CategoryWithTemplateCount[]> {
    return await apiService.getRequest<CategoryWithTemplateCount[]>('/api/custom-order-templates/categories');
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
    status?: CustomOrderTemplateStatus
  ): Promise<PagedCustomOrderTemplateResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('size', size.toString());
    if (status) {
      queryParams.append('status', status);
    }
    
    const url = `/api/custom-order-templates/vendor/${vendorId}?${queryParams.toString()}`;
    return await apiService.getRequest<PagedCustomOrderTemplateResponse>(url);
  }

  async getPending(page: number = 0, size: number = 20, currency?: string): Promise<PagedCustomOrderTemplateResponse> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('size', size.toString());
    if (currency) {
      params.append('currency', currency);
    }
    const url = `/api/custom-order-templates/pending?${params.toString()}`;
    return await apiService.getRequest<PagedCustomOrderTemplateResponse>(url);
  }

  async getAll(page: number = 0, size: number = 20, status?: string, currency?: string): Promise<PagedCustomOrderTemplateResponse> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('size', size.toString());
    if (status) {
      params.append('status', status);
    }
    if (currency) {
      params.append('currency', currency);
    }
    const url = `/api/custom-order-templates/all?${params.toString()}`;
    return await apiService.getRequest<PagedCustomOrderTemplateResponse>(url);
  }

  async approve(templateId: number): Promise<CustomOrderTemplate> {
    return await apiService.postRequest<CustomOrderTemplate>(`/api/custom-order-templates/${templateId}/approve`);
  }

  async reject(templateId: number, reason: string): Promise<CustomOrderTemplate> {
    const data = { reason };
    return await apiService.postRequest<CustomOrderTemplate>(`/api/custom-order-templates/${templateId}/reject`, data);
  }

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

  hasPrice(template: CustomOrderTemplate): boolean {
    return this.getTemplatePrice(template) !== null;
  }

  formatTemplatePrice(template: CustomOrderTemplate): string {
    const priceInfo = this.getTemplatePrice(template);
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
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  formatPrice(priceMinor: number, currency: string): string {
    console.warn('formatPrice with minor units is deprecated. Use formatCurrency with backend-provided amount instead.');
    const decimals = 2;
    const divisor = Math.pow(10, decimals);
    const amount = priceMinor / divisor;
    return this.formatAmount(amount, currency);
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