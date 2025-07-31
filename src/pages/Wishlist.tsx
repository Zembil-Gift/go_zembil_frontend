import { useWishlist } from "@/hooks/useWishlist";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { WishlistButton } from "@/components/WishlistButton";
import { CartButton } from "@/components/CartButton";
import { Heart, ShoppingCart, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { LocalSeasonalProvider, useLocalSeasonalTheme } from "@/components/seasonal/LocalSeasonalTheme";
import { LocalSeasonalThemeSelector } from "@/components/seasonal/LocalSeasonalThemeSelector";
import { LocalSeasonalWishlistHeader, LocalSeasonalDecorations, LocalSeasonalProductBadge } from "@/components/seasonal/LocalSeasonalDecorations";

interface Product {
  id: number;
  name: string;
  price: string;
  images: string[];
  description: string;
  vendor: {
    name: string;
  };
}

interface WishlistItemWithProduct {
  id: number;
  productId: number;
  userId: string;
  createdAt: string;
  product: Product;
}

function WishlistContent() {
  const { isAuthenticated } = useAuth();
  const { wishlistItems, isLoading, getWishlistCount } = useWishlist();
  const { currentTheme, isSeasonalMode } = useLocalSeasonalTheme();

  // The wishlist API now returns products directly, no need for separate fetching
  const wishlistWithProducts = Array.isArray(wishlistItems) ? wishlistItems : [];

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Heart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Your Wishlist</h1>
            <p className="text-gray-600 mb-8">Sign in to save your favorite Ethiopian gifts</p>
            <Button asChild>
              <Link to="/signin?redirect=/wishlist">Sign In</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-ethiopian-gold mx-auto mb-4" />
            <p className="text-gray-600">Loading your wishlist...</p>
          </div>
        </div>
      </div>
    );
  }

  const hasItems = getWishlistCount() > 0;

  if (!hasItems) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Heart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Your Wishlist is Empty</h1>
            <p className="text-gray-600 mb-8">Start exploring our authentic Ethiopian gifts to add favorites here</p>
            <div className="space-x-4">
              <Button asChild>
                <Link to="/shop">Browse Gifts</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/occasions">Shop by Occasion</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 relative" style={{
      backgroundColor: isSeasonalMode && currentTheme.id !== 'default' ? currentTheme.colors.background : undefined
    }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Seasonal Theme Selector */}
        <LocalSeasonalThemeSelector />

        {/* Seasonal Header */}
        <LocalSeasonalWishlistHeader />

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3" style={{
                color: isSeasonalMode && currentTheme.id !== 'default' ? currentTheme.colors.text : undefined
              }}>
                <Heart className="h-8 w-8 text-red-500" />
                Your Wishlist
              </h1>
              <p className="mt-2" style={{
                color: isSeasonalMode && currentTheme.id !== 'default' ? currentTheme.colors.text : undefined,
                opacity: 0.8
              }}>
                {getWishlistCount()} {getWishlistCount() === 1 ? 'gift' : 'gifts'} saved for later
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link to="/shop">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Continue Shopping
              </Link>
            </Button>
          </div>
          <Separator className="mt-6" />
        </div>

        {/* Wishlist Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wishlistWithProducts.map((item: any) => {
            const product = item.product;
            
            if (!product) {
              return null; // Skip items without product data
            }
            
            return (
              <Card key={item.id || item.productId} className="group hover:shadow-lg transition-shadow duration-200 overflow-hidden relative">
                <LocalSeasonalProductBadge />
                <CardContent className="p-0">
                  {/* Product Image */}
                  <div className="relative aspect-square bg-gray-100">
                    {product?.images?.[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200">
                        <span className="text-gray-400">No Image</span>
                      </div>
                    )}
                    
                    {/* Wishlist Button */}
                    <div className="absolute top-3 right-3">
                      <WishlistButton 
                        productId={item.productId} 
                        size="default"
                        variant="secondary"
                        className="bg-white/90 hover:bg-white shadow-sm"
                      />
                    </div>

                    {/* Bestseller Badge */}
                    {product?.isBestSeller && (
                      <Badge className="absolute top-3 left-3 bg-yellow-500 text-yellow-900">
                        Bestseller
                      </Badge>
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="p-4">
                    <div className="space-y-3">
                      <div>
                        <h3 
                          className="font-semibold line-clamp-2"
                          style={{
                            color: isSeasonalMode && currentTheme.id !== 'default' 
                              ? currentTheme.colors.text 
                              : undefined
                          }}
                        >
                          {product?.name || `Product #${item.productId}`}
                        </h3>
                        {product?.vendor && (
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
                      
                      {product?.description && (
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
                          ${product?.price || 'N/A'}
                        </span>
                        {item.createdAt && (
                          <span 
                            className="text-xs"
                            style={{
                              color: isSeasonalMode && currentTheme.id !== 'default' 
                                ? currentTheme.colors.text + '60' 
                                : undefined
                            }}
                          >
                            Added {new Date(item.createdAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-4">
                      <CartButton 
                        productId={item.productId}
                        price={product?.price}
                        className="flex-1"
                      />
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/product/${item.productId}`}>View</Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="mt-12 text-center">
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Need help choosing?
            </h3>
            <div className="flex flex-wrap justify-center gap-4">
              <Button variant="outline" asChild>
                <Link to="/occasions">Shop by Occasion</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/custom-orders">Custom Orders</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/events">Gift Experiences</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Seasonal Decorations */}
      <LocalSeasonalDecorations position="wishlist" intensity="moderate" />
    </div>
  );
}

export default function Wishlist() {
  return (
    <LocalSeasonalProvider>
      <WishlistContent />
    </LocalSeasonalProvider>
  );
}