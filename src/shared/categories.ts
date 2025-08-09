import { 
  Calendar, Heart, Cross, Coffee,
  CakeSlice, GraduationCap, Baby, PartyPopper, Home, Users, Award, 
  Sparkles, Star, Gift, Waves, Egg, Sun, Moon, Mountain, TreePine, 
  Flower2, Crown, HelpingHand, Smile, ThumbsUp, UtensilsCrossed, 
  Wheat, ChefHat, Leaf
} from "lucide-react";

export interface SubCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

export interface MainCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
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
      { id: "birthday", name: "Birthday", slug: "birthday", description: "Celebrate special moments", icon: CakeSlice },
      { id: "graduation", name: "Graduation", slug: "graduation", description: "Academic achievements", icon: GraduationCap },
      { id: "new-baby", name: "New Baby", slug: "new-baby", description: "Welcome new life", icon: Baby },
      { id: "wedding", name: "Wedding", slug: "wedding", description: "Celebrate love stories", icon: PartyPopper },
      { id: "housewarming", name: "Housewarming", slug: "housewarming", description: "New beginnings at home", icon: Home },
      { id: "family-reunion", name: "Family Reunion", slug: "family-reunion", description: "Bring families together", icon: Users },
      { id: "promotion", name: "Promotion", slug: "promotion", description: "Career milestones", icon: Award },
      { id: "anniversary", name: "Anniversary", slug: "anniversary", description: "Mark love and commitment", icon: Heart },
      { id: "retirement", name: "Retirement", slug: "retirement", description: "New chapter begins", icon: Sparkles },
      { id: "first-day-school", name: "First Day School", slug: "first-day-school", description: "Educational journey", icon: Star },
      { id: "engagement", name: "Engagement", slug: "engagement", description: "Promise of forever", icon: Gift },
      { id: "mothers-day", name: "Mother's Day", slug: "mothers-day", description: "Honor mothers", icon: Heart },
      { id: "fathers-day", name: "Father's Day", slug: "fathers-day", description: "Celebrate fathers", icon: Heart },
      { id: "valentines-day", name: "Valentine's Day", slug: "valentines-day", description: "Express love", icon: Heart }
    ]
  },
  {
    id: "cultural-religious",
    name: "Cultural & Religious",
    slug: "cultural-religious",
    description: "Cultural and religious celebrations",
    icon: Cross,
    color: "from-blue-500 to-purple-500",
    subcategories: [
      { id: "meskel", name: "Meskel", slug: "meskel", description: "Finding of the True Cross", icon: Cross },
      { id: "timket", name: "Timket", slug: "timket", description: "Epiphany celebration", icon: Waves },
      { id: "gena", name: "Gena", slug: "gena", description: "Ethiopian Christmas", icon: Star },
      { id: "fasika", name: "Fasika", slug: "fasika", description: "Ethiopian Easter", icon: Egg },
      { id: "enkutatash", name: "Enkutatash", slug: "enkutatash", description: "Ethiopian New Year", icon: Sun },
      { id: "eid-al-fitr", name: "Eid al-Fitr", slug: "eid-al-fitr", description: "End of Ramadan", icon: Moon },
      { id: "eid-al-adha", name: "Eid al-Adha", slug: "eid-al-adha", description: "Feast of Sacrifice", icon: Mountain },
      { id: "irreechaa", name: "Irreechaa", slug: "irreechaa", description: "Thanksgiving festival", icon: TreePine },
      { id: "ashenda", name: "Ashenda", slug: "ashenda", description: "Girls' festival", icon: Flower2 },
      { id: "adwa-victory", name: "Adwa Victory", slug: "adwa-victory", description: "Victory celebration", icon: Crown },
      { id: "bunn", name: "Bunn", slug: "bunn", description: "Coffee ceremony", icon: Coffee },
      { id: "sigd", name: "Sigd", slug: "sigd", description: "Beta Israel holiday", icon: Heart }
    ]
  },
  {
    id: "emotions",
    name: "Emotions",
    slug: "emotions",
    description: "Express feelings and emotions",
    icon: Heart,
    color: "from-pink-500 to-red-500",
    subcategories: [
      { id: "love-romance", name: "Love & Romance", slug: "love-romance", description: "Express deep affection", icon: Heart },
      { id: "gratitude", name: "Gratitude", slug: "gratitude", description: "Show appreciation", icon: Star },
      { id: "comfort-support", name: "Comfort & Support", slug: "comfort-support", description: "Be there for others", icon: HelpingHand },
      { id: "celebration", name: "Celebration", slug: "celebration", description: "Mark achievements", icon: Sparkles },
      { id: "miss-you", name: "Miss You", slug: "miss-you", description: "Bridge distances", icon: Smile },
      { id: "congratulations", name: "Congratulations", slug: "congratulations", description: "Celebrate success", icon: ThumbsUp },
      { id: "get-well-soon", name: "Get Well Soon", slug: "get-well-soon", description: "Wish recovery", icon: Heart },
      { id: "thinking-of-you", name: "Thinking of You", slug: "thinking-of-you", description: "Show you care", icon: Heart },
      { id: "good-luck", name: "Good Luck", slug: "good-luck", description: "Wish success", icon: Star },
      { id: "im-sorry", name: "I'm Sorry", slug: "im-sorry", description: "Express regret", icon: Sparkles },
      { id: "just-because", name: "Just Because", slug: "just-because", description: "No reason needed", icon: Coffee },
      { id: "encouragement", name: "Encouragement", slug: "encouragement", description: "Boost spirits", icon: Heart }
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
      { id: "ethiopian-coffee", name: "Ethiopian Coffee", slug: "ethiopian-coffee", description: "Traditional & premium blends", icon: Coffee },
      { id: "spices-herbs", name: "Spices & Herbs", slug: "spices-herbs", description: "Berbere, Mitmita, and more", icon: Leaf },
      { id: "traditional-bread", name: "Traditional Bread", slug: "traditional-bread", description: "Injera & dabo", icon: Wheat },
      { id: "sweets-desserts", name: "Sweets & Desserts", slug: "sweets-desserts", description: "Baklava, himbasha, and more", icon: CakeSlice },
      { id: "dairy-products", name: "Dairy Products", slug: "dairy-products", description: "Cheese, milk, butter", icon: UtensilsCrossed },
      { id: "fresh-produce", name: "Fresh Produce", slug: "fresh-produce", description: "Fruits & vegetables", icon: Leaf },
      { id: "packaged-meals", name: "Packaged Meals", slug: "packaged-meals", description: "Ready-to-eat Ethiopian dishes", icon: ChefHat },
      { id: "beverages", name: "Beverages", slug: "beverages", description: "Teas, juices, soft drinks", icon: Coffee }
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
