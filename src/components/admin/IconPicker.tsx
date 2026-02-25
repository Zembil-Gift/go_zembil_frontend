import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Search, Package } from 'lucide-react';
import { 
  // Main category icons
  Calendar, Heart, Cross, Coffee, Home, Users, Star, Gift, Sparkles,
  
  // Occasions & Celebrations
  CakeSlice, GraduationCap, Baby, PartyPopper, Award, Crown, Flower2, 
  Cake, Music, Camera,
  
  // Cultural & Religious
  Waves, Egg, Sun, Moon, Mountain, TreePine, Church, Bell,
  
  // Emotions & Feelings
  HelpingHand, Smile, ThumbsUp, Laugh, Frown, Meh, HeartHandshake,
  Angry,
  
  // Food & Beverages
  UtensilsCrossed, Wheat, ChefHat, Leaf, Apple, Banana, Cherry,
  Grape, Carrot, Fish, Beef, Milk, Wine,
  Beer, IceCream, Pizza, Sandwich, Soup, Salad, Cookie,
  
  // Nature & Animals
  Trees, Flower, Bug, Bird, Cat, Dog, Rabbit,
  Turtle, Snail,
  
  // Activities & Hobbies
  Gamepad2, Music2, Headphones, Guitar, Piano, Mic, Book,
  BookOpen, Pen, Paintbrush, Palette,
  Video, Film, Theater, Tv, Radio, Smartphone, Laptop,
  
  // Sports & Fitness
  Dumbbell, Bike, Car, Plane, Ship, Train, Rocket, Target,
  
  // Shopping & Business
  ShoppingBag, ShoppingCart, Store, CreditCard, Coins, DollarSign,
  Euro, PoundSterling, Bitcoin, Briefcase, Building,
  Factory, Warehouse, Truck,
  
  // Health & Medical
  Stethoscope, Pill, Syringe, Bandage, Hospital,
  Ambulance, Thermometer, Glasses, Brain, Bone,
  
  // Weather & Seasons
  Cloud, CloudRain, CloudSnow, CloudLightning, Rainbow, Snowflake,
  Umbrella, Zap, Wind, Tornado, Sunrise, Sunset,
  
  // Transportation
  Bus, Sailboat,
  Anchor, Compass, Map, MapPin, Navigation, Route,
  
  // Technology & Communication
  Wifi, Bluetooth, Signal, Battery, Plug, Monitor, Keyboard,
  Mouse, Printer, Phone, Mail, MessageCircle,
  Send, Share, Download, Upload, Server,
  
  // Home & Living
  Sofa, Bed, Lamp, Key, Lock, Fence,
  
  // Tools & Work
  Hammer, Wrench, Drill, Ruler,
  Scissors, Paperclip, Calculator, Clock, Timer,
  
  // Education & Learning
  School, University, Library, Microscope, Telescope, Globe,
  Atom, Dna, Beaker, TestTube, Magnet, Lightbulb,
  
  // Art & Design
  Brush, Pencil, Eraser, Triangle, Square,
  Circle, Hexagon, Pentagon, Diamond, Shapes, Grid, Layout,
  
  // Games & Entertainment
  Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, Puzzle,
  Spade, Club, Joystick, Trophy, Medal, Ribbon, Flag, Ticket,
  
  // Miscellaneous
  Fingerprint, Eye, EyeOff, Ear, Hand, Footprints, Shirt, Watch,
  
  LucideIcon
} from 'lucide-react';

