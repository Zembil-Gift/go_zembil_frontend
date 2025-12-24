import { apiService } from './apiService';

// Types matching backend DTOs
export interface CategoryResponse {
  id: number;
  name: string;
  slug: string;
  description: string;
  iconName: string;
  imageUrl?: string;
  isFeatured?: boolean;
  displayOrder?: number;
  color?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SubCategoryResponse {
  id: number;
  categoryId: number;
  name: string;
  slug: string;
  description: string;
  iconName: string;
  imageUrl?: string;
  isFeatured?: boolean;
  displayOrder?: number;
  gradient?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Extended types with subcategories included
export interface CategoryWithSubcategories extends CategoryResponse {
  subcategories: SubCategoryResponse[];
}

class CategoryService {
  /**
   * Get all categories
   */
  async getCategories(): Promise<CategoryResponse[]> {
    try {
      const response = await apiService.getRequest<CategoryResponse[]>('/api/categories');
      return response.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      throw error;
    }
  }

  /**
   * Get subcategories for a specific category
   */
  async getSubCategories(categoryId: number): Promise<SubCategoryResponse[]> {
    try {
      const response = await apiService.getRequest<SubCategoryResponse[]>(
        `/api/categories/${categoryId}/sub-categories`
      );
      return response.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    } catch (error) {
      console.error(`Failed to fetch subcategories for category ${categoryId}:`, error);
      throw error;
    }
  }

  /**
   * Get all categories with their subcategories
   */
  async getCategoriesWithSubcategories(): Promise<CategoryWithSubcategories[]> {
    try {
      const categories = await this.getCategories();
      
      const categoriesWithSubs = await Promise.all(
        categories.map(async (category) => {
          const subcategories = await this.getSubCategories(category.id);
          return {
            ...category,
            subcategories,
          };
        })
      );
      
      return categoriesWithSubs;
    } catch (error) {
      console.error('Failed to fetch categories with subcategories:', error);
      throw error;
    }
  }

  /**
   * Get featured categories only
   */
  async getFeaturedCategories(): Promise<CategoryResponse[]> {
    try {
      const categories = await this.getCategories();
      return categories.filter(cat => cat.isFeatured);
    } catch (error) {
      console.error('Failed to fetch featured categories:', error);
      throw error;
    }
  }

  /**
   * Get featured subcategories for a category
   */
  async getFeaturedSubCategories(categoryId: number): Promise<SubCategoryResponse[]> {
    try {
      const subcategories = await this.getSubCategories(categoryId);
      return subcategories.filter(sub => sub.isFeatured);
    } catch (error) {
      console.error(`Failed to fetch featured subcategories for category ${categoryId}:`, error);
      throw error;
    }
  }

  /**
   * Find category by slug
   */
  async getCategoryBySlug(slug: string): Promise<CategoryResponse | undefined> {
    try {
      const categories = await this.getCategories();
      return categories.find(cat => cat.slug === slug);
    } catch (error) {
      console.error(`Failed to find category by slug ${slug}:`, error);
      throw error;
    }
  }

  /**
   * Find subcategory by slug within a category
   */
  async getSubCategoryBySlug(categoryId: number, slug: string): Promise<SubCategoryResponse | undefined> {
    try {
      const subcategories = await this.getSubCategories(categoryId);
      return subcategories.find(sub => sub.slug === slug);
    } catch (error) {
      console.error(`Failed to find subcategory by slug ${slug}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const categoryService = new CategoryService();
export default categoryService;
