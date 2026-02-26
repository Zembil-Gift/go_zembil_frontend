import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Calendar, 
  Clock,
  MapPin, 
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Phone,
  Mail,
  User,
  CalendarClock,
  Play,
  UserX,
  Filter,
  Search
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

import { 
  serviceOrderService, 
  ServiceOrderResponse,
  ServiceOrderStatus 
} from '@/services/serviceOrderService';
import { serviceService } from '@/services/serviceService';

export default function VendorServiceOrders() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrderResponse | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [validReason, setValidReason] = useState(false);
  const [newScheduledDate, setNewScheduledDate] = useState('');
  const [newScheduledTime, setNewScheduledTime] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch vendor's service orders
  const { data: ordersData, isLoading, refetch } = useQuery({
    queryKey: ['vendor-service-orders'],
    queryFn: () => serviceOrderService.getVendorOrders(0, 100),
  });

  const orders = ordersData?.content || [];

  // Filter orders
  const filteredOrders = orders.filter((order: ServiceOrderResponse) => {
    const matchesSearch = searchQuery === '' || 
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.service?.title?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Categorize orders
  const pendingOrders = filteredOrders.filter((order: ServiceOrderResponse) => 
    order.status === 'BOOKED' && order.paymentStatus === 'PAID'
  );

  const confirmedOrders = filteredOrders.filter((order: ServiceOrderResponse) => 
    order.status === 'CONFIRMED_BY_VENDOR'
  );

  const inProgressOrders = filteredOrders.filter((order: ServiceOrderResponse) => 
    order.status === 'IN_PROGRESS'
  );

  const completedOrders = filteredOrders.filter((order: ServiceOrderResponse) => 
    ['COMPLETED', 'NO_SHOW', 'CANCELLED'].includes(order.status)
  );

  // Mutations
  const confirmMutation = useMutation({
    mutationFn: (orderId: number) => serviceOrderService.confirmOrder(orderId),
    onSuccess: async () => {
      toast({ title: 'Order Confirmed', description: 'The booking has been confirmed.' });
      await queryClient.invalidateQueries({ queryKey: ['vendor-service-orders'] });
      setDetailDialogOpen(false);
      setSelectedOrder(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const inProgressMutation = useMutation({
    mutationFn: (orderId: number) => serviceOrderService.markInProgress(orderId),
    onSuccess: async () => {
      toast({ title: 'Status Updated', description: 'Service marked as in progress.' });
      await queryClient.invalidateQueries({ queryKey: ['vendor-service-orders'] });
      setDetailDialogOpen(false);
      setSelectedOrder(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const completeMutation = useMutation({
    mutationFn: (orderId: number) => serviceOrderService.completeOrder(orderId),
    onSuccess: async () => {
      toast({ title: 'Service Completed', description: 'The service has been marked as completed.' });
      await queryClient.invalidateQueries({ queryKey: ['vendor-service-orders'] });
      setDetailDialogOpen(false);
      setSelectedOrder(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const noShowMutation = useMutation({
    mutationFn: (orderId: number) => serviceOrderService.markNoShow(orderId),
    onSuccess: async () => {
      toast({ title: 'No-Show Recorded', description: 'Customer has been marked as no-show.' });
      await queryClient.invalidateQueries({ queryKey: ['vendor-service-orders'] });
      setDetailDialogOpen(false);
      setSelectedOrder(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ orderId, reason, validReason }: { orderId: number; reason: string; validReason: boolean }) =>
      serviceOrderService.vendorCancelOrder(orderId, reason, validReason),
    onSuccess: async () => {
      toast({ title: 'Order Cancelled', description: 'The booking has been cancelled.' });
      await queryClient.invalidateQueries({ queryKey: ['vendor-service-orders'] });
      setCancelDialogOpen(false);
      setCancelReason('');
      setValidReason(false);
      setSelectedOrder(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: ({ orderId, newDateTime }: { orderId: number; newDateTime: string }) =>
      serviceOrderService.vendorRescheduleOrder(orderId, newDateTime),
    onSuccess: async () => {
      toast({ title: 'Reschedule Requested', description: 'Waiting for customer approval.' });
      await queryClient.invalidateQueries({ queryKey: ['vendor-service-orders'] });
      setRescheduleDialogOpen(false);
      setNewScheduledDate('');
      setNewScheduledTime('');
      setSelectedOrder(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleCancel = () => {
    if (selectedOrder && cancelReason) {
      cancelMutation.mutate({ orderId: selectedOrder.id, reason: cancelReason, validReason });
    }
  };

  const handleReschedule = () => {
    if (selectedOrder && newScheduledDate && newScheduledTime) {
      const newDateTime = `${newScheduledDate}T${newScheduledTime}:00`;
      rescheduleMutation.mutate({ orderId: selectedOrder.id, newDateTime });
    }
  };

  const getStatusIcon = (status: ServiceOrderStatus) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'CONFIRMED_BY_VENDOR':
        return <CheckCircle className="h-4 w-4 text-blue-600" />;
      case 'IN_PROGRESS':
        return <Play className="h-4 w-4 text-yellow-600" />;
      case 'CANCELLED':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'NO_SHOW':
        return <UserX className="h-4 w-4 text-gray-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-blue-600" />;
    }
  };

  const OrderCard = ({ order }: { order: ServiceOrderResponse }) => {
    const statusDisplay = serviceOrderService.getStatusDisplay(order.status);
    const hoursUntilService = serviceOrderService.getHoursUntilService(order);
    const isPast = hoursUntilService < 0;
    const isUrgent = hoursUntilService >= 0 && hoursUntilService <= 24;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card 
          className={`cursor-pointer hover:shadow-lg transition-all duration-300 ${
            isUrgent && !isPast ? 'border-amber-300 bg-amber-50/50' : 'border-eagle-green/10'
          }`}
          onClick={() => {
            setSelectedOrder(order);
            setDetailDialogOpen(true);
          }}
        >
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex gap-4 flex-1 min-w-0">
                {/* Service Image */}
                {order.service && serviceService.getPrimaryImageUrl(order.service) ? (
                  <img 
                    src={serviceService.getPrimaryImageUrl(order.service)} 
                    alt={order.service.title}
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-eagle-green/10 flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-6 w-6 text-eagle-green/50" />
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge className={`${statusDisplay.bgColor} ${statusDisplay.color} border-none`}>
                      {getStatusIcon(order.status)}
                      <span className="ml-1">{statusDisplay.text}</span>
                    </Badge>
                    {isUrgent && !isPast && order.status !== 'CANCELLED' && (
                      <Badge className="bg-amber-100 text-amber-700 border-none">
                        <Clock className="h-3 w-3 mr-1" />
                        {hoursUntilService}h away
                      </Badge>
                    )}
                    {order.rescheduleInfo?.pendingRescheduleDateTime && (
                      <Badge className="bg-purple-100 text-purple-700 border-none">
                        Reschedule Pending
                      </Badge>
                    )}
                  </div>
                  
                  <h3 className="font-bold text-eagle-green text-base mb-1 truncate">
                    {order.service?.title || 'Service'}
                  </h3>
                  
                  <p className="text-sm text-eagle-green/70 mb-1">
                    Order #{order.orderNumber}
                  </p>
                  
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-eagle-green/70">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 flex-shrink-0" />
                      {serviceOrderService.formatDate(order.scheduledDateTime)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 flex-shrink-0" />
                      {serviceOrderService.formatTime(order.scheduledDateTime)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="text-left sm:text-right flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-eagle-green/10">
                <p className="font-bold text-eagle-green">
                  {serviceOrderService.formatPrice(order.vendorAmountMinor || order.totalAmountMinor, order.currency)}
                </p>
                <p className="text-xs text-eagle-green/60 mt-1">
                  Your Earnings
                </p>
              </div>
            </div>

            {/* Customer Contact Preview */}
            <div className="mt-3 pt-3 border-t border-eagle-green/10 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-eagle-green/70">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {order.recipientName || order.customerName || 'N/A'}
              </span>
              {order.contactPhone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {order.contactPhone}
                </span>
              )}
            </div>

            {/* Quick Actions */}
            {order.status === 'BOOKED' && order.paymentStatus === 'PAID' && (
              <div className="mt-3 pt-3 border-t border-eagle-green/10 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="bg-eagle-green hover:bg-viridian-green text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    confirmMutation.mutate(order.id);
                  }}
                  disabled={confirmMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Confirm
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedOrder(order);
                    setCancelDialogOpen(true);
                  }}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Decline
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  const EmptyState = ({ message }: { message: string }) => (
    <div className="text-center py-12">
      <Calendar className="h-16 w-16 text-eagle-green/20 mx-auto mb-4" />
      <p className="font-light text-eagle-green/60">{message}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-full overflow-x-hidden">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-eagle-green mb-1">
                Service Orders
              </h1>
              <p className="font-light text-eagle-green/70 text-sm sm:text-base">
                Manage your service bookings
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/vendor/service-calendar">
                <Button
                  variant="outline"
                  className="border-eagle-green text-eagle-green hover:bg-eagle-green hover:text-white"
                >
                  <CalendarClock className="h-4 w-4 mr-2" />
                  Service Calendar
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={() => refetch()}
                className="border-eagle-green text-eagle-green hover:bg-eagle-green hover:text-white"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row flex-wrap gap-4">
              <div className="flex-1 min-w-0 w-full sm:min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-eagle-green/50" />
                  <Input
                    placeholder="Search orders..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="BOOKED">Pending</SelectItem>
                  <SelectItem value="CONFIRMED_BY_VENDOR">Confirmed</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  <SelectItem value="NO_SHOW">No Show</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <Skeleton className="h-16 w-16 rounded-lg bg-june-bud/20" />
                    <div className="flex-1">
                      <Skeleton className="h-5 w-1/4 mb-2 bg-june-bud/20" />
                      <Skeleton className="h-4 w-3/4 mb-2 bg-june-bud/20" />
                      <Skeleton className="h-4 w-1/2 bg-june-bud/20" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Tabs defaultValue="pending" className="space-y-6">
            <TabsList className="bg-june-bud/10 p-1 flex flex-wrap gap-1 w-full">
              <TabsTrigger 
                value="pending"
                className="font-bold data-[state=active]:bg-eagle-green data-[state=active]:text-white"
              >
                Pending ({pendingOrders.length})
              </TabsTrigger>
              <TabsTrigger 
                value="confirmed"
                className="font-bold data-[state=active]:bg-eagle-green data-[state=active]:text-white"
              >
                Confirmed ({confirmedOrders.length})
              </TabsTrigger>
              <TabsTrigger 
                value="in-progress"
                className="font-bold data-[state=active]:bg-eagle-green data-[state=active]:text-white"
              >
                In Progress ({inProgressOrders.length})
              </TabsTrigger>
              <TabsTrigger 
                value="completed"
                className="font-bold data-[state=active]:bg-eagle-green data-[state=active]:text-white"
              >
                History ({completedOrders.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4">
              {pendingOrders.length === 0 ? (
                <EmptyState message="No pending orders awaiting confirmation." />
              ) : (
                pendingOrders.map((order: ServiceOrderResponse) => (
                  <OrderCard key={order.id} order={order} />
                ))
              )}
            </TabsContent>

            <TabsContent value="confirmed" className="space-y-4">
              {confirmedOrders.length === 0 ? (
                <EmptyState message="No confirmed orders." />
              ) : (
                confirmedOrders.map((order: ServiceOrderResponse) => (
                  <OrderCard key={order.id} order={order} />
                ))
              )}
            </TabsContent>

            <TabsContent value="in-progress" className="space-y-4">
              {inProgressOrders.length === 0 ? (
                <EmptyState message="No services currently in progress." />
              ) : (
                inProgressOrders.map((order: ServiceOrderResponse) => (
                  <OrderCard key={order.id} order={order} />
                ))
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              {completedOrders.length === 0 ? (
                <EmptyState message="No completed orders yet." />
              ) : (
                completedOrders.map((order: ServiceOrderResponse) => (
                  <OrderCard key={order.id} order={order} />
                ))
              )}
            </TabsContent>
          </Tabs>
        )}


        {/* Order Detail Dialog */}
        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto bg-white p-4 sm:p-6">
            {selectedOrder && (
              <>
                <DialogHeader>
                  <DialogTitle className="font-bold text-eagle-green">
                    Order #{selectedOrder.orderNumber}
                  </DialogTitle>
                  <DialogDescription>
                    {serviceOrderService.formatDateTime(selectedOrder.scheduledDateTime)}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                  {/* Service Info */}
                  <div className="bg-june-bud/10 rounded-lg p-4">
                    <div className="flex gap-4">
                      {selectedOrder.service && serviceService.getPrimaryImageUrl(selectedOrder.service) ? (
                        <img 
                          src={serviceService.getPrimaryImageUrl(selectedOrder.service)} 
                          alt={selectedOrder.service.title}
                          className="w-20 h-20 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-lg bg-eagle-green/10 flex items-center justify-center">
                          <Calendar className="h-8 w-8 text-eagle-green/50" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-eagle-green text-lg mb-1">
                          {selectedOrder.service?.title || 'Service'}
                        </h3>
                        <div className="space-y-1 text-sm text-eagle-green/70">
                          <p className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {serviceOrderService.formatDate(selectedOrder.scheduledDateTime)}
                          </p>
                          <p className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {serviceOrderService.formatTime(selectedOrder.scheduledDateTime)}
                          </p>
                          {selectedOrder.service?.city && (
                            <p className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              {selectedOrder.service.city}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-sm font-light text-eagle-green/70">Status</span>
                      <Badge className={`ml-2 ${serviceOrderService.getStatusDisplay(selectedOrder.status).bgColor} ${serviceOrderService.getStatusDisplay(selectedOrder.status).color} border-none`}>
                        {serviceOrderService.getStatusDisplay(selectedOrder.status).text}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-sm font-light text-eagle-green/70">Payment</span>
                      <Badge className={`ml-2 ${serviceOrderService.getPaymentStatusDisplay(selectedOrder.paymentStatus).bgColor} ${serviceOrderService.getPaymentStatusDisplay(selectedOrder.paymentStatus).color} border-none`}>
                        {serviceOrderService.getPaymentStatusDisplay(selectedOrder.paymentStatus).text}
                      </Badge>
                    </div>
                  </div>

                  <Separator />

                  {/* Customer Contact Info */}
                  <div>
                    <h4 className="font-bold text-eagle-green mb-3">Customer Contact</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-eagle-green/50" />
                        <span className="text-eagle-green/70">Name:</span>
                        <span className="font-medium text-eagle-green">
                          {selectedOrder.customerName || 'N/A'}
                        </span>
                      </div>
                      {selectedOrder.contactEmail && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-eagle-green/50" />
                          <span className="text-eagle-green/70">Email:</span>
                          <a href={`mailto:${selectedOrder.contactEmail}`} className="font-medium text-eagle-green hover:underline">
                            {selectedOrder.contactEmail}
                          </a>
                        </div>
                      )}
                      {selectedOrder.contactPhone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-eagle-green/50" />
                          <span className="text-eagle-green/70">Phone:</span>
                          <a href={`tel:${selectedOrder.contactPhone}`} className="font-medium text-eagle-green hover:underline">
                            {selectedOrder.contactPhone}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Recipient Info (if different) */}
                  {selectedOrder.recipientName && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-bold text-eagle-green mb-3">Recipient (Gift)</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex items-center gap-2 text-sm">
                            <User className="h-4 w-4 text-eagle-green/50" />
                            <span className="text-eagle-green/70">Name:</span>
                            <span className="font-medium text-eagle-green">
                              {selectedOrder.recipientName}
                            </span>
                          </div>
                          {selectedOrder.recipientEmail && (
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="h-4 w-4 text-eagle-green/50" />
                              <span className="text-eagle-green/70">Email:</span>
                              <span className="font-medium text-eagle-green">
                                {selectedOrder.recipientEmail}
                              </span>
                            </div>
                          )}
                          {selectedOrder.recipientPhone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-4 w-4 text-eagle-green/50" />
                              <span className="text-eagle-green/70">Phone:</span>
                              <span className="font-medium text-eagle-green">
                                {selectedOrder.recipientPhone}
                              </span>
                            </div>
                          )}
                        </div>
                        {selectedOrder.giftMessage && (
                          <div className="mt-3 p-3 bg-yellow/10 rounded-lg">
                            <p className="text-sm text-eagle-green/70 mb-1">Gift Message:</p>
                            <p className="text-sm font-light text-eagle-green/80 italic">
                              "{selectedOrder.giftMessage}"
                            </p>
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
                        <span className="text-eagle-green/70">Customer Paid</span>
                        <span className="text-eagle-green">
                          {serviceOrderService.formatPrice(selectedOrder.totalAmountMinor, selectedOrder.currency)}
                        </span>
                      </div>
                      {selectedOrder.discountMinor && selectedOrder.discountMinor > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-eagle-green/70">Discount Applied</span>
                          <span className="text-eagle-green/70">
                            -{serviceOrderService.formatPrice(selectedOrder.discountMinor, selectedOrder.currency)}
                          </span>
                        </div>
                      )}
                      {selectedOrder.vatAmountMinor && selectedOrder.vatAmountMinor > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-eagle-green/70">VAT</span>
                          <span className="text-red-600">
                            -{serviceOrderService.formatPrice(selectedOrder.vatAmountMinor, selectedOrder.currency)}
                          </span>
                        </div>
                      )}
                      {selectedOrder.platformFeeMinor && selectedOrder.platformFeeMinor > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-eagle-green/70">Platform Fee</span>
                          <span className="text-red-600">
                            -{serviceOrderService.formatPrice(selectedOrder.platformFeeMinor, selectedOrder.currency)}
                          </span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between">
                        <span className="font-bold text-eagle-green">Your Earnings</span>
                        <span className="font-bold text-green-600 text-lg">
                          {serviceOrderService.formatPrice(selectedOrder.vendorAmountMinor || selectedOrder.totalAmountMinor, selectedOrder.currency)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Cancellation Info */}
                  {selectedOrder.cancellationInfo?.cancelledAt && (
                    <>
                      <Separator />
                      <div className="bg-red-50 rounded-lg p-4">
                        <h4 className="font-bold text-red-700 mb-2">Cancellation Details</h4>
                        <div className="space-y-1 text-sm">
                          <p className="text-red-600">
                            <span className="font-bold">Cancelled:</span> {serviceOrderService.formatDateTime(selectedOrder.cancellationInfo.cancelledAt)}
                          </p>
                          <p className="text-red-600">
                            <span className="font-bold">By:</span> {selectedOrder.cancellationInfo.cancelledBy}
                          </p>
                          {selectedOrder.cancellationInfo.reason && (
                            <p className="text-red-600">
                              <span className="font-bold">Reason:</span> {selectedOrder.cancellationInfo.reason}
                            </p>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Action Buttons */}
                <DialogFooter className="flex-wrap gap-2">
                  {serviceOrderService.canVendorConfirm(selectedOrder) && (
                    <Button
                      className="bg-eagle-green hover:bg-viridian-green text-white"
                      onClick={() => confirmMutation.mutate(selectedOrder.id)}
                      disabled={confirmMutation.isPending}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Confirm Booking
                    </Button>
                  )}
                  {serviceOrderService.canVendorMarkInProgress(selectedOrder) && (
                    <Button
                      className="bg-yellow-500 hover:bg-yellow-600 text-white"
                      onClick={() => inProgressMutation.mutate(selectedOrder.id)}
                      disabled={inProgressMutation.isPending}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start Service
                    </Button>
                  )}
                  {serviceOrderService.canVendorComplete(selectedOrder) && (
                    <Button
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => completeMutation.mutate(selectedOrder.id)}
                      disabled={completeMutation.isPending}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Complete
                    </Button>
                  )}
                  {serviceOrderService.canVendorMarkNoShow(selectedOrder) && (
                    <Button
                      variant="outline"
                      className="border-gray-300 text-gray-600"
                      onClick={() => noShowMutation.mutate(selectedOrder.id)}
                      disabled={noShowMutation.isPending}
                    >
                      <UserX className="h-4 w-4 mr-2" />
                      No-Show
                    </Button>
                  )}
                  {serviceOrderService.canVendorReschedule(selectedOrder) && (
                    <Button
                      variant="outline"
                      className="border-purple-300 text-purple-600"
                      onClick={() => {
                        setDetailDialogOpen(false);
                        setRescheduleDialogOpen(true);
                      }}
                    >
                      <CalendarClock className="h-4 w-4 mr-2" />
                      Reschedule
                    </Button>
                  )}
                  {serviceOrderService.canVendorCancel(selectedOrder) && (
                    <Button
                      variant="outline"
                      className="border-red-300 text-red-600"
                      onClick={() => {
                        setDetailDialogOpen(false);
                        setCancelDialogOpen(true);
                      }}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  )}
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Cancel Dialog */}
        <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <DialogContent className="bg-white">
            <DialogHeader>
              <DialogTitle className="text-red-600">Cancel Booking</DialogTitle>
              <DialogDescription>
                This will cancel the booking and issue a full refund to the customer.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="cancelReason">Reason for cancellation *</Label>
                <Textarea
                  id="cancelReason"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Please provide a reason..."
                  className="mt-1"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="validReason"
                  checked={validReason}
                  onCheckedChange={(checked) => setValidReason(checked as boolean)}
                />
                <Label htmlFor="validReason" className="text-sm text-eagle-green/70">
                  This is a valid reason (emergency, force majeure, system error)
                </Label>
              </div>
              <p className="text-xs text-eagle-green/60">
                Note: Invalid cancellations may affect your reliability score.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
                Keep Booking
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancel}
                disabled={!cancelReason || cancelMutation.isPending}
              >
                {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Booking'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reschedule Dialog */}
        <Dialog open={rescheduleDialogOpen} onOpenChange={setRescheduleDialogOpen}>
          <DialogContent className="bg-white">
            <DialogHeader>
              <DialogTitle className="text-purple-600">Request Reschedule</DialogTitle>
              <DialogDescription>
                The customer will need to approve this reschedule request.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="newDate">New Date *</Label>
                <Input
                  id="newDate"
                  type="date"
                  value={newScheduledDate}
                  onChange={(e) => setNewScheduledDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="newTime">New Time *</Label>
                <Input
                  id="newTime"
                  type="time"
                  value={newScheduledTime}
                  onChange={(e) => setNewScheduledTime(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRescheduleDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                className="bg-purple-600 hover:bg-purple-700 text-white"
                onClick={handleReschedule}
                disabled={!newScheduledDate || !newScheduledTime || rescheduleMutation.isPending}
              >
                {rescheduleMutation.isPending ? 'Requesting...' : 'Request Reschedule'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
