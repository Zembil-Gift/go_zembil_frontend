import { Card, CardContent } from "@/components/ui/card";
import { 
  Palette, Camera, Heart, Star, CheckCircle, ArrowRight, Sparkles, Gift, Crown, Coffee,
  Shirt, Wrench, Music, Package, Users, Zap, ChevronDown, Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ProtectedRoute from "@/components/protected-route";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import FadeIn from "@/components/animations/FadeIn";
import { useQuery } from "@tanstack/react-query";
import { customOrderTemplateService } from "@/services/customOrderTemplateService";
import type { CategoryWithTemplateCount } from "@/types/customOrders";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";


// const customOrderSchema = z.object({
//   type: z.string().min(1, "Please select an order type"),
//   title: z.string().min(3, "Title must be at least 3 characters").max(200, "Title must be less than 200 characters"),
//   description: z.string().min(10, "Description must be at least 10 characters").max(2000, "Description must be less than 2000 characters"),
//   budget: z.string().min(1, "Please enter your budget"),
//   deadline: z.string().min(1, "Please select a deadline"),
//   estimatedDelivery: z.string().optional(),
//   recipientInfo: z.string().max(1000, "Recipient info must be less than 1000 characters").optional(),
//   specialRequests: z.string().max(1000, "Special requests must be less than 1000 characters").optional(),
//   referenceImages: z.array(z.any()).optional(),
// });

// type CustomOrderForm = z.infer<typeof customOrderSchema>;

// Draft management functions
// const DRAFT_KEY = 'custom-order-draft';

// const saveDraft = (data: Partial<CustomOrderForm>) => {
//   try {
//     localStorage.setItem(DRAFT_KEY, JSON.stringify({
//       ...data,
//       savedAt: new Date().toISOString()
//     }));
//   } catch (error) {
//     console.warn('Failed to save draft:', error);
//   }
// };

// const loadDraft = (): Partial<CustomOrderForm> | null => {
//   try {
//     const stored = localStorage.getItem(DRAFT_KEY);
//     if (stored) {
//       const parsed = JSON.parse(stored);
//       // Only load if saved within last 7 days
//       const savedAt = new Date(parsed.savedAt);
//       const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
//       if (savedAt > weekAgo) {
//         delete parsed.savedAt;
//         return parsed;
//       }
//     }
//   } catch (error) {
//     console.warn('Failed to load draft:', error);
//   }
//   return null;
// };
//
// const clearDraft = () => {
//   try {
//     localStorage.removeItem(DRAFT_KEY);
//   } catch (error) {
//     console.warn('Failed to clear draft:', error);
//   }
// };

// Category icon mapping based on name
const getCategoryIcon = (categoryName: string) => {
  if (!categoryName) return Package;
  const name = categoryName.toLowerCase();
  if (name.includes('art') || name.includes('paint') || name.includes('portrait')) return Palette;
  if (name.includes('embroid') || name.includes('cloth') || name.includes('shirt') || name.includes('fashion')) return Shirt;
  if (name.includes('wood') || name.includes('craft') || name.includes('tool')) return Wrench;
  if (name.includes('jewel') || name.includes('accessori')) return Star;
  if (name.includes('ceramic') || name.includes('pottery')) return Palette;
  if (name.includes('basket') || name.includes('gift')) return Gift;
  if (name.includes('song') || name.includes('music')) return Music;
  if (name.includes('photo') || name.includes('album') || name.includes('camera')) return Camera;
  if (name.includes('letter') || name.includes('love') || name.includes('heart')) return Heart;
  if (name.includes('leather')) return Sparkles;
  if (name.includes('crown') || name.includes('traditional')) return Crown;
  if (name.includes('coffee')) return Coffee;
  if (name.includes('handmade') || name.includes('sparkle')) return Sparkles;
  return Package;
};

function CustomOrdersContent() {
  // State for "Why Choose" section visibility with localStorage persistence
  const [isFeaturesExpanded, setIsFeaturesExpanded] = useState(() => {
    const saved = localStorage.getItem('custom-orders-features-expanded');
    return saved === null ? false : saved === 'true'; // Default to collapsed
  });

  // State for "How It Works" guide visibility with localStorage persistence
  const [isGuideExpanded, setIsGuideExpanded] = useState(() => {
    const saved = localStorage.getItem('custom-orders-guide-expanded');
    return saved === null ? true : saved === 'true'; // Default to expanded on first visit
  });

  useEffect(() => {
    localStorage.setItem('custom-orders-features-expanded', isFeaturesExpanded.toString());
  }, [isFeaturesExpanded]);

  useEffect(() => {
    localStorage.setItem('custom-orders-guide-expanded', isGuideExpanded.toString());
  }, [isGuideExpanded]);

  // Fetch categories with template counts from API
  const { data: categories, isLoading: isCategoriesLoading } = useQuery({
    queryKey: ['custom-order-categories'],
    queryFn: () => customOrderTemplateService.getCategoriesWithTemplates(),
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-light-cream to-white">
      {/* Simplified Hero Section */}
      <section className="bg-gradient-to-r from-eagle-green to-viridian-green">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <FadeIn delay={0.1}>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-2xl lg:text-3xl font-gotham-bold text-white">
                    Custom Orders
                  </h1>
                </div>
                <p className="text-sm lg:text-base font-gotham-light text-white/80 max-w-2xl">
                  Commission unique, personalized pieces from talented Ethiopian artists
                </p>
              </div>
              <Link to="/custom-orders/categories" className="hidden md:block">
                <Button 
                  size="lg" 
                  className="bg-june-bud hover:bg-june-bud/90 text-eagle-green font-gotham-bold px-6 py-3 h-auto rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <span>Browse Categories</span>
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Features Section - Collapsible */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <FadeIn delay={0.2}>
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8">
            {/* Toggle Header */}
            <button
              onClick={() => setIsFeaturesExpanded(!isFeaturesExpanded)}
              className="w-full p-6 lg:p-8 flex items-center justify-between hover:bg-light-cream/30 transition-colors duration-200 group"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-june-bud/20 to-viridian-green/10 rounded-xl group-hover:from-june-bud/30 group-hover:to-viridian-green/20 transition-colors">
                  <Sparkles className="h-6 w-6 text-eagle-green" />
                </div>
                <div className="text-left">
                  <h2 className="text-2xl lg:text-3xl font-gotham-bold text-eagle-green mb-1">
                    Why Choose Our Custom Order System?
                  </h2>
                  <p className="text-sm font-gotham-light text-eagle-green/70">
                    {isFeaturesExpanded ? 'Click to hide features' : 'Click to see key features and benefits'}
                  </p>
                </div>
              </div>
              <motion.div
                animate={{ rotate: isFeaturesExpanded ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <ChevronDown className="h-6 w-6 text-eagle-green" />
              </motion.div>
            </button>

            {/* Collapsible Content */}
            <AnimatePresence>
              {isFeaturesExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="px-8 pb-8 lg:px-12 lg:pb-12 border-t border-eagle-green/10">
                    <div className="pt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {[
                        {
                          icon: Users,
                          title: "Vendor Templates",
                          description: "Browse professionally created templates from verified vendors with customizable options.",
                          color: "from-eagle-green/20 to-viridian-green/10"
                        },
                        {
                          icon: Package,
                          title: "Dynamic Customization",
                          description: "Fill out custom fields, upload images, and specify exactly what you want.",
                          color: "from-june-bud/20 to-yellow/10"
                        },
                        {
                          icon: Zap,
                          title: "Real-time Chat",
                          description: "Communicate directly with vendors to refine your order and track progress.",
                          color: "from-viridian-green/20 to-eagle-green/10"
                        }
                      ].map((feature, index) => (
                        <motion.div
                          key={feature.title}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 + index * 0.1 }}
                          whileHover={{ y: -4 }}
                        >
                          <Card className="h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white rounded-xl">
                            <CardContent className="p-6 text-center">
                              <div className={`w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center`}>
                                <feature.icon className="h-8 w-8 text-eagle-green" />
                              </div>
                              <h3 className="text-xl font-gotham-bold text-eagle-green mb-3">
                                {feature.title}
                              </h3>
                              <p className="font-gotham-light text-eagle-green/70 leading-relaxed">
                                {feature.description}
                              </p>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </FadeIn>

        {/* How It Works Section - Collapsible */}
        <FadeIn delay={0.5}>
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Toggle Header */}
            <button
              onClick={() => setIsGuideExpanded(!isGuideExpanded)}
              className="w-full p-6 lg:p-8 flex items-center justify-between hover:bg-light-cream/30 transition-colors duration-200 group"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-eagle-green/20 to-viridian-green/10 rounded-xl group-hover:from-eagle-green/30 group-hover:to-viridian-green/20 transition-colors">
                  <Info className="h-6 w-6 text-eagle-green" />
                </div>
                <div className="text-left">
                  <h2 className="text-2xl lg:text-3xl font-gotham-bold text-eagle-green mb-1">
                    How It Works
                  </h2>
                  <p className="text-sm font-gotham-light text-eagle-green/70">
                    {isGuideExpanded ? 'Click to hide guide' : 'Click to see how to place a custom order'}
                  </p>
                </div>
              </div>
              <motion.div
                animate={{ rotate: isGuideExpanded ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <ChevronDown className="h-6 w-6 text-eagle-green" />
              </motion.div>
            </button>

            {/* Collapsible Content */}
            <AnimatePresence>
              {isGuideExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="px-8 pb-8 lg:px-12 lg:pb-12 border-t border-eagle-green/10">
                    <div className="pt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                      {[
                        { 
                          step: 1, 
                          title: "Browse Categories", 
                          description: "Explore different categories and find vendors offering custom templates",
                          icon: Package
                        },
                        { 
                          step: 2, 
                          title: "Customize Order", 
                          description: "Fill out the vendor's custom fields and upload any reference materials",
                          icon: Palette
                        },
                        { 
                          step: 3, 
                          title: "Pay", 
                          description: "Chat with the vendor to finalize details and pricing, then pay securely",
                          icon: CheckCircle
                        },
                        { 
                          step: 4, 
                          title: "Receive Creation", 
                          description: "Track progress and receive your unique handmade item with delivery",
                          icon: Gift
                        }
                      ].map((item, index) => (
                        <motion.div
                          key={item.step}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 + index * 0.1 }}
                          className="text-center"
                        >
                          <div className="relative mb-6">
                            <div className="w-16 h-16 bg-gradient-to-br from-eagle-green to-viridian-green rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                              <item.icon className="h-8 w-8 text-white" />
                            </div>
                            <div className="absolute -top-2 -right-2 w-8 h-8 bg-june-bud rounded-full flex items-center justify-center text-eagle-green font-gotham-bold text-sm shadow-md">
                              {item.step}
                            </div>
                          </div>
                          <h3 className="text-lg font-gotham-bold text-eagle-green mb-3">
                            {item.title}
                          </h3>
                          <p className="font-gotham-light text-eagle-green/70 text-sm leading-relaxed">
                            {item.description}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </FadeIn>

        {/* Popular Categories Preview */}
        <FadeIn delay={0.7}>
          <div className="mt-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-gotham-bold text-eagle-green mb-4">
                Browse Categories
              </h2>
              <p className="text-lg font-gotham-light text-eagle-green/70">
                Discover custom order templates from our talented vendors
              </p>
            </div>

            {isCategoriesLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
                {[...Array(8)].map((_, index) => (
                  <Card key={index} className="border-0 shadow-md bg-white rounded-xl">
                    <CardContent className="p-4 text-center">
                      <Skeleton className="w-12 h-12 rounded-xl mx-auto mb-3" />
                      <Skeleton className="h-4 w-24 mx-auto mb-2" />
                      <Skeleton className="h-3 w-16 mx-auto" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : categories && categories.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
                {categories.map((category: CategoryWithTemplateCount, index: number) => {
                  const IconComponent = getCategoryIcon(category.categoryName);
                  return (
                    <motion.div
                      key={category.categoryId}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.8 + index * 0.05 }}
                      whileHover={{ scale: 1.05 }}
                      className="group"
                    >
                      <Link to={`/custom-orders/category/${category.categoryId}`}>
                        <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-300 bg-white rounded-xl cursor-pointer">
                          <CardContent className="p-4 text-center">
                            <div className="w-12 h-12 bg-gradient-to-br from-june-bud/20 to-viridian-green/10 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:from-june-bud/30 group-hover:to-viridian-green/20 transition-colors">
                              <IconComponent className="h-6 w-6 text-eagle-green" />
                            </div>
                            <h3 className="font-gotham-bold text-eagle-green text-sm mb-1">
                              {category.categoryName}
                            </h3>
                            <p className="text-xs font-gotham-light text-eagle-green/60">
                              {category.templateCount} {category.templateCount === 1 ? 'template' : 'templates'}
                            </p>
                          </CardContent>
                        </Card>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <Package className="h-16 w-16 text-eagle-green/30 mx-auto mb-4" />
                <p className="text-lg font-gotham-light text-eagle-green/70">
                  No categories available yet. Check back soon!
                </p>
              </div>
            )}

            <div className="text-center">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link to="/custom-orders/categories">
                  <Button 
                    size="lg" 
                    className="bg-eagle-green hover:bg-viridian-green text-white font-gotham-bold px-8 py-3 h-auto rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <span>View All Categories</span>
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </motion.div>
            </div>
          </div>
        </FadeIn>
      </section>
    </div>
  );
}

export default function CustomOrders() {
  return (
    <ProtectedRoute>
      <CustomOrdersContent />
    </ProtectedRoute>
  );
}