import { apiService } from './apiService';

// Types for categories
export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  parentId?: number;
  level: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryWithProducts extends Category {
  productCount: number;
}

export interface CategoryTree extends Category {
  subcategories: CategoryTree[];
}

export interface CreateCategoryRequest {
  name: string;
  slug: string;
  description?: string;
  parentId?: number;
  sortOrder?: number;
}

export interface UpdateCategoryRequest extends Partial<CreateCategoryRequest> {
  isActive?: boolean;
}

// Category service
class CategoryService {
  /**
   * Get all categories (flat list)
   */
  async getAllCategories(): Promise<Category[]> {
    return await apiService.getRequest<Category[]>('/categories');
  }

  /**
   * Get categories with product counts
   */
  async getCategoriesWithProductCounts(): Promise<CategoryWithProducts[]> {
    return await apiService.getRequest<CategoryWithProducts[]>('/categories/with-counts');
  }

  /**
   * Get category hierarchy (tree structure)
   */
  async getCategoryTree(): Promise<CategoryTree[]> {
    return await apiService.getRequest<CategoryTree[]>('/categories/tree');
  }

  /**
   * Get category by ID
   */
  async getCategoryById(id: number): Promise<Category> {
    return await apiService.getRequest<Category>(`/categories/${id}`);
  }

  /**
   * Get category by slug
   */
  async getCategoryBySlug(slug: string): Promise<Category> {
    return await apiService.getRequest<Category>(`/categories/slug/${slug}`);
  }

  /**
   * Get subcategories by parent category ID
   */
  async getSubcategoriesByCategory(categoryId: number): Promise<Category[]> {
    return await apiService.getRequest<Category[]>(`/categories/${categoryId}/subcategories`);
  }

  /**
   * Get main categories (top-level only)
   */
  async getMainCategories(): Promise<Category[]> {
    return await apiService.getRequest<Category[]>('/categories/main');
  }

  /**
   * Get category path (breadcrumb)
   */
  async getCategoryPath(categoryId: number): Promise<Category[]> {
    return await apiService.getRequest<Category[]>(`/categories/${categoryId}/path`);
  }

  /**
   * Search categories
   */
  async searchCategories(query: string): Promise<Category[]> {
    const queryParams = new URLSearchParams();
    queryParams.append('q', query);
    
    return await apiService.getRequest<Category[]>(`/categories/search?${queryParams.toString()}`);
  }

  /**
   * Create new category (admin only)
   */
  async createCategory(data: CreateCategoryRequest): Promise<Category> {
    return await apiService.postRequest<Category>('/categories', data);
  }

  /**
   * Update category (admin only)
   */
  async updateCategory(id: number, data: UpdateCategoryRequest): Promise<Category> {
    return await apiService.putRequest<Category>(`/categories/${id}`, data);
  }

  /**
   * Delete category (admin only)
   */
  async deleteCategory(id: number): Promise<{ message: string }> {
    return await apiService.deleteRequest(`/categories/${id}`);
  }

  /**
   * Reorder categories (admin only)
   */
  async reorderCategories(categoryOrders: { id: number; sortOrder: number }[]): Promise<{ message: string }> {
    return await apiService.putRequest('/categories/reorder', { categories: categoryOrders });
  }

  /**
   * Get popular categories (based on product views/orders)
   */
  async getPopularCategories(limit: number = 10): Promise<CategoryWithProducts[]> {
    const queryParams = new URLSearchParams();
    queryParams.append('limit', limit.toString());
    
    return await apiService.getRequest<CategoryWithProducts[]>(`/categories/popular?${queryParams.toString()}`);
  }

  /**
   * Get categories for navigation menu
   */
  async getNavigationCategories(): Promise<CategoryTree[]> {
    return await apiService.getRequest<CategoryTree[]>('/categories/navigation');
  }
}

// Export singleton instance
export const categoryService = new CategoryService();
export default categoryService;