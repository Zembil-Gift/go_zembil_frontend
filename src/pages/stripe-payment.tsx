import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { loadStripe, Stripe } from '@stripe/stripe-js';
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
import { CheckCircle, AlertCircle, CreditCard, Loader2, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { paymentService } from '@/services/paymentService';
import { apiService } from '@/services/apiService';
import { orderService } from '@/services/orderService';

// Initialize Stripe - Make sure to set VITE_STRIPE_PUBLIC_KEY in your .env
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

interface PaymentFormProps {
  clientSecret: string;
  orderId: number;
  amount: number;
  currency: string;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
}

/**
 * Payment Form Component - Handles the actual payment submission
 */
function PaymentForm({ clientSecret, orderId, amount, currency, onSuccess, onError }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const { toast } = useToast();
  const navigate = useNavigate();

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
            description: "Your payment has been processed. Redirecting...",
          });

          onSuccess(paymentIntent.id);

          setTimeout(() => {
            navigate(`/payment-success?orderId=${orderId}&payment_intent=${paymentIntent.id}`);
          }, 1500);
        } else if (paymentIntent.status === 'processing') {
          toast({
            title: "Payment Processing",
            description: "Your payment is being processed. You'll receive a confirmation shortly.",
          });
          
          setTimeout(() => {
            navigate(`/payment-success?orderId=${orderId}&payment_intent=${paymentIntent.id}`);
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
            defaultValues: {
              billingDetails: {
              }
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
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Order ID:</span>
          <span className="font-medium">#{orderId}</span>
        </div>
        <Separator />
        <div className="flex justify-between">
          <span className="font-semibold">Total Amount:</span>
          <span className="font-bold text-lg">
            {currency === 'USD' ? '$' : 'ETB '}
            {amount && !isNaN(amount) ? (amount / 100).toFixed(2) : '0.00'}
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
            Pay {currency === 'USD' ? '$' : 'ETB '}
            {amount && !isNaN(amount) ? (amount / 100).toFixed(2) : '0.00'}
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
  const navigate = useNavigate();
  const { toast } = useToast();

  const orderId = searchParams.get('orderId');
  
  const [isInitializing, setIsInitializing] = useState(true);
  const [clientSecret, setClientSecret] = useState<string>('');
  const [paymentData, setPaymentData] = useState<{
    amount: number;
    currency: string;
    orderId: number;
  } | null>(null);
  const [error, setError] = useState<string>('');

  // Initialize payment when component mounts
  useEffect(() => {
    if (!orderId) {
      setError('No order ID provided');
      setIsInitializing(false);
      return;
    }

    initializePayment(parseInt(orderId));
  }, [orderId]);

  const initializePayment = async (orderIdNum: number) => {
    try {
      setIsInitializing(true);
      setError('');

      console.log('🔄 Initializing Stripe payment for order:', orderIdNum);

      // First, fetch order details to get the correct amount
      const orderDetails = await apiService.getRequest<any>(`/api/orders/${orderIdNum}`);

      // Extract amount from order totals
      const orderAmount = orderDetails?.totals?.totalMinor || 0;
      const orderCurrency = orderDetails?.currency || 'USD';

      // Call your Spring Boot backend to initialize payment
      const response = await paymentService.initializePayment(orderIdNum, 'STRIPE');


      if (!response.clientSecret) {
        throw new Error('No client secret received from server');
      }

      // Use order details for amount since payment init may not return it
      const amount = response.amount || orderAmount;
      const currency = response.currency || orderCurrency;

      console.log('Parsed payment data:', { amount, currency, orderId: orderIdNum });

      setClientSecret(response.clientSecret);
      setPaymentData({
        amount: amount,
        currency: currency,
        orderId: orderIdNum
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
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
            />
          </Elements>
        </CardContent>
      </Card>

      {/* Information Cards */}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <h3 className="font-semibold mb-1">Secure Payment</h3>
              <p className="text-xs text-gray-600">
                Your card details are encrypted and secure
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <CreditCard className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <h3 className="font-semibold mb-1">All Cards Accepted</h3>
              <p className="text-xs text-gray-600">
                Visa, Mastercard, Amex, and more
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-purple-600" />
              <h3 className="font-semibold mb-1">Instant Processing</h3>
              <p className="text-xs text-gray-600">
                Your order will be confirmed immediately
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
