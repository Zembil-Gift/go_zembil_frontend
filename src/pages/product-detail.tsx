import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useCartStore } from "@/stores/cart-store";
import { 
  Heart, 
  ChevronLeft,
  ChevronRight, 
  Plus, 
  Minus,
  Share2,
  Check,
  X,
  ZoomIn,
  Gift
} from "lucide-react";
import { Link } from "react-router-dom";
import { productService, Product, extractPriceAmount } from "@/services/productService";
import { cartService } from "@/services/cartService";
import { wishlistService } from "@/services/wishlistService";
import { reviewService } from "@/services/reviewService";
import { cn } from "@/lib/utils";
import { formatPrice, getPriceCurrency } from "@/lib/currency";
import { getProductImageUrl, getAllProductImages } from "@/utils/imageUtils";
import { ProductReviewsSection, VendorCard, CompactRating } from "@/components/reviews";
import { DiscountBadge } from "@/components/DiscountBadge";
import { PriceWithDiscount } from "@/components/PriceWithDiscount";

// Image with skeleton loading
function ProductImage({ 
  src, 
  alt, 
  className,
  onClick 
}: { 
  src: string; 
  alt: string; 
  className?: string;
  onClick?: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className="relative w-full h-full" onClick={onClick}>
      {!loaded && !error && (
        <div 
          className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer"
          style={{ backgroundSize: '200% 100%' }}
        />
      )}
      <img
        src={error ? '/placeholder-product.jpg' : src}
        alt={alt}
        className={cn(
          'transition-opacity duration-300',
          loaded ? 'opacity-100' : 'opacity-0',
          className
        )}
        onLoad={() => setLoaded(true)}
        onError={() => {
          setError(true);
          setLoaded(true);
        }}
      />
    </div>
  );
}

