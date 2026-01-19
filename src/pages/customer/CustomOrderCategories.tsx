import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Palette, 
  Sparkles, 
  ArrowRight,
  Package,
  Loader2
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import FadeIn from '@/components/animations/FadeIn';

import { customOrderTemplateService } from '@/services/customOrderTemplateService';
import type { CategoryWithTemplateCount } from '@/types/customOrders';

// Category icon mapping
const getCategoryIcon = (categoryName: string) => {
  if (!categoryName) return Package;
  const name = categoryName.toLowerCase();
  if (name.includes('art') || name.includes('paint') || name.includes('portrait')) {
    return Palette;
  }
  if (name.includes('craft') || name.includes('handmade')) {
    return Sparkles;
  }
  return Package;
};

export default function CustomOrderCategories() {
  const navigate = useNavigate();

  // Fetch categories with template counts
  const { data: categories, isLoading, error } = useQuery({
    queryKey: ['custom-order-categories'],
    queryFn: () => customOrderTemplateService.getCategoriesWithTemplates(),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-light-cream to-white">
        {/* Hero skeleton */}
        <div className="bg-gradient-to-r from-eagle-green to-viridian-green">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Skeleton className="h-8 w-64 mb-2 bg-white/20" />
            <Skeleton className="h-5 w-96 bg-white/20" />
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="overflow-hidden border-0 shadow-md bg-white rounded-xl">
                <CardContent className="p-6">
                  <Skeleton className="h-16 w-16 rounded-xl mb-4 bg-june-bud/20" />
                  <Skeleton className="h-6 w-3/4 mb-2 bg-june-bud/20" />
                  <Skeleton className="h-4 w-1/2 bg-june-bud/20" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Package className="h-16 w-16 text-eagle-green/30 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-eagle-green mb-2">Unable to Load Categories</h2>
          <p className="font-light text-eagle-green/70">Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-light-cream to-white">
      {/* Simplified Hero Section */}
      <section className="bg-gradient-to-r from-eagle-green to-viridian-green">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <FadeIn delay={0.1}>
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-2xl lg:text-3xl font-gotham-bold text-white">
                Custom Order Categories
              </h1>
            </div>
            <p className="text-sm lg:text-base font-gotham-light text-white/80 max-w-2xl">
              Browse categories and find talented vendors who can bring your custom ideas to life
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Categories Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        <FadeIn delay={0.2}>
          <div className="flex items-center gap-2 mb-8">
            <Package className="h-5 w-5 text-viridian-green" />
            <span className="font-gotham-bold text-eagle-green">Browse Categories</span>
          </div>
        </FadeIn>

        {categories && categories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category: CategoryWithTemplateCount, index: number) => {
              const IconComponent = getCategoryIcon(category.categoryName);
              
              return (
                <motion.div
                  key={category.categoryId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -4 }}
                >
                  <Card 
                    className="group overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white rounded-xl cursor-pointer"
                    onClick={() => navigate(`/custom-orders/category/${category.categoryId}`)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-gradient-to-br from-june-bud/20 to-viridian-green/10 rounded-xl group-hover:from-june-bud/30 group-hover:to-viridian-green/20 transition-colors">
                          <IconComponent className="h-8 w-8 text-eagle-green" />
                        </div>
                        <Badge className="bg-eagle-green/10 text-eagle-green border-none">
                          {category.templateCount} {category.templateCount === 1 ? 'template' : 'templates'}
                        </Badge>
                      </div>
                      
                      <h3 className="font-bold text-eagle-green text-xl mb-2 group-hover:text-viridian-green transition-colors">
                        {category.categoryName}
                      </h3>
                      
                      {category.categoryDescription && (
                        <p className="text-sm text-eagle-green/60 line-clamp-2 mb-4">
                          {category.categoryDescription}
                        </p>
                      )}
                      
                      {category.parentCategoryName && (
                        <p className="text-xs text-eagle-green/50 mb-4">
                          in {category.parentCategoryName}
                        </p>
                      )}
                      
                      <div className="flex items-center text-viridian-green font-medium text-sm group-hover:gap-2 transition-all">
                        <span>Browse Templates</span>
                        <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <Package className="h-16 w-16 text-eagle-green/20 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-eagle-green mb-2">No Categories Available</h3>
            <p className="font-light text-eagle-green/60">
              Check back soon for custom order options.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
