import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, AlertCircle, Smartphone, Loader2, ArrowLeft, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { paymentService } from '@/services/paymentService';
import { apiService } from '@/services/apiService';
import { eventOrderService } from '@/services/eventOrderService';
import { serviceOrderService } from '@/services/serviceOrderService';
import { customOrderService } from '@/services/customOrderService';

const CHAPA_CONTAINER_ID = 'chapa-inline-form';
const INLINE_PAYMENT_METHODS = ['telebirr', 'cbebirr', 'ebirr', 'mpesa'] as const;
const CHAPA_INLINE_SCRIPT_ID = 'chapa-inline-sdk';
const CHAPA_INLINE_SCRIPT_SRC = 'https://js.chapa.co/v1/inline.js';

interface ChapaPaymentData {
  amountMajor: string;
  amountMinor: number;
  currency: string;
  orderId: number;
  txRef: string;
  orderType: string;
  customerPhone?: string;
  returnUrl: string;
}

interface ChapaInitializationResult {
  paymentId?: string;
  checkoutUrl?: string;
}

const chapaPublicKey = import.meta.env.VITE_CHAPA_PUBLIC_KEY?.trim();

const normalizeEthiopianPhone = (phone?: string | null): string => {
  if (!phone) return '';

  const digits = phone.replace(/\D/g, '');

  if (digits.startsWith('251') && digits.length >= 12) {
    return digits.slice(3, 12);
  }

  if (digits.startsWith('0') && digits.length >= 10) {
    return digits.slice(1, 10);
  }

  if ((digits.startsWith('9') || digits.startsWith('7')) && digits.length >= 9) {
    return digits.slice(0, 9);
  }

  return '';
};

const formatOrderType = (orderType?: string | null) =>
  (orderType || 'product').toUpperCase();

const getChapaReturnUrl = (orderId: number, txRef: string, orderType?: string | null) => {
  const url = new URL('/payment-success', window.location.origin);
  url.searchParams.set('orderId', String(orderId));
  url.searchParams.set('orderType', formatOrderType(orderType));
  url.searchParams.set('trx_ref', txRef);
  url.searchParams.set('status', 'success');
  return url.toString();
};

const loadChapaInlineScript = async (): Promise<void> => {
  if (window.ChapaCheckout) {
    return;
  }

  const existingScript = document.getElementById(CHAPA_INLINE_SCRIPT_ID) as HTMLScriptElement | null;

  if (existingScript) {
    await new Promise<void>((resolve, reject) => {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Chapa inline checkout script.')), { once: true });
    });
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.id = CHAPA_INLINE_SCRIPT_ID;
    script.src = CHAPA_INLINE_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Chapa inline checkout script.'));
    document.head.appendChild(script);
  });
};