// Comprehensive icon collection organized by categories - only valid Lucide icons
export const AVAILABLE_ICONS: { name: string; icon: LucideIcon; category: string }[] = [
  // Main Categories
  { name: 'Calendar', icon: Calendar, category: 'Main' },
  { name: 'Heart', icon: Heart, category: 'Main' },
  { name: 'Cross', icon: Cross, category: 'Main' },
  { name: 'Coffee', icon: Coffee, category: 'Main' },
  { name: 'Home', icon: Home, category: 'Main' },
  { name: 'Users', icon: Users, category: 'Main' },
  { name: 'Star', icon: Star, category: 'Main' },
  { name: 'Gift', icon: Gift, category: 'Main' },
  { name: 'Sparkles', icon: Sparkles, category: 'Main' },
  { name: 'Package', icon: Package, category: 'Main' },
  
  // Occasions & Celebrations
  { name: 'CakeSlice', icon: CakeSlice, category: 'Occasions' },
  { name: 'GraduationCap', icon: GraduationCap, category: 'Occasions' },
  { name: 'Baby', icon: Baby, category: 'Occasions' },
  { name: 'PartyPopper', icon: PartyPopper, category: 'Occasions' },
  { name: 'Award', icon: Award, category: 'Occasions' },
  { name: 'Crown', icon: Crown, category: 'Occasions' },
  { name: 'Flower2', icon: Flower2, category: 'Occasions' },
  { name: 'Cake', icon: Cake, category: 'Occasions' },
  { name: 'Music', icon: Music, category: 'Occasions' },
  { name: 'Camera', icon: Camera, category: 'Occasions' },
  
  // Cultural & Religious
  { name: 'Waves', icon: Waves, category: 'Cultural' },
  { name: 'Egg', icon: Egg, category: 'Cultural' },
  { name: 'Sun', icon: Sun, category: 'Cultural' },
  { name: 'Moon', icon: Moon, category: 'Cultural' },
  { name: 'Mountain', icon: Mountain, category: 'Cultural' },
  { name: 'TreePine', icon: TreePine, category: 'Cultural' },
  { name: 'Church', icon: Church, category: 'Cultural' },
  { name: 'Bell', icon: Bell, category: 'Cultural' },
  
  // Emotions & Feelings
  { name: 'HelpingHand', icon: HelpingHand, category: 'Emotions' },
  { name: 'Smile', icon: Smile, category: 'Emotions' },
  { name: 'ThumbsUp', icon: ThumbsUp, category: 'Emotions' },
  { name: 'Laugh', icon: Laugh, category: 'Emotions' },
  { name: 'Frown', icon: Frown, category: 'Emotions' },
  { name: 'Meh', icon: Meh, category: 'Emotions' },
  { name: 'HeartHandshake', icon: HeartHandshake, category: 'Emotions' },
  { name: 'Angry', icon: Angry, category: 'Emotions' },
  
  // Food & Beverages
  { name: 'UtensilsCrossed', icon: UtensilsCrossed, category: 'Food' },
  { name: 'Wheat', icon: Wheat, category: 'Food' },
  { name: 'ChefHat', icon: ChefHat, category: 'Food' },
  { name: 'Leaf', icon: Leaf, category: 'Food' },
  { name: 'Apple', icon: Apple, category: 'Food' },
  { name: 'Banana', icon: Banana, category: 'Food' },
  { name: 'Cherry', icon: Cherry, category: 'Food' },
  { name: 'Grape', icon: Grape, category: 'Food' },
  { name: 'Carrot', icon: Carrot, category: 'Food' },
  { name: 'Fish', icon: Fish, category: 'Food' },
  { name: 'Beef', icon: Beef, category: 'Food' },
  { name: 'Milk', icon: Milk, category: 'Food' },
  { name: 'Wine', icon: Wine, category: 'Food' },
  { name: 'Beer', icon: Beer, category: 'Food' },
  { name: 'IceCream', icon: IceCream, category: 'Food' },
  { name: 'Pizza', icon: Pizza, category: 'Food' },
  { name: 'Sandwich', icon: Sandwich, category: 'Food' },
  { name: 'Soup', icon: Soup, category: 'Food' },
  { name: 'Salad', icon: Salad, category: 'Food' },
  { name: 'Cookie', icon: Cookie, category: 'Food' },
  
  // Nature & Animals
  { name: 'Trees', icon: Trees, category: 'Nature' },
  { name: 'Flower', icon: Flower, category: 'Nature' },
  { name: 'Bug', icon: Bug, category: 'Nature' },
  { name: 'Bird', icon: Bird, category: 'Nature' },
  { name: 'Cat', icon: Cat, category: 'Nature' },
  { name: 'Dog', icon: Dog, category: 'Nature' },
  { name: 'Rabbit', icon: Rabbit, category: 'Nature' },
  { name: 'Turtle', icon: Turtle, category: 'Nature' },
  { name: 'Snail', icon: Snail, category: 'Nature' },
  
  // Activities & Hobbies
  { name: 'Gamepad2', icon: Gamepad2, category: 'Activities' },
  { name: 'Music2', icon: Music2, category: 'Activities' },
  { name: 'Headphones', icon: Headphones, category: 'Activities' },
  { name: 'Guitar', icon: Guitar, category: 'Activities' },
  { name: 'Piano', icon: Piano, category: 'Activities' },
  { name: 'Mic', icon: Mic, category: 'Activities' },
  { name: 'Book', icon: Book, category: 'Activities' },
  { name: 'BookOpen', icon: BookOpen, category: 'Activities' },
  { name: 'Pen', icon: Pen, category: 'Activities' },
  { name: 'Paintbrush', icon: Paintbrush, category: 'Activities' },
  { name: 'Palette', icon: Palette, category: 'Activities' },
  { name: 'Video', icon: Video, category: 'Activities' },
  { name: 'Film', icon: Film, category: 'Activities' },
  { name: 'Theater', icon: Theater, category: 'Activities' },
  { name: 'Tv', icon: Tv, category: 'Activities' },
  { name: 'Radio', icon: Radio, category: 'Activities' },
  
  // Sports & Fitness
  { name: 'Dumbbell', icon: Dumbbell, category: 'Sports' },
  { name: 'Bike', icon: Bike, category: 'Sports' },
  { name: 'Target', icon: Target, category: 'Sports' },
  
  // Shopping & Business
  { name: 'ShoppingBag', icon: ShoppingBag, category: 'Shopping' },
  { name: 'ShoppingCart', icon: ShoppingCart, category: 'Shopping' },
  { name: 'Store', icon: Store, category: 'Shopping' },
  { name: 'CreditCard', icon: CreditCard, category: 'Shopping' },
  { name: 'Coins', icon: Coins, category: 'Shopping' },
  { name: 'DollarSign', icon: DollarSign, category: 'Shopping' },
  { name: 'Euro', icon: Euro, category: 'Shopping' },
  { name: 'PoundSterling', icon: PoundSterling, category: 'Shopping' },
  { name: 'Bitcoin', icon: Bitcoin, category: 'Shopping' },
  { name: 'Briefcase', icon: Briefcase, category: 'Shopping' },
  { name: 'Building', icon: Building, category: 'Shopping' },
  { name: 'Factory', icon: Factory, category: 'Shopping' },
  { name: 'Warehouse', icon: Warehouse, category: 'Shopping' },
  { name: 'Truck', icon: Truck, category: 'Shopping' },
  
  // Health & Medical
  { name: 'Stethoscope', icon: Stethoscope, category: 'Health' },
  { name: 'Pill', icon: Pill, category: 'Health' },
  { name: 'Syringe', icon: Syringe, category: 'Health' },
  { name: 'Bandage', icon: Bandage, category: 'Health' },
  { name: 'Hospital', icon: Hospital, category: 'Health' },
  { name: 'Ambulance', icon: Ambulance, category: 'Health' },
  { name: 'Thermometer', icon: Thermometer, category: 'Health' },
  { name: 'Glasses', icon: Glasses, category: 'Health' },
  { name: 'Brain', icon: Brain, category: 'Health' },
  { name: 'Bone', icon: Bone, category: 'Health' },
  
  // Weather & Seasons
  { name: 'Cloud', icon: Cloud, category: 'Weather' },
  { name: 'CloudRain', icon: CloudRain, category: 'Weather' },
  { name: 'CloudSnow', icon: CloudSnow, category: 'Weather' },
  { name: 'CloudLightning', icon: CloudLightning, category: 'Weather' },
  { name: 'Rainbow', icon: Rainbow, category: 'Weather' },
  { name: 'Snowflake', icon: Snowflake, category: 'Weather' },
  { name: 'Umbrella', icon: Umbrella, category: 'Weather' },
  { name: 'Zap', icon: Zap, category: 'Weather' },
  { name: 'Wind', icon: Wind, category: 'Weather' },
  { name: 'Tornado', icon: Tornado, category: 'Weather' },
  { name: 'Sunrise', icon: Sunrise, category: 'Weather' },
  { name: 'Sunset', icon: Sunset, category: 'Weather' },
  
  // Transportation
  { name: 'Car', icon: Car, category: 'Transport' },
  { name: 'Bus', icon: Bus, category: 'Transport' },
  { name: 'Plane', icon: Plane, category: 'Transport' },
  { name: 'Ship', icon: Ship, category: 'Transport' },
  { name: 'Sailboat', icon: Sailboat, category: 'Transport' },
  { name: 'Train', icon: Train, category: 'Transport' },
  { name: 'Rocket', icon: Rocket, category: 'Transport' },
  { name: 'Anchor', icon: Anchor, category: 'Transport' },
  { name: 'Compass', icon: Compass, category: 'Transport' },
  { name: 'Map', icon: Map, category: 'Transport' },
  { name: 'MapPin', icon: MapPin, category: 'Transport' },
  { name: 'Navigation', icon: Navigation, category: 'Transport' },
  { name: 'Route', icon: Route, category: 'Transport' },
  
  // Technology & Communication
  { name: 'Smartphone', icon: Smartphone, category: 'Technology' },
  { name: 'Laptop', icon: Laptop, category: 'Technology' },
  { name: 'Monitor', icon: Monitor, category: 'Technology' },
  { name: 'Keyboard', icon: Keyboard, category: 'Technology' },
  { name: 'Mouse', icon: Mouse, category: 'Technology' },
  { name: 'Printer', icon: Printer, category: 'Technology' },
  { name: 'Phone', icon: Phone, category: 'Technology' },
  { name: 'Mail', icon: Mail, category: 'Technology' },
  { name: 'MessageCircle', icon: MessageCircle, category: 'Technology' },
  { name: 'Send', icon: Send, category: 'Technology' },
  { name: 'Share', icon: Share, category: 'Technology' },
  { name: 'Download', icon: Download, category: 'Technology' },
  { name: 'Upload', icon: Upload, category: 'Technology' },
  { name: 'Server', icon: Server, category: 'Technology' },
  { name: 'Wifi', icon: Wifi, category: 'Technology' },
  { name: 'Bluetooth', icon: Bluetooth, category: 'Technology' },
  { name: 'Signal', icon: Signal, category: 'Technology' },
  { name: 'Battery', icon: Battery, category: 'Technology' },
  { name: 'Plug', icon: Plug, category: 'Technology' },
  
  // Home & Living
  { name: 'Sofa', icon: Sofa, category: 'Home' },
  { name: 'Bed', icon: Bed, category: 'Home' },
  { name: 'Lamp', icon: Lamp, category: 'Home' },
  { name: 'Key', icon: Key, category: 'Home' },
  { name: 'Lock', icon: Lock, category: 'Home' },
  { name: 'Fence', icon: Fence, category: 'Home' },
  
  // Tools & Work
  { name: 'Hammer', icon: Hammer, category: 'Tools' },
  { name: 'Wrench', icon: Wrench, category: 'Tools' },
  { name: 'Drill', icon: Drill, category: 'Tools' },
  { name: 'Ruler', icon: Ruler, category: 'Tools' },
  { name: 'Scissors', icon: Scissors, category: 'Tools' },
  { name: 'Paperclip', icon: Paperclip, category: 'Tools' },
  { name: 'Calculator', icon: Calculator, category: 'Tools' },
  { name: 'Clock', icon: Clock, category: 'Tools' },
  { name: 'Timer', icon: Timer, category: 'Tools' },
  
  // Education & Learning
  { name: 'School', icon: School, category: 'Education' },
  { name: 'University', icon: University, category: 'Education' },
  { name: 'Library', icon: Library, category: 'Education' },
  { name: 'Microscope', icon: Microscope, category: 'Education' },
  { name: 'Telescope', icon: Telescope, category: 'Education' },
  { name: 'Globe', icon: Globe, category: 'Education' },
  { name: 'Atom', icon: Atom, category: 'Education' },
  { name: 'Dna', icon: Dna, category: 'Education' },
  { name: 'Beaker', icon: Beaker, category: 'Education' },
  { name: 'TestTube', icon: TestTube, category: 'Education' },
  { name: 'Magnet', icon: Magnet, category: 'Education' },
  { name: 'Lightbulb', icon: Lightbulb, category: 'Education' },
  
  // Art & Design
  { name: 'Brush', icon: Brush, category: 'Art' },
  { name: 'Pencil', icon: Pencil, category: 'Art' },
  { name: 'Eraser', icon: Eraser, category: 'Art' },
  { name: 'Triangle', icon: Triangle, category: 'Art' },
  { name: 'Square', icon: Square, category: 'Art' },
  { name: 'Circle', icon: Circle, category: 'Art' },
  { name: 'Hexagon', icon: Hexagon, category: 'Art' },
  { name: 'Pentagon', icon: Pentagon, category: 'Art' },
  { name: 'Diamond', icon: Diamond, category: 'Art' },
  { name: 'Shapes', icon: Shapes, category: 'Art' },
  { name: 'Grid', icon: Grid, category: 'Art' },
  { name: 'Layout', icon: Layout, category: 'Art' },
  
  // Games & Entertainment
  { name: 'Dice1', icon: Dice1, category: 'Games' },
  { name: 'Dice2', icon: Dice2, category: 'Games' },
  { name: 'Dice3', icon: Dice3, category: 'Games' },
  { name: 'Dice4', icon: Dice4, category: 'Games' },
  { name: 'Dice5', icon: Dice5, category: 'Games' },
  { name: 'Dice6', icon: Dice6, category: 'Games' },
  { name: 'Puzzle', icon: Puzzle, category: 'Games' },
  { name: 'Spade', icon: Spade, category: 'Games' },
  { name: 'Club', icon: Club, category: 'Games' },
  { name: 'Joystick', icon: Joystick, category: 'Games' },
  { name: 'Trophy', icon: Trophy, category: 'Games' },
  { name: 'Medal', icon: Medal, category: 'Games' },
  { name: 'Ribbon', icon: Ribbon, category: 'Games' },
  { name: 'Flag', icon: Flag, category: 'Games' },
  { name: 'Ticket', icon: Ticket, category: 'Games' },
  
  // Fashion & Beauty
  { name: 'Shirt', icon: Shirt, category: 'Fashion' },
  { name: 'Watch', icon: Watch, category: 'Fashion' },
  
  // Body & Anatomy
  { name: 'Fingerprint', icon: Fingerprint, category: 'Body' },
  { name: 'Eye', icon: Eye, category: 'Body' },
  { name: 'EyeOff', icon: EyeOff, category: 'Body' },
  { name: 'Ear', icon: Ear, category: 'Body' },
  { name: 'Hand', icon: Hand, category: 'Body' },
  { name: 'Footprints', icon: Footprints, category: 'Body' },
];

