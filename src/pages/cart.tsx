import { useState, useMemo, useCallback, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { 
  formatPrice, 
  toMinorUnits, 
  getDiscountAmountForDisplay
} from '@/lib/currency';
import { getProductImageUrl } from "@/utils/imageUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ShoppingBag, Plus, Minus, X, Truck, Heart, ArrowRight, LogIn, Tag, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { cartService, CartItem } from "@/services/cartService";
import { wishlistService } from "@/services/wishlistService";
import { discountService, type DiscountValidationResult } from "@/services/discountService";

export default function Cart() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { 
    cartItems, 
    cartCurrency, 
    isLoading: cartLoading, 
    getTotalItems, 
    error: cartError, 
    refetch,
    appliedDiscountCode,
    setAppliedDiscountCode
  } = useCart();

  const [discountCode, setDiscountCode] = useState(appliedDiscountCode || "");
  const [discountResult, setDiscountResult] = useState<DiscountValidationResult | null>(null);
  const [isValidatingDiscount, setIsValidatingDiscount] = useState(false);
  const [discountError, setDiscountError] = useState<string | null>(null);

  // Sync with persistent discount code
  useEffect(() => {
    if (appliedDiscountCode && !discountCode) {
      setDiscountCode(appliedDiscountCode);
    }
  }, [appliedDiscountCode]);

  useEffect(() => {
    // Auto-validate discount if it exists in store but hasn't been validated in this session
    if (appliedDiscountCode && cartItems.length > 0 && cartCurrency && !discountResult && !isValidatingDiscount && !discountError) {
      handleApplyDiscount();
    }
  }, [appliedDiscountCode, cartItems.length, cartCurrency, discountResult, isValidatingDiscount, discountError]);

  const cartProductIds = useMemo(() => {
    if (!Array.isArray(cartItems)) return [];
    return cartItems.map((item: CartItem) => item.productId).filter(Boolean);
  }, [cartItems]);

  const discountAmountDisplay = useMemo(() => {
    return getDiscountAmountForDisplay(discountResult, cartCurrency);
  }, [discountResult, cartCurrency]);

  const handleApplyDiscount = useCallback(async () => {
    const code = discountCode.trim();
    if (!code) {
      setDiscountError("Please enter a discount code");
      return;
    }
    const subtotal = calculateSubtotal();
    if (!cartCurrency || subtotal <= 0) {
      setDiscountError("Cart is empty");
      return;
    }

    setIsValidatingDiscount(true);
    setDiscountError(null);
    setDiscountResult(null);

    try {
      const result = await discountService.validateDiscountCode({
        discountCode: code,
        orderTotalMinor: toMinorUnits(subtotal, cartCurrency),
        productIds: cartProductIds,
      });

      if (result.applicable) {
        setDiscountResult(result);
        setAppliedDiscountCode(code);
        setDiscountError(null);
        toast({
          title: "Discount Applied",
          description: `Discount code "${code}" is valid! Savings shown below.`,
        });
      } else {
        setDiscountResult(null);
        setAppliedDiscountCode(null);
        setDiscountError(result.reason || "Discount code is not valid for this order");
      }
    } catch (error: any) {
      setDiscountResult(null);
      setAppliedDiscountCode(null);
      setDiscountError(error?.message || "Failed to validate discount code");
    } finally {
      setIsValidatingDiscount(false);
    }
  }, [discountCode, cartCurrency, cartProductIds, toast, setAppliedDiscountCode]);

  const handleRemoveDiscount = useCallback(() => {
    setDiscountResult(null);
    setDiscountError(null);
    setDiscountCode("");
    setAppliedDiscountCode(null);
  }, [setAppliedDiscountCode]);

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
    onError: () => {
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
    onError: () => {
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
    onError: () => {
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
            <h2 className="  text-2xl font-bold text-charcoal mb-4">
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
            <h2 className="  text-2xl font-bold text-charcoal mb-4">
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
            <h2 className="  text-2xl font-bold text-charcoal mb-4">
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
          <h1 className="  text-3xl font-bold text-charcoal mb-2">
            Shopping Cart
          </h1>
          <p className="text-gray-600">
            {getTotalItems()} {getTotalItems() === 1 ? 'item' : 'items'} in your cart
          </p>
        </div>

        {cartItems.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBag size={64} className="text-gray-400 mx-auto mb-6" />
            <h2 className="  text-2xl font-bold text-charcoal mb-4">
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

                    {/* Discount Code Input */}
                    <div className="space-y-2">
                      {discountResult?.applicable ? (
                        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                            <div>
                              <p className="text-xs font-medium text-green-800">
                                "{discountCode}" applied
                              </p>
                              <p className="text-xs text-green-600">
                                Save {formatPrice(discountAmountDisplay, cartCurrency)}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleRemoveDiscount}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 h-6 w-6 p-0"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Discount code"
                              value={discountCode}
                              onChange={(e) => {
                                setDiscountCode(e.target.value);
                                setDiscountError(null);
                              }}
                              onKeyDown={(e) => e.key === 'Enter' && handleApplyDiscount()}
                              className={`flex-1 h-9 text-sm ${discountError ? 'border-red-300' : ''}`}
                              disabled={isValidatingDiscount}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleApplyDiscount}
                              disabled={isValidatingDiscount || !discountCode.trim()}
                              className="border-ethiopian-gold text-ethiopian-gold hover:bg-ethiopian-gold hover:text-white h-9"
                            >
                              {isValidatingDiscount ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Tag className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </div>
                          {discountError && (
                            <p className="text-xs text-red-500 flex items-center gap-1">
                              <XCircle className="h-3 w-3" />
                              {discountError}
                            </p>
                          )}
                        </>
                      )}
                    </div>

                    {/* Discount Line Item */}
                    {discountResult?.applicable && discountAmountDisplay > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Discount</span>
                        <span>-{formatPrice(discountAmountDisplay, cartCurrency)}</span>
                      </div>
                    )}

                    <Separator />

                    {/* Total */}
                    <div className="flex justify-between text-lg font-bold">
                      <span>Estimated Total</span>
                      <span className="text-ethiopian-gold">
                        {formatPrice(Math.max(0, calculateTotal() - discountAmountDisplay), cartCurrency)}
                      </span>
                    </div>

                    {discountResult?.applicable && (
                      <p className="text-xs text-gray-500">
                        Discount will be confirmed at checkout.
                      </p>
                    )}

                    {/* Checkout Button */}
                    <Button 
                      className="w-full bg-ethiopian-gold hover:bg-amber text-white h-12"
                      onClick={() => navigate("/checkout", { state: { appliedDiscountCode: discountResult?.applicable ? discountCode : undefined } })}
                    >
                      Proceed to Checkout
                      <ArrowRight size={16} className="ml-2" />
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
