import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Package, Truck, Clock, MapPin, Phone, Mail, ArrowLeft } from 'lucide-react';
import { isUnauthorizedError } from '@/lib/authUtils';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

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
  recipientCity: string;
  recipientAddress: string;
  total: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  trackingNumber: string;
  createdAt: string;
  deliveryDate?: string;
  items?: OrderItem[];
}

export default function TrackOrder() {
  const { orderId } = useParams<{ orderId: string }>();
  const { toast } = useToast();

  const { data: order, isLoading, error } = useQuery<Order>({
    queryKey: ['/api/orders', orderId],
    enabled: !!orderId && orderId !== 'undefined',
    retry: false,
  });

  useEffect(() => {
    if (error && isUnauthorizedError(error as Error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [error, toast]);

  const getStatusSteps = (currentStatus: string) => {
    const statuses = [
      { key: 'pending', label: 'Order Placed', icon: Package },
      { key: 'processing', label: 'Processing', icon: Clock },
      { key: 'shipped', label: 'Shipped', icon: Truck },
      { key: 'delivered', label: 'Delivered', icon: CheckCircle }
    ];

    const currentIndex = statuses.findIndex(s => s.key === currentStatus.toLowerCase());
    
    return statuses.map((status, index) => ({
      ...status,
      completed: index <= currentIndex,
      current: index === currentIndex
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-48 mx-auto mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-32 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-16">
            <Package size={64} className="text-gray-400 mx-auto mb-6" />
            <h2 className="font-display text-2xl font-bold text-charcoal mb-4">
              Order not found
            </h2>
            <p className="text-gray-600 mb-8">
              We couldn't find the order you're looking for. Please check your order number and try again.
            </p>
            <div className="space-x-4">
              <Button asChild variant="outline">
                <a href="/my-orders" className="flex items-center space-x-2">
                  <ArrowLeft size={16} />
                  <span>My Orders</span>
                </a>
              </Button>
              <Button asChild className="bg-ethiopian-gold hover:bg-amber text-white">
                <a href="/gifts">Continue Shopping</a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const statusSteps = getStatusSteps(order.status);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button asChild variant="ghost" className="mb-4">
            <a href="/my-orders" className="flex items-center space-x-2">
              <ArrowLeft size={16} />
              <span>Back to My Orders</span>
            </a>
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-3xl font-bold text-charcoal mb-2">
                Track Your Order
              </h1>
              <p className="text-gray-600">
                Order #{order.id.slice(0, 8).toUpperCase()}
              </p>
            </div>
            <div className="text-right">
              <Badge className={getStatusColor(order.status)} variant="secondary">
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </Badge>
              {order.trackingNumber && (
                <p className="text-sm text-gray-600 mt-2 font-mono">
                  Tracking: {order.trackingNumber}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Status Timeline */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Order Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              {statusSteps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={step.key} className="flex flex-col items-center flex-1">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                      step.completed 
                        ? 'bg-ethiopian-gold text-white' 
                        : step.current 
                        ? 'bg-blue-100 text-blue-600' 
                        : 'bg-gray-100 text-gray-400'
                    }`}>
                      <Icon size={20} />
                    </div>
                    <p className={`text-sm font-medium ${
                      step.completed ? 'text-ethiopian-gold' : 'text-gray-600'
                    }`}>
                      {step.label}
                    </p>
                    {index < statusSteps.length - 1 && (
                      <div className={`absolute h-0.5 w-full top-6 left-1/2 transform translate-x-1/2 ${
                        step.completed ? 'bg-ethiopian-gold' : 'bg-gray-200'
                      }`} style={{ zIndex: -1 }} />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Order Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Order Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="text-ethiopian-gold" size={20} />
                <span>Order Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
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
                  <p className="font-medium text-gray-900">Payment Method</p>
                  <p className="text-gray-600 capitalize">{order.paymentMethod || 'Card'}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Total Amount</p>
                  <p className="text-gray-900 font-bold">ETB {parseFloat(order.total).toFixed(2)}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Payment Status</p>
                  <Badge className={order.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                    {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="text-ethiopian-gold" size={20} />
                <span>Delivery Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-medium text-gray-900">Recipient</p>
                <p className="text-gray-600">{order.recipientName}</p>
              </div>
              <div>
                <p className="font-medium text-gray-900">Delivery Address</p>
                <p className="text-gray-600">{order.recipientCity}</p>
                {order.recipientAddress && (
                  <p className="text-gray-600 text-sm">{order.recipientAddress}</p>
                )}
              </div>
              <div>
                <p className="font-medium text-gray-900">Contact</p>
                <div className="flex items-center space-x-2 text-gray-600">
                  <Phone size={14} />
                  <span>{order.recipientPhone}</span>
                </div>
              </div>
              {order.deliveryDate && (
                <div>
                  <p className="font-medium text-gray-900">Estimated Delivery</p>
                  <p className="text-gray-600">
                    {new Date(order.deliveryDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Order Items */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Order Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {order.items?.map((item) => (
                <div key={item.id} className="flex items-center space-x-4 py-2 border-b last:border-b-0">
                  <div className="w-16 h-16 flex-shrink-0">
                    <img
                      src={item.product?.images?.[0] || "https://images.unsplash.com/photo-1447933601403-0c6688de566e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"}
                      alt={item.product?.name || "Product"}
                      className="w-full h-full object-cover rounded"
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">
                      {item.product?.name || "Product"}
                    </h4>
                    <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      ETB {(parseFloat(item.price) * item.quantity).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card>
          <CardHeader>
            <CardTitle>Need Help?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <Phone className="text-ethiopian-gold" size={20} />
                <div>
                  <p className="font-medium">Call Support</p>
                  <p className="text-sm text-gray-600">+251 11 123 4567</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="text-ethiopian-gold" size={20} />
                <div>
                  <p className="font-medium">Email Support</p>
                  <p className="text-sm text-gray-600">support@gozembil.com</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}