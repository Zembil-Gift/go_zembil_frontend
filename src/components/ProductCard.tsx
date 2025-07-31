import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, ShoppingCart, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/hooks/useCart";
import { useWishlist } from "@/hooks/useWishlist";
import { useToast } from "@/hooks/use-toast";

import { cn } from "@/lib/utils";
import { getPrimaryBadge } from "@/utils/productHelpers";

interface ProductCardProps {
  product: any;
  className?: string;
}

export default function ProductCard({ product, className }: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { toast } = useToast();
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  
  const price = parseFloat(product.price);
  const originalPrice = product.originalPrice ? parseFloat(product.originalPrice) : null;
  const discount = originalPrice ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;
  
  // Convert USD to ETB (approximate rate)
  const etbPrice = (price * 55).toFixed(0);
  
  // Get primary badge using centralized logic
  const primaryBadge = getPrimaryBadge(product);
  


  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    toggleWishlist(product.id);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    addToCart({ productId: product.id, quantity: 1 });
  };

  return (
    <Link to={`/product/${product.id}`} className={cn("block", className)}>
      <motion.div 
        className="bg-white rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.02, y: -2 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {/* Image Container with consistent aspect ratio */}
        <div className="relative aspect-square bg-gray-50 overflow-hidden">
          <img
            src={product.images?.[0] || '/api/placeholder/400/400'}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          
          {/* Action icons - show on hover */}
          <div className={cn(
            "absolute top-3 right-3 flex gap-2 transition-all duration-300",
            isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          )}>
            <Button
              size="sm"
              variant="secondary"
              className="h-8 w-8 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white shadow-lg"
              onClick={handleWishlistToggle}
            >
              <Heart 
                className={cn(
                  "h-4 w-4 transition-colors",
                  isInWishlist(product.id) ? "fill-red-500 text-red-500" : "text-gray-600"
                )}
              />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="h-8 w-8 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white shadow-lg"
              onClick={handleAddToCart}
            >
              <ShoppingCart className="h-4 w-4 text-gray-600" />
            </Button>
          </div>

          {/* Single Primary Badge */}
          {primaryBadge && (
            <div className="absolute top-3 left-3">
              <Badge variant={primaryBadge.variant} className="shadow-md">
                {primaryBadge.label}
              </Badge>
            </div>
          )}
        </div>

        {/* Product Information */}
        <div className="p-4 space-y-3">
          {/* Product name with fixed height to prevent misalignment */}
          <h3 className="text-sm font-medium text-gray-900 line-clamp-2 leading-5 min-h-[2.5rem] hover:text-ethiopian-gold transition-colors">
            {product.name}
          </h3>
          
          {/* Price section */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-gray-900">
                ${price.toFixed(2)}
              </span>
              {originalPrice && (
                <>
                  <span className="text-sm text-gray-400 line-through">
                    ${originalPrice.toFixed(2)}
                  </span>
                  {discount > 0 && (
                    <span className="text-xs text-red-500 font-medium">
                      -{discount}%
                    </span>
                  )}
                </>
              )}
            </div>
            
            {/* ETB conversion */}
            <div className="text-xs text-gray-500">
              ≈ {etbPrice} ETB
            </div>
          </div>

          {/* Delivery information */}
          <div className="flex items-center gap-1 text-xs text-gray-500 pt-1">
            <Truck className="w-3 h-3" />
            <span>{product.deliveryTime || "3-5 days delivery"}</span>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}