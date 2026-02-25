import { 
  Calendar, Heart, Cross, Coffee
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface SubCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: LucideIcon;
}

export interface MainCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: LucideIcon;
  subcategories: SubCategory[];
  color: string; // For styling consistency
}

export const CATEGORIES: MainCategory[] = [
  {
    id: "occasions",
    name: "Occasions",
    slug: "occasions",
    description: "Gifts for special occasions",
    icon: Calendar,
    color: "from-yellow-500 to-orange-500",
    subcategories: [
    ]
  },
  {
    id: "cultural-religious",
    name: "Cultural & Religious",
    slug: "cultural-religious",
    description: "Cultural and religious celebrations",
    icon: Cross,
    color: "from-blue-500 to-purple-500",
    subcategories: []
  },
  {
    id: "emotions",
    name: "Emotions",
    slug: "emotions",
    description: "Express feelings and emotions",
    icon: Heart,
    color: "from-pink-500 to-red-500",
    subcategories: [
    ]
  },
  {
    id: "food-beverages",
    name: "Food & Beverages",
    slug: "food-beverages",
    description: "Ethiopian food and drinks",
    icon: Coffee,
    color: "from-green-500 to-emerald-500",
    subcategories: [
    ]
  }
];

// Helper functions
export const getCategoryById = (id: string): MainCategory | undefined => {
  return CATEGORIES.find(cat => cat.id === id);
};

export const getCategoryBySlug = (slug: string): MainCategory | undefined => {
  return CATEGORIES.find(cat => cat.slug === slug);
};

export const getSubcategoryBySlug = (categorySlug: string, subcategorySlug: string): SubCategory | undefined => {
  const category = getCategoryBySlug(categorySlug);
  return category?.subcategories.find(sub => sub.slug === subcategorySlug);
};

export const getAllSubcategories = (): SubCategory[] => {
  return CATEGORIES.flatMap(cat => cat.subcategories);
};

export const getSubcategoriesByCategory = (categorySlug: string): SubCategory[] => {
  const category = getCategoryBySlug(categorySlug);
  return category?.subcategories || [];
};

// For URL parameter handling
export interface CategoryFilters {
  category?: string;
  sub?: string;
}

export const parseUrlParams = (searchParams: URLSearchParams): CategoryFilters => {
  return {
    category: searchParams.get('category') || undefined,
    sub: searchParams.get('sub') || undefined,
  };
};

export const buildUrlParams = (filters: CategoryFilters): string => {
  const params = new URLSearchParams();
  if (filters.category) params.set('category', filters.category);
  if (filters.sub) params.set('sub', filters.sub);
  return params.toString();
};
