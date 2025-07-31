import { Button } from "@/components/ui/button";
import { useWishlist } from "@/hooks/useWishlist";
import { useAuth } from "@/hooks/useAuth";
import { Heart, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface WishlistButtonProps {
  productId: number;
  size?: "sm" | "default" | "lg";
  variant?: "ghost" | "outline" | "secondary";
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export function WishlistButton({
  productId,
  size = "default",
  variant = "ghost",
  className,
  onClick,
}: WishlistButtonProps) {
  const { isAuthenticated } = useAuth();
  const { 
    isInWishlist,
    addToWishlist, 
    removeFromWishlist, 
    isAddingToWishlist, 
    isRemovingFromWishlist 
  } = useWishlist();
  const navigate = useNavigate();

  const inWishlist = isInWishlist(productId);
  const isLoading = isAddingToWishlist || isRemovingFromWishlist;

  const handleWishlistToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClick?.(e);

    // Allow guest users to use local wishlist
    try {
      if (inWishlist) {
        removeFromWishlist(productId);
      } else {
        addToWishlist({ productId });
      }
    } catch (error) {
      console.error('Failed to update wishlist:', error);
    }
  };

  const sizeClasses = {
    sm: "h-8 w-8",
    default: "h-10 w-10",
    lg: "h-12 w-12"
  };

  const iconSizes = {
    sm: "h-4 w-4",
    default: "h-5 w-5",
    lg: "h-6 w-6"
  };

  return (
    <Button
      variant={variant}
      size="icon"
      onClick={handleWishlistToggle}
      disabled={isLoading}
      className={cn(
        "transition-all duration-200 hover:scale-105",
        sizeClasses[size],
        inWishlist && "text-red-500 hover:text-red-600",
        !inWishlist && "text-gray-400 hover:text-red-500",
        className
      )}
      title={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
    >
      {isLoading ? (
        <Loader2 className={cn("animate-spin", iconSizes[size])} />
      ) : (
        <Heart 
          className={cn(
            iconSizes[size],
            inWishlist && "fill-current"
          )} 
        />
      )}
    </Button>
  );
}

export default WishlistButton;