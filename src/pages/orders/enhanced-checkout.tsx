import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import PaymentMethodSelector, { PaymentMethodType } from '@/components/PaymentMethodSelector';
import StripeCheckout from '@/components/StripeCheckout';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { formatDualCurrency } from '@/lib/currency';
import { ShoppingCart, User, CreditCard, CheckCircle, AlertCircle, Gift, MapPin } from 'lucide-react';

const checkoutSchema = z.object({
  recipientName: z.string().min(2, 'Recipient name is required'),
  recipientEmail: z.string().email('Valid email is required'),
  recipientPhone: z.string().min(10, 'Valid phone number is required'),
  recipientAddress: z.string().min(10, 'Complete address is required'),
  recipientCity: z.string().min(2, 'City is required'),
  deliveryType: z.enum(['standard', 'express', 'priority']),
  personalMessage: z.string().optional(),
  giftWrap: z.boolean().default(false),
  anonymousGift: z.boolean().default(false),
});

type CheckoutForm = z.infer<typeof checkoutSchema>;

interface CartItem {
  id: string;
  productId: number;
  quantity: number;
  product: {
    id: number;
    name: string;
    price: string;
    imageUrl?: string;
  };
}

export default function EnhancedCheckout() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethodType>('stripe');
  const [paymentData, setPaymentData] = useState<any>(null);
  const [orderData, setOrderData] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      recipientName: '',
      recipientEmail: '',
      recipientPhone: '',
      recipientAddress: '',
      recipientCity: 'Addis Ababa',
      deliveryType: 'standard',
      personalMessage: '',
      giftWrap: false,
      anonymousGift: false,
    },
  });

  // Fetch cart items
  const { data: cartItems = [], isLoading: cartLoading } = useQuery<CartItem[]>({
    queryKey: ['/api/cart'],
  });

  // Calculate order totals
  const calculateSubtotal = () => {
    return cartItems.reduce((total: number, item: CartItem) => {
      const price = parseFloat(item.product?.price || '0');
      return total + (price * item.quantity);
    }, 0);
  };

  const calculateDeliveryFee = () => {
    const deliveryType = form.watch('deliveryType');
    const subtotal = calculateSubtotal();
    
    if (deliveryType === 'standard' && subtotal >= 1000) return 0;
    
    switch (deliveryType) {
      case 'standard': return 50;
      case 'express': return 100;
      case 'priority': return 200;
      default: return 50;
    }
  };

  const calculateExtrasFee = () => {
    let total = 0;
    if (form.watch('giftWrap')) total += 30;
    return total;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateDeliveryFee() + calculateExtrasFee();
  };

  const { etb, usd } = formatDualCurrency(calculateTotal());

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (formData: CheckoutForm) => {
      const orderPayload = {
        ...formData,
        items: cartItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.product.price
        })),
        subtotal: calculateSubtotal(),
        deliveryFee: calculateDeliveryFee(),
        extrasFee: calculateExtrasFee(),
        total: calculateTotal(),
        currency: 'ETB',
        paymentMethod: selectedPaymentMethod,
      };

      return await apiRequest('POST', '/api/orders', orderPayload);
    },
    onSuccess: (data) => {
      setOrderData(data);
      setCurrentStep(3);
      toast({
        title: "Order Created",
        description: "Proceeding to payment...",
      });
    },
    onError: (error) => {
      toast({
        title: "Order Failed",
        description: "Failed to create order. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: CheckoutForm) => {
    createOrderMutation.mutate(data);
  };

  // Handle payment method selection
  const handlePaymentMethodSelect = (method: PaymentMethodType, data?: any) => {
    setSelectedPaymentMethod(method);
    setPaymentData(data);
    setCurrentStep(3);
  };

  // Handle payment success
  const handlePaymentSuccess = (paymentResult: any) => {
    queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
    toast({
      title: "Payment Successful!",
      description: "Your order has been placed successfully.",
    });
    // Redirect to order confirmation page
    window.location.href = `/order-success?orderId=${orderData?.id}`;
  };

  // Handle payment error
  const handlePaymentError = (error: string) => {
    toast({
      title: "Payment Failed",
      description: error,
      variant: "destructive",
    });
    setCurrentStep(2); // Go back to payment method selection
  };

  if (cartLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <ShoppingCart className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-2xl font-bold text-gray-700 mb-2">Your cart is empty</h2>
        <p className="text-gray-500 mb-6">Add some items to your cart to proceed with checkout.</p>
        <Button asChild>
          <a href="/shop">Continue Shopping</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center space-x-4">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                currentStep >= step 
                  ? 'bg-amber-600 text-white' 
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {currentStep > step ? (
                  <CheckCircle className="w-6 h-6" />
                ) : (
                  step
                )}
              </div>
              <span className={`ml-2 text-sm font-medium ${
                currentStep >= step ? 'text-amber-600' : 'text-gray-500'
              }`}>
                {step === 1 && 'Details'}
                {step === 2 && 'Payment'}
                {step === 3 && 'Complete'}
              </span>
              {step < 3 && <div className="w-8 h-px bg-gray-300 ml-4" />}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Order Summary Sidebar */}
        <div className="lg:col-span-1 order-2 lg:order-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ShoppingCart className="w-5 h-5" />
                <span>Order Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Cart Items */}
              <div className="space-y-3">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      {item.product?.imageUrl ? (
                        <img 
                          src={item.product.imageUrl} 
                          alt={item.product.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <Gift className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{item.product.name}</div>
                      <div className="text-xs text-gray-500">Qty: {item.quantity}</div>
                    </div>
                    <div className="text-sm font-medium">
                      {formatDualCurrency(parseFloat(item.product.price) * item.quantity).etb}
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Order Totals */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatDualCurrency(calculateSubtotal()).etb}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery</span>
                  <span>
                    {calculateDeliveryFee() === 0 ? (
                      <Badge variant="secondary" className="text-xs">Free</Badge>
                    ) : (
                      formatDualCurrency(calculateDeliveryFee()).etb
                    )}
                  </span>
                </div>
                {calculateExtrasFee() > 0 && (
                  <div className="flex justify-between">
                    <span>Gift Wrap</span>
                    <span>{formatDualCurrency(calculateExtrasFee()).etb}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <div className="text-right">
                    <div className="text-amber-600">{etb}</div>
                    <div className="text-xs text-gray-500">{usd}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2 order-1 lg:order-2">
          {/* Step 1: Delivery Details */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="w-5 h-5" />
                  <span>Delivery Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="recipientName">Recipient Name *</Label>
                      <Input
                        id="recipientName"
                        {...form.register('recipientName')}
                        placeholder="Full name"
                      />
                      {form.formState.errors.recipientName && (
                        <p className="text-sm text-red-600 mt-1">
                          {form.formState.errors.recipientName.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="recipientEmail">Email Address *</Label>
                      <Input
                        id="recipientEmail"
                        type="email"
                        {...form.register('recipientEmail')}
                        placeholder="recipient@example.com"
                      />
                      {form.formState.errors.recipientEmail && (
                        <p className="text-sm text-red-600 mt-1">
                          {form.formState.errors.recipientEmail.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="recipientPhone">Phone Number *</Label>
                      <Input
                        id="recipientPhone"
                        {...form.register('recipientPhone')}
                        placeholder="+251 9XX XXX XXX"
                      />
                      {form.formState.errors.recipientPhone && (
                        <p className="text-sm text-red-600 mt-1">
                          {form.formState.errors.recipientPhone.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="recipientCity">City *</Label>
                      <Input
                        id="recipientCity"
                        {...form.register('recipientCity')}
                        placeholder="Addis Ababa"
                      />
                      {form.formState.errors.recipientCity && (
                        <p className="text-sm text-red-600 mt-1">
                          {form.formState.errors.recipientCity.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="recipientAddress">Complete Address *</Label>
                    <Textarea
                      id="recipientAddress"
                      {...form.register('recipientAddress')}
                      placeholder="House number, street name, area, landmarks..."
                      className="h-20"
                    />
                    {form.formState.errors.recipientAddress && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.recipientAddress.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="personalMessage">Personal Message (Optional)</Label>
                    <Textarea
                      id="personalMessage"
                      {...form.register('personalMessage')}
                      placeholder="Add a heartfelt message for your loved one..."
                      className="h-24"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="giftWrap"
                        {...form.register('giftWrap')}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor="giftWrap">Add gift wrapping (+30 ETB)</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="anonymousGift"
                        {...form.register('anonymousGift')}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor="anonymousGift">Send as anonymous gift</Label>
                    </div>
                  </div>

                  <Button 
                    type="button"
                    onClick={() => {
                      form.handleSubmit((data) => {
                        setCurrentStep(2);
                      })();
                    }}
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                    size="lg"
                  >
                    Continue to Payment
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Payment Method Selection */}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="w-5 h-5" />
                  <span>Payment Method</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PaymentMethodSelector
                  amount={calculateTotal()}
                  currency="ETB"
                  onPaymentMethodSelect={handlePaymentMethodSelect}
                  userLocation="Ethiopia" // TODO: Detect user location
                />
                
                <div className="mt-6 flex space-x-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setCurrentStep(1)}
                    className="flex-1"
                  >
                    Back to Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Payment Processing */}
          {currentStep === 3 && selectedPaymentMethod === 'stripe' && (
            <StripeCheckout
              amount={calculateTotal()}
              currency="ETB"
              orderData={orderData}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
            />
          )}

          {/* Placeholder for other payment methods */}
          {currentStep === 3 && selectedPaymentMethod !== 'stripe' && (
            <Card>
              <CardContent className="pt-6">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {selectedPaymentMethod === 'paypal' && 
                      'PayPal integration is ready but requires API credentials. Please add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to enable this payment method.'}
                    {selectedPaymentMethod === 'chapa' && 
                      'Chapa integration is ready but requires API credentials. Please add CHAPA_SECRET_KEY to enable Ethiopian payment processing.'}
                    {selectedPaymentMethod === 'telebirr' && 
                      'Telebirr integration is ready but requires API credentials. Please add TELEBIRR_API_KEY to enable mobile money payments.'}
                  </AlertDescription>
                </Alert>
                
                <div className="mt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setCurrentStep(2)}
                    className="w-full"
                  >
                    Choose Different Payment Method
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}