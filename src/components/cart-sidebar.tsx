import { useCart } from "@/hooks/useCart";
import { formatDualCurrency } from "@/lib/currency";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { X, Plus, Minus, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";

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

export default function CartSidebar() {
  const {
    cartItems,
    isLoading,
    isOpen,
    closeCart,
    getTotalItems,
    getTotalPrice,
    updateQuantity,
    removeItem,
    isUpdatingQuantity,
    isRemovingItem,
    isAuthenticated,
  } = useCart();

  const calculateTotal = () => {
    return getTotalPrice().toFixed(2);
  };

  const handleQuantityChange = (item: CartItem, newQuantity: number) => {
    if (newQuantity < 1) {
      removeItem(item.id);
    } else {
      updateQuantity({ id: item.id, quantity: newQuantity });
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={closeCart}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center space-x-2">
            <ShoppingBag size={20} />
            <span>Your Cart ({getTotalItems()})</span>
          </SheetTitle>
        </SheetHeader>

        {!isAuthenticated ? (
          <div className="flex flex-col items-center justify-center py-12">
            <ShoppingBag size={48} className="text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Sign in to view your cart</h3>
            <p className="text-gray-500 text-center mb-6">
              Please sign in to save and view your cart items
            </p>
            <Button asChild className="bg-ethiopian-gold hover:bg-amber">
              <a href="/api/login">Sign In</a>
            </Button>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ethiopian-gold"></div>
          </div>
        ) : cartItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <ShoppingBag size={48} className="text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Your cart is empty</h3>
            <p className="text-gray-500 text-center mb-6">
              Start shopping to add items to your cart
            </p>
            <Button asChild onClick={() => closeCart()} className="bg-ethiopian-gold hover:bg-amber">
              <Link to="/gifts">Browse Gifts</Link>
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 my-4">
              <div className="space-y-4">
                {cartItems.map((item: CartItem) => (
                  <div key={item.id} className="flex items-center space-x-4 bg-gray-50 p-4 rounded-lg">
                    <div className="relative w-16 h-16 flex-shrink-0">
                      <img
                        src={item.product?.images?.[0] || "https://images.unsplash.com/photo-1447933601403-0c6688de566e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"}
                        alt={item.product?.name || "Product"}
                        className="w-full h-full object-cover rounded-md"
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-charcoal line-clamp-2">
                        {item.product?.name || "Product"}
                      </h4>
                      {(() => {
                        const currency = formatDualCurrency(item.product?.price || "0");
                        return (
                          <div className="flex flex-col">
                            <span className="text-ethiopian-gold font-semibold text-sm">{currency.etb}</span>
                            <span className="text-gray-500 text-xs">{currency.usd}</span>
                          </div>
                        );
                      })()}
                      
                      <div className="flex items-center space-x-2 mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleQuantityChange(item, item.quantity - 1)}
                          disabled={isUpdatingQuantity || isRemovingItem}
                          className="h-8 w-8 p-0"
                        >
                          <Minus size={12} />
                        </Button>
                        <span className="text-sm font-medium w-8 text-center">
                          {item.quantity}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleQuantityChange(item, item.quantity + 1)}
                          disabled={isUpdatingQuantity || isRemovingItem}
                          className="h-8 w-8 p-0"
                        >
                          <Plus size={12} />
                        </Button>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => removeItem(item.id)}
                      disabled={isRemovingItem}
                      className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center justify-between text-lg font-semibold">
                <span>Total:</span>
                {(() => {
                  const currency = formatDualCurrency(calculateTotal());
                  return (
                    <div className="text-right">
                      <div className="text-ethiopian-gold">{currency.etb}</div>
                      <div className="text-gray-500 text-sm font-medium">{currency.usd}</div>
                    </div>
                  );
                })()}
              </div>
              
              <div className="space-y-2">
                <Button
                  asChild
                  className="w-full bg-ethiopian-gold hover:bg-amber text-white"
                  onClick={() => closeCart()}
                >
                  <Link to="/checkout">Proceed to Checkout</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="w-full border-ethiopian-gold text-ethiopian-gold hover:bg-ethiopian-gold hover:text-white"
                  onClick={() => closeCart()}
                >
                  <Link to="/cart">View Cart</Link>
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}