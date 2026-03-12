import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Package,
  Clock,
  CheckCircle,
  AlertCircle,
  Filter,
  ChevronRight,
  Calendar,
  Loader2,
  ShoppingBag,
  Truck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/protected-route";
import { formatCurrency, getCurrencyDecimals } from "@/lib/currency";
import apiService from "@/services/apiService";

interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  productImage: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface ShippingAddress {
  fullName?: string;
  phone?: string;
  email?: string;
  street?: string;
  addressLine1?: string | null;
  addressLine2?: string;
  city: string;
  state: string;
  country: string;
  postalCode?: string;
  zipcode?: string;
}

interface OrderTotals {
  subtotalMinor?: number;
  giftWrapMinor?: number;
  netSubtotalMinor?: number;
  discountMinor?: number;
  vatAmountMinor?: number;
  salesTaxMinor?: number;
  shippingMinor?: number;
  platformFeeMinor?: number;
  totalMinor?: number;
  vatApplied?: boolean;
  salesTaxApplied?: boolean;
  vatRate?: number;
  salesTaxRate?: number;
}

interface Order {
  id?: number;
  orderId?: number;
  orderNumber: string;
  status: string;
  items?: OrderItem[];
  lines?: OrderItem[];
  subtotal?: number;
  shippingCost?: number;
  tax?: number;
  discount?: number;
  totalAmount?: number;
  totalMinor?: number;
  totals?: OrderTotals;
  currency: string;
  paymentMethod?: string;
  paymentStatus?: string;
  shippingAddress: ShippingAddress;
  billingAddress?: ShippingAddress;
  estimatedDeliveryDate?: string;
  actualDeliveryDate?: string;
  trackingCode?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface OrdersPage {
  content: Order[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
}

type OrderStatus =
  | "PENDING"
  | "PLACED"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "ALL";

const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: "ALL", label: "All Orders" },
  { value: "PENDING", label: "Pending" },
  { value: "PLACED", label: "Placed" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "PROCESSING", label: "Processing" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
];

function MyOrdersContent() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<OrderStatus>("ALL");

