import { 
  Calendar, Heart, Cross, Coffee, Gift,
  CakeSlice, GraduationCap, Baby, PartyPopper, Home, Users, Award, 
  Sparkles, Star, Waves, Egg, Sun, Moon, Mountain, TreePine, 
  Flower2, Crown, HelpingHand, Smile, ThumbsUp, UtensilsCrossed, 
  Wheat, ChefHat, Leaf, LucideIcon
} from "lucide-react";

// Map icon names from backend to Lucide icons
const iconMap: Record<string, LucideIcon> = {
  'Calendar': Calendar,
  'Cross': Cross,
  'Heart': Heart,
  'Coffee': Coffee,
  
  'CakeSlice': CakeSlice,
  'GraduationCap': GraduationCap,
  'Baby': Baby,
  'PartyPopper': PartyPopper,
  'Home': Home,
  'Users': Users,
  'Award': Award,
  'Sparkles': Sparkles,
  'Star': Star,
  'Gift': Gift,
  
  'Waves': Waves,
  'Egg': Egg,
  'Sun': Sun,
  'Moon': Moon,
  'Mountain': Mountain,
  'TreePine': TreePine,
  'Flower2': Flower2,
  'Crown': Crown,
  
  'HelpingHand': HelpingHand,
  'Smile': Smile,
  'ThumbsUp': ThumbsUp,
  
  'UtensilsCrossed': UtensilsCrossed,
  'Wheat': Wheat,
  'ChefHat': ChefHat,
  'Leaf': Leaf,
};


export function getIconByName(iconName: string | undefined): LucideIcon {
  if (!iconName) return Gift;
  return iconMap[iconName] || Gift;
}


export function getAvailableIconNames(): string[] {
  return Object.keys(iconMap);
}

export default iconMap;
