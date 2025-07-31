import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface EventWishlistItem {
  id: number;
  userId: string;
  eventId: number;
  notes?: string;
  notificationPreference: string;
  createdAt: string;
}

export function useEventWishlist() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: eventWishlistItems = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/event-wishlist"],
    enabled: isAuthenticated,
    retry: false,
  });

  const addToEventWishlistMutation = useMutation({
    mutationFn: async (data: { eventId: number; notes?: string; notificationPreference?: string }) => {
      return await apiRequest("POST", "/api/event-wishlist", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/event-wishlist"] });
      toast({
        title: "Added to wishlist",
        description: "Event has been added to your wishlist!",
      });
    },
    onError: (error: any) => {
      const message = error.message || "Failed to add event to wishlist";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });

  const removeFromEventWishlistMutation = useMutation({
    mutationFn: async (eventId: number) => {
      return await apiRequest("DELETE", `/api/event-wishlist/${eventId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/event-wishlist"] });
      toast({
        title: "Removed from wishlist",
        description: "Event has been removed from your wishlist.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to remove event from wishlist",
        variant: "destructive",
      });
    },
  });

  const updateEventWishlistNotesMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes: string }) => {
      return await apiRequest("PATCH", `/api/event-wishlist/${id}/notes`, { notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/event-wishlist"] });
      toast({
        title: "Notes updated",
        description: "Your wishlist notes have been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to update wishlist notes",
        variant: "destructive",
      });
    },
  });

  const isEventInWishlist = (eventId: number) => {
    return eventWishlistItems.some((item: EventWishlistItem) => item.eventId === eventId);
  };

  const getEventWishlistItem = (eventId: number) => {
    return eventWishlistItems.find((item: EventWishlistItem) => item.eventId === eventId);
  };

  return {
    eventWishlistItems,
    isLoading,
    error,
    addToEventWishlist: addToEventWishlistMutation.mutate,
    removeFromEventWishlist: removeFromEventWishlistMutation.mutate,
    updateEventWishlistNotes: updateEventWishlistNotesMutation.mutate,
    isEventInWishlist,
    getEventWishlistItem,
    isAddingToWishlist: addToEventWishlistMutation.isPending,
    isRemovingFromWishlist: removeFromEventWishlistMutation.isPending,
    isUpdatingNotes: updateEventWishlistNotesMutation.isPending,
  };
}

export function useEventWishlistCheck(eventId: number) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["/api/event-wishlist/check", eventId],
    enabled: isAuthenticated && !!eventId,
    retry: false,
  });
}