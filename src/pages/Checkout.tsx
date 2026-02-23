import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { StateSelect, COUNTRIES } from "@/components/ui/state-select";
import { useNavigate, useLocation } from "react-router-dom";
import { ShoppingCart, ArrowLeft, CreditCard, Smartphone, Loader2, Gift, Tag, CheckCircle2, XCircle, AlertCircle, MapPin } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { formatPrice, toMinorUnits, getCurrencyDecimals, getDiscountAmountForDisplay, calculateDiscountedPrice } from "@/lib/currency";
import { apiService } from "@/services/apiService";
import { orderService, type CreateOrderRequest } from "@/services/orderService";
import { discountService, type DiscountValidationResult } from "@/services/discountService";
import { type CartItem } from "@/services/cartService";
import { getPaymentMethodsForCountry, getDefaultPaymentMethod, type PaymentMethod } from "@/lib/countryConfig";
import { paymentMethodConfigService } from "@/services/paymentMethodConfigService";
import { LocationPicker, type LocationData } from "@/components/maps";

interface CurrencyConversionDto {
  amount: number;
  fromCurrency: string;
  toCurrency: string;
  convertedAmount: number;
  rate: number;
  rateTimestamp?: string;
}

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
  latitude?: number;
  longitude?: number;
  placeId?: string;
  formattedAddress?: string;
}

