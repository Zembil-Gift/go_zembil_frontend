import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { WishlistButton } from '@/components/WishlistButton';
import { CartButton } from '@/components/CartButton';
import { useSeasonalTheme } from './SeasonalThemeProvider';
import { SeasonalProductBadge } from './SeasonalDecorations';

interface Product {
  id: number;
  name: string;
  price: string;
  images: string[];
  description: string;
  isBestSeller?: boolean;
  vendor?: {
    name: string;
  };
}

interface SeasonalProductCardProps {
  product: Product;
  wishlistItem?: {
    id: number;
    productId: number;
    createdAt: string;
  };
  showWishlistDate?: boolean;
  className?: string;
}

export function SeasonalProductCard({ 
  product, 
  wishlistItem, 
  showWishlistDate = false,
  className = "" 
}: SeasonalProductCardProps) {
  const { currentTheme, isSeasonalMode } = useSeasonalTheme();
  
  const cardStyle = isSeasonalMode && currentTheme.id !== 'default' ? {
    borderColor: currentTheme.colors.accent + '40',
    backgroundColor: currentTheme.colors.background,
  } : {};

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
    >
      <Card 
        className={`group hover:shadow-xl transition-all duration-300 overflow-hidden relative ${className}`}
        style={cardStyle}
      >
        <SeasonalProductBadge />
        
        <CardContent className="p-0">
          {/* Product Image */}
          <div className="relative aspect-square bg-gray-100 overflow-hidden">
            {product.images?.[0] ? (
              <motion.img
                src={product.images[0]}
                alt={product.name}
                className="w-full h-full object-cover"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.3 }}
              />
            ) : (
              <div 
                className="w-full h-full flex items-center justify-center"
                style={{
                  backgroundColor: isSeasonalMode && currentTheme.id !== 'default' 
                    ? currentTheme.colors.secondary + '20' 
                    : undefined
                }}
              >
                <span className="text-gray-400">No Image</span>
              </div>
            )}
            
            {/* Floating Action Buttons */}
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <WishlistButton 
                productId={product.id} 
                size="default"
                variant="secondary"
                className="bg-white/90 hover:bg-white shadow-lg backdrop-blur-sm"
              />
            </div>

            {/* Seasonal Overlay Effect */}
            {isSeasonalMode && currentTheme.id !== 'default' && (
              <div 
                className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none"
                style={{
                  background: `linear-gradient(135deg, ${currentTheme.colors.primary}40, ${currentTheme.colors.secondary}40)`,
                }}
              />
            )}

            {/* Traditional Badges */}
            <div className="absolute top-3 left-3 flex flex-col gap-1">
              {product.isBestSeller && (
                <Badge 
                  className="text-xs font-medium"
                  style={{
                    backgroundColor: isSeasonalMode && currentTheme.id !== 'default' 
                      ? currentTheme.colors.accent 
                      : undefined,
                    color: isSeasonalMode && currentTheme.id !== 'default' 
                      ? currentTheme.colors.background 
                      : undefined
                  }}
                >
                  Bestseller
                </Badge>
              )}
            </div>
          </div>

          {/* Product Details */}
          <div className="p-4 space-y-3">
            <div>
              <h3 
                className="font-semibold line-clamp-2 transition-colors duration-200"
                style={{
                  color: isSeasonalMode && currentTheme.id !== 'default' 
                    ? currentTheme.colors.text 
                    : undefined
                }}
              >
                {product.name}
              </h3>
              {product.vendor && (
                <p 
                  className="text-sm mt-1"
                  style={{
                    color: isSeasonalMode && currentTheme.id !== 'default' 
                      ? currentTheme.colors.text + '80' 
                      : undefined
                  }}
                >
                  by {product.vendor.name}
                </p>
              )}
            </div>
            
            {product.description && (
              <p 
                className="text-sm line-clamp-2"
                style={{
                  color: isSeasonalMode && currentTheme.id !== 'default' 
                    ? currentTheme.colors.text + 'CC' 
                    : undefined
                }}
              >
                {product.description}
              </p>
            )}
            
            <div className="flex items-center justify-between">
              <span 
                className="text-lg font-bold"
                style={{
                  color: isSeasonalMode && currentTheme.id !== 'default' 
                    ? currentTheme.colors.primary 
                    : undefined
                }}
              >
                ${product.price}
              </span>
              {showWishlistDate && wishlistItem?.createdAt && (
                <span 
                  className="text-xs"
                  style={{
                    color: isSeasonalMode && currentTheme.id !== 'default' 
                      ? currentTheme.colors.text + '60' 
                      : undefined
                  }}
                >
                  Added {new Date(wishlistItem.createdAt).toLocaleDateString()}
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <CartButton 
                productId={product.id}
                className="flex-1"
                style={{
                  backgroundColor: isSeasonalMode && currentTheme.id !== 'default' 
                    ? currentTheme.colors.primary 
                    : undefined,
                  borderColor: isSeasonalMode && currentTheme.id !== 'default' 
                    ? currentTheme.colors.primary 
                    : undefined,
                  color: isSeasonalMode && currentTheme.id !== 'default' 
                    ? currentTheme.colors.background 
                    : undefined
                }}
              />
            </div>
          </div>
        </CardContent>

        {/* Seasonal Border Effect */}
        {isSeasonalMode && currentTheme.id !== 'default' && (
          <div 
            className="absolute inset-0 rounded-lg pointer-events-none border-2 opacity-0 group-hover:opacity-30 transition-opacity duration-300"
            style={{
              borderColor: currentTheme.colors.accent,
            }}
          />
        )}
      </Card>
    </motion.div>
  );
}