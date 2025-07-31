import { useState } from "react";
import { Heart, MessageCircle, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useEventWishlist } from "@/hooks/useEventWishlist";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface EventWishlistButtonProps {
  eventId: number;
  eventName: string;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "secondary" | "ghost";
  showLabel?: boolean;
  className?: string;
}

export function EventWishlistButton({
  eventId,
  eventName,
  size = "default",
  variant = "outline",
  showLabel = true,
  className = "",
}: EventWishlistButtonProps) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const {
    isEventInWishlist,
    getEventWishlistItem,
    addToEventWishlist,
    removeFromEventWishlist,
    updateEventWishlistNotes,
    isAddingToWishlist,
    isRemovingFromWishlist,
    isUpdatingNotes,
  } = useEventWishlist();

  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [notificationPreference, setNotificationPreference] = useState("all");

  const isInWishlist = isEventInWishlist(eventId);
  const wishlistItem = getEventWishlistItem(eventId);

  const handleToggleWishlist = () => {
    if (!isAuthenticated) {
      toast({
        title: "Sign in required",
        description: "Please sign in to add events to your wishlist.",
        variant: "destructive",
      });
      return;
    }

    if (isInWishlist) {
      removeFromEventWishlist(eventId);
    } else {
      // Open dialog for adding with notes
      setNotes("");
      setNotificationPreference("all");
      setIsNotesDialogOpen(true);
    }
  };

  const handleAddWithNotes = () => {
    addToEventWishlist({
      eventId,
      notes: notes.trim() || undefined,
      notificationPreference,
    });
    setIsNotesDialogOpen(false);
  };

  const handleUpdateNotes = () => {
    if (wishlistItem) {
      updateEventWishlistNotes({
        id: wishlistItem.id,
        notes: notes.trim(),
      });
      setIsNotesDialogOpen(false);
    }
  };

  const openNotesDialog = () => {
    if (wishlistItem) {
      setNotes(wishlistItem.notes || "");
      setNotificationPreference(wishlistItem.notificationPreference || "all");
    }
    setIsNotesDialogOpen(true);
  };

  const isLoading = isAddingToWishlist || isRemovingFromWishlist || isUpdatingNotes;

  return (
    <>
      <div className={`flex items-center gap-2 ${className}`}>
        <Button
          variant={isInWishlist ? "default" : variant}
          size={size}
          onClick={handleToggleWishlist}
          disabled={isLoading}
          className={`flex items-center gap-2 ${
            isInWishlist 
              ? "bg-red-500 hover:bg-red-600 text-white" 
              : "hover:bg-red-50 hover:text-red-600"
          }`}
        >
          <Heart 
            className={`h-4 w-4 ${isInWishlist ? "fill-current" : ""}`}
          />
          {showLabel && (
            <span>
              {isInWishlist ? "In Wishlist" : "Add to Wishlist"}
            </span>
          )}
        </Button>

        {isInWishlist && (
          <Button
            variant="ghost"
            size="sm"
            onClick={openNotesDialog}
            disabled={isLoading}
            className="text-gray-600 hover:text-gray-800"
          >
            <MessageCircle className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Dialog open={isNotesDialogOpen} onOpenChange={setIsNotesDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {isInWishlist ? "Update Wishlist Notes" : "Add to Wishlist"}
            </DialogTitle>
            <DialogDescription>
              {isInWishlist 
                ? "Update your notes and preferences for this event."
                : `Add "${eventName}" to your wishlist with optional notes and notification preferences.`
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Personal Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Why do you want to attend this event? Any special requirements?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notifications">Notification Preferences</Label>
              <Select value={notificationPreference} onValueChange={setNotificationPreference}>
                <SelectTrigger>
                  <SelectValue placeholder="Select notification preference" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All updates</SelectItem>
                  <SelectItem value="price_changes">Price changes only</SelectItem>
                  <SelectItem value="date_changes">Date changes only</SelectItem>
                  <SelectItem value="none">No notifications</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setIsNotesDialogOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={isInWishlist ? handleUpdateNotes : handleAddWithNotes}
              disabled={isLoading}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              <Heart className="h-4 w-4 mr-2" />
              {isInWishlist ? "Update" : "Add to Wishlist"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}