import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCard, Smartphone, Globe, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import { formatDualCurrency, isEthiopianUser, detectUserCurrency } from '@/lib/currency';

export interface PaymentMethodSelectorProps {
  amount: number;
  currency: string;
  userLocation?: string;
  onPaymentMethodSelect: (method: PaymentMethodType, data?: any) => void;
  isLoading?: boolean;
  error?: string;
}

export type PaymentMethodType = 'stripe' | 'paypal' | 'chapa' | 'telebirr';

interface PaymentMethodOption {
  id: PaymentMethodType;
  title: string;
  description: string;
  icon: React.ReactNode;
  availability: 'international' | 'ethiopia' | 'global';
  status: 'active' | 'placeholder';
  badges?: string[];
}

export default function PaymentMethodSelector({
  amount,
  currency,
  userLocation,
  onPaymentMethodSelect,
  isLoading = false,
  error
}: PaymentMethodSelectorProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType>('stripe');
  const [telebirrPhone, setTelebirrPhone] = useState('');
  
  const { etb, usd } = formatDualCurrency(amount);
  const isEthiopian = userLocation ? 
    (userLocation.toLowerCase() === 'ethiopia' || userLocation.toLowerCase() === 'et') : 
    isEthiopianUser();
  
  const detectedCurrency = detectUserCurrency();

  const paymentMethods: PaymentMethodOption[] = [
    {
      id: 'stripe',
      title: 'Credit/Debit Cards & Apple Pay',
      description: 'Visa, Mastercard, American Express, Apple Pay, Google Pay',
      icon: <CreditCard className="w-6 h-6" />,
      availability: 'international',
      status: 'active',
      badges: ['Secure', 'Instant']
    },
    {
      id: 'paypal',
      title: 'PayPal',
      description: 'Pay with your PayPal account or linked cards',
      icon: <Globe className="w-6 h-6" />,
      availability: 'international',
      status: 'placeholder',
      badges: ['Buyer Protection']
    },
    {
      id: 'chapa',
      title: 'Chapa',
      description: 'Ethiopian payment gateway - Cards, Mobile Money, Bank Transfer',
      icon: <Smartphone className="w-6 h-6" />,
      availability: 'global',
      status: 'active',
      badges: ['Local', 'ETB']
    },
    {
      id: 'telebirr',
      title: 'Telebirr',
      description: 'Ethiopian mobile money service',
      icon: <Smartphone className="w-6 h-6" />,
      availability: 'ethiopia',
      status: 'placeholder',
      badges: ['Mobile Money', 'ETB']
    }
  ];

  const getVisibleMethods = () => {
    if (isEthiopian) {
      // Ethiopian users see both Ethiopian and international options
      return paymentMethods;
    }
    // International users see only international options
    return paymentMethods.filter(method => 
      method.availability === 'international' || method.availability === 'global'
    );
  };

  const handleMethodSelect = (methodId: PaymentMethodType) => {
    setSelectedMethod(methodId);
  };

  const handlePaymentSubmit = () => {
    const method = paymentMethods.find(m => m.id === selectedMethod);
    
    if (method?.status === 'placeholder') {
      return; // Don't proceed with placeholder methods
    }

    let paymentData: any = {
      amount,
      currency,
      paymentMethod: selectedMethod
    };

    if (selectedMethod === 'telebirr' && telebirrPhone) {
      paymentData.telebirrPhone = telebirrPhone;
    }

    onPaymentMethodSelect(selectedMethod, paymentData);
  };

  return (
    <div className="space-y-6">
      {/* Payment Amount Display */}
      <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-amber-600 mb-2">
              {currency === 'ETB' ? etb : usd}
            </div>
            <div className="text-sm text-gray-600">
              {currency === 'ETB' ? `≈ ${usd} USD` : `≈ ${etb} ETB`}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Payment Methods */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Choose Payment Method</h3>
        
        <RadioGroup value={selectedMethod} onValueChange={handleMethodSelect}>
          {getVisibleMethods().map((method) => (
            <Card key={method.id} className={`cursor-pointer transition-all duration-200 ${
              selectedMethod === method.id 
                ? 'border-amber-500 bg-amber-50 shadow-md' 
                : 'border-gray-200 hover:border-gray-300'
            } ${method.status === 'placeholder' ? 'opacity-60' : ''}`}>
              <CardContent className="pt-4">
                <div className="flex items-start space-x-4">
                  <RadioGroupItem 
                    value={method.id} 
                    id={method.id}
                    disabled={method.status === 'placeholder'}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="text-amber-600">{method.icon}</div>
                      <div>
                        <label 
                          htmlFor={method.id} 
                          className="text-lg font-medium cursor-pointer"
                        >
                          {method.title}
                        </label>
                        {method.status === 'placeholder' && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            Coming Soon
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm mt-1 ml-9">{method.description}</p>
                    <div className="flex space-x-2 mt-2 ml-9">
                      {method.badges?.map((badge, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {badge}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Telebirr Phone Input */}
                {selectedMethod === 'telebirr' && method.id === 'telebirr' && (
                  <div className="ml-9 mt-4 space-y-2">
                    <Label htmlFor="telebirr-phone">Telebirr Phone Number</Label>
                    <Input
                      id="telebirr-phone"
                      placeholder="09XXXXXXXX"
                      value={telebirrPhone}
                      onChange={(e) => setTelebirrPhone(e.target.value)}
                      className="max-w-xs"
                    />
                  </div>
                )}

                {/* Placeholder Integration Notes */}
                {method.status === 'placeholder' && selectedMethod === method.id && (
                  <div className="ml-9 mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5" />
                      <div className="text-sm text-blue-700">
                        {method.id === 'paypal' && (
                          <>
                            <strong>PayPal Integration Ready:</strong> Add your PayPal credentials
                            (PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET) to enable this payment method.
                          </>
                        )}
                        {method.id === 'chapa' && (
                          <>
                            <strong>Chapa Integration Ready:</strong> Add your Chapa API key
                            (CHAPA_SECRET_KEY) from chapa.co to process Ethiopian payments.
                          </>
                        )}
                        {method.id === 'telebirr' && (
                          <>
                            <strong>Telebirr Integration Ready:</strong> Add your Telebirr API key
                            (TELEBIRR_API_KEY) to enable mobile money payments.
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </RadioGroup>
      </div>

      {/* Security Notice */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-4">
          <div className="flex items-center space-x-3">
            <Shield className="w-5 h-5 text-green-600" />
            <div>
              <div className="font-medium text-green-800">Secure Payment</div>
              <div className="text-sm text-green-700">
                All transactions are encrypted and securely processed. Your payment information is never stored.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Button */}
      <Button 
        onClick={handlePaymentSubmit}
        disabled={isLoading || paymentMethods.find(m => m.id === selectedMethod)?.status === 'placeholder'}
        className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
        size="lg"
      >
        {isLoading ? (
          <>
            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
            Processing...
          </>
        ) : (
          <>
            <Shield className="w-4 h-4 mr-2" />
            Pay Securely
          </>
        )}
      </Button>

      {/* Available Payment Options Info */}
      <div className="text-center text-sm text-gray-500">
        <div className="flex items-center justify-center space-x-2">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span>
            {isEthiopian 
              ? 'Ethiopian and international payment methods available'
              : 'International payment methods available'
            }
          </span>
          <span className="text-xs bg-gray-100 px-2 py-1 rounded">
            {detectedCurrency}
          </span>
        </div>
      </div>
    </div>
  );
}