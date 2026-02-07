import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Loader2, 
  Home, 
  ShoppingBag, 
  TicketIcon,
  Phone
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/services/apiService';

export default function TelebirrReturnPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const orderId = searchParams.get('orderId');
  const orderType = searchParams.get('orderType') || 'product';

  const [status, setStatus] = useState<'verifying' | 'success' | 'pending' | 'failed'>('verifying');
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [checkCount, setCheckCount] = useState(0);

  useEffect(() => {
    if (!orderId) {
      setStatus('failed');
      setMessage('No order information found.');
      return;
    }

    // Start verifying payment status
    verifyPaymentStatus(parseInt(orderId), orderType);
  }, [orderId, orderType]);

  const verifyPaymentStatus = async (orderIdNum: number, type: string) => {
    try {
      setStatus('verifying');
      
      // Fetch order to check payment status
      let order: any;
      
      if (type === 'event') {
        order = await apiService.getRequest<any>(`/api/event-orders/${orderIdNum}`);
      } else if (type === 'service') {
        order = await apiService.getRequest<any>(`/api/service-orders/${orderIdNum}`);
      } else if (type === 'custom') {
        order = await apiService.getRequest<any>(`/api/custom-orders/${orderIdNum}`);
      } else {
        order = await apiService.getRequest<any>(`/api/orders/${orderIdNum}`);
      }

      setOrderDetails(order);

      // Check payment status
      const paymentStatus = order.paymentStatus || order.status;
      
      if (paymentStatus === 'PAID' || paymentStatus === 'CONFIRMED' || paymentStatus === 'COMPLETED') {
        setStatus('success');
        setMessage('Your payment was successful! Thank you for your order.');
        toast({
          title: "Payment Successful",
          description: "Your TeleBirr payment has been confirmed.",
        });
        
        // Clear stored order info
        localStorage.removeItem('goGerami_currentOrderId');
        localStorage.removeItem('goGerami_currentOrderType');
        localStorage.removeItem('goGerami_paymentProvider');
        
      } else if (paymentStatus === 'PENDING' || paymentStatus === 'AWAITING_PAYMENT') {
        // Payment webhook may not have arrived yet - retry a few times
        if (checkCount < 5) {
          setMessage('Verifying your payment with TeleBirr...');
          setTimeout(() => {
            setCheckCount(prev => prev + 1);
            verifyPaymentStatus(orderIdNum, type);
          }, 3000); // Retry every 3 seconds
        } else {
          // Still pending after retries
          setStatus('pending');
          setMessage('Your payment is being processed. This may take a few minutes. You will receive a confirmation once complete.');
        }
      } else if (paymentStatus === 'FAILED' || paymentStatus === 'CANCELLED') {
        setStatus('failed');
        setMessage('Your payment was not successful. Please try again or contact support.');
      } else {
        // Unknown status - treat as pending
        setStatus('pending');
        setMessage('We are verifying your payment status. Please wait or check your order history.');
      }

    } catch (err: any) {
      console.error('Error verifying payment:', err);
      setStatus('pending');
      setMessage('Unable to verify payment status. Please check your order history for updates.');
    }
  };

  const handleContinueShopping = () => {
    navigate('/shop');
  };

  const handleViewOrders = () => {
    if (orderType === 'event') {
      navigate('/my-event-tickets');
    } else if (orderType === 'service') {
      navigate('/my-service-orders');
    } else if (orderType === 'custom') {
      navigate('/my-custom-orders');
    } else {
      navigate('/my-orders');
    }
  };

  const handleViewOrderDetails = () => {
    if (orderId) {
      if (orderType === 'event') {
        navigate(`/my-event-tickets/${orderId}`);
      } else if (orderType === 'service') {
        navigate(`/my-service-orders/${orderId}`);
      } else if (orderType === 'custom') {
        navigate(`/my-custom-orders/${orderId}`);
      } else {
        navigate(`/my-orders/${orderId}`);
      }
    }
  };

  const handleRetryPayment = () => {
    if (orderId) {
      navigate(`/payment/telebirr?orderId=${orderId}&orderType=${orderType}`);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'verifying':
        return <Loader2 className="h-16 w-16 text-green-500 animate-spin" />;
      case 'success':
        return <CheckCircle2 className="h-16 w-16 text-green-500" />;
      case 'pending':
        return <Clock className="h-16 w-16 text-amber-500" />;
      case 'failed':
        return <XCircle className="h-16 w-16 text-red-500" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'verifying':
        return 'border-green-200 bg-green-50';
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'pending':
        return 'border-amber-200 bg-amber-50';
      case 'failed':
        return 'border-red-200 bg-red-50';
    }
  };

  const getStatusTitle = () => {
    switch (status) {
      case 'verifying':
        return 'Verifying Payment';
      case 'success':
        return 'Payment Successful!';
      case 'pending':
        return 'Payment Processing';
      case 'failed':
        return 'Payment Failed';
    }
  };

  return (
    <div className="container max-w-xl mx-auto px-4 py-16">
      <Card className={`shadow-lg ${getStatusColor()}`}>
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="relative">
              {getStatusIcon()}
              {status === 'verifying' && (
                <Phone className="h-6 w-6 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-green-700" />
              )}
            </div>
          </div>
          <CardTitle className="text-2xl">{getStatusTitle()}</CardTitle>
          <CardDescription className="text-base mt-2">
            {message}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Order Details */}
          {orderDetails && (
            <div className="bg-white rounded-lg p-4 border space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Order ID:</span>
                <span className="font-medium">#{orderId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Order Type:</span>
                <span className="font-medium capitalize">{orderType}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Payment Method:</span>
                <span className="font-medium flex items-center">
                  <Phone className="h-4 w-4 mr-1 text-green-600" />
                  TeleBirr
                </span>
              </div>
              {orderDetails.orderNumber && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Order Number:</span>
                  <span className="font-medium">{orderDetails.orderNumber}</span>
                </div>
              )}
            </div>
          )}

          {/* Status-specific alerts */}
          {status === 'pending' && (
            <Alert className="bg-amber-100 border-amber-300">
              <Clock className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-700 ml-2">
                TeleBirr payments may take a few minutes to confirm. 
                You'll receive an SMS confirmation from TeleBirr once complete.
              </AlertDescription>
            </Alert>
          )}

          {status === 'failed' && (
            <Alert className="bg-red-100 border-red-300">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700 ml-2">
                If you were charged but see this error, please contact support.
                For payment issues, you can also dial *127# to check your TeleBirr transaction.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>

        <CardFooter className="flex flex-col space-y-3">
          {status === 'success' && (
            <>
              <Button 
                onClick={handleViewOrderDetails}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {orderType === 'event' ? (
                  <>
                    <TicketIcon className="mr-2 h-4 w-4" />
                    View My Tickets
                  </>
                ) : (
                  <>
                    <ShoppingBag className="mr-2 h-4 w-4" />
                    View Order Details
                  </>
                )}
              </Button>
              <Button 
                onClick={handleContinueShopping}
                variant="outline"
                className="w-full"
              >
                <Home className="mr-2 h-4 w-4" />
                Continue Shopping
              </Button>
            </>
          )}

          {status === 'pending' && (
            <>
              <Button 
                onClick={handleViewOrders}
                className="w-full bg-amber-600 hover:bg-amber-700"
              >
                <ShoppingBag className="mr-2 h-4 w-4" />
                Check My Orders
              </Button>
              <Button 
                onClick={handleContinueShopping}
                variant="outline"
                className="w-full"
              >
                <Home className="mr-2 h-4 w-4" />
                Continue Shopping
              </Button>
            </>
          )}

          {status === 'failed' && (
            <>
              <Button 
                onClick={handleRetryPayment}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <Phone className="mr-2 h-4 w-4" />
                Try Again with TeleBirr
              </Button>
              <Button 
                onClick={() => navigate(-2)} // Go back to checkout
                variant="outline"
                className="w-full"
              >
                Choose Different Payment
              </Button>
            </>
          )}

          {status === 'verifying' && (
            <div className="text-center text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
              Checking payment status... ({checkCount + 1}/6)
            </div>
          )}
        </CardFooter>
      </Card>

      {/* Help Section */}
      <Card className="mt-6 border-gray-200">
        <CardContent className="pt-4">
          <h4 className="font-medium text-gray-700 mb-3">TeleBirr Support</h4>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• Check your TeleBirr balance: Dial *127#</p>
            <p>• TeleBirr customer support: 994</p>
            <p>• Payment may take up to 5 minutes to confirm</p>
            <p>• You will receive an SMS confirmation from TeleBirr</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
