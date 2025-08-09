import { 
  CakeSlice, Heart, GraduationCap, Baby, PartyPopper, Home as HomeIcon, 
  Users, Award, Sparkles, Star, Coffee, Cross, Waves, Egg, Moon, Sun, 
  TreePine, Flower2, Crown, Mountain, HelpingHand, Smile, ThumbsUp,
  UtensilsCrossed, Wheat, ChefHat
} from "lucide-react";
import { CATEGORIES } from "@/shared/categories";

export interface CategoryItem {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  name: string;
  description: string;
  gradient: string;
  slug?: string;
}

// Updated icon mappings for the new categories
const subcategoryIcons: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  // Occasions
  "birthday": CakeSlice,
  "graduation": GraduationCap,
  "new-baby": Baby,
  "wedding": PartyPopper,
  "housewarming": HomeIcon,
  "family-reunion": Users,
  "promotion": Award,
  "anniversary": Heart,
  "retirement": Sparkles,
  "first-day-school": Star,
  "engagement": Heart,
  "mothers-day": Heart,
  "fathers-day": Heart,
  "valentines-day": Heart,
  
  // Cultural & Religious
  "meskel": Cross,
  "timket": Waves,
  "gena": Star,
  "fasika": Egg,
  "enkutatash": Sun,
  "eid-al-fitr": Moon,
  "eid-al-adha": Mountain,
  "irreechaa": TreePine,
  "ashenda": Flower2,
  "adwa-victory": Crown,
  "bunn": Coffee,
  "sigd": Heart,
  
  // Emotions
  "love-romance": Heart,
  "gratitude": Star,
  "comfort-support": HelpingHand,
  "celebration": Sparkles,
  "miss-you": Smile,
  "congratulations": ThumbsUp,
  "get-well-soon": Heart,
  "thinking-of-you": Heart,
  "good-luck": Star,
  "im-sorry": Sparkles,
  "just-because": Coffee,
  "encouragement": Heart,
  
  // Food & Beverages
  "ethiopian-coffee": Coffee,
  "spices-herbs": Wheat,
  "traditional-bread": Wheat,
  "sweets-desserts": CakeSlice,
  "dairy-products": UtensilsCrossed,
  "fresh-produce": Wheat,
  "packaged-meals": ChefHat,
  "beverages": Coffee
};

// Specific gradient mappings for each subcategory
const getGradientForSubcategory = (categoryId: string, slug: string): string => {
  const gradients: Record<string, Record<string, string>> = {
    "occasions": {
      "birthday": "from-pink-500 to-rose-600",
      "graduation": "from-blue-500 to-indigo-600", 
      "new-baby": "from-cyan-400 to-blue-500",
      "wedding": "from-purple-500 to-pink-500",
      "housewarming": "from-green-500 to-emerald-600",
      "family-reunion": "from-orange-500 to-red-500",
      "promotion": "from-yellow-500 to-orange-500",
      "anniversary": "from-red-500 to-pink-600",
      "retirement": "from-gray-500 to-gray-700",
      "first-day-school": "from-indigo-500 to-purple-600",
      "engagement": "from-pink-400 to-rose-500",
      "mothers-day": "from-rose-400 to-pink-500",
      "fathers-day": "from-blue-600 to-indigo-700",
      "valentines-day": "from-red-400 to-pink-500"
    },
    "cultural-religious": {
      "meskel": "from-yellow-500 to-orange-600",
      "timket": "from-blue-500 to-cyan-600",
      "gena": "from-green-600 to-emerald-700",
      "fasika": "from-purple-500 to-violet-600",
      "enkutatash": "from-yellow-400 to-amber-500",
      "eid-al-fitr": "from-emerald-500 to-green-600",
      "eid-al-adha": "from-teal-500 to-cyan-600",
      "irreechaa": "from-orange-500 to-red-600",
      "ashenda": "from-pink-500 to-rose-600",
      "adwa-victory": "from-red-600 to-orange-700",
      "bunn": "from-amber-600 to-orange-700",
      "sigd": "from-indigo-500 to-blue-600"
    },
    "emotions": {
      "love-romance": "from-red-500 to-pink-600",
      "gratitude": "from-amber-500 to-yellow-600",
      "comfort-support": "from-blue-500 to-indigo-600",
      "celebration": "from-purple-500 to-pink-500",
      "miss-you": "from-cyan-500 to-blue-600",
      "congratulations": "from-green-500 to-emerald-600",
      "get-well-soon": "from-emerald-400 to-green-500",
      "thinking-of-you": "from-violet-500 to-purple-600",
      "good-luck": "from-yellow-500 to-amber-600",
      "im-sorry": "from-slate-500 to-gray-600",
      "just-because": "from-indigo-400 to-blue-500",
      "encouragement": "from-orange-500 to-red-500"
    },
    "food-beverages": {
      "ethiopian-coffee": "from-amber-700 to-brown-800",
      "spices-herbs": "from-red-600 to-orange-700",
      "traditional-bread": "from-yellow-600 to-amber-700",
      "sweets-desserts": "from-pink-500 to-rose-600",
      "dairy-products": "from-blue-400 to-cyan-500",
      "fresh-produce": "from-green-500 to-emerald-600",
      "packaged-meals": "from-orange-600 to-red-700",
      "beverages": "from-purple-500 to-indigo-600"
    }
  };
  
  return gradients[categoryId]?.[slug] || "from-gray-500 to-gray-700";
};

// Generate category items from the central config
export const occasionCategories: CategoryItem[] = 
  CATEGORIES.find(cat => cat.id === "occasions")?.subcategories.map(sub => ({
    icon: subcategoryIcons[sub.slug] || CakeSlice,
    name: sub.name,
    description: sub.description,
    gradient: getGradientForSubcategory("occasions", sub.slug),
    slug: sub.slug
  })) || [];

export const culturalCategories: CategoryItem[] = 
  CATEGORIES.find(cat => cat.id === "cultural-religious")?.subcategories.map(sub => ({
    icon: subcategoryIcons[sub.slug] || Cross,
    name: sub.name,
    description: sub.description,
    gradient: getGradientForSubcategory("cultural-religious", sub.slug),
    slug: sub.slug
  })) || [];

export const emotionCategories: CategoryItem[] = 
  CATEGORIES.find(cat => cat.id === "emotions")?.subcategories.map(sub => ({
    icon: subcategoryIcons[sub.slug] || Heart,
    name: sub.name,
    description: sub.description,
    gradient: getGradientForSubcategory("emotions", sub.slug),
    slug: sub.slug
  })) || [];

export const foodCategories: CategoryItem[] = 
  CATEGORIES.find(cat => cat.id === "food-beverages")?.subcategories.map(sub => ({
    icon: subcategoryIcons[sub.slug] || Coffee,
    name: sub.name,
    description: sub.description,
    gradient: getGradientForSubcategory("food-beverages", sub.slug),
    slug: sub.slug
  })) || [];

export const getCategoryContent = (activeCategory: string): CategoryItem[] => {
  switch (activeCategory) {
    case "cultural": return culturalCategories;
    case "emotions": return emotionCategories;
    case "food": return foodCategories;
    default: return occasionCategories;
  }
}; 