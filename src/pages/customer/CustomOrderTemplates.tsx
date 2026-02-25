import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft,
  Package,
  Store,
  FileText,
  Hash,
  Image as ImageIcon,
  Video,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import FadeIn from '@/components/animations/FadeIn';
import { useAuth } from '@/hooks/useAuth';
import { DiscountBadge } from '@/components/DiscountBadge';
import { PriceWithDiscount } from '@/components/PriceWithDiscount';

import { customOrderTemplateService } from '@/services/customOrderTemplateService';
import type { CustomOrderTemplate, CustomOrderTemplateField } from '@/types/customOrders';
import { getTemplateImageUrl } from '@/utils/imageUtils';

// Field type icon mapping
const getFieldTypeIcon = (fieldType: string) => {
  switch (fieldType) {
    case 'TEXT':
      return FileText;
    case 'NUMBER':
      return Hash;
    case 'IMAGE':
      return ImageIcon;
    case 'VIDEO':
      return Video;
    default:
      return FileText;
  }
};

// Template Card Component
export function TemplateCard({ template }: { template: CustomOrderTemplate }) {
  const navigate = useNavigate();
  
  const sortedFields = useMemo(() => 
    customOrderTemplateService.sortFieldsBySortOrder(template.fields || []),
    [template.fields]
  );

  const primaryImage = getTemplateImageUrl(template.images);

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Card 
        className="group overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white rounded-xl cursor-pointer h-full"
        onClick={() => navigate(`/custom-orders/template/${template.id}`)}
      >
        <CardContent className="p-0 flex flex-col h-full">
          {/* Image */}
          <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
            {primaryImage ? (
              <img
                src={primaryImage}
                alt={template.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-june-bud/10 to-viridian-green/5">
                <Package className="h-12 w-12 text-eagle-green/30" />
              </div>
            )}
            
            {/* Discount Badge */}
            {template.activeDiscount && (
              <div className="absolute top-3 left-3">
                <DiscountBadge 
                  discount={template.activeDiscount} 
                  variant="compact" 
                  targetCurrency={template.price?.currencyCode || template.currencyCode || 'ETB'}
                />
              </div>
            )}
            
            {/* Price Badge */}
            <div className="absolute bottom-3 right-3 flex gap-2">
              {template.negotiable === false && (
                <Badge className="bg-viridian-green/90 text-white border-none font-medium backdrop-blur-sm">
                  Fixed Price
                </Badge>
              )}
              {template.activeDiscount ? (
                <div className="bg-gradient-to-r from-red-500 to-pink-500 px-3 py-1.5 rounded-lg backdrop-blur-sm shadow-md border border-red-500/70">
                  <PriceWithDiscount
                    originalPrice={template.price?.amount || 0}
                    currency={template.price?.currencyCode || template.currencyCode || 'ETB'}
                    discount={template.activeDiscount}
                    size="small"
                    theme="onRed"
                  />
                </div>
              ) : (
                <Badge className="bg-eagle-green/90 text-white border-none font-bold backdrop-blur-sm">
                  {template.negotiable === false ? '' : 'From '}{customOrderTemplateService.formatTemplatePrice(template)}
                </Badge>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-4 flex-1 flex flex-col">
            <h3 className="font-bold text-eagle-green text-lg mb-2 group-hover:text-viridian-green transition-colors line-clamp-2">
              {template.name}
            </h3>
            
            {template.description && (
              <p className="text-sm text-eagle-green/60 line-clamp-2 mb-3">
                {template.description}
              </p>
            )}

            {/* Customization Fields Preview */}
            {sortedFields.length > 0 && (
              <div className="mt-auto">
                <p className="text-xs text-eagle-green/50 mb-2">Customization options:</p>
                <div className="flex flex-wrap gap-1.5">
                  {sortedFields.slice(0, 4).map((field: CustomOrderTemplateField) => {
                    const IconComponent = getFieldTypeIcon(field.fieldType);
                    return (
                      <Badge 
                        key={field.id} 
                        variant="outline" 
                        className="text-xs bg-june-bud/10 border-june-bud/20 text-eagle-green/70"
                      >
                        <IconComponent className="h-3 w-3 mr-1" />
                        {field.fieldName}
                      </Badge>
                    );
                  })}
                  {sortedFields.length > 4 && (
                    <Badge variant="outline" className="text-xs bg-gray-100 border-gray-200 text-eagle-green/50">
                      +{sortedFields.length - 4} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function CustomOrderTemplates() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const { user, isInitialized } = useAuth();
  const [currentPage, setCurrentPage] = useState(0);
  const categoryIdNum = categoryId ? parseInt(categoryId) : 0;

  // Fetch templates for category - wait for auth so currency is correct
  const { data: templatesData, isLoading } = useQuery({
    queryKey: ['custom-order-templates', categoryIdNum, currentPage, user?.preferredCurrencyCode ?? 'default'],
    queryFn: () => customOrderTemplateService.getByCategory(categoryIdNum, currentPage, 20),
    enabled: categoryIdNum > 0 && isInitialized,
  });

  const templates = templatesData?.content || [];
  const totalPages = templatesData?.totalPages || 0;

  // Group templates by vendor
  const templatesByVendor = useMemo(() => {
    const grouped: { [vendorId: number]: { vendorName: string; templates: CustomOrderTemplate[] } } = {};
    
    templates.forEach((template: CustomOrderTemplate) => {
      if (!grouped[template.vendorId]) {
        grouped[template.vendorId] = {
          vendorName: template.vendorName,
          templates: []
        };
      }
      grouped[template.vendorId].templates.push(template);
    });
    
    return Object.values(grouped);
  }, [templates]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-light-cream to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-10 w-32 mb-8 bg-june-bud/20" />
          <Skeleton className="h-8 w-64 mb-6 bg-june-bud/20" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="overflow-hidden border-0 shadow-md bg-white rounded-xl">
                <CardContent className="p-0">
                  <Skeleton className="h-48 w-full bg-june-bud/10" />
                  <div className="p-4">
                    <Skeleton className="h-5 w-3/4 mb-2 bg-june-bud/20" />
                    <Skeleton className="h-4 w-full mb-3 bg-june-bud/20" />
                    <Skeleton className="h-4 w-1/2 bg-june-bud/20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-light-cream to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <FadeIn delay={0.1}>
          <Button
            variant="ghost"
            onClick={() => navigate('/custom-orders')}
            className="mb-6 text-eagle-green hover:text-viridian-green hover:bg-june-bud/10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Categories
          </Button>
        </FadeIn>

        {/* Header */}
        <FadeIn delay={0.2}>
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-eagle-green mb-2">
              Custom Order Templates
            </h1>
            <p className="font-light text-eagle-green/70">
              {templates.length} {templates.length === 1 ? 'template' : 'templates'} available
            </p>
          </div>
        </FadeIn>

        {templatesByVendor.length > 0 ? (
          <div className="space-y-12">
            {templatesByVendor.map((vendorGroup, vendorIndex) => (
              <FadeIn key={vendorGroup.vendorName} delay={0.1 * (vendorIndex + 1)}>
                <div>
                  {/* Vendor Header */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-viridian-green/10 rounded-lg">
                      <Store className="h-5 w-5 text-viridian-green" />
                    </div>
                    <div>
                      <h2 className="font-bold text-eagle-green text-xl">
                        {vendorGroup.vendorName}
                      </h2>
                      <p className="text-sm text-eagle-green/60">
                        {vendorGroup.templates.length} {vendorGroup.templates.length === 1 ? 'template' : 'templates'}
                      </p>
                    </div>
                  </div>

                  {/* Templates Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {vendorGroup.templates.map((template, index) => (
                      <motion.div
                        key={template.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <TemplateCard template={template} />
                      </motion.div>
                    ))}
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Package className="h-16 w-16 text-eagle-green/20 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-eagle-green mb-2">No Templates Available</h3>
            <p className="font-light text-eagle-green/60 mb-6">
              There are no approved templates in this category yet.
            </p>
            <Button
              onClick={() => navigate('/custom-orders')}
              className="bg-eagle-green hover:bg-viridian-green text-white"
            >
              Browse Other Categories
            </Button>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-12">
            <Button
              variant="outline"
              onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="border-eagle-green/30 text-eagle-green"
            >
              Previous
            </Button>
            <span className="flex items-center px-4 text-eagle-green/70">
              Page {currentPage + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
              className="border-eagle-green/30 text-eagle-green"
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
