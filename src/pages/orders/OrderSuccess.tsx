import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Package, Truck, MapPin, Phone, User, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface OrderItem {
  id: number;
  productId: number;
  quantity: number;
  price: string;
  product?: {
    name: string;
    images: string[];
  };
}

interface Order {
  id: string;
  recipientName: string;
  recipientPhone: string;
  recipientEmail: string;
  recipientCity: string;
  recipientAddress: string;
  deliveryType: string;
  total: string;
  status: string;
  paymentStatus: string;
  trackingNumber: string;
  createdAt: string;
  items?: OrderItem[];
}

export default function OrderSuccess() {
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [trackingNumber, setTrackingNumber] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const orderIdFromURL = urlParams.get('orderId');
    const paymentMethodParam = urlParams.get('paymentMethod') || '';
    const trackingNumberParam = urlParams.get('trackingNumber') || '';
    
    console.log('🔍 OrderSuccess - Extracting URL params:', {
      fullURL: window.location.href,
      orderIdFromURL,
      paymentMethodParam,
      trackingNumberParam
    });
    
    // Fallback to localStorage if orderId is missing from URL
    const orderIdFromStorage = localStorage.getItem('goZembil_currentOrderId');
    console.log('🔍 OrderSuccess - Checking localStorage fallback:', orderIdFromStorage);
    
    // Use URL first, then localStorage fallback
    const finalOrderId = orderIdFromURL || orderIdFromStorage;
    
    if (finalOrderId) {
      setOrderId(finalOrderId);
      setPaymentMethod(paymentMethodParam);
      setTrackingNumber(trackingNumberParam);
      console.log('✅ OrderSuccess - Set orderId:', finalOrderId);
    } else {
      console.error('❌ OrderSuccess - No orderId found in URL or localStorage');
    }
  }, []);

  const { data: order, isLoading, error } = useQuery<Order>({
    queryKey: [`/api/orders/${orderId}`],
    enabled: !!orderId,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ethiopian-gold mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your order details...</p>
        </div>
      </div>
    );
  }

  if (error || !order || !orderId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="text-center p-8">
            <div className="text-red-500 mb-4">
              <Package className="w-16 h-16 mx-auto mb-4" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Order Not Found</h2>
            <p className="text-gray-600 mb-6">
              We couldn't find your order details. Please check your order confirmation email or contact support.
            </p>
            <Button onClick={() => navigate('/shop')}>
              Continue Shopping
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Thank you for your order! We've received your payment and are preparing your gift for delivery.
          </p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 inline-block mt-4">
            <p className="text-green-800 font-medium">
              Order ID: <strong className="font-bold text-green-900">{orderId}</strong>
            </p>
          </div>
        </div>

        {/* Order Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Order Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="text-ethiopian-gold" size={20} />
                <span>Order Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-gray-900">Order Number</p>
                  <p className="text-gray-600">{order.id.slice(0, 8).toUpperCase()}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Tracking Number</p>
                  <p className="text-gray-600 font-mono">{order.trackingNumber}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Order Date</p>
                  <p className="text-gray-600">
                    {new Date(order.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Status</p>
                  <Badge className="bg-blue-100 text-blue-800">
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </Badge>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Payment Method</p>
                  <p className="text-gray-600 capitalize">{paymentMethod || 'Card'}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Total Amount</p>
                  <p className="text-gray-900 font-semibold">ETB {parseFloat(order.total).toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recipient Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Truck className="text-ethiopian-gold" size={20} />
                <span>Recipient Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <User className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="font-medium text-gray-900">Recipient Name</p>
                    <p className="text-gray-600">{order.recipientName}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="font-medium text-gray-900">Phone Number</p>
                    <p className="text-gray-600">{order.recipientPhone}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="font-medium text-gray-900">Delivery Address</p>
                    <p className="text-gray-600">{order.recipientCity}</p>
                    <p className="text-gray-600 text-sm">{order.recipientAddress}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Truck className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="font-medium text-gray-900">Delivery Type</p>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 capitalize">
                      {order.deliveryType}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Items */}
        {order.items && order.items.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center space-x-4 py-2 border-b last:border-b-0">
                    <div className="w-16 h-16 flex-shrink-0">
                      <img
                        src={item.product?.images?.[0] || "https://images.unsplash.com/photo-1447933601403-0c6688de566e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"}
                        alt={item.product?.name || "Product"}
                        className="w-full h-full object-cover rounded"
                      />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{item.product?.name || "Product"}</h4>
                      <p className="text-gray-600">Quantity: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">ETB {parseFloat(item.price).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
                
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center font-bold text-lg">
                    <span>Total</span>
                    <span>ETB {parseFloat(order.total).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <Button 
            className="bg-ethiopian-gold hover:bg-amber text-white"
            onClick={() => {
              console.log('🔄 Track My Order clicked, navigating to:', `/track/${order.id}`);
              navigate(`/track/${order.id}`);
            }}
          >
            <span className="flex items-center space-x-2">
              <span>📦</span>
              <span>Track My Order</span>
            </span>
          </Button>

          <Button 
            variant="outline" 
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
            onClick={() => {
              console.log('🔄 Continue Shopping clicked, navigating to: /shop');
              navigate('/shop');
            }}
          >
            <span className="flex items-center space-x-2">
              <span>🛍️</span>
              <span>Continue Shopping</span>
            </span>
          </Button>
        </div>

        {/* Next Steps */}
        <Card>
          <CardHeader>
            <CardTitle>What's Next?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="space-y-2">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
                <h4 className="font-medium">Processing</h4>
                <p className="text-sm text-gray-600">
                  We're preparing your order for shipment
                </p>
              </div>
              <div className="space-y-2">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
                  <Truck className="w-6 h-6 text-yellow-600" />
                </div>
                <h4 className="font-medium">Shipping</h4>
                <p className="text-sm text-gray-600">
                  Your order will be shipped within 24 hours
                </p>
              </div>
              <div className="space-y-2">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <h4 className="font-medium">Delivery</h4>
                <p className="text-sm text-gray-600">
                  Delivered to your recipient in 2-3 days
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}