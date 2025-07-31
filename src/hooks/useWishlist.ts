import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { MockApiService } from "@/services/mockApiService";
import { useState, useEffect } from "react";

interface WishlistItem {
  id: number;
  productId: number;
  userId: string;
  createdAt: string;
  product?: {
    id: number;
    name: string;
    price: string;
    images: string[];
  };
}

export function useWishlist() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [localWishlist, setLocalWishlist] = useState<number[]>([]);

  // Load local storage wishlist for guest users
  useEffect(() => {
    if (!isAuthenticated) {
      const stored = localStorage.getItem('goZembil_wishlist');
      if (stored) {
        try {
          setLocalWishlist(JSON.parse(stored));
        } catch (error) {
          console.warn('Error parsing stored wishlist:', error);
          setLocalWishlist([]);
        }
      }
    }
  }, [isAuthenticated]);

  // Save to local storage for guest users
  const saveToLocalStorage = (productIds: number[]) => {
    localStorage.setItem('goZembil_wishlist', JSON.stringify(productIds));
    setLocalWishlist(productIds);
  };

  // Fetch wishlist items from mock API (authenticated users only)
  const { 
    data: wishlistItems = [], 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ["/api/wishlist"],
    queryFn: () => MockApiService.getWishlist(),
    retry: false,
    enabled: isAuthenticated,
    staleTime: 60000, // Consider data fresh for 1 minute
  });

  // Check if product is in wishlist
  const isInWishlist = (productId: number): boolean => {
    if (isAuthenticated) {
      return Array.isArray(wishlistItems) && wishlistItems.some((item: WishlistItem) => item.productId === productId);
    } else {
      return localWishlist.includes(productId);
    }
  };

  // Get wishlist count
  const getWishlistCount = (): number => {
    if (isAuthenticated) {
      return Array.isArray(wishlistItems) ? wishlistItems.length : 0;
    } else {
      return localWishlist.length;
    }
  };

  // Add to wishlist mutation with optimistic updates
  const addToWishlistMutation = useMutation({
    mutationFn: async (data: { productId: number }) => {
      if (!isAuthenticated) {
        // Handle guest users with local storage
        if (localWishlist.includes(data.productId)) {
          throw new Error("Item already in wishlist");
        }
        const newLocalWishlist = [...localWishlist, data.productId];
        saveToLocalStorage(newLocalWishlist);
        return { id: Date.now(), productId: data.productId, userId: 'guest', createdAt: new Date().toISOString() };
      }
      
      // Check if item already exists in wishlist before making API call
      if (Array.isArray(wishlistItems) && wishlistItems.some((item: WishlistItem) => item.productId === data.productId)) {
        throw new Error("Item already in wishlist");
      }
      
      return await MockApiService.addToWishlist(data.productId);
    },
    onMutate: async (newItem) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/wishlist"] });

      // Snapshot the previous value
      const previousWishlist = queryClient.getQueryData(["/api/wishlist"]);

      // Optimistically update to the new value
      if (isAuthenticated) {
        queryClient.setQueryData(["/api/wishlist"], (old: WishlistItem[] = []) => [
          ...old,
          { 
            id: Date.now(), // Temporary ID for optimistic update
            productId: newItem.productId,
            userId: 'temp',
            createdAt: new Date().toISOString()
          }
        ]);
      }

      // Return a context object with the snapshotted value
      return { previousWishlist };
    },
    onSuccess: (data) => {
      if (isAuthenticated) {
        // Refresh the actual data from server to get real IDs
        queryClient.invalidateQueries({ queryKey: ["/api/wishlist"] });
      }
      toast({
        title: "Added to wishlist",
        description: "Gift has been added to your wishlist",
      });
    },
    onError: (error: any, newItem, context) => {
      // Revert the optimistic update
      if (context?.previousWishlist && isAuthenticated) {
        queryClient.setQueryData(["/api/wishlist"], context.previousWishlist);
      } else if (!isAuthenticated) {
        // Revert local storage for guests
        const revertedWishlist = localWishlist.filter(id => id !== newItem.productId);
        saveToLocalStorage(revertedWishlist);
      }
      
      console.error("Add to wishlist error:", error);
      
      // Handle different error types based on HTTP status or message
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

  // Remove from wishlist mutation with optimistic updates
  const removeFromWishlistMutation = useMutation({
    mutationFn: async (productId: number) => {
      if (!isAuthenticated) {
        // Handle guest users with local storage
        if (!localWishlist.includes(productId)) {
          throw new Error("Item not in wishlist");
        }
        const newLocalWishlist = localWishlist.filter(id => id !== productId);
        saveToLocalStorage(newLocalWishlist);
        return { productId };
      }
      
      return await MockApiService.removeFromWishlist(productId);
    },
    onMutate: async (productId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/wishlist"] });

      // Snapshot the previous value
      const previousWishlist = queryClient.getQueryData(["/api/wishlist"]);

      // Optimistically update to the new value
      if (isAuthenticated) {
        queryClient.setQueryData(["/api/wishlist"], (old: WishlistItem[] = []) =>
          old.filter(item => item.productId !== productId)
        );
      }

      // Return a context object with the snapshotted value
      return { previousWishlist };
    },
    onSuccess: (data) => {
      if (isAuthenticated) {
        // Refresh the actual data from server
        queryClient.invalidateQueries({ queryKey: ["/api/wishlist"] });
      }
      toast({
        title: "Removed from wishlist",
        description: "Gift has been removed from your wishlist",
      });
    },
    onError: (error: any, productId, context) => {
      // Revert the optimistic update
      if (context?.previousWishlist && isAuthenticated) {
        queryClient.setQueryData(["/api/wishlist"], context.previousWishlist);
      } else if (!isAuthenticated) {
        // Revert local storage for guests
        const revertedWishlist = [...localWishlist, productId];
        saveToLocalStorage(revertedWishlist);
      }
      
      console.error("Remove from wishlist error:", error);
      if (error.message === "Item not in wishlist") {
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

  // Toggle wishlist (add if not in wishlist, remove if in wishlist)
  const toggleWishlist = (productId: number) => {
    if (isInWishlist(productId)) {
      removeFromWishlistMutation.mutate(productId);
    } else {
      addToWishlistMutation.mutate({ productId });
    }
  };

  return {
    // Data
    wishlistItems: isAuthenticated ? wishlistItems : localWishlist.map(id => ({ id, productId: id, userId: 'guest', createdAt: '' })),
    isLoading,
    error,
    
    // Helper functions
    isInWishlist,
    getWishlistCount,
    
    // Actions with optimistic updates
    addToWishlist: addToWishlistMutation.mutate,
    removeFromWishlist: removeFromWishlistMutation.mutate,
    toggleWishlist,
    
    // Loading states
    isAddingToWishlist: addToWishlistMutation.isPending,
    isRemovingFromWishlist: removeFromWishlistMutation.isPending,
  };
}

export default useWishlist;