  // Fetch customer's product orders
  const {
    data: ordersPage,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["my-orders", statusFilter],
    queryFn: async () => {
      try {
        // Backend endpoint: GET /api/orders?status={status}&page=0&size=100
        const params = new URLSearchParams();
        if (statusFilter !== "ALL") {
          params.append("status", statusFilter);
        }
        params.append("page", "0");
        params.append("size", "100");

        const endpoint = `/api/orders?${params.toString()}`;
        const response = await apiService.getRequest<OrdersPage>(endpoint);
        return response;
      } catch (error: any) {
        console.error("Failed to fetch orders:", error);
        // Return empty page on error
        if (error.response?.status === 400 || error.response?.status === 404) {
          return {
            content: [],
            totalPages: 0,
            totalElements: 0,
            number: 0,
            size: 0,
          };
        }
        throw error;
      }
    },
    enabled: isAuthenticated && !!(user as any)?.id,
    retry: false,
  });

  const orders = ordersPage?.content || [];

  const getOrderTotalMajor = (order: Order): number => {
    const totalMinor = order.totals?.totalMinor ?? order.totalMinor;

    if (typeof totalMinor === "number") {
      const decimals = getCurrencyDecimals(order.currency);
      return totalMinor / Math.pow(10, decimals);
    }

    return order.totalAmount ?? 0;
  };

  const getStatusIcon = (status: string) => {
    const normalizedStatus = status.toUpperCase();
    switch (normalizedStatus) {
      case "PENDING":
        return <Clock className="h-4 w-4" />;
      case "PLACED":
      case "CONFIRMED":
      case "PROCESSING":
        return <Package className="h-4 w-4" />;
      case "SHIPPED":
        return <Truck className="h-4 w-4" />;
      case "DELIVERED":
        return <CheckCircle className="h-4 w-4" />;
      case "CANCELLED":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getStatusBadgeColor = (status: string) => {
    const normalizedStatus = status.toUpperCase();
    switch (normalizedStatus) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
      case "PLACED":
        return "bg-blue-100 text-blue-800 hover:bg-blue-100";
      case "CONFIRMED":
        return "bg-blue-100 text-blue-800 hover:bg-blue-100";
      case "PROCESSING":
        return "bg-indigo-100 text-indigo-800 hover:bg-indigo-100";
      case "SHIPPED":
        return "bg-purple-100 text-purple-800 hover:bg-purple-100";
      case "DELIVERED":
        return "bg-green-100 text-green-800 hover:bg-green-100";
      case "CANCELLED":
        return "bg-red-100 text-red-800 hover:bg-red-100";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
    }
  };

  const getStatusText = (status: string): string => {
    const normalizedStatus = status.toUpperCase();
    switch (normalizedStatus) {
      case "PENDING":
        return "Pending";
      case "PLACED":
        return "Placed";
      case "CONFIRMED":
        return "Confirmed";
      case "PROCESSING":
        return "Processing";
      case "SHIPPED":
        return "Shipped";
      case "DELIVERED":
        return "Delivered";
      case "CANCELLED":
        return "Cancelled";
      default:
        return status;
    }
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value as OrderStatus);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-eagle-green mb-2">
            Sign In Required
          </h2>
          <p className="font-light text-eagle-green/70 mb-4">
            Please sign in to view your orders.
          </p>
          <Button
            onClick={() => navigate("/signin")}
            className="bg-eagle-green hover:bg-viridian-green text-white"
          >
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
            <h1 className="text-3xl font-bold text-eagle-green">My Orders</h1>
            <p className="text-eagle-green/70 mt-1">
              Track and manage your product orders
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
              <h3 className="text-lg font-semibold text-eagle-green mb-2">
                Failed to Load Orders
              </h3>
              <p className="text-eagle-green/70 mb-4">
                Something went wrong while fetching your orders.
              </p>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
              >
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
                {statusFilter === "ALL"
                  ? "No Orders Yet"
                  : `No ${getStatusText(statusFilter)} Orders`}
              </h3>
              <p className="text-eagle-green/70 mb-6">
                {statusFilter === "ALL"
                  ? "You haven't placed any orders yet. Browse our products to get started!"
                  : "No orders match the selected filter."}
              </p>
              {statusFilter === "ALL" && (
                <Button
                  onClick={() => navigate("/gifts")}
                  className="bg-eagle-green hover:bg-viridian-green text-white"
                >
                  Browse Products
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Orders List */}
        {!isLoading && !isError && orders.length > 0 && (
          <>
            <div className="text-sm text-eagle-green/60 mb-4">
              Showing {orders.length} order{orders.length !== 1 ? "s" : ""}
            </div>

            <div className="space-y-4">
              {orders.map((order: Order, index: number) => (
                <motion.div
                  key={order.orderId ?? order.id ?? order.orderNumber}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() =>
                      order.orderNumber &&
                      navigate(`/track/${order.orderNumber}`)
                    }
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-eagle-green/10 rounded-full flex items-center justify-center flex-shrink-0">
                              <ShoppingBag className="h-5 w-5 text-eagle-green" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-eagle-green text-lg truncate">
                                {order.orderNumber ||
                                  `Order #${
                                    order.orderId ?? order.id ?? index + 1
                                  }`}
                              </h3>
                              <Badge
                                className={getStatusBadgeColor(order.status)}
                              >
                                {getStatusIcon(order.status)}
                                <span className="ml-1">
                                  {getStatusText(order.status)}
                                </span>
                              </Badge>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-4 text-sm text-eagle-green/70 ml-13">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {new Date(order.createdAt).toLocaleDateString()}
                            </span>
                            {order.shippingAddress?.fullName && (
                              <span>To: {order.shippingAddress.fullName}</span>
                            )}
                            {order.shippingAddress?.city && (
                              <span>{order.shippingAddress.city}</span>
                            )}
                            {order.trackingCode && (
                              <span className="font-mono text-xs">
                                {order.trackingCode}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-eagle-green text-lg">
                            {formatCurrency(
                              getOrderTotalMajor(order),
                              order.currency
                            )}
                          </p>
                          <ChevronRight className="h-5 w-5 text-eagle-green/30 ml-auto mt-2" />
                        </div>
                      </div>

                      {/* Status hints */}
                      {order.status.toUpperCase() === "SHIPPED" &&
                        order.estimatedDeliveryDate && (
                          <div className="mt-4 pt-4 border-t border-june-bud/20">
                            <p className="text-sm text-green-600 flex items-center gap-2">
                              <Truck className="h-4 w-4" />
                              Estimated delivery:{" "}
                              {new Date(
                                order.estimatedDeliveryDate
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      {order.status.toUpperCase() === "DELIVERED" && (
                        <div className="mt-4 pt-4 border-t border-june-bud/20">
                          <p className="text-sm text-green-600 flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            Order delivered successfully
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function MyOrders() {
  return (
    <ProtectedRoute>
      <MyOrdersContent />
    </ProtectedRoute>
  );
}
