import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Package,
  MapPin,
  User,
  Clock,
  Loader2,
  RefreshCw,
  CheckCircle,
  ShoppingBag,
  DollarSign,
  Navigation,
  Timer,
} from "lucide-react";
import { deliveryService, OrderReadyForDeliveryDto } from "@/services/deliveryService";

export default function AvailableOrders() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<OrderReadyForDeliveryDto | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["delivery", "available-orders", page],
    queryFn: () => deliveryService.getAvailableOrders({ page, size: 10 }),
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  const acceptOrderMutation = useMutation({
    mutationFn: (orderId: number) => deliveryService.selfAssignOrder(orderId),
    onSuccess: () => {
      toast({
        title: "Order Accepted!",
        description: "You have successfully accepted this order for delivery.",
      });
      setShowConfirmDialog(false);
      setSelectedOrder(null);
      queryClient.invalidateQueries({ queryKey: ["delivery", "available-orders"] });
      queryClient.invalidateQueries({ queryKey: ["delivery", "dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["delivery", "assignments"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Accept Order",
        description: error.message || "This order may have been taken by another driver.",
        variant: "destructive",
      });
      setShowConfirmDialog(false);
      refetch(); // Refresh the list
    },
  });


  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleAcceptClick = (order: OrderReadyForDeliveryDto) => {
    setSelectedOrder(order);
    setShowConfirmDialog(true);
  };

  const handleConfirmAccept = () => {
    if (selectedOrder) {
      acceptOrderMutation.mutate(selectedOrder.id);
    }
  };

  const orders = data?.content || [];
  const totalPages = data?.totalPages || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Available Orders</h1>
          <p className="text-gray-500">
            Accept orders ready for delivery
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-ethiopian-gold" />
        </div>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="text-center text-gray-500">
              <Package className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No Available Orders</p>
              <p className="mt-1">
                Check back later for new orders to accept
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {orders.map((order) => (
            <Card key={order.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <ShoppingBag className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {order.orderNumber}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {order.itemCount} item{order.itemCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <Badge variant="secondary" className="ml-2">
                        {order.status}
                      </Badge>
                    </div>

                    {/* Delivery Fee Highlight */}
                    {order.estimatedDeliveryFee && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-green-600" />
                            <span className="text-sm font-medium text-green-800">Your Delivery Earnings</span>
                          </div>
                          <span className="text-lg font-bold text-green-700">
                            {order.deliveryFeeCurrency === 'ETB' ? 'ETB ' : '$'}
                            {Number(order.estimatedDeliveryFee).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex gap-4 mt-2 text-xs text-green-600">
                          {order.estimatedDistanceText && (
                            <span className="flex items-center gap-1">
                              <Navigation className="h-3 w-3" />
                              {order.estimatedDistanceText}
                            </span>
                          )}
                          {order.estimatedDurationText && (
                            <span className="flex items-center gap-1">
                              <Timer className="h-3 w-3" />
                              ~{order.estimatedDurationText}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <User className="h-4 w-4 text-gray-400" />
                        <span>{order.customerName || "Customer"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span>{order.shippingCity || "Unknown"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span>{formatDate(order.createdAt)}</span>
                      </div>
                    </div>

                    {order.shippingAddress && (
                      <p className="text-sm text-gray-500 mt-2">
                        <span className="font-medium">Address:</span> {order.shippingAddress}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={() => handleAcceptClick(order)}
                      className="bg-green-600 hover:bg-green-700"
                      disabled={acceptOrderMutation.isPending}
                    >
                      {acceptOrderMutation.isPending && selectedOrder?.id === order.id ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      Accept Order
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            Previous
          </Button>
          <span className="text-sm text-gray-500">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages - 1}
          >
            Next
          </Button>
        </div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Accept this order?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedOrder && (
                <div className="space-y-2 mt-2">
                  <p>
                    <strong>Order:</strong> {selectedOrder.orderNumber}
                  </p>
                  <p>
                    <strong>Customer:</strong> {selectedOrder.customerName || "Unknown"}
                  </p>
                  <p>
                    <strong>Delivery to:</strong> {selectedOrder.shippingCity || "Unknown"}
                  </p>
                  {selectedOrder.estimatedDeliveryFee && (
                    <div className="mt-3 p-3 bg-green-50 rounded-lg">
                      <p className="text-green-800 font-semibold">
                        Delivery Earnings: {selectedOrder.deliveryFeeCurrency === 'ETB' ? 'ETB ' : '$'}
                        {Number(selectedOrder.estimatedDeliveryFee).toFixed(2)}
                      </p>
                      {selectedOrder.estimatedDistanceText && (
                        <p className="text-sm text-green-600">
                          Distance: {selectedOrder.estimatedDistanceText} • Est. {selectedOrder.estimatedDurationText}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
              <p className="mt-4 text-amber-600">
                Once accepted, you'll be responsible for picking up and delivering this order.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={acceptOrderMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAccept}
              disabled={acceptOrderMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {acceptOrderMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Yes, Accept Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
