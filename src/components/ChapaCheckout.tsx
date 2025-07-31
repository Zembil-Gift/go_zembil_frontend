import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CreditCard, AlertCircle, CheckCircle, ExternalLink } from "lucide-react";

interface ChapaCheckoutProps {
  amount: number;
  currency: string;
  orderData: any;
  userInfo: {
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
  };
  onSuccess: (result: any) => void;
  onError: (error: string) => void;
}

export function ChapaCheckout({ 
  amount, 
  currency, 
  orderData, 
  userInfo,
  onSuccess, 
  onError 
}: ChapaCheckoutProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const { toast } = useToast();

  const handleChapaPayment = async () => {
    try {
      setIsLoading(true);
      setMessage('');
      

      
      const rawResponse = await apiRequest('POST', '/api/payments/chapa/create', {
        amount,
        currency: currency.toUpperCase(),
        email: userInfo.email,
        first_name: userInfo.firstName,
        last_name: userInfo.lastName,
        phone_number: userInfo.phoneNumber || '',
        orderData
      });

      const response = await rawResponse.json() as any;
      console.log('Chapa API Response:', response);
      
      if (response?.success && response?.data?.checkout_url) {
        setMessage('Redirecting to Chapa payment...');
        toast({
          title: "Redirecting to Payment",
          description: "You will be redirected to Chapa to complete your payment.",
        });
        
        onSuccess(response);
        
        // Small delay to show toast, then redirect
        setTimeout(() => {
          window.location.href = response.data.checkout_url;
        }, 1000);
      } else {
        console.error('Chapa response error:', response);
        throw new Error(response?.message || 'Failed to initialize Chapa payment');
      }
    } catch (error) {
      console.error('Error initializing Chapa payment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize Chapa payment';
      setMessage(errorMessage);
      onError(errorMessage);
      toast({
        title: "Payment Initialization Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="w-5 h-5 text-green-600" />
            <span>Chapa Payment</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="font-medium text-green-800">Ethiopian Payment Gateway</span>
            </div>
            <p className="text-sm text-green-700">
              Pay securely using Chapa - Ethiopia's leading payment platform. 
              Supports mobile money, bank transfers, and local payment methods.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Payment Amount:</span>
              <span className="text-lg font-bold text-amber-600">
                {amount.toLocaleString()} {currency}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span>Customer:</span>
              <span>{userInfo.firstName} {userInfo.lastName}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span>Email:</span>
              <span>{userInfo.email}</span>
            </div>
          </div>

          {message && (
            <Alert variant={message.includes('Redirecting') ? 'default' : 'destructive'}>
              {message.includes('Redirecting') ? (
                <ExternalLink className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleChapaPayment}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
            size="lg"
          >
            {isLoading ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                Initializing Payment...
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4 mr-2" />
                Pay with Chapa
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Supported Payment Methods */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-4">
          <h4 className="font-medium text-blue-800 mb-3">Supported Payment Methods</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-blue-600" />
              <span className="text-blue-800">CBE Birr</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-blue-600" />
              <span className="text-blue-800">M-Birr</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-blue-600" />
              <span className="text-blue-800">HelloCash</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-blue-600" />
              <span className="text-blue-800">Bank Transfer</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ChapaCheckout;