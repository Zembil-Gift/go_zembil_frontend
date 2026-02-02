import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Package, Truck, Clock, MapPin, Phone, Mail, ArrowLeft, Loader2, ThumbsUp } from 'lucide-react';
import { isUnauthorizedError } from '@/lib/authUtils';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';
import orderService, { Order } from '@/services/orderService';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function TrackOrder() {
  const { orderId } = useParams<{ orderId: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const { data: order, isLoading, error } = useQuery<Order>({
    queryKey: ['order', orderId],
    queryFn: async () => {
      if (!orderId || orderId === 'undefined') {
        throw new Error('Invalid order ID');
      }
      const result = await orderService.getOrderByNumber(orderId);
      console.log('Order data received:', JSON.stringify(result, null, 2));
      console.log('Order keys:', Object.keys(result));
      console.log('Order totals:', result.totals);
      console.log('Order items:', result.items);
      return result;
    },
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

  // Mutation for confirming delivery
  const confirmDeliveryMutation = useMutation({
    mutationFn: () => orderService.confirmDelivery(order!.orderId),
    onSuccess: () => {
      toast({
        title: "Delivery Confirmed!",
        description: "Thank you for confirming your order delivery.",
      });
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      setShowConfirmDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to confirm delivery",
        variant: "destructive",
      });
    },
  });

  // Check if delivery confirmation is needed (status is DELIVERED but not yet confirmed by user)
  const isDeliveredAndNeedsConfirmation = order && 
    order.status?.toLowerCase() === 'delivered' && 
    !order.deliveryConfirmedAt;

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

  if (error || !order) {
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
                Order #{order.orderNumber || orderId}
              </p>
            </div>
            <div className="text-right">
              <Badge className={getStatusColor(order.status)} variant="secondary">
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </Badge>
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
                    {new Date(order.createdAt || Date.now()).toLocaleDateString('en-US', {
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
                  <p className="text-gray-900 font-bold">{order.currency} {((order.totals?.totalMinor || 0) / 100).toFixed(2)}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Payment Status</p>
                  <Badge className={order.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                    {order.paymentStatus ? order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1) : 'Pending'}
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
                <p className="text-gray-600">{order.shippingAddress?.fullName || 'Customer'}</p>
              </div>
              <div>
                <p className="font-medium text-gray-900">Delivery Address</p>
                <p className="text-gray-600">{order.shippingAddress?.street || order.shippingAddress?.addressLine1}</p>
                {order.shippingAddress?.addressLine2 && (
                  <p className="text-gray-600 text-sm">{order.shippingAddress.addressLine2}</p>
                )}
                <p className="text-gray-600 text-sm">{order.shippingAddress?.city}, {order.shippingAddress?.state}</p>
                <p className="text-gray-600 text-sm">{order.shippingAddress?.country} {order.shippingAddress?.zipcode}</p>
              </div>
              <div>
                <p className="font-medium text-gray-900">Contact</p>
                {order.shippingAddress?.phone ? (
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Phone size={14} />
                    <span>{order.shippingAddress.phone}</span>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No contact information</p>
                )}
                {order.shippingAddress?.email && (
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Mail size={14} />
                    <span>{order.shippingAddress.email}</span>
                  </div>
                )}
              </div>
              {order.estimatedDeliveryDate && (
                <div>
                  <p className="font-medium text-gray-900">Estimated Delivery</p>
                  <p className="text-gray-600">
                    {new Date(order.estimatedDeliveryDate).toLocaleDateString('en-US', {
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
              {(order.lines || order.items)?.map((item: any) => (
                <div key={item.id || item.productId} className="flex items-center space-x-4 py-2 border-b last:border-b-0">
                  <div className="w-16 h-16 flex-shrink-0">
                    <img
                      src={item.productImage || "https://images.unsplash.com/photo-1447933601403-0c6688de566e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"}
                      alt={item.productName || "Product"}
                      className="w-full h-full object-cover rounded"
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">
                      {item.productName || "Product"}
                    </h4>
                    <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                    {item.skuCode && (
                      <p className="text-sm text-gray-400">SKU: {item.skuCode}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      {order.currency} {((item.unitAmountMinor || item.totalPrice || 0) * item.quantity / 100).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Confirm Delivery Section - shown when order is delivered but not yet confirmed by user */}
        {isDeliveredAndNeedsConfirmation && (
          <Card className="mb-8 border-green-200 bg-green-50">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <ThumbsUp className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Did you receive your order?</h3>
                    <p className="text-sm text-gray-600">
                      Please confirm that you have received your delivery.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => setShowConfirmDialog(true)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Confirm Delivery
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Already confirmed message */}
        {order.status?.toLowerCase() === 'delivered' && order.deliveryConfirmedAt && (
          <Card className="mb-8 border-green-200 bg-green-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-800">Delivery Confirmed</h3>
                  <p className="text-sm text-green-600">
                    You confirmed receiving this order on{' '}
                    {new Date(order.deliveryConfirmedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Confirm Delivery Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Delivery</AlertDialogTitle>
            <AlertDialogDescription>
              By confirming, you acknowledge that you have received your order and are satisfied with the delivery.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={confirmDeliveryMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDeliveryMutation.mutate()}
              disabled={confirmDeliveryMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {confirmDeliveryMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Confirming...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Yes, I Received It
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}