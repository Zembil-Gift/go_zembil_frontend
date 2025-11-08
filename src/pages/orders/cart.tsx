import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatDualCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { ShoppingBag, Plus, Minus, X, Truck, Heart, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { MockApiService } from "@/services/mockApiService";

interface CartItem {
  id: number;
  productId: number;
  quantity: number;
  customization?: any;
  product?: {
    id: number;
    name: string;
    price: string;
    images: string[];
    deliveryDays?: number;
  };
}

export default function Cart() {
  const [promoCode, setPromoCode] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: cartItems = [], isLoading } = useQuery<CartItem[]>({
    queryKey: ["/api/cart"],
    queryFn: () => MockApiService.getCart(),
    retry: false,
  });

  const updateQuantityMutation = useMutation({
    mutationFn: async ({ id, quantity }: { id: number; quantity: number }) => {
      // Mock update quantity
      return Promise.resolve({ success: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
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
      return await MockApiService.removeFromCart(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
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
    mutationFn: async (productId: number) => {
      return await MockApiService.addToWishlist(productId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wishlist"] });
      toast({
        title: "Moved to wishlist",
        description: "Item moved to your wishlist",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to move item to wishlist",
        variant: "destructive",
      });
    },
  });

  const calculateSubtotal = () => {
    return cartItems.reduce((total: number, item: CartItem) => {
      const price = parseFloat(item.product?.price || "0");
      return total + (price * item.quantity);
    }, 0);
  };

  const calculateShipping = () => {
    // Free shipping over 1000 ETB
    const subtotal = calculateSubtotal();
    return subtotal >= 1000 ? 0 : 50;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateShipping();
  };

  const getTotalItems = () => {
    return cartItems.reduce((total: number, item: CartItem) => total + item.quantity, 0);
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
      await moveToWishlistMutation.mutateAsync(item.productId);
      removeItemMutation.mutate(item.id);
    } catch (error) {
      // Error already handled by mutation
    }
  };

  if (isLoading) {
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
                        <img
                          src={item.product?.images?.[0] || "https://images.unsplash.com/photo-1447933601403-0c6688de566e?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200"}
                          alt={item.product?.name || "Product"}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      </div>

                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <Link to={`/product/${item.productId}`}>
                          <h3 className="font-semibold text-lg text-charcoal hover:text-ethiopian-gold transition-colors line-clamp-2">
                            {item.product?.name || "Product"}
                          </h3>
                        </Link>
                        {(() => {
                          const currency = formatDualCurrency(item.product?.price || "0");
                          return (
                            <div className="mt-1">
                              <p className="text-ethiopian-gold font-bold text-lg">{currency.etb}</p>
                              <p className="text-gray-500 font-medium text-sm">{currency.usd}</p>
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
                          const itemTotal = parseFloat(item.product?.price || "0") * item.quantity;
                          const currency = formatDualCurrency(itemTotal);
                          return (
                            <div>
                              <p className="font-bold text-lg text-charcoal">{currency.etb}</p>
                              <p className="text-gray-500 font-medium text-sm">{currency.usd}</p>
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
                      {(() => {
                        const currency = formatDualCurrency(calculateSubtotal());
                        return (
                          <div className="text-right">
                            <span className="font-medium">{currency.etb}</span>
                            <div className="text-xs text-gray-500">{currency.usd}</div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Shipping */}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Shipping</span>
                      {calculateShipping() === 0 ? (
                        <span className="font-medium text-green-600">Free</span>
                      ) : (
                        (() => {
                          const currency = formatDualCurrency(calculateShipping());
                          return (
                            <div className="text-right">
                              <span className="font-medium">{currency.etb}</span>
                              <div className="text-xs text-gray-500">{currency.usd}</div>
                            </div>
                          );
                        })()
                      )}
                    </div>

                    {/* Free Shipping Message */}
                    {calculateSubtotal() < 1000 && (
                      <div className="text-sm text-gray-600 bg-amber/10 p-3 rounded-lg">
                        {(() => {
                          const currency = formatDualCurrency(1000 - calculateSubtotal());
                          return `Add ${currency.etb} (${currency.usd}) more for free shipping!`;
                        })()}
                      </div>
                    )}

                    {/* Promo Code */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Promo Code
                      </label>
                      <div className="flex space-x-2">
                        <Input
                          placeholder="Enter code"
                          value={promoCode}
                          onChange={(e) => setPromoCode(e.target.value)}
                          className="flex-1"
                        />
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="border-ethiopian-gold text-ethiopian-gold hover:bg-ethiopian-gold hover:text-white"
                        >
                          Apply
                        </Button>
                      </div>
                    </div>

                    <Separator />

                    {/* Total */}
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      {(() => {
                        const currency = formatDualCurrency(calculateTotal());
                        return (
                          <div className="text-right">
                            <div className="text-ethiopian-gold">{currency.etb}</div>
                            <div className="text-sm font-medium text-gray-500">{currency.usd}</div>
                          </div>
                        );
                      })()}
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

                  {/* Security Info */}
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="text-xs text-gray-500 text-center">
                      <p>🔒 Secure checkout guaranteed</p>
                      <p className="mt-1">🚚 Free delivery on orders over 1,000 ETB</p>
                    </div>
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
