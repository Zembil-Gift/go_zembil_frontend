import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCartStore } from "@/stores/cart-store";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
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
  };
}

export function useCart() {
  const { isAuthenticated } = useAuth();
  const { isOpen, openCart, closeCart, toggleCart } = useCartStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch cart items from mock API
  const { 
    data: cartItems = [], 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ["/api/cart"],
    queryFn: () => MockApiService.getCart(),
    retry: false,
    enabled: isAuthenticated, // Only fetch when authenticated
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchOnWindowFocus: true,
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
        const price = parseFloat(item.product?.price || '0') || 0;
        const quantity = Number(item.quantity) || 0;
        return total + (price * quantity);
      }, 0);
    } catch (error) {
      console.warn('Error calculating cart total price:', error);
      return 0;
    }
  };

  // Add item to cart mutation
  const addToCartMutation = useMutation({
    mutationFn: async ({ productId, quantity = 1, customization }: { 
      productId: number; 
      quantity?: number; 
      customization?: any 
    }) => {
      return await MockApiService.addToCart(productId, quantity);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      toast({
        title: "Added to cart",
        description: "Item has been added to your cart",
      });
    },
    onError: (error) => {
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
        return await MockApiService.removeFromCart(id);
      }
      // Mock update quantity
      return Promise.resolve({ success: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
    },
    onError: (error) => {
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

  // Clear cart mutation
  const clearCartMutation = useMutation({
    mutationFn: async () => {
      // Mock clear cart
      return Promise.resolve({ success: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      toast({
        title: "Cart cleared",
        description: "All items removed from cart",
      });
    },
    onError: (error) => {
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