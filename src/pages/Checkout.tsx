import { useState } from "react";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, ArrowLeft, CreditCard, Globe, Smartphone, Loader2, Gift, Tag } from "lucide-react";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/services/apiService";
import { orderService, type CreateOrderRequest } from "@/services/orderService";

interface AddressDto {
  id?: number;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  contactName?: string;
  contactPhone?: string;
  additionalDetails?: string;
  type?: 'BILLING' | 'SHIPPING';
  isDefault?: boolean;
}

interface CartItem {
  id: number;
  productId: number;
  quantity: number;
  unitPrice?: number;
  totalPrice?: number;
  productName?: string;
  productImage?: string;
  product?: {
    id: number;
    name: string;
    price: string;
    images?: string[];
    cover?: string;
    imageUrl?: string;
  };
}

export default function Checkout() {
  const { isAuthenticated, user } = useAuth();
  const { cartItems, getTotalPrice, getTotalItems, clearCart } = useCart();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isLoadingAddress, setIsLoadingAddress] = useState(true);
  const [existingAddressId, setExistingAddressId] = useState<number | null>(null);
  const [shippingInfo, setShippingInfo] = useState({
    street: "",
    city: "",
    state: "",
    postalCode: "0000",
    country: "",
  });
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [giftWrap, setGiftWrap] = useState(false);
  const [cardMessage, setCardMessage] = useState("");
  const [discountCode, setDiscountCode] = useState("");

  const totalPrice = getTotalPrice();
  const totalItems = getTotalItems();

  useEffect(() => {
    if (user) {
      if (user.phoneNumber && !contactPhone) {
        setContactPhone(user.phoneNumber);
      }
      if (user.email && !contactEmail) {
        setContactEmail(user.email);
      }
    }
  }, [user]);

  useEffect(() => {
    const fetchExistingAddress = async () => {
      if (!isAuthenticated) return;

      try {
        const addresses = await apiService.getRequest<AddressDto[]>('/api/addresses');
        const shippingAddress = addresses?.find(addr => addr.type === 'SHIPPING');

        if (shippingAddress) {
          setExistingAddressId(shippingAddress.id || null);

          setShippingInfo({
            street: shippingAddress.street || "",
            city: shippingAddress.city || "",
            state: shippingAddress.state || "",
            postalCode: shippingAddress.postalCode || "0000",
            country: shippingAddress.country || "",
          });

          // Only set phone from address if user profile doesn't have one
          if (!user?.phoneNumber && shippingAddress.contactPhone) {
            setContactPhone(shippingAddress.contactPhone);
          }

          toast({
            title: "Address Loaded",
            description: "Your saved shipping address has been loaded.",
          });
        }
      } catch (error) {
        console.log('No existing address found or error fetching:', error);
      } finally {
        setIsLoadingAddress(false);
      }
    };

    fetchExistingAddress();
  }, [isAuthenticated, user]);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setShippingInfo({
      ...shippingInfo,
      [e.target.name]: e.target.value,
    });
  };

  const handleProceedToPayment = async () => {
    // Validate required fields
    if (!contactPhone || !shippingInfo.street || !shippingInfo.city) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required shipping information.",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingOrder(true);

    try {
      let shippingAddressId: number;

      const addressPayload: AddressDto = {
        street: shippingInfo.street,
        city: shippingInfo.city,
        state: shippingInfo.state || shippingInfo.city,
        postalCode: shippingInfo.postalCode || '0000',
        country: shippingInfo.country,
        contactName: user?.name || '',
        contactPhone: contactPhone,
        type: 'SHIPPING',
        isDefault: true,
      };

      if (existingAddressId) {
        // Update existing shipping address
        console.log('Updating existing shipping address:', existingAddressId);
        const updatedAddress = await apiService.putRequest<AddressDto>(
          `/api/addresses/${existingAddressId}`,
          addressPayload
        );
        shippingAddressId = updatedAddress.id!;
        console.log('Updated shipping address:', updatedAddress);
      } else {
        // Create new shipping address
        console.log('Creating new shipping address...');
        const savedAddress = await apiService.postRequest<AddressDto>(
          '/api/addresses/type/SHIPPING',
          addressPayload
        );

        if (!savedAddress.id) {
          throw new Error('Failed to create shipping address - no ID returned');
        }
        shippingAddressId = savedAddress.id;
        console.log('Created shipping address with ID:', shippingAddressId);
      }

      // Create order with the address ID
      const orderData: CreateOrderRequest = {
        shippingAddressId: shippingAddressId,
        contactEmail: contactEmail || undefined,
        contactPhone: contactPhone || undefined,
        giftOptions: giftWrap ? {
          giftWrap: true,
          cardMessage: cardMessage || undefined,
        } : undefined,
        discountCode: discountCode || undefined,
      };

      console.log('Creating order with data:', orderData);
      const orderResponse = await orderService.placeOrder(orderData);

      console.log('Order created - full response:', JSON.stringify(orderResponse, null, 2));

      const orderId = (orderResponse as any).orderId || orderResponse.id;
      const orderNumber = (orderResponse as any).orderNumber || orderResponse.orderNumber || orderId;

      if (!orderId) {
        console.error('Order response missing ID:', orderResponse);
        throw new Error('Order created but no order ID returned. Please check your orders.');
      }

      toast({
        title: "Order Created",
        description: `Order #${orderNumber} created. Redirecting to payment...`,
      });

      navigate(`/payment/stripe?orderId=${orderId}`);

    } catch (error: any) {
      console.error('Failed to create order:', error);
      toast({
        title: "Order Creation Failed",
        description: error.message || "Failed to create order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingOrder(false);
    }
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
            onClick={() => navigate('/cart')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Cart
          </Button>

          <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
          <p className="text-gray-600 mt-2">
            Complete your order details and proceed to payment
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Shipping Information */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Shipping Information</span>
                  {isLoadingAddress && (
                    <span className="text-sm text-gray-500 flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading saved address...
                    </span>
                  )}
                  {!isLoadingAddress && existingAddressId && (
                    <Badge variant="secondary">Saved Address Loaded</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="contactEmail">Contact Email</Label>
                    <Input
                      id="contactEmail"
                      name="contactEmail"
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="email@example.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      name="phone"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="+251 9XX XXX XXX"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="street">Street Address *</Label>
                    <Input
                      id="street"
                      name="street"
                      value={shippingInfo.street}
                      onChange={handleInputChange}
                      placeholder="Street address"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        name="city"
                        value={shippingInfo.city}
                        onChange={handleInputChange}
                        placeholder="City"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State/Region</Label>
                      <Input
                        id="state"
                        name="state"
                        value={shippingInfo.state}
                        onChange={handleInputChange}
                        placeholder="State or Region"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      name="country"
                      value={shippingInfo.country}
                      onChange={handleInputChange}
                      placeholder="Country"
                      disabled
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Gift Options */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5" />
                  Gift Options
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="giftWrap"
                    checked={giftWrap}
                    onCheckedChange={(checked) => setGiftWrap(checked === true)}
                  />
                  <Label htmlFor="giftWrap" className="cursor-pointer">
                    Add gift wrapping
                  </Label>
                </div>

                {giftWrap && (
                  <div>
                    <Label htmlFor="cardMessage">Gift Card Message</Label>
                    <Textarea
                      id="cardMessage"
                      value={cardMessage}
                      onChange={(e) => setCardMessage(e.target.value)}
                      placeholder="Write a personal message for the gift card..."
                      rows={3}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Discount Code */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Discount Code
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex space-x-2">
                  <Input
                    placeholder="Enter discount code"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    type="button"
                    className="border-ethiopian-gold text-ethiopian-gold hover:bg-ethiopian-gold hover:text-white"
                  >
                    Apply
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Discount will be applied when order is placed
                </p>
              </CardContent>
            </Card>

            {/* Payment Methods Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Methods
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
                    <strong>Secure Payment:</strong> You will be redirected to our secure payment page after confirming your order.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

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
                        src={
                          item.productImage ||
                          item.product?.cover ||
                          item.product?.imageUrl ||
                          item.product?.images?.[0] ||
                          "/placeholder-product.jpg"
                        }
                        alt={item.productName || item.product?.name || "Product"}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1">
                      <h4 className="font-medium line-clamp-2">
                        {item.productName || item.product?.name || `Product #${item.productId}`}
                      </h4>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm text-gray-600">
                          Qty: {item.quantity}
                        </span>
                        <div className="text-right">
                          <p className="font-semibold">
                            {(item.totalPrice || item.unitPrice || 0).toLocaleString()} ETB
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
                    <span>{totalPrice.toLocaleString()} ETB</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Shipping</span>
                    <span className="text-green-600">Free</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>{totalPrice.toLocaleString()} ETB</span>
                  </div>
                </div>

                <Button
                  onClick={handleProceedToPayment}
                  disabled={isCreatingOrder}
                  className="w-full h-12 text-lg mt-4"
                >
                  {isCreatingOrder ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Creating Order...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-5 w-5" />
                      Proceed to Payment
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
