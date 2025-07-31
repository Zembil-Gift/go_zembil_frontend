import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { ShoppingCart, Plus, Minus, Trash2, CreditCard, X } from "lucide-react";
import { useNavigate } from "wouter";
import { cn } from "@/lib/utils";

interface CartItem {
  id: number;
  productId: number;
  quantity: number;
  product?: {
    id: number;
    name: string;
    price: string;
    images: string[];
  };
}

export function CartSidebar() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useNavigate();
  const {
    cartItems,
    isLoading,
    getTotalItems,
    getTotalPrice,
    updateQuantity,
    removeItem,
    clearCart,
    isOpen,
    closeCart,
    isUpdatingCart,
    isRemovingFromCart,
    isClearingCart
  } = useCart();

  const totalItems = getTotalItems();
  const totalPrice = getTotalPrice();
  const totalETB = totalPrice * 120.5; // Convert to ETB

  const handleUpdateQuantity = (cartItem: CartItem, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(cartItem.id);
    } else {
      updateQuantity({ id: cartItem.id, quantity: newQuantity });
    }
  };

  const handleCheckout = () => {
    closeCart();
    navigate('/checkout');
  };

  const handleSignIn = () => {
    closeCart();
    navigate('/signin');
  };

  if (!isAuthenticated) {
    return (
      <Sheet open={isOpen} onOpenChange={closeCart}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Shopping Cart
            </SheetTitle>
          </SheetHeader>
          
          <div className="flex flex-col items-center justify-center h-full space-y-4">
            <ShoppingCart className="h-16 w-16 text-gray-300" />
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">Sign in to view your cart</h3>
              <p className="text-sm text-gray-600">
                Create an account or sign in to save items to your cart
              </p>
            </div>
            <Button onClick={handleSignIn} className="w-full max-w-xs">
              Sign In
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={closeCart}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Shopping Cart
              {totalItems > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {totalItems}
                </Badge>
              )}
            </div>
            {cartItems.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearCart}
                disabled={isClearingCart}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : cartItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4">
            <ShoppingCart className="h-16 w-16 text-gray-300" />
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">Your cart is empty</h3>
              <p className="text-sm text-gray-600">
                Add some items to get started
              </p>
            </div>
            <Button variant="outline" onClick={closeCart}>
              Continue Shopping
            </Button>
          </div>
        ) : (
          <>
            {/* Cart Items */}
            <div className="flex-1 space-y-4 overflow-y-auto">
              {cartItems.map((item: CartItem) => (
                <div key={item.id} className="flex gap-3 p-3 border rounded-lg">
                  {/* Product Image */}
                  <div className="w-16 h-16 flex-shrink-0 bg-gray-100 rounded-md overflow-hidden">
                    <img
                      src={item.product?.images?.[0] || "/api/placeholder/100/100"}
                      alt={item.product?.name || "Product"}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "/api/placeholder/100/100";
                      }}
                    />
                  </div>

                  {/* Product Details */}
                  <div className="flex-1 space-y-2">
                    <h4 className="font-medium text-sm line-clamp-2">
                      {item.product?.name || "Unknown Product"}
                    </h4>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-semibold text-primary">
                          ${parseFloat(item.product?.price || "0").toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">
                          ≈ {(parseFloat(item.product?.price || "0") * 120.5).toFixed(0)} ETB
                        </p>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleUpdateQuantity(item, item.quantity - 1)}
                          disabled={isUpdatingCart || isRemovingFromCart}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        
                        <span className="min-w-[2rem] text-center font-medium">
                          {item.quantity}
                        </span>
                        
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleUpdateQuantity(item, item.quantity + 1)}
                          disabled={isUpdatingCart}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Subtotal */}
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        ${(parseFloat(item.product?.price || "0") * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Remove Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => removeItem(item.id)}
                    disabled={isRemovingFromCart}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Separator />

            {/* Cart Summary */}
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal ({totalItems} items)</span>
                  <span>${totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>In Ethiopian Birr</span>
                  <span>≈ {totalETB.toFixed(0)} ETB</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Shipping</span>
                  <span className="text-green-600">Free</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span className="text-primary">${totalPrice.toFixed(2)}</span>
                </div>
              </div>

              {/* Checkout Button */}
              <Button 
                onClick={handleCheckout}
                className="w-full h-12 text-lg"
                disabled={cartItems.length === 0}
              >
                <CreditCard className="mr-2 h-5 w-5" />
                Proceed to Checkout
              </Button>

              <Button 
                variant="outline" 
                onClick={closeCart}
                className="w-full"
              >
                Continue Shopping
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default CartSidebar;