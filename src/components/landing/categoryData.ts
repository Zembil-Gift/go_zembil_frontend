import { 
  CakeSlice, Heart, GraduationCap, Baby, PartyPopper, Home as HomeIcon, 
  Users, Award, Sparkles, Star, Coffee, Cross, Waves, Egg, Moon, Sun, 
  TreePine, Flower2, Crown, Mountain, HelpingHand, Smile, ThumbsUp,
  PaintbrushVertical, Shirt, Palette, Gift, Music, Camera
} from "lucide-react";

export interface CategoryItem {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  name: string;
  description: string;
  gradient: string;
}

export const occasionCategories: CategoryItem[] = [
  { icon: CakeSlice, name: "Birthday", description: "Celebrate special moments", gradient: "from-warm-red to-ethiopian-gold" },
  { icon: Heart, name: "Anniversary", description: "Mark love and commitment", gradient: "from-warm-red to-deep-forest" },
  { icon: GraduationCap, name: "Graduation", description: "Academic achievements", gradient: "from-ethiopian-gold to-amber-600" },
  { icon: Baby, name: "New Baby", description: "Welcome new life", gradient: "from-deep-forest to-ethiopian-gold" },
  { icon: PartyPopper, name: "Wedding", description: "Celebrate love stories", gradient: "from-pink-500 to-rose-600" },
  { icon: HomeIcon, name: "Housewarming", description: "New beginnings at home", gradient: "from-blue-500 to-indigo-600" },
  { icon: Users, name: "Family Reunion", description: "Bring families together", gradient: "from-green-500 to-teal-600" },
  { icon: Award, name: "Promotion", description: "Career milestones", gradient: "from-purple-500 to-violet-600" },
  { icon: Sparkles, name: "Retirement", description: "New chapter begins", gradient: "from-orange-500 to-red-600" },
  { icon: Star, name: "First Day School", description: "Educational journey", gradient: "from-cyan-500 to-blue-600" },
  { icon: Gift, name: "Engagement", description: "Promise of forever", gradient: "from-rose-500 to-pink-600" },
  { icon: Coffee, name: "Job Interview", description: "Career opportunities", gradient: "from-amber-600 to-yellow-600" }
];

export const culturalCategories: CategoryItem[] = [
  { icon: Cross, name: "Meskel", description: "Finding of the True Cross", gradient: "from-ethiopian-gold to-warm-red" },
  { icon: Waves, name: "Timket", description: "Epiphany celebration", gradient: "from-blue-500 to-teal-500" },
  { icon: Star, name: "Gena", description: "Ethiopian Christmas", gradient: "from-warm-red to-ethiopian-gold" },
  { icon: Egg, name: "Fasika", description: "Ethiopian Easter", gradient: "from-orange-400 to-amber-500" },
  { icon: Sun, name: "Enkutatash", description: "Ethiopian New Year", gradient: "from-yellow-400 to-orange-500" },
  { icon: Moon, name: "Eid al-Fitr", description: "End of Ramadan", gradient: "from-green-500 to-emerald-600" },
  { icon: Mountain, name: "Eid al-Adha", description: "Feast of Sacrifice", gradient: "from-purple-500 to-indigo-600" },
  { icon: TreePine, name: "Irreechaa", description: "Thanksgiving festival", gradient: "from-green-600 to-lime-500" },
  { icon: Flower2, name: "Ashenda", description: "Girls' festival", gradient: "from-pink-500 to-rose-500" },
  { icon: Crown, name: "Adwa Victory", description: "Victory celebration", gradient: "from-red-600 to-yellow-500" },
  { icon: Coffee, name: "Bunn", description: "Coffee ceremony", gradient: "from-amber-700 to-orange-600" },
  { icon: Heart, name: "Sigd", description: "Beta Israel holiday", gradient: "from-blue-600 to-purple-600" }
];

export const emotionCategories: CategoryItem[] = [
  { icon: Heart, name: "Love & Romance", description: "Express deep affection", gradient: "from-warm-red to-deep-forest" },
  { icon: Star, name: "Gratitude", description: "Show appreciation", gradient: "from-ethiopian-gold to-warm-red" },
  { icon: HelpingHand, name: "Comfort & Support", description: "Be there for others", gradient: "from-deep-forest to-ethiopian-gold" },
  { icon: Sparkles, name: "Celebration", description: "Mark achievements", gradient: "from-ethiopian-gold to-amber-600" },
  { icon: Smile, name: "Miss You", description: "Bridge distances", gradient: "from-purple-500 to-pink-500" },
  { icon: ThumbsUp, name: "Congratulations", description: "Celebrate success", gradient: "from-green-500 to-emerald-600" },
  { icon: Heart, name: "Get Well Soon", description: "Wish recovery", gradient: "from-blue-500 to-teal-500" },
  { icon: Gift, name: "Thinking of You", description: "Show you care", gradient: "from-orange-400 to-amber-500" },
  { icon: Star, name: "Good Luck", description: "Wish success", gradient: "from-indigo-500 to-purple-600" },
  { icon: Sparkles, name: "I'm Sorry", description: "Express regret", gradient: "from-rose-500 to-red-500" },
  { icon: Coffee, name: "Just Because", description: "No reason needed", gradient: "from-yellow-500 to-orange-500" },
  { icon: Heart, name: "Encouragement", description: "Boost spirits", gradient: "from-cyan-500 to-blue-600" }
];

export const customCategories: CategoryItem[] = [
  { icon: PaintbrushVertical, name: "Custom Portrait", description: "Personalized artwork", gradient: "from-ethiopian-gold to-deep-forest" },
  { icon: Shirt, name: "Embroidery", description: "Hand-stitched designs", gradient: "from-warm-red to-ethiopian-gold" },
  { icon: Coffee, name: "Wood Crafts", description: "Handcrafted items", gradient: "from-deep-forest to-warm-red" },
  { icon: Star, name: "Custom Jewelry", description: "Personalized accessories", gradient: "from-ethiopian-gold to-amber-600" },
  { icon: Palette, name: "Painted Ceramics", description: "Artistic pottery", gradient: "from-blue-500 to-teal-600" },
  { icon: Gift, name: "Personalized Baskets", description: "Custom gift baskets", gradient: "from-green-500 to-lime-600" },
  { icon: Music, name: "Custom Songs", description: "Personalized music", gradient: "from-purple-500 to-violet-600" },
  { icon: Camera, name: "Photo Albums", description: "Memory collections", gradient: "from-orange-500 to-amber-600" },
  { icon: Heart, name: "Love Letters", description: "Handwritten messages", gradient: "from-pink-500 to-rose-600" },
  { icon: Sparkles, name: "Leather Goods", description: "Handcrafted leather", gradient: "from-amber-700 to-orange-600" },
  { icon: Crown, name: "Traditional Crowns", description: "Cultural headpieces", gradient: "from-yellow-500 to-gold" },
  { icon: Coffee, name: "Coffee Accessories", description: "Brewing essentials", gradient: "from-brown-600 to-amber-600" }
];

export const getCategoryContent = (activeCategory: string): CategoryItem[] => {
  switch (activeCategory) {
    case "cultural": return culturalCategories;
    case "emotions": return emotionCategories;
    case "custom": return customCategories;
    default: return occasionCategories;
  }
}; 