export default function Checkout() {
  const { isAuthenticated, user } = useAuth();
  const { 
    cartItems, 
    cartCurrency, 
    getTotalItems,
    appliedDiscountCode,
    setAppliedDiscountCode
  } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
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
  const [discountCode, setDiscountCode] = useState(appliedDiscountCode || "");
  const [discountResult, setDiscountResult] = useState<DiscountValidationResult | null>(null);
  const [isValidatingDiscount, setIsValidatingDiscount] = useState(false);
  const [discountError, setDiscountError] = useState<string | null>(null);

  // Shipping address geolocation
  const [shippingCoords, setShippingCoords] = useState<{
    latitude?: number;
    longitude?: number;
    placeId?: string;
    formattedAddress?: string;
  }>({});

  // Delivery estimate from backend (distance-based fee + radius check)
  interface DeliveryEstimate {
    distanceMeters?: number;
    distanceText?: string;
    deliveryFee?: number;
    currencyCode?: string;
    withinDeliveryRadius?: boolean;
    vendorDeliveryRadiusKm?: number;
    distanceKm?: number;
    vendorLocationAvailable?: boolean;
  }
  const [deliveryEstimate, setDeliveryEstimate] = useState<DeliveryEstimate | null>(null);
  const [isEstimatingDelivery, setIsEstimatingDelivery] = useState(false);

  const fetchDeliveryEstimate = async (lat: number, lng: number) => {
    setIsEstimatingDelivery(true);
    setDeliveryEstimate(null);
    try {
      const result = await apiService.postRequest<DeliveryEstimate>(
        '/api/delivery/estimate/cart',
        { destinationLatitude: lat, destinationLongitude: lng }
      );
      setDeliveryEstimate(result);
    } catch (err: any) {
      console.warn('Delivery estimate failed:', err?.message);
      setDeliveryEstimate(null);
    } finally {
      setIsEstimatingDelivery(false);
    }
  };

  
  // Determine available payment methods based on user's country AND backend config
  const userCountry = user?.country || '';
  const countryPaymentMethods = useMemo(() => getPaymentMethodsForCountry(userCountry), [userCountry]);

  // Fetch backend-enabled payment methods
  const { data: backendEnabledMethods } = useQuery({
    queryKey: ['payment-method-configs'],
    queryFn: () => paymentMethodConfigService.getAllConfigs(),
    staleTime: 60_000, // Cache for 1 minute
  });

  // Cross-reference: only show methods that are both country-appropriate AND backend-enabled
  const availablePaymentMethods = useMemo(() => {
    if (!backendEnabledMethods) return countryPaymentMethods; // Fallback while loading
    const enabledSet = new Set(
      backendEnabledMethods
        .filter((c) => c.enabled)
        .map((c) => c.paymentMethod.toLowerCase())
    );
    return countryPaymentMethods.filter((m) => enabledSet.has(m));
  }, [countryPaymentMethods, backendEnabledMethods]);

  const defaultPaymentMethod = useMemo(() => {
    if (availablePaymentMethods.length > 0) return availablePaymentMethods[0];
    return getDefaultPaymentMethod(userCountry);
  }, [availablePaymentMethods, userCountry]);
  
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>(defaultPaymentMethod);
  const [telebirrConversion, setTelebirrConversion] = useState<CurrencyConversionDto | null>(null);
  const [isConvertingTelebirr, setIsConvertingTelebirr] = useState(false);
  
  const totalItems = getTotalItems();

  // Extract product IDs from cart for discount validation
  const cartProductIds = useMemo(() => {
    if (!Array.isArray(cartItems)) return [];
    return cartItems.map((item: CartItem) => item.productId).filter(Boolean);
  }, [cartItems]);

  const getDiscountedItemTotal = useCallback((item: CartItem) => {
    const baseUnitPrice = Number(item.unitPrice || 0);
    const discount = item.product?.activeDiscount;
    const discountedUnitPrice = discount
      ? calculateDiscountedPrice(baseUnitPrice, cartCurrency, discount)
      : baseUnitPrice;
    return discountedUnitPrice * item.quantity;
  }, [cartCurrency]);

  const effectiveSubtotal = useMemo(() => {
    if (!Array.isArray(cartItems)) return 0;
    return cartItems.reduce((total, item) => total + getDiscountedItemTotal(item), 0);
  }, [cartItems, getDiscountedItemTotal]);

  const handleApplyDiscount = useCallback(async (codeOverride?: string) => {
    const code = (codeOverride || discountCode).trim();
    if (!code) {
      setDiscountError("Please enter a discount code");
      return;
    }
    if (!cartCurrency || effectiveSubtotal <= 0) {
      setDiscountError("Cart is empty or currency not set");
      return;
    }

    setIsValidatingDiscount(true);
    setDiscountError(null);
    setDiscountResult(null);

    try {
      const result = await discountService.validateDiscountCode({
        discountCode: code,
        orderTotalMinor: toMinorUnits(effectiveSubtotal, cartCurrency),
        productIds: cartProductIds,
      });

      if (result.applicable) {
        setDiscountResult(result);
        setAppliedDiscountCode(code);
        setDiscountError(null);
        toast({
          title: "Discount Applied",
          description: `Discount code "${code}" applied successfully!`,
        });
      } else {
        setDiscountResult(null);
        setAppliedDiscountCode(null);
        setDiscountError(result.reason || "Discount code is not valid for this order");
      }
    } catch (error: any) {
      setDiscountResult(null);
      setAppliedDiscountCode(null);
      setDiscountError(error?.message || "Failed to validate discount code");
    } finally {
      setIsValidatingDiscount(false);
    }
  }, [discountCode, cartCurrency, effectiveSubtotal, cartProductIds, toast, setAppliedDiscountCode]);

  const handleRemoveDiscount = useCallback(() => {
    setDiscountResult(null);
    setDiscountError(null);
    setDiscountCode("");
    setAppliedDiscountCode(null);
  }, [setAppliedDiscountCode]);

  // Handle automatic discount application from persistent state
  useEffect(() => {
    if (appliedDiscountCode && 
        cartCurrency && 
        effectiveSubtotal > 0 && 
        !discountResult && 
        !isValidatingDiscount && 
        !discountError) {
      handleApplyDiscount(appliedDiscountCode);
    }
  }, [appliedDiscountCode, cartCurrency, effectiveSubtotal, discountResult, isValidatingDiscount, discountError, handleApplyDiscount]);

  // Update selected payment method when default changes (e.g., user data loads)
  useEffect(() => {
    if (!availablePaymentMethods.includes(selectedPaymentMethod)) {
      setSelectedPaymentMethod(defaultPaymentMethod);
    }
  }, [availablePaymentMethods, selectedPaymentMethod, defaultPaymentMethod]);

  // Calculate the discount amount in display (major) units
  const discountAmountDisplay = useMemo(() => {
    return getDiscountAmountForDisplay(discountResult, cartCurrency);
  }, [discountResult, cartCurrency]);

  // Final total after discount
  const finalTotal = useMemo(() => {
    return Math.max(0, effectiveSubtotal - discountAmountDisplay);
  }, [effectiveSubtotal, discountAmountDisplay]);

  useEffect(() => {
    let cancelled = false;

    const shouldConvert = selectedPaymentMethod === 'telebirr'
      && cartCurrency
      && cartCurrency.toUpperCase() !== 'ETB'
      && effectiveSubtotal > 0;

    if (!shouldConvert) {
      setTelebirrConversion(null);
      setIsConvertingTelebirr(false);
      return;
    }

    const fetchConversion = async () => {
      try {
        setIsConvertingTelebirr(true);
        const result = await apiService.getRequest<CurrencyConversionDto>(
          `/api/currencies/convert?amount=${encodeURIComponent(effectiveSubtotal)}&from=${encodeURIComponent(cartCurrency)}&to=ETB`
        );
        if (!cancelled) {
          setTelebirrConversion(result);
        }
      } catch (error) {
        if (!cancelled) {
          setTelebirrConversion(null);
        }
      } finally {
        if (!cancelled) {
          setIsConvertingTelebirr(false);
        }
      }
    };

    fetchConversion();

    return () => {
      cancelled = true;
    };
  }, [selectedPaymentMethod, cartCurrency, effectiveSubtotal]);

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

          if (shippingAddress.latitude && shippingAddress.longitude) {
            setShippingCoords({
              latitude: shippingAddress.latitude,
              longitude: shippingAddress.longitude,
              placeId: shippingAddress.placeId,
              formattedAddress: shippingAddress.formattedAddress,
            });
          }

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

  const handleBillingInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBillingInfo({
      ...billingInfo,
      [e.target.name]: e.target.value,
    });
  };

  const handleProceedToPayment = async () => {
    // Validate required fields
    const hasValidLocation = shippingCoords.latitude != null || (!!shippingInfo.street && !!shippingInfo.city);
    const isOutsideRadius = deliveryEstimate?.withinDeliveryRadius === false;
    if (!contactPhone || !hasValidLocation) {
      toast({
        title: "Missing Information",
        description: !contactPhone
          ? "Please enter your phone number."
          : "Please pin your delivery location on the map.",
        variant: "destructive",
      });
      return;
    }
    if (isOutsideRadius) {
      toast({
        title: "Outside Delivery Area",
        description: `Your delivery address is ${deliveryEstimate?.distanceKm?.toFixed(1)} km from the vendor, which exceeds their ${deliveryEstimate?.vendorDeliveryRadiusKm?.toFixed(0)} km delivery radius. Please choose a closer address.`,
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
        street: shippingInfo.street || shippingCoords.formattedAddress || '',
        city: shippingInfo.city || shippingInfo.state || 'N/A',
        state: shippingInfo.state || shippingInfo.city || 'N/A',
        postalCode: shippingInfo.postalCode || '',
        country: shippingInfo.country || '',
        type: 'SHIPPING',
        isDefault: true,
        latitude: shippingCoords.latitude,
        longitude: shippingCoords.longitude,
        placeId: shippingCoords.placeId,
        formattedAddress: shippingCoords.formattedAddress,
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

      const orderId = (orderResponse as any).orderId;
      if (!orderId) {
        console.error('Order response missing ID:', orderResponse);
        throw new Error('Order created but no order ID returned. Please check your orders.');
      }

      toast({
        title: "Order Created",
        description: "Your order has been created. Please review the details before payment.",
      });

      // Reset idempotency key for next order
      setOrderIdempotencyKey(null);
      setAppliedDiscountCode(null);

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

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    Delivery Location *
                  </Label>
                  <p className="text-xs text-gray-500">
                    Click on the map or use search to pin your exact delivery location
                  </p>
                  <LocationPicker
                    latitude={shippingCoords.latitude}
                    longitude={shippingCoords.longitude}
                    onLocationSelect={(loc: LocationData) => {
                      setShippingInfo({
                        street: loc.streetAddress || loc.formattedAddress,
                        city: loc.city || loc.state,
                        state: loc.state,
                        postalCode: loc.postalCode,
                        country: loc.country,
                      });
                      setShippingCoords({
                        latitude: loc.latitude,
                        longitude: loc.longitude,
                        placeId: loc.placeId,
                        formattedAddress: loc.formattedAddress,
                      });
                      // Fetch delivery fee estimate for the selected location
                      if (loc.latitude && loc.longitude) {
                        fetchDeliveryEstimate(loc.latitude, loc.longitude);
                      }
                    }}
                    height="320px"
                    placeholder="Search your delivery address..."
                  />
                  {shippingCoords.formattedAddress && (
                    <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-emerald-800">Delivery location confirmed</p>
                        <p className="text-sm text-emerald-700 mt-0.5">{shippingCoords.formattedAddress}</p>
                      </div>
                    </div>
                  )}
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
                          <StateSelect
                            id="billingState"
                            value={billingInfo.state}
                            onValueChange={(value) => setBillingInfo({ ...billingInfo, state: value })}
                          />
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
                {discountResult?.applicable ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="text-sm font-medium text-green-800">
                            Code "{discountCode}" applied
                          </p>
                          <p className="text-xs text-green-600">
                            You save {formatPrice(discountAmountDisplay, cartCurrency)}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveDiscount}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Enter discount code"
                        value={discountCode}
                        onChange={(e) => {
                          setDiscountCode(e.target.value);
                          setDiscountError(null);
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleApplyDiscount()}
                        className={`flex-1 ${discountError ? 'border-red-300' : ''}`}
                        disabled={isValidatingDiscount}
                      />
                      <Button
                        type="button"
                        onClick={handleApplyDiscount}
                        disabled={isValidatingDiscount || !discountCode.trim()}
                        className="bg-eagle-green hover:bg-eagle-green/90 text-white min-w-[90px] font-medium transition-all"
                      >
                        {isValidatingDiscount ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Apply Code'
                        )}
                      </Button>
                    </div>
                    {discountError && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <XCircle className="h-3 w-3" />
                        {discountError}
                      </p>
                    )}
                  </div>
                )}
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
                {/* Stripe Option - Only show for non-Ethiopian users */}
                {availablePaymentMethods.includes('stripe') && (
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
                )}

                {/* Chapa Option - Only show for Ethiopian users */}
                {availablePaymentMethods.includes('chapa') && (
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
                          CBE Birr, M-Pesa, Awash Bank, Bank Transfer
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* TeleBirr Option - Only show for Ethiopian users */}
                {availablePaymentMethods.includes('telebirr') && (
                  <div 
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedPaymentMethod === 'telebirr' 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedPaymentMethod('telebirr')}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedPaymentMethod === 'telebirr' ? 'border-blue-500' : 'border-gray-300'
                      }`}>
                        {selectedPaymentMethod === 'telebirr' && (
                          <div className="w-3 h-3 rounded-full bg-blue-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Smartphone className="h-5 w-5 text-blue-600" />
                          <span className="font-medium">TeleBirr</span>
                          <span className="text-xs text-gray-500">(Ethiopia)</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          TeleBirr Wallet, Bank Account, Cards
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* No payment methods available */}
                {availablePaymentMethods.length === 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No payment methods are currently available. Please try again later or contact support.
                    </AlertDescription>
                  </Alert>
                )}

               
              </CardContent>
            </Card>
          </div>
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
                  const images = item.product?.images as Array<{ id: number; url: string; fullUrl?: string; isPrimary: boolean; sortOrder: number }> | undefined;
                  const imageUrl = images?.[0]?.fullUrl || 
                                   images?.[0]?.url || 
                                   item.product?.cover || 
                                   item.productImage || '';
                  
                  return (
                  <div key={item.id} className="flex gap-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-md overflow-hidden">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={item.productName || item.product?.name || "Product"}
                          className="w-full h-full object-cover"
                          onError={(e) => { 
                            e.currentTarget.classList.add('hidden'); 
                            const fallback = e.currentTarget.nextElementSibling; 
                            if (fallback) fallback.classList.remove('hidden'); 
                          }}
                        />
                      ) : null}
                      <div className={`w-full h-full bg-gray-100 rounded-md flex items-center justify-center ${imageUrl ? 'hidden' : ''}`}>
                        <div className="text-center text-gray-400">
                          <p className="text-xs">No image</p>
                        </div>
                      </div>
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
                          {(() => {
                            const lineTotal = getDiscountedItemTotal(item);
                            const originalLineTotal = Number(item.unitPrice || 0) * item.quantity;
                            const hasDiscount = lineTotal < originalLineTotal;

                            return (
                              <>
                                <p className="font-semibold">
                                  {formatPrice(lineTotal, cartCurrency)}
                                </p>
                                {hasDiscount && (
                                  <p className="text-xs text-gray-500 line-through">
                                    {formatPrice(originalLineTotal, cartCurrency)}
                                  </p>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                  );
                })}

                <Separator className="my-4" />

                {/* Subtotal */}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span>
                    {selectedPaymentMethod === 'telebirr' && telebirrConversion
                      ? formatPrice(telebirrConversion.convertedAmount, 'ETB')
                      : formatPrice(effectiveSubtotal, cartCurrency)}
                  </span>
                </div>

                {/* Delivery Fee */}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Delivery Fee
                  </span>
                  <span className="font-medium">
                    {isEstimatingDelivery ? (
                      <span className="flex items-center gap-1 text-gray-400">
                        <Loader2 className="h-3 w-3 animate-spin" /> Calculating...
                      </span>
                    ) : deliveryEstimate?.deliveryFee != null ? (
                      <span className={deliveryEstimate.withinDeliveryRadius === false ? 'text-red-500' : 'text-gray-900'}>
                        {formatPrice(deliveryEstimate.deliveryFee, deliveryEstimate.currencyCode || cartCurrency)}
                        {deliveryEstimate.distanceText && (
                          <span className="text-xs text-gray-400 ml-1">({deliveryEstimate.distanceText})</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">Select location</span>
                    )}
                  </span>
                </div>

                {/* Outside radius warning */}
                {deliveryEstimate?.withinDeliveryRadius === false && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-red-700">Outside delivery area</p>
                      <p className="text-xs text-red-600">
                        Your address is {deliveryEstimate.distanceKm?.toFixed(1)} km away. This vendor only delivers within {deliveryEstimate.vendorDeliveryRadiusKm?.toFixed(0)} km.
                      </p>
                    </div>
                  </div>
                )}

                {/* Discount */}
                {discountResult?.applicable && discountAmountDisplay > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span className="flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      Discount ({discountCode})
                    </span>
                    <span>-{formatPrice(discountAmountDisplay, cartCurrency)}</span>
                  </div>
                )}
            
                {/* Estimated Total */}
                <div className="flex justify-between font-semibold text-lg pt-2">
                  <span>Estimated Total</span>
                  <span className="text-ethiopian-gold">
                    {selectedPaymentMethod === 'telebirr' && telebirrConversion
                      ? formatPrice(
                          Math.max(0, telebirrConversion.convertedAmount - (discountAmountDisplay * (telebirrConversion.rate || 1))),
                          'ETB'
                        )
                      : formatPrice(finalTotal, cartCurrency)}
                  </span>
                </div>

                {selectedPaymentMethod === 'telebirr' && cartCurrency?.toUpperCase() !== 'ETB' && (
                  <div className="text-xs text-blue-700 bg-blue-50 rounded-md p-2">
                    {isConvertingTelebirr && (
                      <span>Converting total to ETB for TeleBirr...</span>
                    )}
                    {!isConvertingTelebirr && telebirrConversion && (
                      <span>
                        TeleBirr charges in ETB. Converted from {cartCurrency} at rate {telebirrConversion.rate}.
                      </span>
                    )}
                    {!isConvertingTelebirr && !telebirrConversion && (
                      <span>TeleBirr charges in ETB. Unable to fetch conversion rate right now.</span>
                    )}
                  </div>
                )}

                <Button
                  onClick={handleProceedToPayment}
                  disabled={isCreatingOrder || deliveryEstimate?.withinDeliveryRadius === false}
                  className={`w-full h-12 text-lg mt-4 ${
                    deliveryEstimate?.withinDeliveryRadius === false
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                  }`}
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
