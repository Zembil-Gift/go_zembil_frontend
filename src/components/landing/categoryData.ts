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
  { icon: CakeSlice, name: "Birthday", description: "Celebrate special moments", gradient: "from-yellow to-june-bud" },
  { icon: Heart, name: "Anniversary", description: "Mark love and commitment", gradient: "from-viridian-green to-eagle-green" },
  { icon: GraduationCap, name: "Graduation", description: "Academic achievements", gradient: "from-june-bud to-yellow" },
  { icon: Baby, name: "New Baby", description: "Welcome new life", gradient: "from-eagle-green to-viridian-green" },
  { icon: PartyPopper, name: "Wedding", description: "Celebrate love stories", gradient: "from-yellow to-viridian-green" },
  { icon: HomeIcon, name: "Housewarming", description: "New beginnings at home", gradient: "from-june-bud to-eagle-green" },
  { icon: Users, name: "Family Reunion", description: "Bring families together", gradient: "from-viridian-green to-june-bud" },
  { icon: Award, name: "Promotion", description: "Career milestones", gradient: "from-eagle-green to-yellow" },
  { icon: Sparkles, name: "Retirement", description: "New chapter begins", gradient: "from-yellow to-eagle-green" },
  { icon: Star, name: "First Day School", description: "Educational journey", gradient: "from-june-bud to-viridian-green" },
  { icon: Gift, name: "Engagement", description: "Promise of forever", gradient: "from-viridian-green to-yellow" },
  { icon: Coffee, name: "Job Interview", description: "Career opportunities", gradient: "from-eagle-green to-june-bud" }
];

export const culturalCategories: CategoryItem[] = [
  { icon: Cross, name: "Meskel", description: "Finding of the True Cross", gradient: "from-yellow to-viridian-green" },
  { icon: Waves, name: "Timket", description: "Epiphany celebration", gradient: "from-june-bud to-eagle-green" },
  { icon: Star, name: "Gena", description: "Ethiopian Christmas", gradient: "from-viridian-green to-yellow" },
  { icon: Egg, name: "Fasika", description: "Ethiopian Easter", gradient: "from-eagle-green to-june-bud" },
  { icon: Sun, name: "Enkutatash", description: "Ethiopian New Year", gradient: "from-yellow to-eagle-green" },
  { icon: Moon, name: "Eid al-Fitr", description: "End of Ramadan", gradient: "from-june-bud to-viridian-green" },
  { icon: Mountain, name: "Eid al-Adha", description: "Feast of Sacrifice", gradient: "from-viridian-green to-eagle-green" },
  { icon: TreePine, name: "Irreechaa", description: "Thanksgiving festival", gradient: "from-eagle-green to-yellow" },
  { icon: Flower2, name: "Ashenda", description: "Girls' festival", gradient: "from-yellow to-june-bud" },
  { icon: Crown, name: "Adwa Victory", description: "Victory celebration", gradient: "from-viridian-green to-june-bud" },
  { icon: Coffee, name: "Bunn", description: "Coffee ceremony", gradient: "from-june-bud to-eagle-green" },
  { icon: Heart, name: "Sigd", description: "Beta Israel holiday", gradient: "from-eagle-green to-viridian-green" }
];

export const emotionCategories: CategoryItem[] = [
  { icon: Heart, name: "Love & Romance", description: "Express deep affection", gradient: "from-yellow to-viridian-green" },
  { icon: Star, name: "Gratitude", description: "Show appreciation", gradient: "from-june-bud to-eagle-green" },
  { icon: HelpingHand, name: "Comfort & Support", description: "Be there for others", gradient: "from-viridian-green to-yellow" },
  { icon: Sparkles, name: "Celebration", description: "Mark achievements", gradient: "from-eagle-green to-june-bud" },
  { icon: Smile, name: "Miss You", description: "Bridge distances", gradient: "from-yellow to-eagle-green" },
  { icon: ThumbsUp, name: "Congratulations", description: "Celebrate success", gradient: "from-june-bud to-viridian-green" },
  { icon: Heart, name: "Get Well Soon", description: "Wish recovery", gradient: "from-viridian-green to-june-bud" },
  { icon: Gift, name: "Thinking of You", description: "Show you care", gradient: "from-eagle-green to-yellow" },
  { icon: Star, name: "Good Luck", description: "Wish success", gradient: "from-yellow to-june-bud" },
  { icon: Sparkles, name: "I'm Sorry", description: "Express regret", gradient: "from-viridian-green to-eagle-green" },
  { icon: Coffee, name: "Just Because", description: "No reason needed", gradient: "from-june-bud to-yellow" },
  { icon: Heart, name: "Encouragement", description: "Boost spirits", gradient: "from-eagle-green to-viridian-green" }
];

export const customCategories: CategoryItem[] = [
  { icon: PaintbrushVertical, name: "Custom Portrait", description: "Personalized artwork", gradient: "from-yellow to-viridian-green" },
  { icon: Shirt, name: "Embroidery", description: "Hand-stitched designs", gradient: "from-june-bud to-eagle-green" },
  { icon: Coffee, name: "Wood Crafts", description: "Handcrafted items", gradient: "from-viridian-green to-yellow" },
  { icon: Star, name: "Custom Jewelry", description: "Personalized accessories", gradient: "from-eagle-green to-june-bud" },
  { icon: Palette, name: "Painted Ceramics", description: "Artistic pottery", gradient: "from-yellow to-eagle-green" },
  { icon: Gift, name: "Personalized Baskets", description: "Custom gift baskets", gradient: "from-june-bud to-viridian-green" },
  { icon: Music, name: "Custom Songs", description: "Personalized music", gradient: "from-viridian-green to-june-bud" },
  { icon: Camera, name: "Photo Albums", description: "Memory collections", gradient: "from-eagle-green to-yellow" },
  { icon: Heart, name: "Love Letters", description: "Handwritten messages", gradient: "from-yellow to-june-bud" },
  { icon: Sparkles, name: "Leather Goods", description: "Handcrafted leather", gradient: "from-viridian-green to-eagle-green" },
  { icon: Crown, name: "Traditional Crowns", description: "Cultural headpieces", gradient: "from-june-bud to-yellow" },
  { icon: Coffee, name: "Coffee Accessories", description: "Brewing essentials", gradient: "from-eagle-green to-viridian-green" }
];

export const getCategoryContent = (activeCategory: string): CategoryItem[] => {
  switch (activeCategory) {
    case "cultural": return culturalCategories;
    case "emotions": return emotionCategories;
    case "custom": return customCategories;
    default: return occasionCategories;
  }
}; 