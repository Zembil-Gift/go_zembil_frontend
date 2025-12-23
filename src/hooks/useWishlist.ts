import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { 
  wishlistService, 
  WishListItemDto, 
  PagedWishListResponse,
  CreateWishListItemRequest,
  MoveToCartRequest,
  BatchMoveToCartRequest,
  BatchDeleteRequest,
  UpdateWishListItemRequest
} from "@/services/wishlistService";

export function useWishlist() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: wishlistResponse,
    isLoading, 
    error 
  } = useQuery({
    queryKey: ["/api/wish-list"],
    queryFn: () => wishlistService.getWishlist(),
    retry: false,
    enabled: isAuthenticated,
  });

  const wishlistItems: WishListItemDto[] = wishlistResponse?.items || [];

  const isInWishlist = (productId: number): boolean => {
    // Only check server wishlist for authenticated users
    if (isAuthenticated) {
      return wishlistItems.some((item) => item.productId === productId);
    }
    // For unauthenticated users, nothing is in wishlist (forces login)
    return false;
  };

  const getWishlistCount = (): number => {
    // Only show count for authenticated users
    if (isAuthenticated) {
      return wishlistResponse?.totalElements || wishlistItems.length;
    }
    return 0;
  };

  const addToWishlistMutation = useMutation({
    mutationFn: async (data: CreateWishListItemRequest) => {
      // Force authentication for wishlist actions - check immediately
      if (!isAuthenticated) {
        throw new Error('Authentication required');
      }
      
      if (wishlistItems.some((item) => item.productId === data.productId)) {
        throw new Error("Item already in wishlist");
      }
      
      return await wishlistService.addToWishlist(data);
    },
    onMutate: async (newItem) => {
      // Don't do optimistic updates for unauthenticated users
      if (!isAuthenticated) {
        // Show toast and redirect to login immediately
        toast({
          title: "Sign in required",
          description: "Please sign in to add items to your wishlist",
        });
        // Small delay to show toast before redirect
        setTimeout(() => {
          const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
          window.location.href = `/signin?returnUrl=${returnUrl}`;
        }, 500);
        return;
      }

      await queryClient.cancelQueries({ queryKey: ["/api/wish-list"] });

      const previousWishlist = queryClient.getQueryData<PagedWishListResponse>(["/api/wish-list"]);

      queryClient.setQueryData<PagedWishListResponse>(["/api/wish-list"], (old) => {
        const items = old?.items || [];
        return {
          ...old,
          page: old?.page || 0,
          size: old?.size || 20,
          totalPages: old?.totalPages || 1,
          totalElements: (old?.totalElements || 0) + 1,
          items: [
            ...items,
            { 
              id: Date.now(),
              productId: newItem.productId,
              productName: 'Loading...',
              price: 0,
              currency: 'ETB',
              available: true,
              priceChanged: false,
              addedAt: new Date().toISOString()
            } as WishListItemDto
          ]
        };
      });

      return { previousWishlist };
    },
    onSuccess: () => {
      if (isAuthenticated) {
        queryClient.invalidateQueries({ queryKey: ["/api/wish-list"] });
        toast({
          title: "Added to wishlist",
          description: "Gift has been added to your wishlist",
        });
      }
    },
    onError: (error: any, _newItem, context) => {
      // Handle authentication error
      if (error?.message === 'Authentication required') {
        // Don't show error toast, redirect is already handled in onMutate
        return;
      }
      
      if (context?.previousWishlist && isAuthenticated) {
        queryClient.setQueryData(["/api/wish-list"], context.previousWishlist);
      }
      
      console.error("Add to wishlist error:", error);
      
      if (error?.status === 409 || error?.message === "Item already in wishlist" || error?.message?.includes("already in wishlist")) {
        toast({
          title: "Already in wishlist",
          description: "This gift is already in your wishlist",
          variant: "default",
        });
      } else {
        toast({
          title: "Error",
          description: error?.message || "Failed to add gift to wishlist",
          variant: "destructive",
        });
      }
    },
  });

  const removeFromWishlistMutation = useMutation({
    mutationFn: async (productId: number) => {
      // Force authentication for wishlist actions - check immediately
      if (!isAuthenticated) {
        throw new Error('Authentication required');
      }
      
      return await wishlistService.removeProductFromWishlist(productId);
    },
    onMutate: async (productId) => {
      // Don't do optimistic updates for unauthenticated users
      if (!isAuthenticated) {
        // Show toast and redirect to login immediately
        toast({
          title: "Sign in required",
          description: "Please sign in to manage your wishlist",
        });
        // Small delay to show toast before redirect
        setTimeout(() => {
          const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
          window.location.href = `/signin?returnUrl=${returnUrl}`;
        }, 500);
        return;
      }

      await queryClient.cancelQueries({ queryKey: ["/api/wish-list"] });

      const previousWishlist = queryClient.getQueryData<PagedWishListResponse>(["/api/wish-list"]);

      queryClient.setQueryData<PagedWishListResponse>(["/api/wish-list"], (old) => {
        if (!old) return old;
        return {
          ...old,
          totalElements: Math.max(0, (old.totalElements || 0) - 1),
          items: old.items.filter(item => item.productId !== productId)
        };
      });

      return { previousWishlist };
    },
    onSuccess: () => {
      if (isAuthenticated) {
        queryClient.invalidateQueries({ queryKey: ["/api/wish-list"] });
        toast({
          title: "Removed from wishlist",
          description: "Gift has been removed from your wishlist",
        });
      }
    },
    onError: (error: any, _productId, context) => {
      // Handle authentication error
      if (error?.message === 'Authentication required') {
        // Don't show error toast, redirect is already handled in onMutate
        return;
      }
      
      if (context?.previousWishlist && isAuthenticated) {
        queryClient.setQueryData(["/api/wish-list"], context.previousWishlist);
      }
      
      console.error("Remove from wishlist error:", error);
      if (error.message === "Item not in wishlist" || error.message === "Product not found in wishlist") {
        toast({
          title: "Not in wishlist",
          description: "This gift is not in your wishlist",
          variant: "default",
        });
      } else {
        toast({
          title: "Error",
          description: error?.message || "Failed to remove gift from wishlist",
          variant: "destructive",
        });
      }
    },
  });

  const moveToCartMutation = useMutation({
    mutationFn: async (request: MoveToCartRequest) => {
      return await wishlistService.moveToCart(request);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["/api/wish-list"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      toast({
        title: "Moved to cart",
        description: response.message || "Item has been moved to your cart",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to move item to cart",
        variant: "destructive",
      });
    },
  });

  const batchMoveToCartMutation = useMutation({
    mutationFn: async (request: BatchMoveToCartRequest) => {
      return await wishlistService.batchMoveToCart(request);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["/api/wish-list"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      if (response.failureCount > 0) {
        toast({
          title: "Partially moved",
          description: `${response.successCount} items moved to cart, ${response.failureCount} failed`,
          variant: "default",
        });
      } else {
        toast({
          title: "Moved to cart",
          description: `${response.successCount} items moved to your cart`,
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to move items to cart",
        variant: "destructive",
      });
    },
  });

  const batchDeleteMutation = useMutation({
    mutationFn: async (request: BatchDeleteRequest) => {
      return await wishlistService.batchDelete(request);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["/api/wish-list"] });
      if (response.failureCount > 0) {
        toast({
          title: "Partially deleted",
          description: `${response.successCount} items removed, ${response.failureCount} failed`,
          variant: "default",
        });
      } else {
        toast({
          title: "Removed from wishlist",
          description: `${response.successCount} items removed from your wishlist`,
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to remove items from wishlist",
        variant: "destructive",
      });
    },
  });

  const clearWishlistMutation = useMutation({
    mutationFn: async () => {
      if (!isAuthenticated) {
        throw new Error('Authentication required');
      }
      return await wishlistService.clearWishlist();
    },
    onSuccess: () => {
      if (isAuthenticated) {
        queryClient.invalidateQueries({ queryKey: ["/api/wish-list"] });
      }
      toast({
        title: "Wishlist cleared",
        description: "All items have been removed from your wishlist",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to clear wishlist",
        variant: "destructive",
      });
    },
  });

  const updateWishlistItemMutation = useMutation({
    mutationFn: async ({ itemId, request }: { itemId: number; request: UpdateWishListItemRequest }) => {
      return await wishlistService.updateWishlistItem(itemId, request);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wish-list"] });
      toast({
        title: "Updated",
        description: "Wishlist item has been updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to update wishlist item",
        variant: "destructive",
      });
    },
  });

  const toggleWishlist = (productId: number, options?: { notes?: string; priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNASSIGNED' }) => {
    if (isInWishlist(productId)) {
      removeFromWishlistMutation.mutate(productId);
    } else {
      addToWishlistMutation.mutate({ productId, ...options });
    }
  };

  const normalizedWishlistItems: WishListItemDto[] = isAuthenticated
    ? wishlistItems 
    : []; // Empty array for unauthenticated users

  return {
    wishlistItems: normalizedWishlistItems,
    isLoading,
    error,
    
    isInWishlist,
    getWishlistCount,
    
    addToWishlist: (productId: number, options?: Omit<CreateWishListItemRequest, 'productId'>) =>
      addToWishlistMutation.mutate({ productId, ...options }),
    removeFromWishlist: removeFromWishlistMutation.mutate,
    toggleWishlist,
    
    moveToCart: moveToCartMutation.mutate,
    batchMoveToCart: batchMoveToCartMutation.mutate,
    batchDelete: batchDeleteMutation.mutate,
    clearWishlist: clearWishlistMutation.mutate,
    updateWishlistItem: (itemId: number, request: UpdateWishListItemRequest) => 
      updateWishlistItemMutation.mutate({ itemId, request }),
    
    isAddingToWishlist: addToWishlistMutation.isPending,
    isRemovingFromWishlist: removeFromWishlistMutation.isPending,
    isMovingToCart: moveToCartMutation.isPending,
    isBatchMovingToCart: batchMoveToCartMutation.isPending,
    isBatchDeleting: batchDeleteMutation.isPending,
    isClearingWishlist: clearWishlistMutation.isPending,
    isUpdatingItem: updateWishlistItemMutation.isPending,
  };
}

export default useWishlist;