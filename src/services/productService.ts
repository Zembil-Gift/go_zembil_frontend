import { apiService } from './apiService';

// Types for products
export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  priceUSD: number;
  imageUrl: string;
  categoryId: number;
  vendorId: number;
  tags: string[];
  stockQuantity: number;
  deliveryTime: string;
  rating: number;
  reviewCount: number;
  isActive: boolean;
  isFeatured: boolean;
  isTrending: boolean;
  isNew: boolean;
  discountPercentage?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductRequest {
  name: string;
  description: string;
  price: number;
  categoryId: number;
  imageUrl?: string;
  tags?: string[];
  stockQuantity: number;
  deliveryTime: string;
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {
  isActive?: boolean;
  isFeatured?: boolean;
  isTrending?: boolean;
  isNew?: boolean;
  discountPercentage?: number;
}

export interface ProductsResponse {
  products: Product[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ProductSearchParams {
  query?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  tags?: string[];
  isFeatured?: boolean;
  isTrending?: boolean;
  isNew?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'price' | 'rating' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

// Product service
class ProductService {
  /**
   * Get all products with pagination and filters
   */
  async getAllProducts(params?: ProductSearchParams): Promise<ProductsResponse> {
    const queryParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            queryParams.append(key, value.join(','));
          } else {
            queryParams.append(key, value.toString());
          }
        }
      });
    }
    
    const url = `/products${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return await apiService.getRequest<ProductsResponse>(url);
  }

  /**
   * Get product by ID
   */
  async getProductById(id: number): Promise<Product> {
    return await apiService.getRequest<Product>(`/products/${id}`);
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(category: string, params?: Omit<ProductSearchParams, 'category'>): Promise<ProductsResponse> {
    const searchParams: ProductSearchParams = { ...params, category };
    return await this.getAllProducts(searchParams);
  }

  /**
   * Search products
   */
  async searchProducts(query: string, params?: Omit<ProductSearchParams, 'query'>): Promise<ProductsResponse> {
    const searchParams: ProductSearchParams = { ...params, query };
    return await this.getAllProducts(searchParams);
  }

  /**
   * Get featured products
   */
  async getFeaturedProducts(limit?: number): Promise<Product[]> {
    const queryParams = new URLSearchParams();
    if (limit) queryParams.append('limit', limit.toString());
    
    const url = `/products/featured${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return await apiService.getRequest<Product[]>(url);
  }

  /**
   * Get trending products
   */
  async getTrendingProducts(limit?: number): Promise<ProductsResponse> {
    const params: ProductSearchParams = { isTrending: true };
    if (limit) params.limit = limit;
    
    return await this.getAllProducts(params);
  }

  /**
   * Get new products
   */
  async getNewProducts(limit?: number): Promise<ProductsResponse> {
    const params: ProductSearchParams = { isNew: true };
    if (limit) params.limit = limit;
    
    return await this.getAllProducts(params);
  }

  /**
   * Create new product (admin/vendor only)
   */
  async createProduct(data: CreateProductRequest): Promise<Product> {
    return await apiService.postRequest<Product>('/products', data);
  }

  /**
   * Update product (admin/vendor only)
   */
  async updateProduct(id: number, data: UpdateProductRequest): Promise<Product> {
    return await apiService.putRequest<Product>(`/products/${id}`, data);
  }

  /**
   * Delete product (admin/vendor only)
   */
  async deleteProduct(id: number): Promise<{ message: string }> {
    return await apiService.deleteRequest(`/products/${id}`);
  }

  /**
   * Get product recommendations
   */
  async getRecommendations(productId?: number, limit: number = 8): Promise<Product[]> {
    const queryParams = new URLSearchParams();
    if (productId) queryParams.append('productId', productId.toString());
    queryParams.append('limit', limit.toString());
    
    const url = `/products/recommendations${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return await apiService.getRequest<Product[]>(url);
  }

  /**
   * Get products by vendor
   */
  async getProductsByVendor(vendorId: number, params?: ProductSearchParams): Promise<ProductsResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append('vendorId', vendorId.toString());
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            queryParams.append(key, value.join(','));
          } else {
            queryParams.append(key, value.toString());
          }
        }
      });
    }
    
    const url = `/products/vendor/${vendorId}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return await apiService.getRequest<ProductsResponse>(url);
  }
}

// Export singleton instance
export const productService = new ProductService();
export default productService;