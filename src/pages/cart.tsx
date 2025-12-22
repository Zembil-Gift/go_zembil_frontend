import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { formatPrice } from "@/lib/currency";
import { getProductImageUrl } from "@/utils/imageUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ShoppingBag, Plus, Minus, X, Truck, Heart, ArrowRight, LogIn } from "lucide-react";
import { Link } from "react-router-dom";
import { cartService, CartItem } from "@/services/cartService";
import { wishlistService } from "@/services/wishlistService";

export default function Cart() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { cartItems, cartCurrency, isLoading: cartLoading, getTotalItems, error: cartError, refetch } = useCart();

  const updateQuantityMutation = useMutation({
    mutationFn: async ({ id, quantity }: { id: number; quantity: number }) => {
      return await cartService.updateCartItem(id, quantity);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart", "items"] });
      toast({
        title: "Quantity updated",
        description: "Cart item quantity updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update cart item",
        variant: "destructive",
      });
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: async (id: number) => {
      return await cartService.removeFromCart(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart", "items"] });
      toast({
        title: "Item removed",
        description: "Item removed from cart",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to remove item from cart",
        variant: "destructive",
      });
    },
  });

  const moveToWishlistMutation = useMutation({
    mutationFn: async (cartItemId: number) => {
      return await wishlistService.saveForLater({ cartItemId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wish-list"] });
      queryClient.invalidateQueries({ queryKey: ["cart", "items"] });
      toast({
        title: "Saved for later",
        description: "Item moved to your wishlist",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save item for later",
        variant: "destructive",
      });
    },
  });

  const calculateSubtotal = () => {
    if (!Array.isArray(cartItems)) return 0;
    return cartItems.reduce((total: number, item: CartItem) => {
      const itemTotal = Number(item.totalPrice) || (Number(item.unitPrice || 0) * item.quantity);
      return total + itemTotal;
    }, 0);
  };

  const calculateTotal = () => {
    // Total is just subtotal on cart page - shipping is calculated at checkout
    return calculateSubtotal();
  };

  const handleQuantityChange = (item: CartItem, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItemMutation.mutate(item.id);
    } else {
      updateQuantityMutation.mutate({ id: item.id, quantity: newQuantity });
    }
  };

  const handleMoveToWishlist = async (item: CartItem) => {
    try {
      // Use the backend's save-for-later endpoint which handles both
      // adding to wishlist and removing from cart atomically
      await moveToWishlistMutation.mutateAsync(item.id);
    } catch (error) {
      // Error already handled by mutation
    }
  };
  
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="text-center py-8">
              <div className="text-gray-600">Checking authentication...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <LogIn size={64} className="text-gray-400 mx-auto mb-6" />
            <h2 className="font-display text-2xl font-bold text-charcoal mb-4">
              Sign in to view your cart
            </h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Please sign in to your account to view and manage your shopping cart.
            </p>
            <Button asChild className="bg-ethiopian-gold hover:bg-amber text-white">
              <Link to="/signin">Sign In</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <LogIn size={64} className="text-gray-400 mx-auto mb-6" />
            <h2 className="font-display text-2xl font-bold text-charcoal mb-4">
              Sign in to view your cart
            </h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Please sign in to your account to view and manage your shopping cart.
            </p>
            <Button asChild className="bg-ethiopian-gold hover:bg-amber text-white">
              <Link to="/signin">Sign In</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (cartLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-32 bg-gray-200 rounded"></div>
                ))}
              </div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
        
      </div>
    );
  }

  if (cartError) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <ShoppingBag size={64} className="text-red-400 mx-auto mb-6" />
            <h2 className="font-display text-2xl font-bold text-charcoal mb-4">
              Failed to load cart
            </h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              There was an error loading your cart. Please try again.
            </p>
            <Button onClick={() => refetch()} className="bg-ethiopian-gold hover:bg-amber text-white">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-charcoal mb-2">
            Shopping Cart
          </h1>
          <p className="text-gray-600">
            {getTotalItems()} {getTotalItems() === 1 ? 'item' : 'items'} in your cart
          </p>
        </div>

        {cartItems.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBag size={64} className="text-gray-400 mx-auto mb-6" />
            <h2 className="font-display text-2xl font-bold text-charcoal mb-4">
              Your cart is empty
            </h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Looks like you haven't added any items to your cart yet. Start shopping to fill it up!
            </p>
            <div className="space-y-4">
              <Button asChild className="bg-ethiopian-gold hover:bg-amber text-white">
                <Link to="/gifts">Browse All Gifts</Link>
              </Button>
              <br />
              <Button asChild variant="outline" className="border-ethiopian-gold text-ethiopian-gold hover:bg-ethiopian-gold hover:text-white">
                <Link to="/wishlist">View Wishlist</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item: CartItem) => (
                <Card key={item.id} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      {/* Product Image */}
                      <div className="relative w-24 h-24 flex-shrink-0">
                        {getProductImageUrl(item.product?.images, item.product?.cover || item.productImage) ? (
                          <img
                            src={getProductImageUrl(
                              item.product?.images,
                              item.product?.cover || item.productImage
                            )}
                            alt={item.productName || item.product?.name || "Product"}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
                            <div className="text-center text-gray-400">
                              <p className="text-xs">No image</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <Link to={`/product/${item.productId}`}>
                          <h3 className="font-semibold text-lg text-charcoal hover:text-ethiopian-gold transition-colors line-clamp-2">
                            {item.product?.name || `Product #${item.productId}`}
                          </h3>
                        </Link>
                        {(() => {
                          // Use unitPrice from API instead of product.price
                          return (
                            <div className="mt-1">
                              <p className="text-ethiopian-gold font-bold text-lg">
                                {formatPrice(item.unitPrice || 0, cartCurrency)}
                              </p>
                            </div>
                          );
                        })()}
                        
                        {/* Delivery Info */}
                        <div className="flex items-center mt-2 text-sm text-gray-500">
                          <Truck size={14} className="mr-1" />
                          <span>{item.product?.deliveryDays || 3} days delivery</span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-4 mt-4">
                          {/* Quantity Controls */}
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleQuantityChange(item, item.quantity - 1)}
                              disabled={updateQuantityMutation.isPending}
                              className="h-8 w-8 p-0"
                            >
                              <Minus size={14} />
                            </Button>
                            <span className="text-sm font-medium w-8 text-center">
                              {item.quantity}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleQuantityChange(item, item.quantity + 1)}
                              disabled={updateQuantityMutation.isPending}
                              className="h-8 w-8 p-0"
                            >
                              <Plus size={14} />
                            </Button>
                          </div>

                          {/* Move to Wishlist */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleMoveToWishlist(item)}
                            disabled={moveToWishlistMutation.isPending}
                            className="text-gray-600 hover:text-ethiopian-gold"
                          >
                            <Heart size={14} className="mr-1" />
                            Save for later
                          </Button>

                          {/* Remove */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeItemMutation.mutate(item.id)}
                            disabled={removeItemMutation.isPending}
                            className="text-gray-600 hover:text-red-600"
                          >
                            <X size={14} className="mr-1" />
                            Remove
                          </Button>
                        </div>
                      </div>

                      {/* Item Total */}
                      <div className="text-right">
                        {(() => {
                          const itemTotal = Number(item.totalPrice) || (Number(item.unitPrice || 0) * item.quantity);
                          return (
                            <div>
                              <p className="font-bold text-lg text-charcoal">
                                {formatPrice(itemTotal, cartCurrency)}
                              </p>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-8">
                <CardContent className="p-6">
                  <h2 className="font-semibold text-xl text-charcoal mb-6">
                    Order Summary
                  </h2>

                  <div className="space-y-4">
                    {/* Subtotal */}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal ({getTotalItems()} items)</span>
                      <span className="font-medium">{formatPrice(calculateSubtotal(), cartCurrency)}</span>
                    </div>

                    <Separator />

                    {/* Total */}
                    <div className="flex justify-between text-lg font-bold">
                      <span>Subtotal</span>
                      <span className="text-ethiopian-gold">{formatPrice(calculateTotal(), cartCurrency)}</span>
                    </div>

                    {/* Checkout Button */}
                    <Button asChild className="w-full bg-ethiopian-gold hover:bg-amber text-white h-12">
                      <Link to="/checkout">
                        Proceed to Checkout
                        <ArrowRight size={16} className="ml-2" />
                      </Link>
                    </Button>

                    {/* Continue Shopping */}
                    <Button asChild variant="outline" className="w-full border-gray-300">
                      <Link to="/gifts">Continue Shopping</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      
    </div>
  );
}
