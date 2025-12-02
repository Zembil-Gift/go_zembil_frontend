import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useCartStore } from "@/stores/cart-store";
import { 
  Heart, 
  Star, 
  Truck, 
  Shield, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Minus,
  Share2,
  MessageCircle,
  Check
} from "lucide-react";
import { Link } from "react-router-dom";
import { productService, Product, extractPriceAmount } from "@/services/productService";
import { cartService } from "@/services/cartService";
import { wishlistService } from "@/services/wishlistService";
import { cn } from "@/lib/utils";

export default function ProductDetail() {
  const params = useParams();
  const productId = params.id;
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [selectedSkuId, setSelectedSkuId] = useState<number | null>(null);
  
  const { toast } = useToast();
  const { addItem, openCart } = useCartStore();
  const queryClient = useQueryClient();

  const { data: product, isLoading } = useQuery<Product>({
    queryKey: ["products", "detail", productId],
    queryFn: () => productService.getProductById(Number(productId)),
    enabled: !!productId,
  });

  const selectedSku = useMemo(() => {
    if (!product?.productSku || product.productSku.length === 0) return null;
    
    if (selectedSkuId) {
      return product.productSku.find(sku => sku.id === selectedSkuId) || product.productSku[0];
    }
    return product.productSku[0];
  }, [product, selectedSkuId]);

  const currentPrice = useMemo(() => {
    if (selectedSku?.price) return extractPriceAmount(selectedSku.price);
    if (product?.productSku?.[0]?.price) return extractPriceAmount(product.productSku[0].price);
    return extractPriceAmount(product?.price);
  }, [selectedSku, product]);

  const stockQuantity = useMemo(() => {
    if (selectedSku?.stockQuantity !== undefined) return selectedSku.stockQuantity;
    return product?.stockQuantity || 0;
  }, [selectedSku, product]);

  const skuAttributes = useMemo(() => {
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

  const { data: reviews = [] } = useQuery({
    queryKey: ["products", productId, "reviews"],
    queryFn: () => [], // Reviews API not implemented yet - return empty for now
    enabled: !!productId,
  });

  const wishlistMutation = useMutation({
    mutationFn: async () => {
      if (isWishlisted) {
        return await wishlistService.removeProductFromWishlist(Number(productId));
      } else {
        return await wishlistService.addToWishlist(Number(productId));
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
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update wishlist",
        variant: "destructive",
      });
    },
  });

  const addToCartMutation = useMutation({
    mutationFn: async () => {
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
        image: product?.cover || "",
        quantity,
        skuId: selectedSku?.id,
        skuCode: selectedSku?.skuCode,
      });
      
      toast({
        title: "Added to cart",
        description: `${product?.name} added to your cart`,
      });
      openCart();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add item to cart",
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

  const images = product.cover
    ? [product.cover] 
    : ["https://images.unsplash.com/photo-1447933601403-0c6688de566e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"];

  const nextImage = () => {
    setSelectedImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setSelectedImageIndex((prev) => (prev - 1 + images.length) % images.length);
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
      

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-8">
          <Link to="/" className="hover:text-viridian-green">Home</Link>
          <span>/</span>
          <Link to="/gifts" className="hover:text-viridian-green">Gifts</Link>
          <span>/</span>
          <span className="text-charcoal font-medium">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Product Images */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative aspect-square bg-white rounded-2xl overflow-hidden shadow-lg">
              <img
                src={images[selectedImageIndex]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              {images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow-lg transition-colors"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow-lg transition-colors"
                  >
                    <ChevronRight size={20} />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail Images */}
            {images.length > 1 && (
              <div className="flex space-x-2 overflow-x-auto">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                     className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                      selectedImageIndex === index
                        ? "border-viridian-green"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${product.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Title and Rating */}
            <div>
              <h1 className="font-display text-3xl font-bold text-charcoal mb-4">
                {product.name}
              </h1>
              
              {product.rating && product.reviewCount && (
                <div className="flex items-center space-x-2 mb-4">
                  <div className="flex items-center">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={16}
                        className={`${
                          i < Math.floor(parseFloat(product.rating))
                            ? "text-viridian-green fill-viridian-green"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-600">
                    {parseFloat(product.rating).toFixed(1)} ({product.reviewCount} reviews)
                  </span>
                </div>
              )}

              {/* Badges */}
              <div className="flex flex-wrap gap-2 mb-4">
                {product.salesCount && product.salesCount > 50 && (
                  <Badge className="bg-viridian-green text-white">Bestseller</Badge>
                )}
                {product.tags?.includes("handmade") && (
                  <Badge className="bg-warm-red text-white">Handmade</Badge>
                )}
                {product.tags?.includes("authentic") && (
                  <Badge className="bg-sunset-orange text-white">Authentic</Badge>
                )}
                {stockQuantity > 0 && stockQuantity <= 5 && (
                  <Badge variant="outline\" className="border-orange-500 text-orange-500">
                    Only {stockQuantity} left
                  </Badge>
                )}
              </div>
            </div>

            {/* Price */}
            <div className="space-y-2">
              <div className="text-3xl font-bold text-viridian-green">
                ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-sm text-gray-500">
                ≈ {(currentPrice * 55).toLocaleString()} ETB
              </div>
              {stockQuantity > 0 ? (
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
                <h3 className="font-semibold text-charcoal">Select Variant</h3>
                
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
                          <div className="font-medium text-sm">{sku.skuCode}</div>
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
                          ${extractPriceAmount(sku.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                    className="h-10 w-10 p-0"
                  >
                    <Plus size={16} />
                  </Button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-4">
              <div className="flex space-x-4">
                <Button
                  onClick={() => addToCartMutation.mutate()}
                  disabled={addToCartMutation.isPending}
                  className="flex-1 bg-viridian-green hover:bg-viridian-green/90 text-white h-12"
                >
                  {addToCartMutation.isPending ? "Adding..." : "Add to Cart"}
                </Button>
                <Button
                  onClick={() => wishlistMutation.mutate()}
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
                onClick={() => {
                  addToCartMutation.mutate();
                  // Navigate to checkout after adding to cart
                  setTimeout(() => {
                    window.location.href = "/checkout";
                  }, 1000);
                }}
                variant="outline"
                className="w-full h-12 border-deep-forest text-deep-forest hover:bg-deep-forest hover:text-white"
              >
                Buy Now
              </Button>
            </div>

            {/* Delivery Info */}
            <div className="space-y-3 pt-6 border-t border-gray-200">
              <div className="flex items-center space-x-3">
                <Truck className="text-viridian-green" size={20} />
                <span className="text-gray-600">
                  {product.deliveryDays || 3} days delivery in Addis Ababa
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <Shield className="text-viridian-green" size={20} />
                <span className="text-gray-600">Quality guarantee & authentic products</span>
              </div>
              <div className="flex items-center space-x-3">
                <MessageCircle className="text-viridian-green" size={20} />
                <span className="text-gray-600">Add personal video message (+50 ETB)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Product Details Tabs */}
        <div className="mt-16">
          <Tabs defaultValue="reviews" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
              <TabsTrigger value="details">Product Details</TabsTrigger>
              <TabsTrigger value="shipping">Shipping & Returns</TabsTrigger>
            </TabsList>
            
            <TabsContent value="reviews" className="space-y-6">
              <div className="bg-white rounded-lg p-6">
                <h3 className="font-semibold text-lg mb-4">Customer Reviews</h3>
                {reviews.length > 0 ? (
                  <div className="space-y-4">
                    {reviews.map((review: any) => (
                      <div key={review.id} className="border-b border-gray-200 pb-4 last:border-b-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="flex">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                size={14}
                                className={`${
                                  i < review.rating
                                    ? "text-viridian-green fill-viridian-green"
                                    : "text-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="font-medium">{review.title}</span>
                        </div>
                        <p className="text-gray-600">{review.content}</p>
                        <p className="text-sm text-gray-500 mt-2">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No reviews yet. Be the first to review this product!</p>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="details" className="space-y-6">
              <div className="bg-white rounded-lg p-6">
                <h3 className="font-semibold text-lg mb-4">Product Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium">SKU:</span>
                    <span className="ml-2 text-gray-600">{product.sku || "N/A"}</span>
                  </div>
                  <div>
                    <span className="font-medium">Weight:</span>
                    <span className="ml-2 text-gray-600">{product.weight || "N/A"} kg</span>
                  </div>
                  <div>
                    <span className="font-medium">Delivery Time:</span>
                    <span className="ml-2 text-gray-600">{product.deliveryDays || 3} days</span>
                  </div>
                  <div>
                    <span className="font-medium">Customizable:</span>
                    <span className="ml-2 text-gray-600">
                      {product.isCustomizable ? "Yes" : "No"}
                    </span>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="shipping" className="space-y-6">
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
            </TabsContent>
          </Tabs>
        </div>
      </div>

      
    </div>
  );
}
