import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { ShoppingCart, Plus, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

interface CartButtonProps {
  productId: number;
  price: number;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "secondary";
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export function CartButton({
  productId,
  price,
  size = "default",
  variant = "default",
  className,
  onClick,
}: CartButtonProps) {
  const { isAuthenticated } = useAuth();
  const { addToCart, isAddingToCart } = useCart();
  const [, navigate] = useLocation();

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClick?.(e);

    if (!isAuthenticated) {
      navigate('/signin?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }

    try {
      await addToCart({
        productId,
        quantity: 1,
      });
    } catch (error) {
      console.error('Failed to add to cart:', error);
    }
  };

  const sizeClasses = {
    sm: "h-8 px-3 text-sm",
    default: "h-10 px-4",
    lg: "h-12 px-6 text-lg"
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleAddToCart}
      disabled={isAddingToCart}
      className={cn(
        "flex items-center gap-2 transition-all duration-200",
        sizeClasses[size],
        className
      )}
    >
      {isAddingToCart ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Adding...
        </>
      ) : (
        <>
          <ShoppingCart className="h-4 w-4" />
          <span className="hidden sm:inline">Add to Cart</span>
          <span className="sm:hidden">
            <Plus className="h-3 w-3" />
          </span>
        </>
      )}
    </Button>
  );
}

export default CartButton;