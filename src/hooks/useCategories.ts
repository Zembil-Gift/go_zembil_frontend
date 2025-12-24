import { useQuery } from '@tanstack/react-query';
import { categoryService, CategoryWithSubcategories, CategoryResponse, SubCategoryResponse } from '@/services/categoryService';
import { CATEGORIES } from '@/shared/categories';

const convertStaticToApiFormat = (): CategoryWithSubcategories[] => {
  return CATEGORIES.map((cat, catIndex) => ({
    id: catIndex + 1,
    name: cat.name,
    slug: cat.slug,
    description: cat.description,
    iconName: cat.icon.name || cat.id,
    isFeatured: true,
    displayOrder: catIndex + 1,
    color: cat.color,
    subcategories: cat.subcategories.map((sub, subIndex) => ({
      id: (catIndex * 100) + subIndex + 1,
      categoryId: catIndex + 1,
      name: sub.name,
      slug: sub.slug,
      description: sub.description,
      iconName: sub.icon.name || sub.id,
      isFeatured: subIndex < 6, // First 6 are featured
      displayOrder: subIndex + 1,
      gradient: '',
    })),
  }));
};


export function useCategories() {
  return useQuery({
    queryKey: ['categories', 'all'],
    queryFn: async () => {
      try {
        return await categoryService.getCategoriesWithSubcategories();
      } catch (error) {
        console.warn('Failed to fetch categories from API, using static fallback:', error);
        return convertStaticToApiFormat();
      }
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

export function useMainCategories() {
  return useQuery({
    queryKey: ['categories', 'main'],
    queryFn: async () => {
      try {
        return await categoryService.getCategories();
      } catch (error) {
        console.warn('Failed to fetch main categories from API, using static fallback:', error);
        return convertStaticToApiFormat().map(({ subcategories, ...cat }) => cat);
      }
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}


export function useSubCategories(categoryId: number | null) {
  return useQuery({
    queryKey: ['categories', 'subcategories', categoryId],
    queryFn: async () => {
      if (!categoryId) return [];
      try {
        return await categoryService.getSubCategories(categoryId);
      } catch (error) {
        console.warn(`Failed to fetch subcategories for ${categoryId}, using static fallback:`, error);
        const staticData = convertStaticToApiFormat();
        const category = staticData.find(cat => cat.id === categoryId);
        return category?.subcategories || [];
      }
    },
    enabled: !!categoryId,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}


export function useCategoryBySlug(slug: string | null) {
  const { data: categories, isLoading, error } = useCategories();
  
  const category = slug 
    ? categories?.find(cat => cat.slug === slug) 
    : undefined;
  
  return {
    category,
    isLoading,
    error,
  };
}

export function useSubCategoryBySlug(categorySlug: string | null, subCategorySlug: string | null) {
  const { category, isLoading, error } = useCategoryBySlug(categorySlug);
  
  const subCategory = subCategorySlug && category
    ? category.subcategories?.find(sub => sub.slug === subCategorySlug)
    : undefined;
  
  return {
    category,
    subCategory,
    isLoading,
    error,
  };
}

export type { CategoryWithSubcategories, CategoryResponse, SubCategoryResponse };
