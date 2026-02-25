import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, AlertCircle, Smartphone, Loader2, ArrowLeft, ExternalLink, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { paymentService } from '@/services/paymentService';
import { apiService } from '@/services/apiService';
import { eventOrderService } from '@/services/eventOrderService';


export default function ChapaPaymentPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const orderId = searchParams.get('orderId');
  const orderType = searchParams.get('orderType'); // 'event' or null (default to product)
  
  const [isInitializing, setIsInitializing] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string>('');
  const [paymentData, setPaymentData] = useState<{
    amount: number;
    currency: string;
    orderId: number;
    txRef: string;
  } | null>(null);
  const [error, setError] = useState<string>('');

  // Initialize payment when component mounts
  useEffect(() => {
    if (!orderId) {
      setError('No order ID provided');
      setIsInitializing(false);
      return;
    }

    initializePayment(parseInt(orderId), orderType);
  }, [orderId, orderType]);

  const initializePayment = async (orderIdNum: number, type?: string | null) => {
    try {
      setIsInitializing(true);
      setError('');

      console.log('🔄 Initializing Chapa payment for order:', orderIdNum, 'type:', type);

      let orderDetails: any;
      let response: any;

      // Use appropriate service based on order type
      if (type === 'event') {
        // Event order - fetch event order details and initialize payment
        orderDetails = await eventOrderService.getOrder(orderIdNum);
        response = await eventOrderService.initializePayment(orderIdNum, 'CHAPA');
      } else {
        // Product order - fetch order details and initialize payment
        orderDetails = await apiService.getRequest<any>(`/api/orders/${orderIdNum}`);
        response = await paymentService.initializePayment(orderIdNum, 'CHAPA');
      }

      // Extract amount from order details (in minor units)
      const orderAmountMinor = type === 'event'
        ? orderDetails?.totalAmountMinor || 0
        : orderDetails?.totals?.totalMinor || 0;
      const orderCurrency = orderDetails?.currency || 'ETB';

      console.log('Chapa initialization response:', response);

      if (!response.checkoutUrl) {
        throw new Error('No checkout URL received from server');
      }

      setCheckoutUrl(response.checkoutUrl);
      setPaymentData({
        amount: orderAmountMinor,
        currency: orderCurrency,
        orderId: orderIdNum,
        txRef: response.paymentId || ''
      });

      toast({
        title: "Payment Ready",
        description: "Click the button below to proceed to Chapa payment.",
      });

    } catch (err: any) {
      console.error('❌ Chapa payment initialization failed:', err);
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

  const handleProceedToChapa = () => {
    if (!checkoutUrl) return;
    
    setIsRedirecting(true);
    toast({
      title: "Redirecting to Chapa",
      description: "You will be redirected to complete your payment.",
    });

    // Small delay for user to see the message
    setTimeout(() => {
      window.location.href = checkoutUrl;
    }, 1000);
  };

  // Loading state
  if (isInitializing) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-16">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-green-600" />
            <p className="text-lg font-medium">Initializing Chapa payment...</p>
            <p className="text-sm text-gray-500">Please wait while we prepare your payment</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error || !orderId || !checkoutUrl || !paymentData) {
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
                {error || 'Unable to initialize Chapa payment. Please try again.'}
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

  // Payment ready state
  return (
    <div className="container max-w-2xl mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <Smartphone className="mr-2 h-6 w-6 text-green-600" />
            Complete Your Payment
          </CardTitle>
          <CardDescription>
            Pay securely using Ethiopian payment methods via Chapa
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Order Summary */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Order ID:</span>
              <span className="font-medium">#{paymentData.orderId}</span>
            </div>
            {paymentData.txRef && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Transaction Ref:</span>
                <span className="font-mono text-xs">{paymentData.txRef}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between">
              <span className="font-semibold">Total Amount:</span>
              <span className="font-bold text-lg">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: paymentData.currency || 'ETB',
                }).format((paymentData.amount || 0) / 100)}
              </span>
            </div>
          </div>

          {/* Payment Methods Info */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-medium text-green-800 mb-3">Available Payment Methods</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-blue-600" />
                <span>Telebirr</span>
              </div>
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-green-600" />
                <span>M-Pesa</span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-purple-600" />
                <span>CBE Birr</span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-gray-600" />
                <span>Bank Transfer</span>
              </div>
            </div>
          </div>

          {/* Proceed Button */}
          <Button 
            onClick={handleProceedToChapa}
            disabled={isRedirecting}
            className="w-full h-12 text-lg bg-green-600 hover:bg-green-700"
          >
            {isRedirecting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Redirecting to Chapa...
              </>
            ) : (
              <>
                <ExternalLink className="mr-2 h-5 w-5" />
                Pay with Chapa
              </>
            )}
          </Button>

          <p className="text-xs text-center text-gray-500">
            You will be redirected to Chapa's secure payment page to complete your transaction.
            After payment, you'll be returned to our site.
          </p>
        </CardContent>
      </Card>


      {/* Back Button */}
      <div className="mt-6 text-center">
        <Button
          variant="ghost"
          onClick={() => navigate('/checkout')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Checkout
        </Button>
      </div>
    </div>
  );
}
