import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Copy,
  Filter,
  Mail,
  Package,
  RefreshCw,
  Search,
  ShoppingBag,
  User,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

import { orderService } from "@/services/orderService";
import {
  packageService,
  ProductPackageResponse,
  VendorPackageOrderResponse,
} from "@/services/packageService";

export default function VendorPackageOrders() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedOrder, setSelectedOrder] =
    useState<VendorPackageOrderResponse | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [packageFilter, setPackageFilter] = useState<string>("all");

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [orderToReject, setOrderToReject] =
    useState<VendorPackageOrderResponse | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: packagesData } = useQuery({
    queryKey: ["vendor", "packages", "order-source"],
    queryFn: () => packageService.getVendorPackages(undefined, 0, 100),
  });

  const packages: ProductPackageResponse[] = packagesData?.content || [];

  const {
    data: orders,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["vendor-package-orders", packageFilter],
    queryFn: async (): Promise<VendorPackageOrderResponse[]> => {
      if (packageFilter !== "all") {
        const response = await packageService.getPackageOrders(
          Number(packageFilter),
          0,
          100
        );
        return response.content || [];
      }

      if (packages.length === 0) {
        return [];
      }

      const result = await Promise.all(
        packages.map((pkg) => packageService.getPackageOrders(pkg.id, 0, 100))
      );

      return result.flatMap((entry) => entry.content || []);
    },
    enabled: packageFilter !== "all" || packages.length > 0,
  });

  const acceptOrderMutation = useMutation({
    mutationFn: ({ packageId, orderId }: { packageId: number; orderId: number }) =>
      packageService.acceptPackageOrder(packageId, orderId),
    onSuccess: async () => {
      toast({
        title: "Order Accepted",
        description: "The package order has been confirmed.",
      });
      await queryClient.invalidateQueries({
        queryKey: ["vendor-package-orders"],
      });
      setDetailDialogOpen(false);
      setSelectedOrder(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to accept package order",
        variant: "destructive",
      });
    },
  });

  const denyOrderMutation = useMutation({
    mutationFn: ({
      packageId,
      orderId,
      reason,
    }: {
      packageId: number;
      orderId: number;
      reason: string;
    }) => packageService.denyPackageOrder(packageId, orderId, reason),
    onSuccess: async () => {
      toast({
        title: "Order Rejected",
        description: "The package order has been rejected.",
      });
      await queryClient.invalidateQueries({
        queryKey: ["vendor-package-orders"],
      });
      setRejectDialogOpen(false);
      setDetailDialogOpen(false);
      setOrderToReject(null);
      setSelectedOrder(null);
      setRejectionReason("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject package order",
        variant: "destructive",
      });
    },
  });

  const filteredOrders = useMemo(() => {
    const rows = orders || [];

    return rows.filter((order) => {
      const normalizedSearch = searchQuery.trim().toLowerCase();
      const matchSearch =
        normalizedSearch.length === 0 ||
        order.orderNumber.toLowerCase().includes(normalizedSearch) ||
        order.customerName?.toLowerCase().includes(normalizedSearch) ||
        order.packageName.toLowerCase().includes(normalizedSearch) ||
        order.items.some((item) =>
          item.productName.toLowerCase().includes(normalizedSearch)
        );

      const matchStatus =
        statusFilter === "all" || order.orderStatus === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [orders, searchQuery, statusFilter]);

  const pendingOrders = filteredOrders.filter(
    (order) =>
      order.orderStatus === "PENDING" ||
      order.orderStatus === "PLACED" ||
      order.orderStatus === "CONFIRMED"
  );

  const processingOrders = filteredOrders.filter(
    (order) => order.orderStatus === "PROCESSING"
  );

  const shippedOrders = filteredOrders.filter(
    (order) => order.orderStatus === "SHIPPED"
  );

  const completedOrders = filteredOrders.filter((order) =>
    ["DELIVERED", "CANCELLED", "REFUNDED", "REJECTED"].includes(
      order.orderStatus
    )
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "PLACED":
        return <Clock className="h-4 w-4 text-purple-600" />;
      case "CONFIRMED":
        return <CheckCircle className="h-4 w-4 text-blue-600" />;
      case "PROCESSING":
        return <Package className="h-4 w-4 text-purple-600" />;
      case "SHIPPED":
        return <Package className="h-4 w-4 text-indigo-600" />;
      case "DELIVERED":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "CANCELLED":
      case "REJECTED":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "REFUNDED":
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusDisplay = orderService.getStatusDisplay(status);
    return (
      <Badge
        className={`${statusDisplay.bgColor} ${statusDisplay.color} border-none`}
      >
        {getStatusIcon(status)}
        <span className="ml-1">{statusDisplay.text}</span>
      </Badge>
    );
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const OrderCard = ({ order }: { order: VendorPackageOrderResponse }) => {
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
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex gap-4 flex-1 min-w-0">
                <div className="w-16 h-16 rounded-lg bg-eagle-green/10 flex items-center justify-center flex-shrink-0">
                  <ShoppingBag className="h-6 w-6 text-eagle-green/50" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {getStatusBadge(order.orderStatus)}
                    <Badge className="bg-green-100 text-green-700 border-none">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Paid
                    </Badge>
                  </div>

                  <h3 className="font-bold text-eagle-green text-base mb-1">
                    Order #{order.orderNumber}
                  </h3>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-eagle-green/70">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3 flex-shrink-0" />
                      {order.customerName || "Customer"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 flex-shrink-0" />
                      {orderService.formatDate(order.createdAt)}
                    </span>
                  </div>

                  <p className="text-sm text-eagle-green/60 mt-1">
                    {order.packageName} x {order.packageQuantity}
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-eagle-green/10">
                <p className="font-bold text-eagle-green">
                  {orderService.formatPrice(order.totalPriceMinor, order.currency)}
                </p>
                <p className="text-xs text-eagle-green/60 mt-1">Order Total</p>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-eagle-green/10">
              <div className="flex flex-wrap gap-2">
                {order.items.slice(0, 3).map((item, index) => (
                  <span
                    key={`${item.packageItemId}-${index}`}
                    className="text-xs bg-eagle-green/5 text-eagle-green/70 px-2 py-1 rounded"
                  >
                    {item.productName} x {item.quantity}
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-full overflow-x-hidden">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-eagle-green mb-1 truncate">
                Package Orders
              </h1>
              <p className="font-light text-eagle-green/70">
                Track and manage orders for your packages
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
              <p className="text-2xl font-bold text-green-700">
                {completedOrders.filter((o) => o.orderStatus === "DELIVERED").length}
              </p>
              <p className="text-sm text-green-600">Delivered</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row flex-wrap gap-4">
              <div className="flex-1 min-w-0 w-full sm:min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-eagle-green/50" />
                  <Input
                    placeholder="Search orders, package, customers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={packageFilter} onValueChange={setPackageFilter}>
                <SelectTrigger className="w-full sm:w-[220px]">
                  <Package className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by package" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Packages</SelectItem>
                  {packages.map((pkg) => (
                    <SelectItem key={pkg.id} value={String(pkg.id)}>
                      {pkg.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="PLACED">Placed</SelectItem>
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

        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList className="bg-eagle-green/5 p-1 rounded-lg flex flex-wrap gap-1 w-full h-auto">
            <TabsTrigger
              value="pending"
              className="data-[state=active]:bg-eagle-green data-[state=active]:text-white whitespace-normal text-xs sm:text-sm text-center px-2 sm:px-4"
            >
              New Orders ({pendingOrders.length})
            </TabsTrigger>
            <TabsTrigger
              value="processing"
              className="data-[state=active]:bg-eagle-green data-[state=active]:text-white whitespace-normal text-xs sm:text-sm text-center px-2 sm:px-4"
            >
              Processing ({processingOrders.length})
            </TabsTrigger>
            <TabsTrigger
              value="shipped"
              className="data-[state=active]:bg-eagle-green data-[state=active]:text-white whitespace-normal text-xs sm:text-sm text-center px-2 sm:px-4"
            >
              Shipped ({shippedOrders.length})
            </TabsTrigger>
            <TabsTrigger
              value="completed"
              className="data-[state=active]:bg-eagle-green data-[state=active]:text-white whitespace-normal text-xs sm:text-sm text-center px-2 sm:px-4"
            >
              Completed ({completedOrders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            {isLoading ? (
              <LoadingState />
            ) : pendingOrders.length === 0 ? (
              <EmptyState message="No pending package orders at the moment" />
            ) : (
              <div className="space-y-4">
                {pendingOrders.map((order) => (
                  <OrderCard key={order.packageSaleId} order={order} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="processing">
            {isLoading ? (
              <LoadingState />
            ) : processingOrders.length === 0 ? (
              <EmptyState message="No package orders being processed" />
            ) : (
              <div className="space-y-4">
                {processingOrders.map((order) => (
                  <OrderCard key={order.packageSaleId} order={order} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="shipped">
            {isLoading ? (
              <LoadingState />
            ) : shippedOrders.length === 0 ? (
              <EmptyState message="No package orders in transit" />
            ) : (
              <div className="space-y-4">
                {shippedOrders.map((order) => (
                  <OrderCard key={order.packageSaleId} order={order} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed">
            {isLoading ? (
              <LoadingState />
            ) : completedOrders.length === 0 ? (
              <EmptyState message="No completed package orders yet" />
            ) : (
              <div className="space-y-4">
                {completedOrders.map((order) => (
                  <OrderCard key={order.packageSaleId} order={order} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto bg-white p-4 sm:p-6">
            {selectedOrder && (
              <>
                <DialogHeader>
                  <DialogTitle className="font-bold text-eagle-green flex items-center gap-2">
                    Order #{selectedOrder.orderNumber}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() =>
                        copyToClipboard(selectedOrder.orderNumber, "Order number")
                      }
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </DialogTitle>
                  <DialogDescription>
                    Placed on {orderService.formatDateTime(selectedOrder.createdAt)}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div>
                      <span className="text-sm font-light text-eagle-green/70">Order Status</span>
                      <span className="ml-2">{getStatusBadge(selectedOrder.orderStatus)}</span>
                    </div>
                    <div>
                      <span className="text-sm font-light text-eagle-green/70">Package</span>
                      <Badge className="ml-2 bg-blue-100 text-blue-700 border-none">
                        {selectedOrder.packageName}
                      </Badge>
                    </div>
                  </div>

                  {selectedOrder.orderStatus === "PLACED" && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <h4 className="font-bold text-purple-800 mb-2 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Order Awaiting Your Approval
                      </h4>
                      <p className="text-sm text-purple-700 mb-4">
                        This package order has been placed and paid. Please accept or reject it.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button
                          onClick={() =>
                            acceptOrderMutation.mutate({
                              packageId: selectedOrder.packageId,
                              orderId: selectedOrder.orderId,
                            })
                          }
                          disabled={acceptOrderMutation.isPending}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          {acceptOrderMutation.isPending ? "Accepting..." : "Accept Order"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setOrderToReject(selectedOrder);
                            setRejectDialogOpen(true);
                          }}
                          disabled={denyOrderMutation.isPending}
                          className="border-red-300 text-red-600 hover:bg-red-50"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject Order
                        </Button>
                      </div>
                    </div>
                  )}

                  <Separator />

                  <div>
                    <h4 className="font-bold text-eagle-green mb-3">Customer Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-eagle-green/50" />
                        <span className="text-eagle-green/70">Name:</span>
                        <span className="font-medium text-eagle-green">
                          {selectedOrder.customerName || "N/A"}
                        </span>
                      </div>
                      {selectedOrder.customerEmail && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-eagle-green/50" />
                          <span className="text-eagle-green/70">Email:</span>
                          <a
                            href={`mailto:${selectedOrder.customerEmail}`}
                            className="font-medium text-eagle-green hover:underline"
                          >
                            {selectedOrder.customerEmail}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-bold text-eagle-green mb-3">Package Items</h4>
                    <div className="space-y-3">
                      {selectedOrder.items.map((item, index) => (
                        <div
                          key={`${item.packageItemId}-${index}`}
                          className="flex flex-col sm:flex-row gap-4 p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="w-16 h-16 rounded-lg bg-eagle-green/10 flex items-center justify-center flex-shrink-0">
                            <Package className="h-6 w-6 text-eagle-green/50" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="font-medium text-eagle-green">{item.productName}</h5>
                            {item.skuCode && (
                              <p className="text-xs text-eagle-green/60">SKU: {item.skuCode}</p>
                            )}
                            <p className="text-sm text-eagle-green/70 mt-1">
                              Qty: {item.quantity} x {orderService.formatPrice(item.unitPriceMinor, selectedOrder.currency)}
                            </p>
                          </div>
                          <div className="text-left sm:text-right flex-shrink-0">
                            <p className="font-medium text-eagle-green">
                              {orderService.formatPrice(item.lineTotalMinor, selectedOrder.currency)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-bold text-eagle-green mb-3">Payment Summary</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-eagle-green/70">Package Quantity</span>
                        <span className="text-eagle-green">{selectedOrder.packageQuantity}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-eagle-green/70">Platform Fee</span>
                        <span className="text-red-600">
                          -{orderService.formatPrice(selectedOrder.platformFeeMinor, selectedOrder.currency)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-eagle-green/70">Delivery Fee</span>
                        <span className="text-eagle-green">
                          {orderService.formatPrice(selectedOrder.deliveryFeeMinor, selectedOrder.currency)}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex justify-between pt-2 border-t border-green-200 bg-green-50 -mx-2 px-2 py-2 rounded">
                        <span className="font-bold text-green-700">Order Total</span>
                        <span className="font-bold text-green-700 text-lg">
                          {orderService.formatPrice(selectedOrder.totalPriceMinor, selectedOrder.currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent className="max-w-md bg-white">
            <DialogHeader>
              <DialogTitle className="font-bold text-red-600 flex items-center gap-2">
                <XCircle className="h-5 w-5" />
                Reject Order
              </DialogTitle>
              <DialogDescription>
                {orderToReject && (
                  <>
                    Rejecting order #{orderToReject.orderNumber}. Please provide a reason for rejection.
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium text-eagle-green mb-2 block">
                  Rejection Reason <span className="text-red-500">*</span>
                </label>
                <Textarea
                  placeholder="e.g., Package items out of stock"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
              <p className="text-xs text-eagle-green/60">
                The customer will be notified of this rejection with the reason provided.
              </p>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setRejectDialogOpen(false);
                  setRejectionReason("");
                  setOrderToReject(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (orderToReject && rejectionReason.trim()) {
                    denyOrderMutation.mutate({
                      packageId: orderToReject.packageId,
                      orderId: orderToReject.orderId,
                      reason: rejectionReason.trim(),
                    });
                  }
                }}
                disabled={!rejectionReason.trim() || denyOrderMutation.isPending}
              >
                {denyOrderMutation.isPending ? "Rejecting..." : "Confirm Rejection"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
