import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCartStore } from "@/stores/cart-store";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cartService, CartItem } from "@/services/cartService";

export function useCart() {
  const { isAuthenticated, user } = useAuth();
  const { isOpen, openCart, closeCart, toggleCart } = useCartStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get user's preferred currency (fallback to USD)
  const preferredCurrency = user?.preferredCurrencyCode || 'USD';

  const {
    data: cartData, 
    isLoading, 
    error,
    refetch,
    isFetching 
  } = useQuery({
    queryKey: ["cart", "items", preferredCurrency],
    queryFn: async () => {
      try {
        const result = await cartService.getCart(preferredCurrency);
        return result;
      } catch (error) {
        throw error;
      }
    },
    retry: false,
    enabled: isAuthenticated, // Only fetch when authenticated
    staleTime: 0, // Always consider data stale
    refetchOnMount: 'always', // Always refetch on mount
    refetchOnWindowFocus: true,
  });

  // Extract items and currency from cart data
  const cartItems = cartData?.items || [];
  const cartCurrency = cartData?.currency || preferredCurrency;

  console.log('Cart query state:', { 
    cartItems, 
    cartCurrency,
    isLoading, 
    error, 
    isFetching,
    itemCount: cartItems?.length,
    queryEnabled: isAuthenticated 
  });

  // Calculate total items with error handling
  const getTotalItems = (): number => {
    try {
      if (!isAuthenticated || !Array.isArray(cartItems)) {
        return 0;
      }
      return cartItems.reduce((total: number, item: CartItem) => {
        const quantity = Number(item.quantity) || 0;
        return total + quantity;
      }, 0);
    } catch (error) {
      console.warn('Error calculating cart total:', error);
      return 0;
    }
  };

  // Calculate total price with error handling
  const getTotalPrice = (): number => {
    try {
      if (!isAuthenticated || !Array.isArray(cartItems)) {
        return 0;
      }
      return cartItems.reduce((total: number, item: CartItem) => {
        // Use totalPrice from API if available, otherwise calculate from unitPrice
        const itemTotal = Number(item.totalPrice) || (Number(item.unitPrice || 0) * Number(item.quantity || 0));
        return total + itemTotal;
      }, 0);
    } catch (error) {
      console.warn('Error calculating cart total price:', error);
      return 0;
    }
  };

  // Add item to cart mutation
  const addToCartMutation = useMutation({
    mutationFn: async ({ productId, quantity = 1, productSkuId }: { 
      productId: number; 
      quantity?: number; 
      productSkuId?: number;
    }) => {
      return await cartService.addToCart({ productId, quantity, productSkuId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart", "items"] });
      toast({
        title: "Added to cart",
        description: "Item has been added to your cart",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add item to cart. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update quantity mutation
  const updateQuantityMutation = useMutation({
    mutationFn: async ({ id, quantity }: { id: number; quantity: number }) => {
      if (quantity <= 0) {
        return await cartService.removeFromCart(id);
      }
      return await cartService.updateCartItem(id, quantity);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart", "items"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update cart item",
        variant: "destructive",
      });
    },
  });

  // Remove item mutation
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

  // Clear cart mutation
  const clearCartMutation = useMutation({
    mutationFn: async () => {
      return await cartService.clearCart();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart", "items"] });
      toast({
        title: "Cart cleared",
        description: "All items removed from cart",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to clear cart",
        variant: "destructive",
      });
    },
  });

  return {
    // Cart data
    cartItems,
    cartCurrency,
    isLoading,
    error,
    refetch,
    
    // Cart calculations
    getTotalItems,
    getTotalPrice,
    
    // Cart state
    isOpen,
    openCart,
    closeCart,
    toggleCart,
    
    // Cart mutations
    addToCart: addToCartMutation.mutate,
    updateQuantity: updateQuantityMutation.mutate,
    removeItem: removeItemMutation.mutate,
    clearCart: clearCartMutation.mutate,
    
    // Loading states
    isAddingToCart: addToCartMutation.isPending,
    isUpdatingQuantity: updateQuantityMutation.isPending,
    isRemovingItem: removeItemMutation.isPending,
    isClearingCart: clearCartMutation.isPending,
    
    // Authentication state
    isAuthenticated,
  };
}