export default function ChapaPaymentPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const orderId = searchParams.get('orderId');
  const orderType = searchParams.get('orderType'); // 'event', 'service', 'custom', or null (default to product)
  
  const [isInitializing, setIsInitializing] = useState(true);
  const [isRenderingInline, setIsRenderingInline] = useState(false);
  const [paymentData, setPaymentData] = useState<ChapaPaymentData | null>(null);
  const [error, setError] = useState<string>('');
  const inlineCheckoutRef = useRef<{ initialize: (containerId?: string) => void } | null>(null);

  // Initialize payment when component mounts
  useEffect(() => {
    if (!orderId) {
      setError('No order ID provided');
      setIsInitializing(false);
      return;
    }

    initializePayment(parseInt(orderId), orderType);
  }, [orderId, orderType]);

  useEffect(() => {
    if (!paymentData) {
      return;
    }

    let cancelled = false;

    const renderInlineCheckout = async () => {
      try {
        setIsRenderingInline(true);
        setError('');

        if (!chapaPublicKey) {
          throw new Error('Chapa public key is not configured. Set VITE_CHAPA_PUBLIC_KEY in your environment.');
        }

        await loadChapaInlineScript();

        if (cancelled) {
          return;
        }

        if (!window.ChapaCheckout) {
          throw new Error('Unable to load Chapa inline checkout.');
        }

        const container = document.getElementById(CHAPA_CONTAINER_ID);

        if (!container) {
          throw new Error('Chapa payment container was not found.');
        }

        container.innerHTML = '';

        const chapa = new window.ChapaCheckout({
          publicKey: chapaPublicKey,
          amount: paymentData.amountMajor,
          currency: paymentData.currency,
          tx_ref: paymentData.txRef,
          mobile: paymentData.customerPhone || '',
          availablePaymentMethods: [...INLINE_PAYMENT_METHODS],
          returnUrl: paymentData.returnUrl,
          showFlag: true,
          showPaymentMethodsNames: true,
          customizations: {
            buttonText: 'Pay with Chapa',
            successMessage: 'Payment received successfully. Redirecting...',
            styles: `
              #${CHAPA_CONTAINER_ID} .chapa-payment-methods-grid {
                gap: 12px;
                flex-wrap: wrap;
                justify-content: flex-start;
              }
              #${CHAPA_CONTAINER_ID} .chapa-payment-method {
                width: calc(50% - 6px);
                min-height: 88px;
                border-radius: 12px;
                border: 1px solid #d1d5db;
                box-shadow: none;
                padding: 12px;
              }
              #${CHAPA_CONTAINER_ID} .chapa-payment-name {
                font-size: 12px;
                font-weight: 600;
                color: #1f2937;
              }
              #${CHAPA_CONTAINER_ID} .chapa-payment-icon {
                width: 36px;
                height: 36px;
              }
              #${CHAPA_CONTAINER_ID} .chapa-selected {
                background-color: #f0fdf4;
                box-shadow: 0 0 0 1px #16a34a;
                border-color: #16a34a;
              }
              #${CHAPA_CONTAINER_ID} .chapa-phone-input-wrapper {
                border-radius: 12px;
                padding: 10px 12px;
              }
              #${CHAPA_CONTAINER_ID} .chapa-phone-input {
                font-size: 16px;
              }
              #${CHAPA_CONTAINER_ID} .chapa-pay-button {
                border-radius: 12px;
                min-height: 48px;
                font-weight: 700;
                background: linear-gradient(90deg, #16a34a, #15803d);
              }
              #${CHAPA_CONTAINER_ID} .chapa-pay-button:hover {
                background: linear-gradient(90deg, #15803d, #166534);
              }
              @media (max-width: 640px) {
                #${CHAPA_CONTAINER_ID} .chapa-payment-method {
                  width: 100%;
                }
              }
            `,
          },
          onPaymentFailure: (message: string) => {
            setError(message || 'Chapa payment failed. Please try again.');
            toast({
              title: 'Payment Failed',
              description: message || 'Chapa payment failed. Please try again.',
              variant: 'destructive',
            });
          },
          onClose: () => {
            toast({
              title: 'Checkout Closed',
              description: 'You can continue your payment whenever you are ready.',
            });
          },
        });

        inlineCheckoutRef.current = chapa;
        chapa.initialize(CHAPA_CONTAINER_ID);
      } catch (err: any) {
        console.error('❌ Failed to render Chapa inline checkout:', err);
        setError(err.message || 'Failed to render Chapa inline checkout.');
      } finally {
        if (!cancelled) {
          setIsRenderingInline(false);
        }
      }
    };

    void renderInlineCheckout();

    return () => {
      cancelled = true;
      inlineCheckoutRef.current = null;
      const container = document.getElementById(CHAPA_CONTAINER_ID);
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [paymentData, toast]);

  const initializePayment = async (orderIdNum: number, type?: string | null) => {
    try {
      setIsInitializing(true);
      setError('');

      console.log('🔄 Initializing Chapa payment for order:', orderIdNum, 'type:', type);

      if (!chapaPublicKey) {
        throw new Error('Chapa public key is not configured. Set VITE_CHAPA_PUBLIC_KEY in your environment.');
      }

      let orderDetails: any;
      let initResult: ChapaInitializationResult | null = null;

      // Always initialize the payment with the backend first and use the
      // returned `paymentId` as the canonical Chapa `tx_ref`.
      if (type === 'event') {
        orderDetails = await eventOrderService.getOrder(orderIdNum);
        initResult = await eventOrderService.initializePayment(orderIdNum, 'CHAPA');
      } else if (type === 'service') {
        orderDetails = await serviceOrderService.getOrder(orderIdNum);
        initResult = await serviceOrderService.initializePayment(orderIdNum, 'CHAPA');
      } else if (type === 'custom') {
        orderDetails = await customOrderService.getById(orderIdNum);
        initResult = await customOrderService.initPayment(orderIdNum, 'CHAPA');
      } else {
        orderDetails = await apiService.getRequest<any>(`/api/orders/${orderIdNum}`);
        initResult = await paymentService.initializePayment(orderIdNum, 'CHAPA');
      }

      // Extract amount from order details (in minor units)
      const orderAmountMinor = type === 'event'
        ? orderDetails?.totalAmountMinor || 0
        : type === 'service'
        ? orderDetails?.totalAmountMinor || 0
        : type === 'custom'
        ? orderDetails?.finalPriceMinor || orderDetails?.basePriceMinor || 0
        : orderDetails?.totals?.totalMinor || 0;
      const orderCurrency = orderDetails?.currency || orderDetails?.currencyCode || 'ETB';
      const txRef = initResult?.paymentId?.trim();
      const contactPhone = type === 'event'
        ? orderDetails?.contactPhone
        : type === 'service'
        ? orderDetails?.contactPhone || orderDetails?.recipientPhone
        : type === 'custom'
        ? undefined
        : orderDetails?.contactPhone || orderDetails?.shippingAddress?.phone;

      console.log('Prepared Chapa inline payment context:', {
        orderId: orderIdNum,
        orderType: type,
        currency: orderCurrency,
        txRef,
        checkoutUrl: initResult?.checkoutUrl,
      });

      if (!orderAmountMinor || orderAmountMinor <= 0) {
        throw new Error('Unable to determine the Chapa payment amount for this order.');
      }

      if (!txRef) {
        throw new Error('Backend did not return a Chapa payment reference (paymentId / tx_ref).');
      }

      setPaymentData({
        amountMajor: (orderAmountMinor / 100).toFixed(2),
        amountMinor: orderAmountMinor,
        currency: orderCurrency,
        orderId: orderIdNum,
        txRef,
        orderType: formatOrderType(type),
        customerPhone: normalizeEthiopianPhone(contactPhone),
        returnUrl: getChapaReturnUrl(orderIdNum, txRef, type),
      });

      toast({
        title: "Payment Ready",
        description: "Complete your payment below without leaving the app.",
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

  // Loading state
  if (isInitializing) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-16">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-green-600" />
            <p className="text-lg font-medium">Preparing Chapa inline checkout...</p>
            <p className="text-sm text-gray-500">Please wait while we prepare your payment</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error || !orderId || !paymentData) {
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
          
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Order Summary */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Order ID:</span>
              <span className="font-medium">#{paymentData.orderId}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Order Type:</span>
              <span className="font-medium">{paymentData.orderType}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="font-semibold">Total Amount:</span>
              <span className="font-bold text-lg">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: paymentData.currency || 'ETB',
                }).format((paymentData.amountMinor || 0) / 100)}
              </span>
            </div>
          </div>

          

          {isRenderingInline && (
            <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading Chapa checkout form...
            </div>
          )}

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div id={CHAPA_CONTAINER_ID} className="min-h-[220px]" />
          </div>

          <p className="text-xs text-center text-gray-500">
            Chapa will prompt for the selected payment method here. When payment succeeds, you will be taken to the confirmation page automatically.
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