export default function ProductDetail() {
  const params = useParams();
  const navigate = useNavigate();
  const productId = params.id;
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [selectedSkuId, setSelectedSkuId] = useState<number | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  
  const { toast } = useToast();
  const { user, isInitialized, isAuthenticated } = useAuth();
  const { addItem, openCart } = useCartStore();
  const queryClient = useQueryClient();

  const { data: product, isLoading } = useQuery<Product>({
    queryKey: ["products", "detail", productId, user?.preferredCurrencyCode ?? "default"],
    queryFn: () => productService.getProductById(Number(productId)),
    enabled: !!productId && isInitialized,
  });

  // Auto-select first available SKU when product loads
  useEffect(() => {
    if (product?.productSku && product.productSku.length > 0 && selectedSkuId === null) {
      // Find first SKU with stock, or just the first SKU if none have stock
      const firstAvailableSku = product.productSku.find(sku => (sku.stockQuantity || 0) > 0);
      const skuToSelect = firstAvailableSku || product.productSku[0];
      if (skuToSelect?.id) {
        setSelectedSkuId(skuToSelect.id);
      }
    }
  }, [product, selectedSkuId]);

  const selectedSku = useMemo(() => {
    if (!product?.productSku || product.productSku.length === 0) return null;
    
    if (selectedSkuId) {
      return product.productSku.find(sku => sku.id === selectedSkuId) || null;
    }
    
    // Auto-select if there's only ONE SKU (it's the base product, not a variant choice)
    if (product.productSku.length === 1) {
      return product.productSku[0];
    }
    
    // For multiple SKUs, don't auto-select - let user choose
    return null;
  }, [product, selectedSkuId]);

  const currentPrice = useMemo(() => {
    if (selectedSku?.price) return extractPriceAmount(selectedSku.price);
    if (product?.productSku?.[0]?.price) return extractPriceAmount(product.productSku[0].price);
    return extractPriceAmount(product?.price);
  }, [selectedSku, product]);

  const currencyCode = useMemo(() => {
    if (selectedSku?.price?.currencyCode) return selectedSku.price.currencyCode;
    if (product?.productSku?.[0]?.price?.currencyCode) return product.productSku[0].price.currencyCode;
    return getPriceCurrency(product?.price);
  }, [selectedSku, product]);

  const stockQuantity = useMemo(() => {
    // For multi-SKU products, only show stock when a variant is selected
    const isMultiSku = product?.productSku && product.productSku.length > 1;
    if (isMultiSku && !selectedSkuId) return null;
    
    if (selectedSku?.stockQuantity !== undefined) return selectedSku.stockQuantity;
    return product?.stockQuantity || 0;
  }, [selectedSku, selectedSkuId, product]);

  // Ensure quantity does not exceed stock
  useEffect(() => {
    if (stockQuantity !== null && stockQuantity > 0 && quantity > stockQuantity) {
      setQuantity(stockQuantity);
    }
  }, [stockQuantity, quantity]);

  useMemo(() => {
    if (!product?.productSku) return {};

    const attributes: Record<string, Set<string>> = {};

    product.productSku.forEach(sku => {
      sku.attributes?.forEach(attr => {
        if (!attributes[attr.name]) {
          attributes[attr.name] = new Set();
        }
        attributes[attr.name].add(attr.value);
      });
    });

    const result: Record<string, string[]> = {};
    Object.entries(attributes).forEach(([name, values]) => {
      result[name] = Array.from(values);
    });

    return result;
  }, [product]);
// Show product images by default.
  // Only show SKU images when user explicitly selects a variant (for multi-SKU products).
  // For single-SKU products, show SKU images if available (since the SKU IS the product).
  const images = useMemo(() => {
    const isMultiSku = product?.productSku && product.productSku.length > 1;
    const userSelectedVariant = selectedSkuId !== null;
    
    // Show SKU images if: single SKU product OR user explicitly selected a variant
    if ((!isMultiSku || userSelectedVariant) && selectedSku?.images && selectedSku.images.length > 0) {
      return selectedSku.images
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(img => img.fullUrl);
    }
    
    return getAllProductImages(product?.images);
  }, [selectedSkuId, selectedSku, product?.productSku, product?.images]);
  
  // Use images if available, otherwise empty array (no fallback)
  const displayImages = useMemo(() => {
    return images.length > 0 ? images : [];
  }, [images]);

  const { data: ratingSummary } = useQuery({
    queryKey: ["product-rating-summary", productId],
    queryFn: () => reviewService.getProductRatingSummary(Number(productId)),
    enabled: !!productId,
  });

  const { data: vendorProfile } = useQuery({
    queryKey: ["vendor-profile-by-user", product?.vendorId],
    queryFn: () => {
      if (!product?.vendorId) return null;
      return reviewService.getVendorPublicProfileByUserId(product.vendorId);
    },
    enabled: !!product?.vendorId,
  });

  const wishlistMutation = useMutation({
    mutationFn: async () => {
      if (isWishlisted) {
        return await wishlistService.removeProductFromWishlist(Number(productId));
      } else {
        return await wishlistService.addToWishlist({ productId: Number(productId) });
      }
    },
    onSuccess: () => {
      setIsWishlisted(!isWishlisted);
      toast({
        title: isWishlisted ? "Removed from wishlist" : "Added to wishlist",
        description: isWishlisted 
          ? "Item removed from your wishlist" 
          : "Item added to your wishlist",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update wishlist",
        variant: "destructive",
      });
    },
  });

  const addToCartMutation = useMutation({
    mutationFn: async () => {
      if (!isAuthenticated) {
        throw new Error('Authentication required');
      }

      // Require variant selection for products with multiple SKUs
      if (product?.productSku && product.productSku.length > 1 && !selectedSkuId) {
        throw new Error('Please select a variant');
      }
      
      return await cartService.addToCart({
        productId: Number(productId),
        productSkuId: selectedSku?.id,
        quantity,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart', 'items'] });
      addItem({
        productId: Number(productId),
        name: product?.name || "",
        price: currentPrice,
        image: getProductImageUrl(product?.images, product?.cover),
        quantity,
        stockQuantity: stockQuantity || undefined,
        skuId: selectedSku?.id,
        skuCode: selectedSku?.skuCode,
        skuName: selectedSku?.skuName,
      });
      
      toast({
        title: "Added to cart",
        description: `${product?.name} added to your cart`,
      });
      openCart();
    },
    onError: (error: any) => {
      if (error?.message === 'Authentication required') {
        const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
        navigate(`/signin?returnUrl=${returnUrl}`);
        return;
      }

      toast({
        title: "Error",
        description: error?.message || "Failed to add item to cart",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="aspect-square bg-gray-200 rounded-lg"></div>
              <div className="space-y-4">
                <div className="h-8 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                <div className="h-12 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
        
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50">
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Product not found</h1>
            <Link to="/gifts">
              <Button className="bg-viridian-green hover:bg-viridian-green/90">
                Browse All Gifts
              </Button>
            </Link>
          </div>
        </div>
        
      </div>
    );
  }


  const nextImage = () => {
    if (displayImages.length === 0) return;
    setSelectedImageIndex((prev) => (prev + 1) % displayImages.length);
  };

  const prevImage = () => {
    if (displayImages.length === 0) return;
    setSelectedImageIndex((prev) => (prev - 1 + displayImages.length) % displayImages.length);
  };

  const openLightbox = (index: number) => {
    setSelectedImageIndex(index);
    setLightboxOpen(true);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: product.description,
          url: window.location.href,
        });
      } catch (err) {
        console.log("Error sharing:", err);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied",
        description: "Product link copied to clipboard",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Lightbox Modal */}
      <AnimatePresence>
        {lightboxOpen && displayImages.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
            onClick={() => setLightboxOpen(false)}
          >
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-50"
            >
              <X className="h-8 w-8" />
            </button>
            
            {displayImages.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); prevImage(); }}
                  className="absolute left-4 text-white hover:text-gray-300 z-50 p-2 bg-black/50 rounded-full"
                >
                  <ChevronLeft className="h-8 w-8" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); nextImage(); }}
                  className="absolute right-4 text-white hover:text-gray-300 z-50 p-2 bg-black/50 rounded-full"
                >
                  <ChevronRight className="h-8 w-8" />
                </button>
              </>
            )}
            
            <motion.img
              key={selectedImageIndex}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              src={displayImages[selectedImageIndex]}
              alt={`${product.name} - Image ${selectedImageIndex + 1}`}
              className="max-h-[90vh] max-w-[90vw] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            
            {displayImages.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white font-light">
                {selectedImageIndex + 1} / {displayImages.length}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-8">
          <Link to="/" className="hover:text-viridian-green">Home</Link>
          <span>/</span>
          <Link to="/gifts" className="hover:text-viridian-green">Gifts</Link>
          {product.subCategoryName && (
            <>
              <span>/</span>
              <Link 
                to={`/gifts?category=${product.subCategorySlug || product.subCategoryId}`} 
                className="hover:text-viridian-green"
              >
                {product.subCategoryName}
              </Link>
            </>
          )}
          <span>/</span>
          <span className="text-charcoal font-medium">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Product Images */}
          <div className="space-y-4">
            {displayImages.length > 0 ? (
              <>
                {/* Main Image */}
                <div 
                  className="relative aspect-square bg-white rounded-2xl overflow-hidden shadow-lg cursor-pointer group"
                  onClick={() => openLightbox(selectedImageIndex)}
                >
                  <ProductImage
                    src={displayImages[selectedImageIndex]}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center pointer-events-none">
                    <ZoomIn className="h-12 w-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  
                  {/* Navigation arrows */}
                  {displayImages.length > 1 && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); prevImage(); }}
                        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 hover:bg-white rounded-full shadow-lg transition-all opacity-0 group-hover:opacity-100"
                      >
                        <ChevronLeft className="h-5 w-5 text-charcoal" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); nextImage(); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 hover:bg-white rounded-full shadow-lg transition-all opacity-0 group-hover:opacity-100"
                      >
                        <ChevronRight className="h-5 w-5 text-charcoal" />
                      </button>
                    </>
                  )}
                  
                  {/* Image counter */}
                  {displayImages.length > 1 && (
                    <div className="absolute bottom-4 left-4">
                      <Badge className="bg-black/60 text-white border-none font-light">
                        {selectedImageIndex + 1} / {displayImages.length}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Thumbnail Images */}
                {displayImages.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {displayImages.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImageIndex(index)}
                        className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                          index === selectedImageIndex
                            ? "border-viridian-green ring-2 ring-viridian-green/30"
                            : "border-transparent hover:border-gray-300"
                        }`}
                      >
                        <ProductImage
                          src={image}
                          alt={`${product.name} thumbnail ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              /* No Image Available */
              <div className="aspect-square bg-gray-100 rounded-2xl flex items-center justify-center shadow-lg">
                <div className="text-center text-gray-400">
                  <p className="text-sm">No image available</p>
                </div>
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Title and Rating */}
            <div>
              {product.subCategoryName && (
                <div className="text-sm font-medium text-viridian-green uppercase tracking-wider mb-2">
                  {product.subCategoryName}
                </div>
              )}
              <h1 className="text-3xl font-bold text-charcoal mb-4">
                {product.name}
              </h1>
              
              {/* Rating from API */}
              {ratingSummary && ratingSummary.totalReviews > 0 ? (
                <div className="flex items-center space-x-2 mb-4">
                  <CompactRating 
                    rating={ratingSummary.averageRating} 
                    reviewCount={ratingSummary.totalReviews}
                    size="md"
                  />
                </div>
              ) : (
                <p className="text-sm text-gray-500 mb-4">No reviews yet</p>
              )}

              {/* Badges */}
              <div className="flex flex-wrap gap-2 mb-4">
                {product.isFeatured && (
                  <Badge className="bg-viridian-green text-white">Featured</Badge>
                )}
                {product.isTrending && (
                  <Badge className="bg-sunset-orange text-white">Trending</Badge>
                )}
                {stockQuantity !== null && stockQuantity > 0 && stockQuantity <= 5 && (
                  <Badge variant="outline" className="border-orange-500 text-orange-500">
                    Only {stockQuantity} left
                  </Badge>
                )}
              </div>

              {/* Product Tags */}
              {product.tags && product.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {product.tags.map((tag: string, index: number) => (
                    <Badge 
                      key={index} 
                      variant="secondary" 
                      className="text-xs font-normal"
                    >
                      #{tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Price */}
            <div className="space-y-2">
              {product.activeDiscount && (
                <div>
                  <DiscountBadge 
                    discount={product.activeDiscount} 
                    variant="compact" 
                    size="small" 
                    targetCurrency={currencyCode}
                  />
                </div>
              )}
              <PriceWithDiscount
                originalPrice={currentPrice}
                currency={currencyCode}
                discount={product.activeDiscount}
                size="large"
              />
              {stockQuantity === null ? (
                <div className="text-sm text-gray-500">
                  Select a variant to see availability
                </div>
              ) : stockQuantity > 0 ? (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <Check className="h-4 w-4" />
                  <span>In Stock ({stockQuantity} available)</span>
                </div>
              ) : (
                <div className="text-sm text-red-500">Out of Stock</div>
              )}
            </div>

            {product.productSku && product.productSku.length > 1 && (
              <div className="space-y-4 pt-4 border-t border-gray-200">
                <h3 className="font-semibold text-charcoal">
                  Select Variant <span className="text-red-500">*</span>
                </h3>
                
                <div className="grid grid-cols-1 gap-3">
                  {product.productSku.map((sku) => (
                    <button
                      key={sku.id}
                      onClick={() => setSelectedSkuId(sku.id || null)}
                      disabled={(sku.stockQuantity || 0) === 0}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border-2 transition-all text-left",
                        selectedSku?.id === sku.id
                          ? "border-viridian-green bg-viridian-green/5"
                          : "border-gray-200 hover:border-gray-300",
                        (sku.stockQuantity || 0) === 0 && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                          selectedSku?.id === sku.id
                            ? "border-viridian-green"
                            : "border-gray-300"
                        )}>
                          {selectedSku?.id === sku.id && (
                            <div className="w-3 h-3 rounded-full bg-viridian-green" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{sku.skuName}</div>
                          {sku.attributes && sku.attributes.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-1">
                              {sku.attributes.map((attr, idx) => (
                                <span key={idx} className="text-xs text-gray-500">
                                  {attr.name}: <span className="font-medium">{attr.value}</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-viridian-green">
                          {formatPrice(extractPriceAmount(sku.price), sku.price?.currencyCode || currencyCode)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {(sku.stockQuantity || 0) > 0 
                            ? `${sku.stockQuantity} in stock` 
                            : "Out of stock"}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Single SKU Info */}
            {product.productSku && product.productSku.length === 1 && selectedSku?.attributes && selectedSku.attributes.length > 0 && (
              <div className="space-y-2 pt-4 border-t border-gray-200">
                <h3 className="font-semibold text-charcoal">Product Details</h3>
                <div className="flex flex-wrap gap-4">
                  {selectedSku.attributes.map((attr, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">{attr.name}:</span>
                      <Badge variant="outline">{attr.value}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {product.description && (
              <div>
                <h3 className="font-semibold text-charcoal mb-2">Description</h3>
                <p className="text-gray-600 leading-relaxed">{product.description}</p>
              </div>
            )}

            {/* Quantity Selector */}
            <div className="space-y-2">
              <label className="font-semibold text-charcoal">Quantity</label>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="h-10 w-10 p-0"
                  >
                    <Minus size={16} />
                  </Button>
                  <span className="text-lg font-medium w-12 text-center">{quantity}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setQuantity(quantity + 1)}
                    disabled={stockQuantity !== null && quantity >= stockQuantity}
                    className="h-10 w-10 p-0"
                  >
                    <Plus size={16} />
                  </Button>
                </div>
              </div>
            </div>

            {/* Gift wrapping info - selection happens at checkout */}
            {product.giftWrappable && (
              <div className="flex items-center gap-2 p-3 border border-dashed border-viridian-green/30 rounded-lg bg-viridian-green/5">
                <Gift className="h-4 w-4 text-viridian-green flex-shrink-0" />
                <span className="text-sm text-charcoal">
                  Gift wrapping available
                  {(product.giftWrapCustomerPrice || product.giftWrapPrice) && (product.giftWrapCustomerPrice || product.giftWrapPrice)! > 0 ? (
                    <span className="text-viridian-green font-semibold ml-1">
                      (+{formatPrice(product.giftWrapCustomerPrice || product.giftWrapPrice!, product.giftWrapCurrencyCode || currencyCode)})
                    </span>
                  ) : (
                    <span className="text-green-600 font-medium ml-1">— Free</span>
                  )}
                  <span className="text-muted-foreground ml-1">· Select at checkout</span>
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-4">
              <div className="flex space-x-4">
                <Button
                  onClick={() => addToCartMutation.mutate()}
                  disabled={addToCartMutation.isPending || stockQuantity === 0 || stockQuantity === null}
                  className="flex-1 bg-viridian-green hover:bg-viridian-green/90 text-white h-12"
                >
                  {addToCartMutation.isPending 
                    ? "Adding..." 
                    : stockQuantity === 0 
                      ? "Out of Stock"
                      : product?.productSku && product.productSku.length > 1 && !selectedSkuId
                        ? "Select a Variant First"
                        : "Add to Cart"}
                </Button>
                <Button
                  onClick={() => {
                    if (!isAuthenticated) {
                      const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
                      navigate(`/signin?returnUrl=${returnUrl}`);
                      return;
                    }

                    wishlistMutation.mutate();
                  }}
                  disabled={wishlistMutation.isPending}
                  variant="outline"
                  className="h-12 px-6 border-viridian-green text-viridian-green hover:bg-viridian-green hover:text-white"
                >
                  <Heart size={20} className={isWishlisted ? "fill-current" : ""} />
                </Button>
                <Button
                  onClick={handleShare}
                  variant="outline"
                  className="h-12 px-6"
                >
                  <Share2 size={20} />
                </Button>
              </div>

              <Button
                onClick={async () => {
                  // Check variant selection first for multi-SKU products
                  if (product?.productSku && product.productSku.length > 1 && !selectedSkuId) {
                    toast({
                      title: "Please select a variant",
                      description: "Choose a product variant before proceeding",
                      variant: "destructive",
                    });
                    return;
                  }
                  
                  if (stockQuantity === 0 || stockQuantity === null) {
                    toast({
                      title: "Out of stock",
                      description: "This item is currently unavailable",
                      variant: "destructive",
                    });
                    return;
                  }

                  try {
                    await addToCartMutation.mutateAsync();
                    navigate("/checkout");
                  } catch (error) {
                    console.error('Failed to add to cart:', error);
                  }
                }}
                disabled={addToCartMutation.isPending || stockQuantity === 0 || stockQuantity === null}
                variant="outline"
                className="w-full h-12 border-deep-forest text-deep-forest hover:bg-deep-forest hover:text-white"
              >
                {addToCartMutation.isPending ? "Processing..." : "Buy Now"}
              </Button>
            </div>

            {/* Delivery Info */}
            {/* <div className="space-y-3 pt-6 border-t border-gray-200">
              <div className="flex items-center space-x-3">
                <Shield className="text-viridian-green" size={20} />
                <span className="text-gray-600">Quality guarantee & authentic products</span>
              </div>
              <div className="flex items-center space-x-3">
                <MessageCircle className="text-viridian-green" size={20} />
                <span className="text-gray-600">Add personal video message (+50 ETB)</span>
              </div>
            </div> */}
          </div>
        </div>

        {/* Vendor Section */}
        {vendorProfile && (
          <div className="mt-8">
            <h3 className="font-semibold text-lg text-charcoal mb-4">Sold by</h3>
            <VendorCard vendor={vendorProfile} />
          </div>
        )}

        {/* Product Details Tabs */}
        <div className="mt-16">
          <Tabs defaultValue="reviews" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="reviews">
                Reviews
                {ratingSummary && ratingSummary.totalReviews > 0 && (
                  <span className="ml-1 text-xs">({ratingSummary.totalReviews})</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="details">Product Details</TabsTrigger>
              <TabsTrigger value="shipping">Shipping & Returns</TabsTrigger>
            </TabsList>
            
            <TabsContent value="reviews" className="space-y-6 mt-6">
              <ProductReviewsSection productId={Number(productId)} />
            </TabsContent>
            
            <TabsContent value="details" className="space-y-6">
              <div className="bg-white rounded-lg p-6">
                <h3 className="font-semibold text-lg mb-4">Product Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedSku?.skuName && (
                    <div>
                      <span className="font-medium">Variant:</span>
                      <span className="ml-2 text-gray-600">{selectedSku.skuName}</span>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
            
            {/* <TabsContent value="shipping" className="space-y-6">
              <div className="bg-white rounded-lg p-6">
                <h3 className="font-semibold text-lg mb-4">Shipping & Returns</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Delivery Options</h4>
                    <ul className="space-y-1 text-gray-600">
                      <li>• Standard delivery: 3-5 business days (Free in Addis Ababa)</li>
                      <li>• Express delivery: 1-2 business days (+100 ETB)</li>
                      <li>• Influencer delivery: Special unboxing experience (+200 ETB)</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Return Policy</h4>
                    <p className="text-gray-600">
                      30-day return policy for unopened items. Custom and personalized items are non-returnable.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent> */}
          </Tabs>
        </div>
      </div>

      
    </div>
  );
}
