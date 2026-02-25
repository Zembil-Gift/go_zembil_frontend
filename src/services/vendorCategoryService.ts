import { apiService } from "./apiService";

export interface VendorCategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
  iconName?: string;
  isActive: boolean;
  displayOrder: number;
}

export const vendorCategoryService = {
  getAllActiveCategories: async (): Promise<VendorCategory[]> => {
    return apiService.getRequest<VendorCategory[]>("/api/vendor-categories");
  },

  getCategoryById: async (id: number): Promise<VendorCategory> => {
    return apiService.getRequest<VendorCategory>(`/api/vendor-categories/${id}`);
  },

  getCategoryBySlug: async (slug: string): Promise<VendorCategory> => {
    return apiService.getRequest<VendorCategory>(`/api/vendor-categories/slug/${slug}`);
  },

  admin: {
    getAllCategories: async (): Promise<VendorCategory[]> => {
      return apiService.getRequest<VendorCategory[]>("/api/admin/vendor-categories");
    },

    createCategory: async (data: {
      name: string;
      description?: string;
      iconName?: string;
      isActive?: boolean;
      displayOrder?: number;
    }): Promise<VendorCategory> => {
      return apiService.postRequest<VendorCategory>("/api/admin/vendor-categories", data);
    },

    updateCategory: async (
      id: number,
      data: {
        name: string;
        description?: string;
        iconName?: string;
        isActive?: boolean;
        displayOrder?: number;
      }
    ): Promise<VendorCategory> => {
      return apiService.putRequest<VendorCategory>(`/api/admin/vendor-categories/${id}`, data);
    },

    deleteCategory: async (id: number): Promise<void> => {
      return apiService.deleteRequest(`/api/admin/vendor-categories/${id}`);
    },

    toggleActive: async (id: number): Promise<VendorCategory> => {
      return apiService.patchRequest<VendorCategory>(`/api/admin/vendor-categories/${id}/toggle-active`);
    },
  },
};

export default vendorCategoryService;
