import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Smartphone, CheckCircle, ExternalLink, Loader2 } from "lucide-react";

interface TelebirrCheckoutProps {
  amount: number;
  currency: string;
  orderData: any;
  orderType?: 'product' | 'event';
  onSuccess: (result: any) => void;
  onError: (error: string) => void;
}

export function TelebirrCheckout({ 
  amount, 
  currency, 
  orderData,
  orderType = 'product',
  onSuccess, 
  onError 
}: TelebirrCheckoutProps) {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleTelebirrPayment = () => {
    try {
      setIsLoading(true);
      
      // Navigate to TeleBirr payment page with order details
      const orderId = orderData?.id || orderData?.orderId;
      
      if (!orderId) {
        throw new Error('Order ID is required for TeleBirr payment');
      }

      toast({
        title: "Proceeding to TeleBirr",
        description: "You will be redirected to initialize TeleBirr payment.",
      });
      
      // Call onSuccess first to indicate we're proceeding
      onSuccess({ proceeding: true });

      // Navigate to TeleBirr payment page
      setTimeout(() => {
        navigate(`/payment/telebirr?orderId=${orderId}&orderType=${orderType}`);
      }, 500);
      
    } catch (error) {
      console.error('Error proceeding to TeleBirr payment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to proceed to TeleBirr payment';
      onError(errorMessage);
      toast({
        title: "Payment Error",
        description: errorMessage,
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  // Format amount for display (convert from minor units)
  const formattedAmount = new Intl.NumberFormat('en-ET', {
    style: 'currency',
    currency: currency || 'ETB',
    minimumFractionDigits: 2
  }).format(amount / 100);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Smartphone className="w-5 h-5 text-blue-600" />
            <span>TeleBirr Payment</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* TeleBirr Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-blue-800">Ethio Telecom Mobile Money</span>
            </div>
            <p className="text-sm text-blue-700">
              Pay securely using TeleBirr Wallet, Bank Accounts, or Cards through Ethio Telecom's payment gateway.
            </p>
          </div>

          {/* Payment Summary */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-gray-900">Payment Summary</h4>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Amount</span>
              <span className="font-bold text-lg">{formattedAmount}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Payment Method</span>
              <span className="text-blue-600 font-medium">TeleBirr</span>
            </div>
          </div>

          {/* Payment Options Info */}
          <div className="border rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-gray-900">Available Payment Options</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Smartphone className="w-4 h-4 text-blue-600" />
                </div>
                <span>TeleBirr Wallet</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <span>Bank Account</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-purple-600" />
                </div>
                <span>Debit/Credit Card</span>
              </div>
            </div>
          </div>

          {/* Security Notice */}
          <Alert>
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">
              Your payment is secured by Ethio Telecom's trusted payment infrastructure.
            </AlertDescription>
          </Alert>

          {/* Pay Button */}
          <Button 
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
            size="lg"
            onClick={handleTelebirrPayment}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <ExternalLink className="mr-2 h-4 w-4" />
                Pay with TeleBirr - {formattedAmount}
              </>
            )}
          </Button>

          {/* Terms Notice */}
          <p className="text-xs text-gray-500 text-center">
            By clicking "Pay with TeleBirr", you agree to TeleBirr's terms of service.
            You will be redirected to complete the payment.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default TelebirrCheckout;
