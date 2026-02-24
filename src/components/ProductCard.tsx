import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, ShoppingCart, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/hooks/useCart";
import { useWishlist } from "@/hooks/useWishlist";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

import { cn } from "@/lib/utils";
import { getPrimaryBadge } from "@/utils/productHelpers";
import { extractPriceAmount, Price } from "@/services/productService";
import { formatPriceFromDto, formatPrice, getPriceAmount, getPriceCurrency, PriceData } from "@/lib/currency";
import { getProductImageUrl } from "@/utils/imageUtils";
import { DiscountBadge } from "@/components/DiscountBadge";
import { PriceWithDiscount } from "@/components/PriceWithDiscount";

interface ProductCardProps {
  product: any;
  className?: string;
}

export default function ProductCard({ product, className }: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  
  // Get the best price object from SKUs or product
  const getProductPriceObject = (): PriceData | null => {
    if (product.productSku && product.productSku.length > 0) {
      // Find SKU with lowest price
      let lowestPrice: PriceData | null = null;
      let lowestAmount = Infinity;
      
      for (const sku of product.productSku) {
        const amount = getPriceAmount(sku.price);
        if (amount > 0 && amount < lowestAmount) {
          lowestAmount = amount;
          lowestPrice = sku.price;
        }
      }
      
      if (lowestPrice) return lowestPrice;
    }
    return product.price || null;
  };

  const getProductPrice = () => {
    if (product.productSku && product.productSku.length > 0) {
      const prices = product.productSku
        .map((sku: any) => extractPriceAmount(sku.price))
        .filter((p: number) => p > 0);
      if (prices.length > 0) {
        return Math.min(...prices);
      }
    }
    return extractPriceAmount(product.price);
  };

  const isInStock = () => {
    if (product.productSku && product.productSku.length > 0) {
      return product.productSku.some((sku: any) => (sku.stockQuantity || 0) > 0);
    }
    return product.stockQuantity !== 0;
  };

  const getTotalStock = () => {
    if (product.productSku && product.productSku.length > 0) {
      return product.productSku.reduce((total: number, sku: any) => total + (sku.stockQuantity || 0), 0);
    }
    return product.stockQuantity || 0;
  };
  
  const priceObject = getProductPriceObject();
  const price = getProductPrice();
  const inStock = isInStock();
  
  // Format price using currency from price data
  const formattedPrice = formatPriceFromDto(priceObject);
  const currencyCode = getPriceCurrency(priceObject);
  
  const primaryBadge = getPrimaryBadge(product);
  


  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    toggleWishlist(product.id);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) {
      const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
      navigate(`/signin?returnUrl=${returnUrl}`);
      return;
    }
    
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
            src={getProductImageUrl(product.images, product.cover)}
            alt={product.name}
            className={cn(
              "w-full h-full object-cover transition-transform duration-300 group-hover:scale-105",
              !inStock && "opacity-60"
            )}
          />
          
          {!inStock && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                Out of Stock
              </span>
            </div>
          )}
          
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
          {/* Subcategory */}
          {product.subCategoryName && (
            <span className="text-xs font-medium text-viridian-green uppercase tracking-wide">
              {product.subCategoryName}
            </span>
          )}

          {/* Product name with fixed height to prevent misalignment */}
          <h3 className="text-sm font-medium text-gray-900 line-clamp-2 leading-5 min-h-[2.5rem] hover:text-ethiopian-gold transition-colors">
            {product.name}
          </h3>
          
          {/* Price section */}
          <div className="space-y-1">
            {product.activeDiscount && (
              <div className="mb-1">
                <DiscountBadge 
                  discount={product.activeDiscount} 
                  size="small" 
                  variant="compact" 
                  targetCurrency={currencyCode}
                />
              </div>
            )}
            <PriceWithDiscount
              originalPrice={price}
              currency={currencyCode}
              discount={product.activeDiscount}
              size="small"
              showSavings={false}
            />
          </div>

          {/* SKU variants info */}
          {product.productSku && product.productSku.length > 1 && (
            <div className="text-xs text-gray-500">
              {product.productSku.length} variants available
            </div>
          )}

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