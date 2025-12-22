import {apiService} from './apiService';

// Types for products
export interface ProductAttribute {
  id?: number;
  name: string;
  value: string;
}

export interface Price {
  id?: number;
  productId?: number;
  variantId?: number;
  currencyCode?: string;
  currencyId?: number;
  unitAmountMinor?: number;
  amount?: number;
  useExchangeRate?: boolean;
  active?: boolean;
}

/**
 * Extract the display price from a Price object.
 * Uses 'amount' if available, otherwise calculates from 'unitAmountMinor'.
 */
export function extractPriceAmount(price?: Price): number {
  if (!price) return 0;
  if (price.amount != null && price.amount > 0) return price.amount;
  if (price.unitAmountMinor != null && price.unitAmountMinor > 0) {
    // Convert minor units (cents) to major units (dollars)
    return price.unitAmountMinor / 100;
  }
  return 0;
}

export interface ProductSku {
  id?: number;
  skuCode: string;
  price?: Price;
  stockQuantity?: number;
  attributes?: ProductAttribute[];
  images?: Array<{
    id: number;
    url: string;
    isPrimary: boolean;
    sortOrder: number;
  }>;
}

export interface Product {
  id: number; 
  name: string;
  description?: string;
  summary?: string;
  cover?: string;
  price?: Price;
  subCategoryId?: number;
  isFeatured?: boolean;
  isCustomizable?: boolean;
  tags?: string[];
  occasion?: string;
  productSku?: ProductSku[];
  createdAt?: string;
  updatedAt?: string;
  imageUrl?: string;
  images?: Array<{
    id: number;
    url: string;
    originalFilename?: string;
    altText?: string;
    sortOrder: number;
    isPrimary: boolean;
    fileSize?: number;
    contentType?: string;
    createdAt?: string;
  }>;
  rating?: number;
  reviewCount?: number;
  isTrending?: boolean;
  isNew?: boolean;
  stockQuantity?: number;
  categoryId?: number;
  categorySlug?: string;
  category?: string;
}

export interface Tag {
  id?: number;
  name: string;
  slug: string;
  description?: string;
}

export interface PagedProductResponse {
  content: Product[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

class ProductService {
  /**
   * Get all products with pagination
   */
  async getAllProducts(page: number = 0, size: number = 20): Promise<PagedProductResponse> {
    try {
      const url = `/api/v1/products?page=${page}&size=${size}`;
      const response = await apiService.getRequest<PagedProductResponse>(url);
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get product by ID
   */
  async getProductById(id: number): Promise<Product> {
    return await apiService.getRequest<Product>(`/api/v1/products/${id}`);
  }

  /**
   * Get products by sub-category
   */
  async getProductsBySubCategory(subCategoryId: number, page: number = 0, size: number = 20): Promise<PagedProductResponse> {
    const url = `/api/v1/products/sub-category/${subCategoryId}?page=${page}&size=${size}`;
    return await apiService.getRequest<PagedProductResponse>(url);
  }

  /**
   * Search products
   */
  async searchProducts(query: string, page: number = 0, size: number = 20): Promise<PagedProductResponse> {
    const url = `/api/v1/products/search?q=${encodeURIComponent(query)}&page=${page}&size=${size}`;
    return await apiService.getRequest<PagedProductResponse>(url);
  }

  /**
   * Get featured products
   */
  async getFeaturedProducts(limit: number = 10): Promise<Product[]> {
    try {
      const url = `/api/v1/products/featured?limit=${limit}`;
        return await apiService.getRequest<Product[]>(url);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Filter products
   */
  async filterProducts(filter: {
    categoryId?: number;
    minPrice?: number;
    maxPrice?: number;
    tags?: string[];
    occasion?: string;
    isFeatured?: boolean;
    isCustomizable?: boolean;
  }, page: number = 0, size: number = 20): Promise<PagedProductResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('size', size.toString());
    
    Object.entries(filter).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          queryParams.append(`filter.${key}`, value.join(','));
        } else {
          queryParams.append(`filter.${key}`, value.toString());
        }
      }
    });
    
    const url = `/api/v1/products/filter?${queryParams.toString()}`;
    return await apiService.getRequest<PagedProductResponse>(url);
  }

  /**
   * Create new product (admin/vendor only)
   */
  async createProduct(data: Product): Promise<Product> {
    return await apiService.postRequest<Product>('/api/v1/products', data);
  }

  /**
   * Update product (admin/vendor only)
   */
  async updateProduct(id: number, data: Partial<Product>): Promise<Product> {
    return await apiService.putRequest<Product>(`/api/v1/products/${id}`, data);
  }

  /**
   * Delete product (admin/vendor only)
   */
  async deleteProduct(id: number): Promise<void> {
    return await apiService.deleteRequest(`/api/v1/products/${id}`);
  }

  /**
   * Check if product exists
   */
  async productExists(id: number): Promise<boolean> {
    return await apiService.getRequest<boolean>(`/api/v1/products/${id}/exists`);
  }
}

// Export singleton instance
export const productService = new ProductService();
export default productService;