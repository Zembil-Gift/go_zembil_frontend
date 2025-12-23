import { apiService } from './apiService';

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  iconName?: string;
}

export interface SubCategory {
  id: number;
  categoryId: number;
  name: string;
  slug: string;
  description?: string;
  iconName?: string;
}

class CategoryService {
  private baseUrl = '/api/categories';

  /**
   * Get all categories
   */
  async getCategories(): Promise<Category[]> {
    try {
      return await apiService.getRequest<Category[]>(this.baseUrl);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      return [];
    }
  }

  /**
   * Get sub-categories for a category
   */
  async getSubCategories(categoryId: number): Promise<SubCategory[]> {
    try {
      return await apiService.getRequest<SubCategory[]>(`${this.baseUrl}/${categoryId}/sub-categories`);
    } catch (error) {
      console.error('Failed to fetch sub-categories:', error);
      return [];
    }
  }
}

export const categoryService = new CategoryService();
export default categoryService;
