import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Package, 
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Phone,
  Mail,
  User,
  Filter,
  Search,
  Truck,
  MapPin,
  Copy,
  ShoppingBag
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

import { 
  orderService, 
  VendorOrder,
  VendorOrderDeliveryInfo
} from '@/services/orderService';

export default function VendorProductOrders() {
  const { toast } = useToast();
  
  const [selectedOrder, setSelectedOrder] = useState<VendorOrder | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch vendor's product orders
  const { data: ordersData, isLoading, refetch } = useQuery({
    queryKey: ['vendor-product-orders', statusFilter],
    queryFn: () => {
      const status = statusFilter === 'all' ? undefined : statusFilter;
      return orderService.getVendorOrders(0, 100, status);
    },
  });

  const orders = ordersData?.content || [];

  // Filter orders by search query
  const filteredOrders = orders.filter((order: VendorOrder) => {
    const matchesSearch = searchQuery === '' || 
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.items.some(item => item.productName.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesSearch;
  });

  // Categorize orders
  const pendingOrders = filteredOrders.filter((order: VendorOrder) => 
    order.status === 'PENDING' || order.status === 'CONFIRMED'
  );

  const processingOrders = filteredOrders.filter((order: VendorOrder) => 
    order.status === 'PROCESSING'
  );

  const shippedOrders = filteredOrders.filter((order: VendorOrder) => 
    order.status === 'SHIPPED'
  );

  const completedOrders = filteredOrders.filter((order: VendorOrder) => 
    ['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(order.status)
  );

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: `${label} copied to clipboard`,
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'CONFIRMED':
        return <CheckCircle className="h-4 w-4 text-blue-600" />;
      case 'PROCESSING':
        return <Package className="h-4 w-4 text-purple-600" />;
      case 'SHIPPED':
        return <Truck className="h-4 w-4 text-indigo-600" />;
      case 'DELIVERED':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'CANCELLED':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'REFUNDED':
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getDeliveryStatusIcon = (status: string) => {
    switch (status) {
      case 'ASSIGNED':
        return <User className="h-4 w-4 text-blue-600" />;
      case 'ACCEPTED':
        return <CheckCircle className="h-4 w-4 text-cyan-600" />;
      case 'PICKED_UP':
        return <Package className="h-4 w-4 text-purple-600" />;
      case 'IN_TRANSIT':
        return <Truck className="h-4 w-4 text-indigo-600" />;
      case 'ARRIVED':
        return <MapPin className="h-4 w-4 text-orange-600" />;
      case 'DELIVERED':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'RETURNED':
        return <AlertCircle className="h-4 w-4 text-amber-600" />;
      case 'CANCELLED':
        return <XCircle className="h-4 w-4 text-gray-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const OrderCard = ({ order }: { order: VendorOrder }) => {
    const statusDisplay = orderService.getStatusDisplay(order.status);
    const hasDelivery = !!order.deliveryInfo;
    const deliveryStatusDisplay = order.deliveryInfo 
      ? orderService.getDeliveryStatusDisplay(order.deliveryInfo.status)
      : null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all duration-300 border-eagle-green/10"
          onClick={() => {
            setSelectedOrder(order);
            setDetailDialogOpen(true);
          }}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-4 flex-1">
                {/* Order Icon or First Product Image */}
                {order.items[0]?.productImage ? (
                  <img 
                    src={order.items[0].productImage} 
                    alt={order.items[0].productName}
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-eagle-green/10 flex items-center justify-center flex-shrink-0">
                    <ShoppingBag className="h-6 w-6 text-eagle-green/50" />
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge className={`${statusDisplay.bgColor} ${statusDisplay.color} border-none`}>
                      {getStatusIcon(order.status)}
                      <span className="ml-1">{statusDisplay.text}</span>
                    </Badge>
                    {order.paymentStatus === 'PAID' && (
                      <Badge className="bg-green-100 text-green-700 border-none">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Paid
                      </Badge>
                    )}
                    {hasDelivery && deliveryStatusDisplay && (
                      <Badge className={`${deliveryStatusDisplay.bgColor} ${deliveryStatusDisplay.color} border-none`}>
                        {getDeliveryStatusIcon(order.deliveryInfo!.status)}
                        <span className="ml-1">{deliveryStatusDisplay.text}</span>
                      </Badge>
                    )}
                  </div>
                  
                  <h3 className="font-bold text-eagle-green text-base mb-1">
                    Order #{order.orderNumber}
                  </h3>
                  
                  <div className="flex items-center gap-4 text-sm text-eagle-green/70">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {order.customerName || 'Customer'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {orderService.formatDate(order.createdAt)}
                    </span>
                  </div>
                  
                  <p className="text-sm text-eagle-green/60 mt-1">
                    {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              
              <div className="text-right flex-shrink-0">
                <p className="font-bold text-eagle-green">
                  {orderService.formatPrice(order.vendorAmountMinor, order.currency)}
                </p>
                <p className="text-xs text-eagle-green/60 mt-1">Your earnings</p>
                {hasDelivery && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-indigo-600">
                    <Truck className="h-3 w-3" />
                    <span>Delivery assigned</span>
                  </div>
                )}
              </div>
            </div>

            {/* Product Summary Preview */}
            <div className="mt-3 pt-3 border-t border-eagle-green/10">
              <div className="flex flex-wrap gap-2">
                {order.items.slice(0, 3).map((item, index) => (
                  <span key={index} className="text-xs bg-eagle-green/5 text-eagle-green/70 px-2 py-1 rounded">
                    {item.productName} × {item.quantity}
                  </span>
                ))}
                {order.items.length > 3 && (
                  <span className="text-xs bg-eagle-green/5 text-eagle-green/70 px-2 py-1 rounded">
                    +{order.items.length - 3} more
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  const EmptyState = ({ message }: { message: string }) => (
    <div className="text-center py-12">
      <ShoppingBag className="h-16 w-16 text-eagle-green/20 mx-auto mb-4" />
      <p className="font-light text-eagle-green/60">{message}</p>
    </div>
  );

  const LoadingState = () => (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex gap-4">
              <Skeleton className="w-16 h-16 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="text-right space-y-2">
                <Skeleton className="h-5 w-20 ml-auto" />
                <Skeleton className="h-3 w-16 ml-auto" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const DeliveryPersonCard = ({ deliveryInfo }: { deliveryInfo: VendorOrderDeliveryInfo }) => {
    const statusDisplay = orderService.getDeliveryStatusDisplay(deliveryInfo.status);
    
    return (
      <div className="bg-indigo-50 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-indigo-900 flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Delivery Information
          </h4>
          <Badge className={`${statusDisplay.bgColor} ${statusDisplay.color} border-none`}>
            {getDeliveryStatusIcon(deliveryInfo.status)}
            <span className="ml-1">{statusDisplay.text}</span>
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-indigo-600" />
              <span className="text-indigo-700">Delivery Person:</span>
              <span className="font-medium text-indigo-900">{deliveryInfo.deliveryPersonName}</span>
            </div>
            
            {deliveryInfo.deliveryPersonPhone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-indigo-600" />
                <span className="text-indigo-700">Phone:</span>
                <a 
                  href={`tel:${deliveryInfo.deliveryPersonPhone}`} 
                  className="font-medium text-indigo-900 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {deliveryInfo.deliveryPersonPhone}
                </a>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(deliveryInfo.deliveryPersonPhone!, 'Phone number');
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            )}
            
            {deliveryInfo.deliveryPersonEmail && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-indigo-600" />
                <span className="text-indigo-700">Email:</span>
                <a 
                  href={`mailto:${deliveryInfo.deliveryPersonEmail}`} 
                  className="font-medium text-indigo-900 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {deliveryInfo.deliveryPersonEmail}
                </a>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            {deliveryInfo.vehicleType && (
              <div className="flex items-center gap-2 text-sm">
                <Truck className="h-4 w-4 text-indigo-600" />
                <span className="text-indigo-700">Vehicle:</span>
                <span className="font-medium text-indigo-900">
                  {deliveryInfo.vehicleType}
                  {deliveryInfo.vehicleNumber && ` (${deliveryInfo.vehicleNumber})`}
                </span>
              </div>
            )}
            
            {deliveryInfo.expectedDeliveryAt && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-indigo-600" />
                <span className="text-indigo-700">Expected:</span>
                <span className="font-medium text-indigo-900">
                  {orderService.formatDateTime(deliveryInfo.expectedDeliveryAt)}
                </span>
              </div>
            )}
            
            {deliveryInfo.assignedAt && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-indigo-600" />
                <span className="text-indigo-700">Assigned:</span>
                <span className="font-medium text-indigo-900">
                  {orderService.formatDateTime(deliveryInfo.assignedAt)}
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Delivery Timeline */}
        <div className="pt-3 border-t border-indigo-200">
          <div className="flex flex-wrap gap-4 text-xs">
            {deliveryInfo.pickedUpAt && (
              <div className="flex items-center gap-1 text-indigo-700">
                <CheckCircle className="h-3 w-3 text-green-600" />
                Picked up: {orderService.formatDateTime(deliveryInfo.pickedUpAt)}
              </div>
            )}
            {deliveryInfo.deliveredAt && (
              <div className="flex items-center gap-1 text-indigo-700">
                <CheckCircle className="h-3 w-3 text-green-600" />
                Delivered: {orderService.formatDateTime(deliveryInfo.deliveredAt)}
              </div>
            )}
          </div>
        </div>
        
        {/* Proof Images */}
        {(deliveryInfo.pickupImageUrl || deliveryInfo.proofImageUrl) && (
          <div className="pt-3 border-t border-indigo-200">
            <p className="text-sm text-indigo-700 mb-2">Delivery Proof:</p>
            <div className="flex gap-3">
              {deliveryInfo.pickupImageUrl && (
                <div className="text-center">
                  <img 
                    src={deliveryInfo.pickupImageUrl} 
                    alt="Pickup proof"
                    className="w-20 h-20 rounded-lg object-cover cursor-pointer hover:opacity-80"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(deliveryInfo.pickupImageUrl, '_blank');
                    }}
                  />
                  <p className="text-xs text-indigo-600 mt-1">Pickup</p>
                </div>
              )}
              {deliveryInfo.proofImageUrl && (
                <div className="text-center">
                  <img 
                    src={deliveryInfo.proofImageUrl} 
                    alt="Delivery proof"
                    className="w-20 h-20 rounded-lg object-cover cursor-pointer hover:opacity-80"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(deliveryInfo.proofImageUrl, '_blank');
                    }}
                  />
                  <p className="text-xs text-indigo-600 mt-1">Delivery</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {deliveryInfo.notes && (
          <div className="pt-3 border-t border-indigo-200">
            <p className="text-sm text-indigo-700">Notes:</p>
            <p className="text-sm text-indigo-900">{deliveryInfo.notes}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-eagle-green mb-1">
                Product Orders
              </h1>
              <p className="font-light text-eagle-green/70">
                Track and manage orders for your products
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => refetch()}
              className="border-eagle-green text-eagle-green hover:bg-eagle-green hover:text-white"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </motion.div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-yellow-700">{pendingOrders.length}</p>
              <p className="text-sm text-yellow-600">Pending</p>
            </CardContent>
          </Card>
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-purple-700">{processingOrders.length}</p>
              <p className="text-sm text-purple-600">Processing</p>
            </CardContent>
          </Card>
          <Card className="bg-indigo-50 border-indigo-200">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-indigo-700">{shippedOrders.length}</p>
              <p className="text-sm text-indigo-600">Shipped</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-700">{completedOrders.filter(o => o.status === 'DELIVERED').length}</p>
              <p className="text-sm text-green-600">Delivered</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-eagle-green/50" />
                  <Input
                    placeholder="Search orders, products, customers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                  <SelectItem value="PROCESSING">Processing</SelectItem>
                  <SelectItem value="SHIPPED">Shipped</SelectItem>
                  <SelectItem value="DELIVERED">Delivered</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Orders Tabs */}
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList className="bg-eagle-green/5 p-1 rounded-lg">
            <TabsTrigger value="pending" className="data-[state=active]:bg-eagle-green data-[state=active]:text-white">
              New Orders ({pendingOrders.length})
            </TabsTrigger>
            <TabsTrigger value="processing" className="data-[state=active]:bg-eagle-green data-[state=active]:text-white">
              Processing ({processingOrders.length})
            </TabsTrigger>
            <TabsTrigger value="shipped" className="data-[state=active]:bg-eagle-green data-[state=active]:text-white">
              Shipped ({shippedOrders.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="data-[state=active]:bg-eagle-green data-[state=active]:text-white">
              Completed ({completedOrders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            {isLoading ? <LoadingState /> : (
              pendingOrders.length === 0 
                ? <EmptyState message="No pending orders at the moment" />
                : <div className="space-y-4">{pendingOrders.map((order: VendorOrder) => <OrderCard key={order.orderId} order={order} />)}</div>
            )}
          </TabsContent>

          <TabsContent value="processing">
            {isLoading ? <LoadingState /> : (
              processingOrders.length === 0 
                ? <EmptyState message="No orders being processed" />
                : <div className="space-y-4">{processingOrders.map((order: VendorOrder) => <OrderCard key={order.orderId} order={order} />)}</div>
            )}
          </TabsContent>

          <TabsContent value="shipped">
            {isLoading ? <LoadingState /> : (
              shippedOrders.length === 0 
                ? <EmptyState message="No orders in transit" />
                : <div className="space-y-4">{shippedOrders.map((order: VendorOrder) => <OrderCard key={order.orderId} order={order} />)}</div>
            )}
          </TabsContent>

          <TabsContent value="completed">
            {isLoading ? <LoadingState /> : (
              completedOrders.length === 0 
                ? <EmptyState message="No completed orders yet" />
                : <div className="space-y-4">{completedOrders.map((order: VendorOrder) => <OrderCard key={order.orderId} order={order} />)}</div>
            )}
          </TabsContent>
        </Tabs>

        {/* Order Detail Dialog */}
        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white">
            {selectedOrder && (
              <>
                <DialogHeader>
                  <DialogTitle className="font-bold text-eagle-green flex items-center gap-2">
                    Order #{selectedOrder.orderNumber}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(selectedOrder.orderNumber, 'Order number')}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </DialogTitle>
                  <DialogDescription>
                    Placed on {orderService.formatDateTime(selectedOrder.createdAt)}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                  {/* Status Badges */}
                  <div className="flex items-center gap-4 flex-wrap">
                    <div>
                      <span className="text-sm font-light text-eagle-green/70">Order Status</span>
                      <Badge className={`ml-2 ${orderService.getStatusDisplay(selectedOrder.status).bgColor} ${orderService.getStatusDisplay(selectedOrder.status).color} border-none`}>
                        {getStatusIcon(selectedOrder.status)}
                        <span className="ml-1">{orderService.getStatusDisplay(selectedOrder.status).text}</span>
                      </Badge>
                    </div>
                    <div>
                      <span className="text-sm font-light text-eagle-green/70">Payment</span>
                      <Badge className={`ml-2 ${orderService.getPaymentStatusDisplay(selectedOrder.paymentStatus).bgColor} ${orderService.getPaymentStatusDisplay(selectedOrder.paymentStatus).color} border-none`}>
                        {orderService.getPaymentStatusDisplay(selectedOrder.paymentStatus).text}
                      </Badge>
                    </div>
                  </div>

                  <Separator />

                  {/* Customer Contact Info */}
                  <div>
                    <h4 className="font-bold text-eagle-green mb-3">Customer Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-eagle-green/50" />
                        <span className="text-eagle-green/70">Name:</span>
                        <span className="font-medium text-eagle-green">
                          {selectedOrder.customerName || 'N/A'}
                        </span>
                      </div>
                      {selectedOrder.customerEmail && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-eagle-green/50" />
                          <span className="text-eagle-green/70">Email:</span>
                          <a href={`mailto:${selectedOrder.customerEmail}`} className="font-medium text-eagle-green hover:underline">
                            {selectedOrder.customerEmail}
                          </a>
                        </div>
                      )}
                      {selectedOrder.customerPhone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-eagle-green/50" />
                          <span className="text-eagle-green/70">Phone:</span>
                          <a href={`tel:${selectedOrder.customerPhone}`} className="font-medium text-eagle-green hover:underline">
                            {selectedOrder.customerPhone}
                          </a>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyToClipboard(selectedOrder.customerPhone!, 'Phone number')}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Shipping Address */}
                  {selectedOrder.shippingAddress && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-bold text-eagle-green mb-3 flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Shipping Address
                        </h4>
                        <div className="bg-gray-50 rounded-lg p-4 text-sm text-eagle-green/80">
                          <p>{selectedOrder.shippingAddress.addressLine1 || selectedOrder.shippingAddress.street}</p>
                          {selectedOrder.shippingAddress.addressLine2 && (
                            <p>{selectedOrder.shippingAddress.addressLine2}</p>
                          )}
                          <p>
                            {selectedOrder.shippingAddress.city}
                            {selectedOrder.shippingAddress.state && `, ${selectedOrder.shippingAddress.state}`}
                            {selectedOrder.shippingAddress.zipcode && ` ${selectedOrder.shippingAddress.zipcode}`}
                          </p>
                          {selectedOrder.shippingAddress.country && (
                            <p>{selectedOrder.shippingAddress.country}</p>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Delivery Information */}
                  {selectedOrder.deliveryInfo && (
                    <>
                      <Separator />
                      <DeliveryPersonCard deliveryInfo={selectedOrder.deliveryInfo} />
                    </>
                  )}

                  <Separator />

                  {/* Order Items */}
                  <div>
                    <h4 className="font-bold text-eagle-green mb-3">Order Items</h4>
                    <div className="space-y-3">
                      {selectedOrder.items.map((item, index) => (
                        <div key={index} className="flex gap-4 p-3 bg-gray-50 rounded-lg">
                          {item.productImage ? (
                            <img 
                              src={item.productImage} 
                              alt={item.productName}
                              className="w-16 h-16 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-lg bg-eagle-green/10 flex items-center justify-center">
                              <Package className="h-6 w-6 text-eagle-green/50" />
                            </div>
                          )}
                          <div className="flex-1">
                            <h5 className="font-medium text-eagle-green">{item.productName}</h5>
                            {item.skuCode && (
                              <p className="text-xs text-eagle-green/60">SKU: {item.skuCode}</p>
                            )}
                            <p className="text-sm text-eagle-green/70 mt-1">
                              Qty: {item.quantity} × {orderService.formatPrice(item.unitAmountMinor, item.currency)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-eagle-green">
                              {orderService.formatPrice(item.totalAmountMinor, item.currency)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Gift Options */}
                  {(selectedOrder.giftWrap || selectedOrder.cardMessage) && (
                    <>
                      <Separator />
                      <div className="bg-yellow-50 rounded-lg p-4">
                        <h4 className="font-bold text-yellow-800 mb-2">Gift Options</h4>
                        {selectedOrder.giftWrap && (
                          <div className="flex items-center gap-2 text-sm text-yellow-700 mb-1">
                            <CheckCircle className="h-4 w-4" />
                            Gift wrapping requested
                          </div>
                        )}
                        {selectedOrder.cardMessage && (
                          <div>
                            <p className="text-sm text-yellow-700">Gift message:</p>
                            <p className="text-sm italic text-yellow-800 mt-1">"{selectedOrder.cardMessage}"</p>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  <Separator />

                  {/* Payment Summary */}
                  <div>
                    <h4 className="font-bold text-eagle-green mb-3">Payment Summary</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-eagle-green/70">Subtotal</span>
                        <span className="text-eagle-green">
                          {orderService.formatPrice(selectedOrder.subtotalMinor, selectedOrder.currency)}
                        </span>
                      </div>
                      {selectedOrder.vatAmountMinor && selectedOrder.vatAmountMinor > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-eagle-green/70">VAT</span>
                          <span className="text-eagle-green">
                            {orderService.formatPrice(selectedOrder.vatAmountMinor, selectedOrder.currency)}
                          </span>
                        </div>
                      )}
                      {selectedOrder.platformFeeMinor && selectedOrder.platformFeeMinor > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-eagle-green/70">Platform Fee</span>
                          <span className="text-red-600">
                            -{orderService.formatPrice(selectedOrder.platformFeeMinor, selectedOrder.currency)}
                          </span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between text-sm">
                        <span className="text-eagle-green/70">Order Total</span>
                        <span className="text-eagle-green">
                          {orderService.formatPrice(selectedOrder.totalAmountMinor, selectedOrder.currency)}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-green-200 bg-green-50 -mx-2 px-2 py-2 rounded">
                        <span className="font-bold text-green-700">Your Earnings</span>
                        <span className="font-bold text-green-700 text-lg">
                          {orderService.formatPrice(selectedOrder.vendorAmountMinor, selectedOrder.currency)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tracking Code */}
                  {selectedOrder.trackingCode && (
                    <>
                      <Separator />
                      <div className="bg-blue-50 rounded-lg p-4">
                        <h4 className="font-bold text-blue-800 mb-2">Tracking Information</h4>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-blue-700">Tracking Code:</span>
                          <span className="font-mono font-medium text-blue-900">{selectedOrder.trackingCode}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyToClipboard(selectedOrder.trackingCode!, 'Tracking code')}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Notes */}
                  {selectedOrder.notes && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-bold text-eagle-green mb-2">Order Notes</h4>
                        <p className="text-sm text-eagle-green/70">{selectedOrder.notes}</p>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