// Create a lookup map for efficient icon retrieval by name
export const ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  AVAILABLE_ICONS.map(({ name, icon }) => [name, icon])
);

// Helper function to get icon component by name with fallback
export const getIconByName = (iconName?: string, fallback: LucideIcon = Package): LucideIcon => {
  return iconName && ICON_MAP[iconName] ? ICON_MAP[iconName] : fallback;
};

interface IconPickerProps {
  value?: string;
  onChange: (iconName: string) => void;
  placeholder?: string;
}

export function IconPicker({ value, onChange, placeholder = "Select an icon" }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const selectedIcon = AVAILABLE_ICONS.find(icon => icon.name === value);
  const categories = ['All', ...Array.from(new Set(AVAILABLE_ICONS.map(icon => icon.category)))];

  const filteredIcons = AVAILABLE_ICONS.filter(icon => {
    const matchesSearch = icon.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || icon.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleIconSelect = (iconName: string) => {
    onChange(iconName);
    setOpen(false);
  };

  const handleModalClick = (e: React.MouseEvent) => {
    // Prevent any form submission when clicking inside the modal
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className="space-y-2">
      <Label>Icon</Label>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className="w-full justify-start"
      >
        {selectedIcon ? (
          <div className="flex items-center gap-2">
            <selectedIcon.icon className="h-4 w-4" />
            <span>{selectedIcon.name}</span>
          </div>
        ) : (
          <span className="text-gray-500">{placeholder}</span>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl w-[90vw] h-[80vh] max-h-[800px] p-0 gap-0" onClick={handleModalClick}>
          <DialogHeader className="px-6 py-4 border-b bg-white flex-shrink-0">
            <DialogTitle className="text-xl font-semibold">Choose an Icon</DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col h-full overflow-hidden">
            {/* Search and Filter Section */}
            <div className="px-6 py-4 border-b bg-gray-50 space-y-4 flex-shrink-0">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search icons..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11 text-base"
                  autoFocus
                />
              </div>

              {/* Category Filter with count */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Categories</span>
                  <span className="text-sm text-gray-500 bg-white px-2 py-1 rounded-md border">
                    {filteredIcons.length} icons
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 max-h-20 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                  {categories.map((category) => (
                    <Badge
                      key={category}
                      variant={selectedCategory === category ? "default" : "outline"}
                      className="cursor-pointer text-sm px-3 py-1 hover:bg-gray-100 transition-colors flex-shrink-0"
                      onClick={() => setSelectedCategory(category)}
                    >
                      {category}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Scrollable Icons Grid */}
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              <div className="p-6">
                {filteredIcons.length > 0 ? (
                  <div className="grid grid-cols-10 sm:grid-cols-12 md:grid-cols-14 lg:grid-cols-16 xl:grid-cols-18 gap-3">
                    {filteredIcons.map((iconData) => {
                      const IconComponent = iconData.icon;
                      const isSelected = value === iconData.name;
                      
                      return (
                        <Button
                          key={iconData.name}
                          type="button"
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          className="h-12 w-12 p-0 hover:scale-105 transition-all duration-200 focus:ring-2 focus:ring-blue-500 group"
                          onClick={() => handleIconSelect(iconData.name)}
                          title={iconData.name}
                          tabIndex={0}
                        >
                          <IconComponent className="h-5 w-5 group-hover:scale-110 transition-transform" />
                        </Button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-16 text-gray-500">
                    <Package className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium mb-2">No icons found</h3>
                    <p className="text-gray-400">No icons match "{searchTerm}"</p>
                    <p className="text-sm text-gray-400 mt-1">Try a different search term or category</p>
                  </div>
                )}
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="px-6 py-4 border-t bg-gray-50 flex-shrink-0 flex justify-between items-center">
              {value ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">Selected:</span>
                  <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-md border">
                    {selectedIcon && <selectedIcon.icon className="h-4 w-4" />}
                    <span className="text-sm font-medium">{value}</span>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">No icon selected</div>
              )}
              
              <div className="flex gap-2">
                {value && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleIconSelect('')}
                    className="hover:bg-gray-200 transition-colors"
                  >
                    Clear Selection
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setOpen(false)}
                  className="hover:bg-gray-200 transition-colors"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}