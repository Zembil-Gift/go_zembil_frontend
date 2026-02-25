import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Package,
  Clock,
  CheckCircle,
  AlertCircle,
  Filter,
  ChevronRight,
  Store,
  Calendar
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/protected-route';

import { customOrderService } from '@/services/customOrderService';
import type { CustomOrder, CustomOrderStatus } from '@/types/customOrders';

const STATUS_OPTIONS: { value: CustomOrderStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All Orders' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'PRICE_PROPOSED', label: 'Price Proposed' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'PAID', label: 'Paid' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

function MyCustomOrdersContent() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isInitialized } = useAuth();
  const [statusFilter, setStatusFilter] = useState<CustomOrderStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(0);
  
  // Fetch customer's orders (wait for auth so currency is correct)
  const { data: ordersData, isLoading, isError } = useQuery({
    queryKey: ['my-custom-orders', page, statusFilter, user?.preferredCurrencyCode ?? 'default'],
    queryFn: () => customOrderService.getByCustomer(
      page, 
      20, 
      statusFilter === 'ALL' ? undefined : statusFilter
    ),
    enabled: isAuthenticated && isInitialized,
  });

  const orders = ordersData?.content || [];
  const totalPages = ordersData?.totalPages || 0;
  const totalElements = ordersData?.totalElements || 0;

  const getStatusIcon = (status: CustomOrderStatus) => {
    switch (status) {
      case 'SUBMITTED':
      case 'PRICE_PROPOSED':
        return <Clock className="h-4 w-4" />;
      case 'CONFIRMED':
      case 'PAID':
      case 'IN_PROGRESS':
        return <Package className="h-4 w-4" />;
      case 'COMPLETED':
      case 'OUT_FOR_DELIVERY':
      case 'DELIVERED':
        return <CheckCircle className="h-4 w-4" />;
      case 'CANCELLED':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value as CustomOrderStatus | 'ALL');
    setPage(0);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-eagle-green mb-2">Sign In Required</h2>
          <p className="font-light text-eagle-green/70 mb-4">Please sign in to view your orders.</p>
          <Button onClick={() => navigate('/signin')} className="bg-eagle-green hover:bg-viridian-green text-white">
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-light-cream to-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-eagle-green">My Custom Orders</h1>
            <p className="text-eagle-green/70 mt-1">
              Track and manage your personalized orders
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Filter className="h-4 w-4 text-eagle-green/50" />
            <Select value={statusFilter} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid gap-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-3 flex-1">
                      <Skeleton className="h-6 w-48 bg-june-bud/20" />
                      <Skeleton className="h-4 w-32 bg-june-bud/20" />
                      <Skeleton className="h-4 w-64 bg-june-bud/20" />
                    </div>
                    <Skeleton className="h-8 w-24 bg-june-bud/20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Error State */}
        {isError && (
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-eagle-green mb-2">Failed to Load Orders</h3>
              <p className="text-eagle-green/70 mb-4">Something went wrong while fetching your orders.</p>
              <Button onClick={() => window.location.reload()} variant="outline">
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && !isError && orders.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="h-16 w-16 text-eagle-green/30 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-eagle-green mb-2">
                {statusFilter === 'ALL' ? 'No Custom Orders Yet' : `No ${customOrderService.getStatusText(statusFilter as CustomOrderStatus)} Orders`}
              </h3>
              <p className="text-eagle-green/70 mb-6">
                {statusFilter === 'ALL' 
                  ? "You haven't placed any custom orders yet. Browse our templates to get started!"
                  : "No orders match the selected filter."}
              </p>
              {statusFilter === 'ALL' && (
                <Button 
                  onClick={() => navigate('/custom-orders')}
                  className="bg-eagle-green hover:bg-viridian-green text-white"
                >
                  Browse Custom Templates
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Orders List */}
        {!isLoading && !isError && orders.length > 0 && (
          <>
            <div className="text-sm text-eagle-green/60 mb-4">
              Showing {orders.length} of {totalElements} orders
            </div>
            
            <div className="space-y-4">
              {orders.map((order: CustomOrder, index: number) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card 
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => navigate(`/my-custom-orders/${order.id}`)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-eagle-green text-lg truncate">
                              {order.templateName}
                            </h3>
                            <Badge className={customOrderService.getStatusBadgeColor(order.status)}>
                              {getStatusIcon(order.status)}
                              <span className="ml-1">{customOrderService.getStatusText(order.status)}</span>
                            </Badge>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-4 text-sm text-eagle-green/70">
                            <span className="font-mono">#{order.orderNumber}</span>
                            <span className="flex items-center gap-1">
                              <Store className="h-3.5 w-3.5" />
                              {order.vendorName}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {new Date(order.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          {order.additionalDescription && (
                            <p className="text-sm text-eagle-green/60 mt-2 line-clamp-1">
                              {order.additionalDescription}
                            </p>
                          )}
                        </div>

                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-eagle-green text-lg">
                            {customOrderService.formatPrice(
                              order.finalPrice != null ? order.finalPrice : order.basePrice ?? 0,
                              order.currencyCode || order.currency
                            )}
                          </p>
                          {order.finalPriceMinor != null && order.finalPriceMinor !== order.basePriceMinor && (
                            <p className="text-xs text-eagle-green/50 line-through">
                              {customOrderService.formatPrice(order.basePrice ?? 0, order.currencyCode || order.currency)}
                            </p>
                          )}
                          <ChevronRight className="h-5 w-5 text-eagle-green/30 ml-auto mt-2" />
                        </div>
                      </div>

                      {/* Action hints based on status */}
                      {order.status === 'PRICE_PROPOSED' && (
                        <div className="mt-4 pt-4 border-t border-june-bud/20">
                          <p className="text-sm text-amber-600 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            Vendor has proposed a price. Review and respond.
                          </p>
                        </div>
                      )}
                      {order.status === 'CONFIRMED' && (
                        <div className="mt-4 pt-4 border-t border-june-bud/20">
                          <p className="text-sm text-green-600 flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            Ready for payment. Complete your purchase.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  Previous
                </Button>
                <span className="flex items-center px-4 text-sm text-eagle-green/70">
                  Page {page + 1} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function MyCustomOrders() {
  return (
    <ProtectedRoute>
      <MyCustomOrdersContent />
    </ProtectedRoute>
  );
}
