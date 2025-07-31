import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY!);

interface StripeCheckoutProps {
  amount: number;
  currency: string;
  orderData: any;
  onSuccess: (paymentResult: any) => void;
  onError: (error: string) => void;
}

interface CheckoutFormProps {
  clientSecret: string;
  onSuccess: (paymentResult: any) => void;
  onError: (error: string) => void;
}

function CheckoutForm({ clientSecret, onSuccess, onError }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    if (!stripe) return;

    // Check if payment was already successful (return from redirect)
    const urlParams = new URLSearchParams(window.location.search);
    const paymentIntentId = urlParams.get('payment_intent');
    const redirectStatus = urlParams.get('redirect_status');

    if (paymentIntentId && redirectStatus === 'succeeded') {
      setMessage('Payment succeeded!');
      toast({
        title: "Payment Successful",
        description: "Your payment has been processed successfully.",
      });
      console.log('✅ Stripe redirect payment confirmed, calling onSuccess with:', paymentIntentId);
      onSuccess({ paymentIntentId, status: 'succeeded' });
    }
  }, [stripe, onSuccess, toast]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || isLoading) {
      return; // Prevent multiple submissions
    }

    setIsLoading(true);
    setMessage('');

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/order-success`,
        },
        redirect: 'if_required'
      });

      if (error) {
        if (error.type === "card_error" || error.type === "validation_error") {
          setMessage(error.message || 'Payment failed');
          onError(error.message || 'Payment failed');
        } else {
          setMessage("An unexpected error occurred.");
          onError("An unexpected error occurred.");
        }
        toast({
          title: "Payment Failed",
          description: error.message || "An unexpected error occurred.",
          variant: "destructive",
        });
      } else if (paymentIntent) {
        if (paymentIntent.status === 'succeeded') {
          setMessage('Payment succeeded!');
          toast({
            title: "Payment Successful",
            description: "Your payment has been processed successfully.",
          });
          console.log('✅ Stripe payment confirmed, calling onSuccess with:', paymentIntent.id);
          console.log('🔄 Payment intent details:', {
            id: paymentIntent.id,
            status: paymentIntent.status,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency
          });
          
          // Call onSuccess callback which should trigger redirect
          console.log('🔄 About to call onSuccess callback...');
          const result = onSuccess({ 
            paymentIntentId: paymentIntent.id, 
            status: paymentIntent.status,
            paymentMethod: 'stripe'
          });
          
          console.log('✅ onSuccess callback completed, result:', result);
          
          // Failsafe redirect if callback doesn't work
          setTimeout(() => {
            console.log('🚨 Failsafe redirect activated - checking if still on checkout page');
            if (window.location.pathname.includes('/checkout')) {
              console.log('🚨 Still on checkout, forcing redirect...');
              const orderId = localStorage.getItem('goZembil_currentOrderId');
              if (orderId) {
                window.location.href = `/order-success?orderId=${orderId}&paymentMethod=stripe`;
              }
            }
          }, 3000);
        } else {
          setMessage(`Payment ${paymentIntent.status}`);
        }
      }
    } catch (stripeError) {
      console.error('Stripe payment error:', stripeError);
      setMessage("Payment processing failed. Please try again.");
      onError("Payment processing failed. Please try again.");
      toast({
        title: "Payment Error",
        description: "Payment processing failed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const paymentElementOptions = {
    layout: "tabs" as const,
    paymentMethodOrder: ['card', 'apple_pay', 'google_pay']
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="w-5 h-5 text-amber-600" />
            <span>Payment Details</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <PaymentElement 
              id="payment-element"
              options={paymentElementOptions}
            />

            {message && (
              <Alert variant={message.includes('succeeded') ? 'default' : 'destructive'}>
                {message.includes('succeeded') ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            <Button
              disabled={isLoading || !stripe || !elements}
              type="submit"
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              size="lg"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Processing Payment...
                </>
              ) : (
                'Complete Payment'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Security Features */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-green-800">256-bit SSL encryption</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-green-800">PCI DSS compliant</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-green-800">Fraud protection</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function StripeCheckout({ amount, currency, orderData, onSuccess, onError }: StripeCheckoutProps) {
  const [clientSecret, setClientSecret] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const createPaymentIntent = async () => {
      try {
        setIsLoading(true);
        
        const rawResponse = await apiRequest('POST', '/api/payments/stripe/create-intent', {
          amount: amount,
          currency: currency.toUpperCase(),
          orderType: 'product_order',
          orderId: orderData?.id || 'temp-order',
          metadata: {
            orderData: orderData
          }
        });

        const response = await rawResponse.json() as any;
        console.log('🔍 Stripe API Response:', response);

        if (response.success && response.clientSecret) {
          setClientSecret(response.clientSecret);
        } else {
          throw new Error(response.message || 'No client secret received');
        }
      } catch (error) {
        console.error('Error creating payment intent:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to initialize payment';
        onError(errorMessage);
        toast({
          title: "Payment Initialization Failed",
          description: `No client secret received: ${errorMessage}`,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    createPaymentIntent();
  }, [amount, currency, orderData, onError, toast]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center space-x-2 py-8">
            <div className="animate-spin w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full" />
            <span className="text-gray-600">Initializing secure payment...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!clientSecret) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to initialize payment. Please try again or contact support.
        </AlertDescription>
      </Alert>
    );
  }

  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#F59E0B', // amber-500
        colorBackground: '#ffffff',
        colorText: '#1f2937',
        colorDanger: '#ef4444',
        fontFamily: 'system-ui, sans-serif',
        spacingUnit: '4px',
        borderRadius: '8px'
      }
    }
  };

  return (
    <Elements options={options} stripe={stripePromise}>
      <CheckoutForm 
        clientSecret={clientSecret}
        onSuccess={onSuccess}
        onError={onError}
      />
    </Elements>
  );
}