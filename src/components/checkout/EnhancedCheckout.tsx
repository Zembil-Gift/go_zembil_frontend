import { useState, useEffect } from "react";
import { useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, CreditCard, Smartphone, Wallet } from "lucide-react";

interface CheckoutProps {
  amount: number;
  currency: string;
  orderType: string;
  orderId: string;
  customerEmail?: string;
  onSuccess?: (transaction: any) => void;
  onError?: (error: string) => void;
}

interface CurrencyConversion {
  [key: string]: number;
}

export function EnhancedCheckout({
  amount,
  currency = "USD",
  orderType,
  orderId,
  customerEmail,
  onSuccess,
  onError
}: CheckoutProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState("");
  const [currencyConversions, setCurrencyConversions] = useState<CurrencyConversion>({});
  const [selectedCurrency, setSelectedCurrency] = useState(currency);
  const [paymentMethods] = useState([
    { id: 'card', name: 'Credit/Debit Card', icon: CreditCard },
    { id: 'paypal', name: 'PayPal', icon: Wallet },
    { id: 'apple_pay', name: 'Apple Pay', icon: Smartphone },
    { id: 'google_pay', name: 'Google Pay', icon: Smartphone },
  ]);

  // Create payment intent
  useEffect(() => {
    const createPaymentIntent = async () => {
      try {
        setIsLoading(true);
        const response = await apiRequest("POST", "/api/payments/stripe/create-intent", {
          amount,
          currency: selectedCurrency,
          orderType,
          orderId,
          customerEmail,
          paymentMethods: ['card', 'paypal', 'apple_pay', 'google_pay', 'link']
        });

        if (response.success) {
          setClientSecret(response.clientSecret);
          setCurrencyConversions(response.currencyConversions);
        } else {
          throw new Error(response.message || 'Failed to create payment intent');
        }
      } catch (error) {
        console.error('Payment intent error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to initialize payment';
        toast({
          title: "Payment Setup Error",
          description: errorMessage,
          variant: "destructive",
        });
        onError?.(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    createPaymentIntent();
  }, [amount, selectedCurrency, orderType, orderId, customerEmail]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      return;
    }

    setIsLoading(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-confirmation`,
          receipt_email: customerEmail,
        },
        redirect: "if_required"
      });

      if (error) {
        throw new Error(error.message || 'Payment failed');
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        toast({
          title: "Payment Successful!",
          description: "Your order has been processed successfully.",
        });
        onSuccess?.(paymentIntent);
      }
    } catch (error) {
      console.error('Payment error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Payment failed';
      toast({
        title: "Payment Failed",
        description: errorMessage,
        variant: "destructive",
      });
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  if (!clientSecret) {
    return (
      <Card className="w-full max-w-lg mx-auto">
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Setting up payment...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Secure Payment
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Payment Amount Display */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-medium">Total Amount:</span>
            <span className="text-2xl font-bold text-primary">
              {formatCurrency(amount, selectedCurrency)}
            </span>
          </div>

          {/* Currency Conversions Display */}
          {Object.keys(currencyConversions).length > 1 && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Currency conversions:</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(currencyConversions).map(([curr, amt]) => (
                  <div key={curr} className="flex justify-between">
                    <span className="text-gray-600">{curr}:</span>
                    <span className="font-medium">
                      {formatCurrency(amt, curr)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Payment Methods Info */}
        <div className="space-y-3">
          <p className="text-sm font-medium">Accepted Payment Methods:</p>
          <div className="flex flex-wrap gap-2">
            {paymentMethods.map((method) => (
              <Badge key={method.id} variant="secondary" className="flex items-center gap-1">
                <method.icon className="h-3 w-3" />
                {method.name}
              </Badge>
            ))}
          </div>
        </div>

        <Separator />

        {/* Stripe Payment Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white rounded-lg border p-4">
            <PaymentElement 
              options={{
                layout: "tabs",
                defaultValues: {
                  billingDetails: {
                    email: customerEmail || ''
                  }
                }
              }}
            />
          </div>

          <Button 
            type="submit" 
            disabled={!stripe || !elements || isLoading}
            className="w-full h-12 text-lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processing Payment...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-5 w-5" />
                Pay {formatCurrency(amount, selectedCurrency)}
              </>
            )}
          </Button>
        </form>

        {/* Security Notice */}
        <div className="text-xs text-gray-500 text-center">
          <p>🔒 Your payment information is secure and encrypted</p>
          <p>Powered by Stripe • PCI DSS Compliant</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default EnhancedCheckout;