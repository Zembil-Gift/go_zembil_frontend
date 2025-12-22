import { useWishlist } from "@/hooks/useWishlist";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { WishlistButton } from "@/components/WishlistButton";
import { Heart, ShoppingCart, Loader2, Trash2, AlertCircle, Check, Package } from "lucide-react";
import { Link } from "react-router-dom";
import { LocalSeasonalProvider, useLocalSeasonalTheme } from "@/components/seasonal/LocalSeasonalTheme";
import { LocalSeasonalThemeSelector } from "@/components/seasonal/LocalSeasonalThemeSelector";
import { LocalSeasonalWishlistHeader, LocalSeasonalDecorations, LocalSeasonalProductBadge } from "@/components/seasonal/LocalSeasonalDecorations";
import { formatPrice } from "@/lib/currency";
import { WishListItemDto } from "@/services/wishlistService";
import { getSkuImageUrl } from "@/utils/imageUtils";
import { useState } from "react";

function WishlistContent() {
  const { isAuthenticated } = useAuth();
  const { 
    wishlistItems, 
    isLoading, 
    getWishlistCount,
    moveToCart,
    batchMoveToCart,
    batchDelete,
    clearWishlist,
    isMovingToCart,
    isBatchMovingToCart,
    isBatchDeleting,
    isClearingWishlist
  } = useWishlist();
  const { currentTheme, isSeasonalMode } = useLocalSeasonalTheme();
  const [selectedItems, setSelectedItems] = useState<number[]>([]);

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
          <div className="flex items-center justify-between flex-wrap gap-4">
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
            <div className="flex gap-2 flex-wrap">
              {selectedItems.length > 0 && (
                <>
                  <Button 
                    variant="default"
                    onClick={() => batchMoveToCart({ wishListItemIds: selectedItems })}
                    disabled={isBatchMovingToCart}
                  >
                    {isBatchMovingToCart ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ShoppingCart className="h-4 w-4 mr-2" />
                    )}
                    Move {selectedItems.length} to Cart
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={() => {
                      batchDelete({ wishListItemIds: selectedItems });
                      setSelectedItems([]);
                    }}
                    disabled={isBatchDeleting}
                  >
                    {isBatchDeleting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-2" />
                    )}
                    Remove {selectedItems.length}
                  </Button>
                </>
              )}
              <Button variant="outline" asChild>
                <Link to="/shop">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Continue Shopping
                </Link>
              </Button>
            </div>
          </div>
          <Separator className="mt-6" />
        </div>

        {/* Wishlist Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wishlistItems.map((item: WishListItemDto) => {
            const isSelected = selectedItems.includes(item.id);
            
            return (
              <Card 
                key={item.id} 
                className={`group hover:shadow-lg transition-shadow duration-200 overflow-hidden relative ${
                  isSelected ? 'ring-2 ring-ethiopian-gold' : ''
                } ${!item.available ? 'opacity-75' : ''}`}
              >
                <LocalSeasonalProductBadge />
                <CardContent className="p-0">
                  {/* Selection checkbox */}
                  <div className="absolute top-3 left-3 z-10">
                    <button
                      onClick={() => {
                        setSelectedItems(prev => 
                          isSelected 
                            ? prev.filter(id => id !== item.id)
                            : [...prev, item.id]
                        );
                      }}
                      className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                        isSelected 
                          ? 'bg-ethiopian-gold border-ethiopian-gold text-white' 
                          : 'bg-white/90 border-gray-300 hover:border-ethiopian-gold'
                      }`}
                    >
                      {isSelected && <Check className="h-4 w-4" />}
                    </button>
                  </div>
                  
                  {/* Product Image */}
                  <div className="relative aspect-square bg-gray-100">
                    {(() => {
                      const imageUrl = getSkuImageUrl(
                        item.productSku?.images,
                        item.productImages, // Now we have product images available
                        item.imageUrl
                      );
                      
                      return imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={item.productName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200">
                          <Package className="h-12 w-12 text-gray-400" />
                        </div>
                      );
                    })()}
                    
                    {/* Wishlist Button */}
                    <div className="absolute top-3 right-3">
                      <WishlistButton 
                        productId={item.productId} 
                        size="default"
                        variant="secondary"
                        className="bg-white/90 hover:bg-white shadow-sm"
                      />
                    </div>

                    {/* Status Badges */}
                    <div className="absolute bottom-3 left-3 flex flex-wrap gap-1">
                      {!item.available && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          {item.availabilityMessage || 'Unavailable'}
                        </Badge>
                      )}
                      {item.priceChanged && (
                        <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">
                          Price changed
                        </Badge>
                      )}
                      {item.priority && item.priority !== 'UNASSIGNED' && (
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            item.priority === 'HIGH' ? 'border-red-500 text-red-600' :
                            item.priority === 'MEDIUM' ? 'border-yellow-500 text-yellow-600' :
                            'border-gray-400 text-gray-600'
                          }`}
                        >
                          {item.priority}
                        </Badge>
                      )}
                    </div>
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
                          {item.productName || `Product #${item.productId}`}
                        </h3>
                        {item.skuCode && (
                          <p 
                            className="text-xs mt-1 text-gray-500"
                          >
                            SKU: {item.skuCode}
                          </p>
                        )}
                        {item.productSku?.attributes && item.productSku.attributes.length > 0 && (
                          <p className="text-xs mt-1 text-gray-500">
                            {item.productSku.attributes.map(attr => `${attr.name}: ${attr.value}`).join(', ')}
                          </p>
                        )}
                      </div>
                      
                      {item.notes && (
                        <p 
                          className="text-sm line-clamp-2 italic"
                          style={{
                            color: isSeasonalMode && currentTheme.id !== 'default' 
                              ? currentTheme.colors.text + 'CC' 
                              : undefined
                          }}
                        >
                          "{item.notes}"
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span 
                            className="text-lg font-bold"
                            style={{
                              color: isSeasonalMode && currentTheme.id !== 'default' 
                                ? currentTheme.colors.primary 
                                : undefined
                            }}
                          >
                            {formatPrice(item.price, item.currency || 'ETB')}
                          </span>
                          {item.priceChanged && item.snapshotPrice && (
                            <span className="text-xs text-gray-500 line-through">
                              Was: {formatPrice(item.snapshotPrice, item.currency || 'ETB')}
                            </span>
                          )}
                        </div>
                        {item.addedAt && (
                          <span 
                            className="text-xs"
                            style={{
                              color: isSeasonalMode && currentTheme.id !== 'default' 
                                ? currentTheme.colors.text + '60' 
                                : undefined
                            }}
                          >
                            Added {new Date(item.addedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-4">
                      <Button 
                        onClick={() => moveToCart({ wishListItemId: item.id })}
                        disabled={!item.available || isMovingToCart}
                        className="flex-1"
                      >
                        {isMovingToCart ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <ShoppingCart className="h-4 w-4 mr-2" />
                        )}
                        {item.available ? 'Add to Cart' : 'Unavailable'}
                      </Button>
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