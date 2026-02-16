import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Package, 
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  User,
  Filter,
  Search,
  DollarSign,
  MessageSquare,
  Eye,
  Play,
  Truck
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';

import { customOrderService } from '@/services/customOrderService';
import type { CustomOrder, CustomOrderStatus } from '@/types/customOrders';

export default function VendorCustomOrders() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const isVendor = user?.role?.toUpperCase() === 'VENDOR';

  // Fetch vendor's custom orders
  const { data: ordersData, isLoading, refetch } = useQuery({
    queryKey: ['vendor-custom-orders', statusFilter],
    queryFn: () => {
      const status = statusFilter === 'all' ? undefined : statusFilter as CustomOrderStatus;
      return customOrderService.getByVendor(0, 100, status);
    },
    enabled: isAuthenticated && isVendor,
  });

  const orders = ordersData?.content || [];

  // Filter orders by search query
  const filteredOrders = orders.filter((order: CustomOrder) => {
    const matchesSearch = searchQuery === '' || 
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.templateName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  // Categorize orders
  const submittedOrders = filteredOrders.filter((order: CustomOrder) => 
    order.status === 'SUBMITTED'
  );

  const priceProposedOrders = filteredOrders.filter((order: CustomOrder) => 
    order.status === 'PRICE_PROPOSED'
  );

  const confirmedOrders = filteredOrders.filter((order: CustomOrder) => 
    order.status === 'CONFIRMED'
  );

  const paidOrders = filteredOrders.filter((order: CustomOrder) => 
    order.status === 'PAID'
  );

  const inProgressOrders = filteredOrders.filter((order: CustomOrder) => 
    order.status === 'IN_PROGRESS'
  );

  const completedOrders = filteredOrders.filter((order: CustomOrder) => 
    ['COMPLETED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'].includes(order.status)
  );

  const getStatusIcon = (status: CustomOrderStatus) => {
    switch (status) {
      case 'SUBMITTED':
        return <AlertCircle className="h-4 w-4 text-blue-600" />;
      case 'PRICE_PROPOSED':
        return <DollarSign className="h-4 w-4 text-yellow-600" />;
      case 'CONFIRMED':
        return <CheckCircle className="h-4 w-4 text-purple-600" />;
      case 'PAID':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'IN_PROGRESS':
        return <Play className="h-4 w-4 text-orange-600" />;
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-teal-600" />;
      case 'OUT_FOR_DELIVERY':
        return <Truck className="h-4 w-4 text-indigo-600" />;
      case 'DELIVERED':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'CANCELLED':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const OrderCard = ({ order }: { order: CustomOrder }) => {
    const statusBadgeColor = customOrderService.getStatusBadgeColor(order.status);
    const statusText = customOrderService.getStatusText(order.status);
    // For non-negotiable templates, vendor cannot propose price
    const isNonNegotiable = order.templateNegotiable === false;
    const canProposePrice = !isNonNegotiable && customOrderService.canVendorProposePrice(order.status);
    const canMarkInProgress = customOrderService.canVendorMarkInProgress(order.status);
    const canMarkCompleted = customOrderService.canVendorMarkCompleted(order.status);

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all duration-300 border-eagle-green/10"
          onClick={() => navigate(`/vendor/custom-orders/${order.id}`)}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-4 flex-1">
                {/* Order Icon */}
                <div className="w-16 h-16 rounded-lg bg-eagle-green/10 flex items-center justify-center flex-shrink-0">
                  <Package className="h-6 w-6 text-eagle-green/50" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge className={`${statusBadgeColor} border-none`}>
                      {getStatusIcon(order.status)}
                      <span className="ml-1">{statusText}</span>
                    </Badge>
                    {isNonNegotiable && (
                      <Badge className="bg-viridian-green/10 text-viridian-green border-viridian-green/20">
                        Fixed Price
                      </Badge>
                    )}
                    {order.paymentStatus === 'PAID' && (
                      <Badge className="bg-green-100 text-green-700 border-none">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Paid
                      </Badge>
                    )}
                  </div>
                  
                  <h3 className="font-bold text-eagle-green text-base mb-1 truncate">
                    {order.templateName}
                  </h3>
                  
                  <p className="text-sm text-eagle-green/70 mb-1">
                    Order #{order.orderNumber}
                  </p>
                  
                  <div className="flex items-center gap-4 text-sm text-eagle-green/70">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {order.customerName}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(order.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="text-right flex-shrink-0">
                <p className="font-bold text-eagle-green">
                  {order.finalVendorPrice || order.finalVendorPriceMinor 
                    ? customOrderService.formatPrice(order.finalVendorPrice ?? 0, order.currencyCode)
                    : customOrderService.formatPrice(order.baseVendorPrice ?? order.basePrice ?? 0, order.currencyCode)
                  }
                </p>
                {order.finalVendorPriceMinor && order.baseVendorPriceMinor && order.finalVendorPriceMinor !== order.baseVendorPriceMinor && (
                  <p className="text-xs text-eagle-green/60 line-through">
                    {customOrderService.formatPrice(order.baseVendorPrice ?? 0, order.currencyCode)}
                  </p>
                )}
                <p className="text-xs text-eagle-green/60 mt-1">
                  {order.values?.length || 0} customization{order.values?.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-3 pt-3 border-t border-eagle-green/10 flex gap-2 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                className="border-eagle-green text-eagle-green hover:bg-eagle-green hover:text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/vendor/custom-orders/${order.id}`);
                }}
              >
                <Eye className="h-4 w-4 mr-1" />
                View Details
              </Button>
              
              {canProposePrice && (
                <Button
                  size="sm"
                  className="bg-yellow-500 hover:bg-yellow-600 text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/vendor/custom-orders/${order.id}?action=propose-price`);
                  }}
                >
                  <DollarSign className="h-4 w-4 mr-1" />
                  Propose Price
                </Button>
              )}
              
              {canMarkInProgress && (
                <Button
                  size="sm"
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/vendor/custom-orders/${order.id}?action=start`);
                  }}
                >
                  <Play className="h-4 w-4 mr-1" />
                  Start Work
                </Button>
              )}
              
              {canMarkCompleted && (
                <Button
                  size="sm"
                  className="bg-teal-500 hover:bg-teal-600 text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/vendor/custom-orders/${order.id}?action=complete`);
                  }}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Mark Complete
                </Button>
              )}
              
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/vendor/custom-orders/${order.id}?tab=chat`);
                }}
              >
                <MessageSquare className="h-4 w-4 mr-1" />
                Chat
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  const EmptyState = ({ message }: { message: string }) => (
    <div className="text-center py-12">
      <Package className="h-16 w-16 text-eagle-green/20 mx-auto mb-4" />
      <p className="font-light text-eagle-green/60">{message}</p>
    </div>
  );

  if (!isAuthenticated || !isVendor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <AlertCircle className="h-16 w-16 text-amber-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-600 mb-4">You need to be a vendor to access this page.</p>
        <Button asChild>
          <Link to="/vendor-signup">Become a Vendor</Link>
        </Button>
      </div>
    );
  }

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
                Custom Orders
              </h1>
              <p className="font-light text-eagle-green/70">
                Track and manage custom orders from customers
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

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">New</CardTitle>
              <AlertCircle className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{submittedOrders.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Price Sent</CardTitle>
              <DollarSign className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{priceProposedOrders.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
              <CheckCircle className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{confirmedOrders.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Paid</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{paidOrders.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Play className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{inProgressOrders.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-teal-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-teal-600">{completedOrders.length}</div>
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
                    placeholder="Search by order number, customer, or template..."
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
                  <SelectItem value="SUBMITTED">Submitted</SelectItem>
                  <SelectItem value="PRICE_PROPOSED">Price Proposed</SelectItem>
                  <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="OUT_FOR_DELIVERY">Out for Delivery</SelectItem>
                  <SelectItem value="DELIVERED">Delivered</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
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
          <Tabs defaultValue="new" className="space-y-6">
            <TabsList className="bg-june-bud/10 p-1 flex-wrap">
              <TabsTrigger 
                value="new"
                className="font-bold data-[state=active]:bg-eagle-green data-[state=active]:text-white"
              >
                New ({submittedOrders.length})
              </TabsTrigger>
              <TabsTrigger 
                value="negotiating"
                className="font-bold data-[state=active]:bg-eagle-green data-[state=active]:text-white"
              >
                Negotiating ({priceProposedOrders.length + confirmedOrders.length})
              </TabsTrigger>
              <TabsTrigger 
                value="active"
                className="font-bold data-[state=active]:bg-eagle-green data-[state=active]:text-white"
              >
                Active ({paidOrders.length + inProgressOrders.length})
              </TabsTrigger>
              <TabsTrigger 
                value="history"
                className="font-bold data-[state=active]:bg-eagle-green data-[state=active]:text-white"
              >
                History ({completedOrders.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="new" className="space-y-4">
              {submittedOrders.length === 0 ? (
                <EmptyState message="No new custom orders awaiting your review." />
              ) : (
                submittedOrders.map((order: CustomOrder) => (
                  <OrderCard key={order.id} order={order} />
                ))
              )}
            </TabsContent>

            <TabsContent value="negotiating" className="space-y-4">
              {priceProposedOrders.length === 0 && confirmedOrders.length === 0 ? (
                <EmptyState message="No orders in negotiation." />
              ) : (
                <>
                  {priceProposedOrders.map((order: CustomOrder) => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                  {confirmedOrders.map((order: CustomOrder) => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                </>
              )}
            </TabsContent>

            <TabsContent value="active" className="space-y-4">
              {paidOrders.length === 0 && inProgressOrders.length === 0 ? (
                <EmptyState message="No active orders." />
              ) : (
                <>
                  {paidOrders.map((order: CustomOrder) => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                  {inProgressOrders.map((order: CustomOrder) => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                </>
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              {completedOrders.length === 0 ? (
                <EmptyState message="No completed orders yet." />
              ) : (
                completedOrders.map((order: CustomOrder) => (
                  <OrderCard key={order.id} order={order} />
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
