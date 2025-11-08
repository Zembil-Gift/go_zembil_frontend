import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { EnhancedCheckout } from "@/components/checkout/EnhancedCheckout";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "wouter";
import { ShoppingCart, ArrowLeft, CreditCard, Globe, Smartphone } from "lucide-react";
import { useEffect } from "react";

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY!);

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

export default function Checkout() {
  const { isAuthenticated, user } = useAuth();
  const { cartItems, getTotalPrice, getTotalItems, clearCart } = useCart();
  const [, navigate] = useNavigate();

  const totalPrice = getTotalPrice();
  const totalItems = getTotalItems();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/signin?redirect=/checkout');
    }
  }, [isAuthenticated, navigate]);

  // Redirect if cart is empty
  useEffect(() => {
    if (isAuthenticated && cartItems.length === 0) {
      navigate('/shop');
    }
  }, [isAuthenticated, cartItems.length, navigate]);

  const handlePaymentSuccess = (transaction: any) => {
    // Clear cart and redirect to success page
    clearCart();
    navigate(`/payment-success?transaction=${transaction.id}`);
  };

  const handlePaymentError = (error: string) => {
    console.error('Payment error:', error);
    // Error is already handled by toast in EnhancedCheckout
  };

  if (!isAuthenticated || cartItems.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/shop')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Shopping
          </Button>
          
          <h1 className="text-3xl font-bold text-gray-900">Secure Checkout</h1>
          <p className="text-gray-600 mt-2">
            Complete your order with our secure payment system
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Summary */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Order Summary ({totalItems} items)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cartItems.map((item: CartItem) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-md overflow-hidden">
                      <img
                        src={item.product?.images?.[0] || "/api/placeholder/100/100"}
                        alt={item.product?.name || "Product"}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    <div className="flex-1">
                      <h4 className="font-medium line-clamp-2">
                        {item.product?.name}
                      </h4>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm text-gray-600">
                          Qty: {item.quantity}
                        </span>
                        <div className="text-right">
                          <p className="font-semibold">
                            ${(parseFloat(item.product?.price || "0") * item.quantity).toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-500">
                            ≈ {(parseFloat(item.product?.price || "0") * item.quantity * 120.5).toFixed(0)} ETB
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>${totalPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Shipping</span>
                    <span className="text-green-600">Free</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Tax</span>
                    <span>Calculated at checkout</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <div className="text-right">
                      <div>${totalPrice.toFixed(2)} USD</div>
                      <div className="text-sm text-gray-500 font-normal">
                        ≈ {(totalPrice * 120.5).toFixed(0)} ETB
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Methods Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Accepted Payment Methods
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">Credit/Debit Cards</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-blue-600" />
                    <span className="text-sm">PayPal</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-gray-800" />
                    <span className="text-sm">Apple Pay</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">Google Pay</span>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>For Ethiopian customers:</strong> We also accept Chapa and Telebirr payments. 
                    Contact us for local payment options.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Security Notice */}
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center gap-2 text-green-600">
                    <span className="text-2xl">🔒</span>
                    <span className="font-semibold">Secure & Encrypted</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Your payment information is protected with industry-standard encryption
                  </p>
                  <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
                    <Badge variant="outline">SSL Secured</Badge>
                    <Badge variant="outline">PCI Compliant</Badge>
                    <Badge variant="outline">Stripe Powered</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Form */}
          <div>
            <Elements
              stripe={stripePromise}
              options={{
                appearance: {
                  theme: 'stripe',
                  variables: {
                    colorPrimary: '#FDCB2D',
                    colorBackground: '#ffffff',
                    colorText: '#000000',
                    fontFamily: 'Inter, system-ui, sans-serif',
                  },
                },
                clientSecret: undefined, // Will be set by EnhancedCheckout
              }}
            >
              <EnhancedCheckout
                amount={totalPrice}
                currency="USD"
                orderType="product_purchase"
                orderId={`cart_${Date.now()}`}
                customerEmail={user?.email}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
              />
            </Elements>
          </div>
        </div>
      </div>
    </div>
  );
}