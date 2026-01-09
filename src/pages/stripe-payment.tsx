import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, CreditCard, Loader2, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { paymentService } from '@/services/paymentService';
import { apiService } from '@/services/apiService';
import { eventOrderService } from '@/services/eventOrderService';
import { customOrderService } from '@/services/customOrderService';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

const getCountryCode = (country?: string): string => {
  if (!country) return '';
  const countryMap: Record<string, string> = {
    'Ethiopia': 'ET',
    'USA': 'US',
    'United States': 'US',
    'United States of America': 'US',
  };
  return countryMap[country] || country;
};

interface PaymentFormProps {
  clientSecret: string;
  orderId: number;
  amount: number;
  currency: string;
  billingDetails?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      postal_code?: string;
      country?: string;
    };
  };
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
}

/**
 * Payment Form Component - Handles the actual payment submission
 */
function PaymentForm({ orderId, amount, currency, billingDetails, onSuccess, onError }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const { toast } = useToast();
  useNavigate();
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      console.error('Stripe or Elements not loaded');
      return;
    }

    if (isProcessing) {
      return; // Prevent multiple submissions
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      // Confirm the payment with Stripe
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success?orderId=${orderId}`,
        },
        redirect: 'if_required' // Only redirect if required by payment method
      });

      if (error) {
        // Payment failed
        const message = error.message || 'Payment failed. Please try again.';
        setErrorMessage(message);
        onError(message);
        
        toast({
          title: "Payment Failed",
          description: message,
          variant: "destructive",
        });
      } else if (paymentIntent) {
        // Payment succeeded
        if (paymentIntent.status === 'succeeded') {
          console.log('✅ Payment succeeded:', paymentIntent.id);
          
          toast({
            title: "Payment Successful!",
            description: "Your payment has been processed. Opening confirmation...",
          });

          onSuccess(paymentIntent.id);

          setTimeout(() => {
            window.location.href = `/payment-success?orderId=${orderId}&payment_intent=${paymentIntent.id}`;
          }, 1500);
        } else if (paymentIntent.status === 'processing') {
          toast({
            title: "Payment Processing",
            description: "Your payment is being processed. You'll receive a confirmation shortly.",
          });
          
          setTimeout(() => {
            window.location.href = `/payment-success?orderId=${orderId}&payment_intent=${paymentIntent.id}`;
          }, 2000);
        } else {
          setErrorMessage(`Payment status: ${paymentIntent.status}`);
        }
      }
    } catch (err: any) {
      const message = err.message || 'An unexpected error occurred';
      setErrorMessage(message);
      onError(message);
      
      toast({
        title: "Payment Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Payment Element - Stripe handles the UI */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <PaymentElement 
          options={{
            layout: 'tabs',
            fields: {
              billingDetails: {
                name: 'auto',
                email: 'auto',
                phone: 'auto',
                address: 'auto',
              }
            },
            defaultValues: {
              billingDetails: billingDetails || {}
            }
          }}
        />
      </div>

      {/* Error Message */}
      {errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* Order Summary */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-2">
        <Separator />
        <div className="flex justify-between">
          <span className="font-semibold">Total Amount:</span>
          <span className="font-bold text-lg">
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: currency || 'USD',
            }).format((amount || 0) / 100)}
          </span>
        </div>
      </div>

      {/* Submit Button */}
      <Button 
        type="submit" 
        className="w-full h-12 text-lg"
        disabled={!stripe || !elements || isProcessing}
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Processing Payment...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-5 w-5" />
            Pay {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: currency || 'USD',
            }).format((amount || 0) / 100)}
          </>
        )}
      </Button>
    </form>
  );
}

/**
 * Main Stripe Payment Page Component
 */
export default function StripePaymentPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const orderId = searchParams.get('orderId');
  const orderType = searchParams.get('orderType'); // 'event' or null (default to product)
  
  const [isInitializing, setIsInitializing] = useState(true);
  const [clientSecret, setClientSecret] = useState<string>('');
  const [paymentData, setPaymentData] = useState<{
    amount: number;
    currency: string;
    orderId: number;
    billingDetails?: {
      name?: string;
      email?: string;
      phone?: string;
      address?: {
        line1?: string;
        line2?: string;
        city?: string;
        state?: string;
        postal_code?: string;
        country?: string;
      };
    };
  } | null>(null);
  const [error, setError] = useState<string>('');

  // Initialize payment when component mounts
  useEffect(() => {
    // Check if we have client secret from navigation state (for event orders)
    const stateData = location.state as any;
    if (stateData?.clientSecret) {
      setClientSecret(stateData.clientSecret);
      setPaymentData({
        amount: stateData.amount,
        currency: stateData.currency,
        orderId: stateData.orderId,
      });
      setIsInitializing(false);
      return;
    }

    // Otherwise, initialize payment
    if (!orderId) {
      setError('No order ID provided');
      setIsInitializing(false);
      return;
    }

    initializePayment(parseInt(orderId), orderType);
  }, [orderId, orderType, location.state]);

  const initializePayment = async (orderIdNum: number, type?: string | null) => {
    try {
      setIsInitializing(true);
      setError('');

      console.log('🔄 Initializing Stripe payment for order:', orderIdNum, 'type:', type);

      let orderDetails: any;
      let response: any;

      // Use appropriate service based on order type
      if (type === 'event') {
        // Event order - fetch event order details and initialize payment
        orderDetails = await eventOrderService.getOrder(orderIdNum);
        response = await eventOrderService.initializePayment(orderIdNum, 'STRIPE');
      } else if (type === 'custom') {
        // Custom order - fetch custom order details and initialize payment
        orderDetails = await customOrderService.getById(orderIdNum);
        response = await customOrderService.initPayment(orderIdNum, 'STRIPE');
      } else {
        // Product order - fetch order details and initialize payment
        orderDetails = await apiService.getRequest<any>(`/api/orders/${orderIdNum}`);
        response = await paymentService.initializePayment(orderIdNum, 'STRIPE');
      }

      // Extract amount from order details
      const orderAmount = type === 'event' 
        ? orderDetails?.totalAmountMinor || 0
        : type === 'custom'
        ? (orderDetails?.finalPriceMinor || orderDetails?.basePriceMinor || 0)
        : orderDetails?.totals?.totalMinor || 0;
      const orderCurrency = orderDetails?.currency || orderDetails?.currencyCode || 'USD';


      if (!response.clientSecret) {
        throw new Error('No client secret received from server');
      }

      // Use order details for amount since payment init may not return it
      const amount = response.amount || orderAmount;
      const currency = response.currency || orderCurrency;

      console.log('Parsed payment data:', { amount, currency, orderId: orderIdNum });

      // Extract billing details - prefer billingAddress if available, fall back to shipping
      const billingAddressData = orderDetails?.billingAddress || orderDetails?.shippingAddress;
      const billingDetails = billingAddressData ? {
        name: billingAddressData.fullName || billingAddressData.contactName || '',
        email: orderDetails?.contactEmail || billingAddressData.email || '',
        phone: orderDetails?.contactPhone || billingAddressData.phone || '',
        address: {
          line1: billingAddressData.addressLine1 || billingAddressData.street || '',
          line2: billingAddressData.addressLine2 || '',
          city: billingAddressData.city || '',
          state: billingAddressData.state || '',
          postal_code: billingAddressData.postalCode || '',
          country: getCountryCode(billingAddressData.country) || '',
        }
      } : undefined;

      setClientSecret(response.clientSecret);
      setPaymentData({
        amount: amount,
        currency: currency,
        orderId: orderIdNum,
        billingDetails,
      });

      toast({
        title: "Payment Ready",
        description: "Enter your card details to complete the payment.",
      });

    } catch (err: any) {
      console.error('❌ Payment initialization failed:', err);
      const errorMsg = err.message || 'Failed to initialize payment';
      setError(errorMsg);
      
      toast({
        title: "Initialization Failed",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsInitializing(false);
    }
  };

  const handlePaymentSuccess = (paymentIntentId: string) => {
    console.log('✅ Payment successful, PaymentIntent:', paymentIntentId);
    console.log('🔔 Stripe webhook will process the payment_intent.succeeded event');
    console.log('💾 Backend will update order status to PAID');
  };

  const handlePaymentError = (errorMessage: string) => {
    console.error('❌ Payment error:', errorMessage);
  };

  // Loading state
  if (isInitializing) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-16">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg font-medium">Initializing secure payment...</p>
            <p className="text-sm text-gray-500">Please wait while we prepare your payment</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error || !orderId || !clientSecret || !paymentData) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-red-600">
              <AlertCircle className="mr-2 h-6 w-6" />
              Payment Initialization Failed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>
                {error || 'Unable to initialize payment. Please try again.'}
              </AlertDescription>
            </Alert>
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => navigate('/my-orders')}
                className="flex-1"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                View Orders
              </Button>
              <Button
                onClick={() => window.location.reload()}
                className="flex-1"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Payment form
  return (
    <div className="container max-w-2xl mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <CreditCard className="mr-2 h-6 w-6" />
            Complete Your Payment
          </CardTitle>
          <CardDescription>
            Enter your card details to securely complete your order
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Elements 
            stripe={stripePromise} 
            options={{
              clientSecret,
              appearance: {
                theme: 'stripe',
                variables: {
                  colorPrimary: '#0070f3',
                  colorBackground: '#ffffff',
                  colorText: '#1a1a1a',
                  colorDanger: '#ef4444',
                  fontFamily: 'system-ui, sans-serif',
                  borderRadius: '8px',
                }
              }
            }}
          >
            <PaymentForm
              clientSecret={clientSecret}
              orderId={paymentData.orderId}
              amount={paymentData.amount}
              currency={paymentData.currency}
              billingDetails={paymentData.billingDetails}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
            />
          </Elements>
        </CardContent>
      </Card>
    </div>
  );
}
