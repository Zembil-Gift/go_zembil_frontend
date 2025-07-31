import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertTriangle, ArrowRight, Home, ShoppingBag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function PaymentSuccess() {
  const [paymentStatus, setPaymentStatus] = useState<'loading' | 'success' | 'failed' | 'pending'>('loading');
  const [orderInfo, setOrderInfo] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentIntent = urlParams.get('payment_intent');
    const orderId = urlParams.get('orderId');
    const trxRef = urlParams.get('trx_ref');
    const status = urlParams.get('status');
    
    // Handle Stripe payment success
    if (paymentIntent) {
      setPaymentStatus('success');
      setOrderInfo({
        id: orderId,
        paymentMethod: 'Stripe',
        paymentId: paymentIntent
      });
    }
    // Handle Chapa payment callback
    else if (trxRef) {
      if (status === 'success') {
        setPaymentStatus('success');
        setOrderInfo({
          id: orderId,
          paymentMethod: 'Chapa',
          paymentId: trxRef
        });
        toast({
          title: "Payment Successful!",
          description: "Your Chapa payment has been processed successfully.",
        });
      } else {
        setPaymentStatus('failed');
        toast({
          title: "Payment Failed",
          description: "Your Chapa payment was not successful. Please try again.",
          variant: "destructive",
        });
      }
    }
    // Default success for demo
    else if (orderId) {
      setPaymentStatus('success');
      setOrderInfo({
        id: orderId,
        paymentMethod: 'Unknown'
      });
    }
    else {
      // No payment info found
      setTimeout(() => setPaymentStatus('failed'), 2000);
    }
  }, [toast]);

  if (paymentStatus === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="animate-spin w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full mx-auto"></div>
              <h2 className="text-xl font-semibold">Verifying Payment...</h2>
              <p className="text-gray-600">Please wait while we confirm your payment.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (paymentStatus === 'failed') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-600">
              <AlertTriangle className="w-6 h-6" />
              <span>Payment Failed</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Your payment could not be processed. This could be due to insufficient funds, 
                network issues, or payment cancellation.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-3">
              <Button asChild className="w-full">
                <a href="/checkout">
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Try Again
                </a>
              </Button>
              
              <Button variant="outline" asChild className="w-full">
                <a href="/cart">
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  Back to Cart
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-green-600">
            <CheckCircle className="w-6 h-6" />
            <span>Payment Successful!</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Your payment has been processed successfully. You will receive an email 
              confirmation shortly with your order details.
            </AlertDescription>
          </Alert>

          {orderInfo && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <h3 className="font-semibold text-gray-800">Order Information</h3>
              {orderInfo.id && (
                <p className="text-sm">
                  <span className="font-medium">Order ID:</span> {orderInfo.id}
                </p>
              )}
              <p className="text-sm">
                <span className="font-medium">Payment Method:</span> {orderInfo.paymentMethod}
              </p>
              {orderInfo.paymentId && (
                <p className="text-sm">
                  <span className="font-medium">Payment ID:</span> {orderInfo.paymentId}
                </p>
              )}
            </div>
          )}

          <div className="space-y-3">
            {orderInfo?.id && (
              <Button asChild className="w-full bg-green-600 hover:bg-green-700">
                <a href={`/track/${orderInfo.id}`}>
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  Track Your Order
                </a>
              </Button>
            )}
            
            <Button variant="outline" asChild className="w-full">
              <a href="/shop">
                <Home className="w-4 h-4 mr-2" />
                Continue Shopping
              </a>
            </Button>
          </div>

          <div className="text-center pt-4 border-t">
            <p className="text-sm text-gray-600">
              🎉 Thank you for choosing goZembil!
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Your gifts will be delivered with love from Ethiopia
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}