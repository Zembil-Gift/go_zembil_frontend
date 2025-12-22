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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, ArrowLeft, CreditCard, Globe, Smartphone, Loader2, Gift, Tag } from "lucide-react";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/currency";
import { apiService } from "@/services/apiService";
import { orderService, type CreateOrderRequest } from "@/services/orderService";
import { getProductImageUrl, getSkuImageUrl } from "@/utils/imageUtils";

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

const COUNTRIES = [
  { value: "United States", label: "United States" },
  { value: "Ethiopia", label: "Ethiopia" },
  { value: "Canada", label: "Canada" },
  { value: "United Kingdom", label: "United Kingdom" },
  { value: "Europe", label: "Europe" },
  { value: "Australia", label: "Australia" },
  { value: "Middle East", label: "Middle East" },
];

const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
  { value: "DC", label: "District of Columbia" },
];

export default function Checkout() {
  const { isAuthenticated, user } = useAuth();
  const { cartItems, cartCurrency, getTotalPrice, getTotalItems, clearCart } = useCart();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isLoadingAddress, setIsLoadingAddress] = useState(true);
  const [existingAddressId, setExistingAddressId] = useState<number | null>(null);
  const [existingBillingAddressId, setExistingBillingAddressId] = useState<number | null>(null);
  const [orderIdempotencyKey, setOrderIdempotencyKey] = useState<string | null>(null);
  const [shippingInfo, setShippingInfo] = useState({
    street: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
  });
  const [billingInfo, setBillingInfo] = useState({
    street: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
  });
  const [sameAsShipping, setSameAsShipping] = useState(true);
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [giftWrap, setGiftWrap] = useState(false);
  const [cardMessage, setCardMessage] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'stripe' | 'chapa'>('stripe');
  const [shippingStateSearch, setShippingStateSearch] = useState("");
  const [billingStateSearch, setBillingStateSearch] = useState("");

  const filteredShippingStates = US_STATES.filter(state =>
    state.label.toLowerCase().includes(shippingStateSearch.toLowerCase()) ||
    state.value.toLowerCase().includes(shippingStateSearch.toLowerCase())
  );

  const filteredBillingStates = US_STATES.filter(state =>
    state.label.toLowerCase().includes(billingStateSearch.toLowerCase()) ||
    state.value.toLowerCase().includes(billingStateSearch.toLowerCase())
  );

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
        const billingAddress = addresses?.find(addr => addr.type === 'BILLING');

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

        if (billingAddress) {
          setExistingBillingAddressId(billingAddress.id || null);
          setBillingInfo({
            street: billingAddress.street || "",
            city: billingAddress.city || "",
            state: billingAddress.state || "",
            postalCode: billingAddress.postalCode || "0000",
            country: billingAddress.country || "",
          });
          setSameAsShipping(false);
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

  const handleBillingInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBillingInfo({
      ...billingInfo,
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

    // Generate idempotency key once for this order attempt
    // If user retries after a failure, we reuse the same key
    let currentIdempotencyKey = orderIdempotencyKey;
    console.log('Current idempotency key from state:', currentIdempotencyKey);
    if (!currentIdempotencyKey) {
      currentIdempotencyKey = crypto.randomUUID();
      console.log('Generated NEW idempotency key:', currentIdempotencyKey);
      setOrderIdempotencyKey(currentIdempotencyKey);
    } else {
      console.log('REUSING existing idempotency key:', currentIdempotencyKey);
    }

    try {
      let shippingAddressId: number;

      const addressPayload: AddressDto = {
        street: shippingInfo.street,
        city: shippingInfo.city,
        state: shippingInfo.state || shippingInfo.city,
        postalCode: shippingInfo.postalCode || '',
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

      // Handle billing address
      let billingAddressId: number | undefined;
      
      if (sameAsShipping) {
        // Create billing address with same data as shipping
        const billingPayload: AddressDto = {
          street: shippingInfo.street,
          city: shippingInfo.city,
          state: shippingInfo.state || shippingInfo.city,
          postalCode: shippingInfo.postalCode || '',
          country: shippingInfo.country,
          contactName: user?.name || '',
          contactPhone: contactPhone,
          type: 'BILLING',
          isDefault: false,
        };

        if (existingBillingAddressId) {
          // Update existing billing address with shipping data
          console.log('Updating billing address with shipping data:', existingBillingAddressId);
          const updatedBillingAddress = await apiService.putRequest<AddressDto>(
            `/api/addresses/${existingBillingAddressId}`,
            billingPayload
          );
          billingAddressId = updatedBillingAddress.id!;
        } else {
          // Create new billing address with shipping data
          console.log('Creating billing address with same data as shipping...');
          const savedBillingAddress = await apiService.postRequest<AddressDto>(
            '/api/addresses/type/BILLING',
            billingPayload
          );
          billingAddressId = savedBillingAddress.id;
          setExistingBillingAddressId(billingAddressId || null);
        }
        console.log('Billing address (same as shipping) ID:', billingAddressId);
      } else {
        // Different billing address - validate and create/update
        if (!billingInfo.street || !billingInfo.city || !billingInfo.country) {
          toast({
            title: "Missing Information",
            description: "Please fill in all required billing information.",
            variant: "destructive",
          });
          setIsCreatingOrder(false);
          return;
        }

        const billingPayload: AddressDto = {
          street: billingInfo.street,
          city: billingInfo.city,
          state: billingInfo.state || billingInfo.city,
          postalCode: billingInfo.postalCode || '',
          country: billingInfo.country,
          contactName: user?.name || '',
          contactPhone: contactPhone,
          type: 'BILLING',
          isDefault: false,
        };

        if (existingBillingAddressId) {
          // Update existing billing address
          console.log('Updating existing billing address:', existingBillingAddressId);
          const updatedBillingAddress = await apiService.putRequest<AddressDto>(
            `/api/addresses/${existingBillingAddressId}`,
            billingPayload
          );
          billingAddressId = updatedBillingAddress.id!;
        } else {
          // Create new billing address
          console.log('Creating new billing address...');
          const savedBillingAddress = await apiService.postRequest<AddressDto>(
            '/api/addresses/type/BILLING',
            billingPayload
          );
          billingAddressId = savedBillingAddress.id;
        }
        console.log('Billing address ID:', billingAddressId);
      }

      // Create order with address IDs
      const orderData: CreateOrderRequest = {
        shippingAddressId: shippingAddressId,
        billingAddressId: billingAddressId, // undefined when sameAsShipping=true, backend will handle this
        contactEmail: contactEmail || undefined,
        contactPhone: contactPhone || undefined,
        giftOptions: giftWrap ? {
          giftWrap: true,
          cardMessage: cardMessage || undefined,
        } : undefined,
        discountCode: discountCode || undefined,
      };

      console.log('Creating order with data:', orderData);
      console.log('Using idempotency key for API call:', currentIdempotencyKey);
      const orderResponse = await orderService.placeOrder(orderData, currentIdempotencyKey);

      console.log('Order created - full response:', JSON.stringify(orderResponse, null, 2));

      const orderId = (orderResponse as any).orderId || orderResponse.id;
      const orderNumber = (orderResponse as any).orderNumber || orderResponse.orderNumber || orderId;

      if (!orderId) {
        console.error('Order response missing ID:', orderResponse);
        throw new Error('Order created but no order ID returned. Please check your orders.');
      }

      toast({
        title: "Order Created",
        description: `Order #${orderNumber} created. Review your order details...`,
      });

      // Reset idempotency key for next order
      setOrderIdempotencyKey(null);

      // Navigate to order review page before payment
      navigate(`/order-review?orderId=${orderId}&paymentMethod=${selectedPaymentMethod}`);

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
                    {shippingInfo.country === "United States" && (
                      <div>
                        <Label htmlFor="state">State *</Label>
                        <Select
                          value={shippingInfo.state}
                          onValueChange={(value) => setShippingInfo({ ...shippingInfo, state: value })}
                        >
                          <SelectTrigger id="state">
                            <SelectValue placeholder="Select a state" />
                          </SelectTrigger>
                          <SelectContent>
                            <div className="p-2">
                              <Input
                                placeholder="Search states..."
                                value={shippingStateSearch}
                                onChange={(e) => setShippingStateSearch(e.target.value)}
                                className="mb-2"
                              />
                            </div>
                            {filteredShippingStates.map((state) => (
                              <SelectItem key={state.value} value={state.value}>
                                {state.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="postalCode">Postal Code</Label>
                      <Input
                        id="postalCode"
                        name="postalCode"
                        value={shippingInfo.postalCode}
                        onChange={handleInputChange}
                        placeholder="Postal code"
                      />
                    </div>
                    <div>
                      <Label htmlFor="country">Country *</Label>
                      <Select
                        value={shippingInfo.country}
                        onValueChange={(value) => {
                          setShippingInfo({ ...shippingInfo, country: value, state: "" });
                          setShippingStateSearch("");
                        }}
                      >
                        <SelectTrigger id="country">
                          <SelectValue placeholder="Select a country" />
                        </SelectTrigger>
                        <SelectContent>
                          {COUNTRIES.map((country) => (
                            <SelectItem key={country.value} value={country.value}>
                              {country.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Billing Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Billing Address</span>
                  {!sameAsShipping && existingBillingAddressId && (
                    <Badge variant="secondary">Saved Billing Address</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sameAsShipping"
                    checked={sameAsShipping}
                    onCheckedChange={(checked) => setSameAsShipping(checked === true)}
                  />
                  <Label htmlFor="sameAsShipping" className="cursor-pointer">
                    Same as shipping address
                  </Label>
                </div>

                {!sameAsShipping && (
                  <div className="grid grid-cols-1 gap-4 pt-4 border-t">
                    <div>
                      <Label htmlFor="billingStreet">Street Address *</Label>
                      <Input
                        id="billingStreet"
                        name="street"
                        value={billingInfo.street}
                        onChange={handleBillingInputChange}
                        placeholder="Billing street address"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="billingCity">City *</Label>
                        <Input
                          id="billingCity"
                          name="city"
                          value={billingInfo.city}
                          onChange={handleBillingInputChange}
                          placeholder="City"
                          required
                        />
                      </div>
                      {billingInfo.country === "United States" && (
                        <div>
                          <Label htmlFor="billingState">State *</Label>
                          <Select
                            value={billingInfo.state}
                            onValueChange={(value) => setBillingInfo({ ...billingInfo, state: value })}
                          >
                            <SelectTrigger id="billingState">
                              <SelectValue placeholder="Select a state" />
                            </SelectTrigger>
                            <SelectContent>
                              <div className="p-2">
                                <Input
                                  placeholder="Search states..."
                                  value={billingStateSearch}
                                  onChange={(e) => setBillingStateSearch(e.target.value)}
                                  className="mb-2"
                                />
                              </div>
                              {filteredBillingStates.map((state) => (
                                <SelectItem key={state.value} value={state.value}>
                                  {state.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="billingPostalCode">Postal Code</Label>
                        <Input
                          id="billingPostalCode"
                          name="postalCode"
                          value={billingInfo.postalCode}
                          onChange={handleBillingInputChange}
                          placeholder="Postal code"
                        />
                      </div>
                      <div>
                        <Label htmlFor="billingCountry">Country *</Label>
                        <Select
                          value={billingInfo.country}
                          onValueChange={(value) => {
                            setBillingInfo({ ...billingInfo, country: value, state: "" });
                            setBillingStateSearch("");
                          }}
                        >
                          <SelectTrigger id="billingCountry">
                            <SelectValue placeholder="Select a country" />
                          </SelectTrigger>
                          <SelectContent>
                            {COUNTRIES.map((country) => (
                              <SelectItem key={country.value} value={country.value}>
                                {country.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
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
                  Select Payment Method
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Stripe Option */}
                <div 
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedPaymentMethod === 'stripe' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedPaymentMethod('stripe')}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedPaymentMethod === 'stripe' ? 'border-blue-500' : 'border-gray-300'
                    }`}>
                      {selectedPaymentMethod === 'stripe' && (
                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-blue-600" />
                        <span className="font-medium">Stripe</span>
                        <span className="text-xs text-gray-500">(International)</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Credit/Debit Cards, Apple Pay, Google Pay, PayPal
                      </p>
                    </div>
                  </div>
                </div>

                {/* Chapa Option */}
                <div 
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedPaymentMethod === 'chapa' 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedPaymentMethod('chapa')}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedPaymentMethod === 'chapa' ? 'border-green-500' : 'border-gray-300'
                    }`}>
                      {selectedPaymentMethod === 'chapa' && (
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-5 w-5 text-green-600" />
                        <span className="font-medium">Chapa</span>
                        <span className="text-xs text-gray-500">(Ethiopia)</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Telebirr, M-Pesa, CBE Birr, Bank Transfer
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Secure Payment:</strong> You will be redirected to complete your payment securely.
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
                {cartItems.map((item: CartItem) => {
                  // Get image URL with SKU image priority, fallback to product image
                  const imageUrl = getSkuImageUrl(
                    item.productSku?.images,
                    item.product?.images,
                    item.product?.cover
                  );
                  
                  return (
                  <div key={item.id} className="flex gap-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-md overflow-hidden">
                      <img
                        src={imageUrl}
                        alt={item.productName || item.product?.name || "Product"}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1">
                      <h4 className="font-medium line-clamp-2">
                        {item.productName || item.product?.name || `Product #${item.productId}`}
                      </h4>
                      {item.productSku?.attributes && item.productSku.attributes.length > 0 && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {item.productSku.attributes.map(attr => `${attr.name}: ${attr.value}`).join(', ')}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm text-gray-600">
                          Qty: {item.quantity}
                        </span>
                        <div className="text-right">
                          <p className="font-semibold">
                            {formatPrice(item.totalPrice || item.unitPrice || 0, cartCurrency)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  );
                })}

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatPrice(totalPrice, cartCurrency)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Shipping</span>
                    <span className="text-gray-500">Based on address</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Subtotal</span>
                    <span>{formatPrice(totalPrice, cartCurrency)}</span>
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
