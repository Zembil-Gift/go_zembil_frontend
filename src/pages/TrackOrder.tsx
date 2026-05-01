import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  CheckCircle,
  Package,
  Truck,
  Clock,
  MapPin,
  Phone,
  Mail,
  ArrowLeft,
} from "lucide-react";
import { isUnauthorizedError } from "@/lib/authUtils";
import { formatCurrency, getCurrencyDecimals } from "@/lib/currency";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import orderService, { Order, SubOrder } from "@/services/orderService";

export default function TrackOrder() {
  const { orderId } = useParams<{ orderId: string }>();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showDeliveryContactDialog, setShowDeliveryContactDialog] =
    useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const CANCEL_REASON = "Customer requested cancellation";

  const {
    data: order,
    isLoading,
    error,
  } = useQuery<Order>({
    queryKey: ["order", orderId],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!orderId || orderId === "undefined") {
        throw new Error("Invalid order ID");
      }
      const result = await orderService.getOrderByNumber(orderId);
      console.log("Order data received:", JSON.stringify(result, null, 2));
      console.log("Order keys:", Object.keys(result));
      console.log("Order totals:", result.totals);
      console.log("Order items:", result.items);
      return result;
    },
    enabled: !!orderId && orderId !== "undefined",
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

  const cancelOrderMutation = useMutation({
    mutationFn: async () => {
      if (!order) {
        throw new Error("Order not loaded");
      }

      const subOrders = Array.isArray(order.subOrders) ? order.subOrders : [];
      if (subOrders.length > 0) {
        const cancellableSubOrders = subOrders.filter(
          (subOrder): subOrder is SubOrder & { orderId: number } =>
            subOrder.cancellable === true && typeof subOrder.orderId === "number"
        );

        if (cancellableSubOrders.length === 0) {
          throw new Error("No cancellable sub-orders found");
        }

        await Promise.all(
          cancellableSubOrders.map((subOrder) =>
            orderService.cancelOrder(subOrder.orderId, CANCEL_REASON)
          )
        );
        return;
      }

      await orderService.cancelOrder(order.orderId, CANCEL_REASON);
    },
    onSuccess: () => {
      toast({
        title: "Order cancelled",
        description: "Cancellation submitted and refund processing has started.",
      });
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["my-orders"] });
      setCancelDialogOpen(false);
    },
    onError: (mutationError: Error) => {
      toast({
        title: "Failed to cancel order",
        description: mutationError.message,
        variant: "destructive",
      });
    },
  });

  const formatMinorAmount = (
    amountMinor: number | undefined,
    currency: string | undefined
  ) => {
    const curr = currency || "ETB";
    const amount = (amountMinor ?? 0) / Math.pow(10, getCurrencyDecimals(curr));
    return formatCurrency(amount, curr);
  };

  const getDerivedPaymentStatus = (status: string | undefined) => {
    const normalizedStatus = status?.toUpperCase() || "";

    if (
      [
        "PLACED",
        "CONFIRMED",
        "PROCESSING",
        "SHIPPED",
        "DELIVERED",
        "CANCELLED",
        "PARTIALLY_CANCELLED",
      ].includes(normalizedStatus)
    ) {
      return "PAID";
    }

    if (
      normalizedStatus === "REFUNDED" ||
      normalizedStatus === "PARTIALLY_REFUNDED"
    ) {
      return "REFUNDED";
    }

    return "PENDING";
  };

  const getOrderReviewPaymentMethod = (order: Order) => {
    return order.currency?.toUpperCase() === "ETB" ? "chapa" : "stripe";
  };

  const getStatusSteps = (currentStatus: string) => {
    const statuses = [
      { key: "placed", label: "Order Placed", icon: Package },
      { key: "confirmed", label: "Confirmed", icon: CheckCircle },
      { key: "processing", label: "Processing", icon: Clock },
      { key: "shipped", label: "Shipped", icon: Truck },
      { key: "delivered", label: "Delivered", icon: CheckCircle },
    ];

    const statusAliases: Record<string, string> = {
      pending: "placed",
      placed: "placed",
      confirmed: "confirmed",
      processing: "processing",
      shipped: "shipped",
      delivered: "delivered",
    };

    const normalizedStatus =
      statusAliases[currentStatus?.toLowerCase()] ||
      currentStatus?.toLowerCase();

    const currentIndex = statuses.findIndex((s) => s.key === normalizedStatus);

    return statuses.map((status, index) => ({
      ...status,
      completed: index <= currentIndex,
      current: index === currentIndex,
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "placed":
        return "bg-blue-100 text-blue-800";
      case "confirmed":
        return "bg-indigo-100 text-indigo-800";
      case "processing":
        return "bg-blue-100 text-blue-800";
      case "shipped":
        return "bg-purple-100 text-purple-800";
      case "delivered":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "refunded":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) =>
    status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();

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
              We couldn't find the order you're looking for. Please check your
              order number and try again.
            </p>
            <div className="space-x-4">
              <Button asChild variant="outline">
                <a href="/my-orders" className="flex items-center space-x-2">
                  <ArrowLeft size={16} />
                  <span>My Orders</span>
                </a>
              </Button>
              <Button
                asChild
                className="bg-ethiopian-gold hover:bg-amber text-white"
              >
                <a href="/gifts">Continue Shopping</a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const statusSteps = getStatusSteps(order.status);
  const paymentStatus = getDerivedPaymentStatus(order.status);
  const paymentStatusClassName =
    paymentStatus === "PAID"
      ? "bg-green-100 text-green-800"
      : paymentStatus === "REFUNDED"
      ? "bg-orange-100 text-orange-800"
      : "bg-yellow-100 text-yellow-800";
  const shippingAddress = order.shippingAddress as
    | (typeof order.shippingAddress & { street?: string; zipcode?: string })
    | undefined;
  const shippingAddressLine =
    shippingAddress?.addressLine1 ||
    shippingAddress?.street ||
    "Address not available";
  const postalCode = shippingAddress?.postalCode || shippingAddress?.zipcode;
  const isPendingOrder = order.status?.toLowerCase() === "pending";
  const continueCheckoutUrl = `/order-review?orderId=${
    order.orderId
  }&paymentMethod=${getOrderReviewPaymentMethod(order)}`;
  const etaValue =
    order.eta ||
    (order as any).expectedDeliveryAt ||
    (order as any).deliveryInfo?.expectedDeliveryAt;
  const deliveryPersonInfo =
    order.deliveryPersonInfo || (order as any)["delivery-person-info"];
  const contactPhone = order.contactPhone || order.shippingAddress?.phone;
  const contactEmail = order.contactEmail || order.shippingAddress?.email;
  const orderItems = (
    order.lines && order.lines.length > 0 ? order.lines : order.items
  ) as Array<{
    id?: number;
    productId?: number;
    productName?: string;
    productImage?: string;
    quantity?: number;
    skuCode?: string;
    unitAmountMinor?: number;
    totalPrice?: number;
    currency?: string;
    attributes?: Array<{ name: string; value: string }>;
  }>;
  const subOrders = Array.isArray(order.subOrders) ? order.subOrders : [];
  const cancellableSubOrders = subOrders.filter(
    (subOrder): subOrder is SubOrder & { orderId: number } =>
      subOrder.cancellable === true && typeof subOrder.orderId === "number"
  );
  const canCancelSingleOrder = subOrders.length === 0 && order.cancellable === true;
  const canCancelSubOrders = subOrders.length > 0 && cancellableSubOrders.length > 0;
  const showCancelAction = canCancelSingleOrder || canCancelSubOrders;
  const hasMultipleSubOrders = subOrders.length > 1;
  const hasOrderItemAttributes = orderItems.some(
    (item) => Array.isArray(item.attributes) && item.attributes.length > 0
  );
  const displayOrderNumber = hasMultipleSubOrders
    ? order.orderGroupNumber || orderId || order.orderNumber
    : order.orderNumber || orderId;

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
              <p className="text-gray-600">Order #{displayOrderNumber}</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 justify-end">
                {isPendingOrder ? (
                  <Button
                    asChild
                    className="bg-yellow-500 hover:bg-yellow-600 text-white"
                  >
                    <a href={continueCheckoutUrl}>Continue Checkout</a>
                  </Button>
                ) : (
                  <Badge
                    className={getStatusColor(order.status)}
                    variant="secondary"
                  >
                    {getStatusLabel(order.status)}
                  </Badge>
                )}

                {deliveryPersonInfo && (
                  <Button
                    variant="outline"
                    onClick={() => setShowDeliveryContactDialog(true)}
                  >
                    Contact Delivery
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        <Dialog
          open={showDeliveryContactDialog}
          onOpenChange={setShowDeliveryContactDialog}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Delivery Contact</DialogTitle>
              <DialogDescription>
                Delivery Con Reach out to the assigned delivery person for this
                order.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              {deliveryPersonInfo?.fullName && (
                <div>
                  <p className="text-gray-500">Name</p>
                  <p className="font-medium text-gray-900">
                    {deliveryPersonInfo.fullName}
                  </p>
                </div>
              )}
              {deliveryPersonInfo?.phone && (
                <div>
                  <p className="text-gray-500">Phone</p>
                  <p className="font-medium text-gray-900">
                    {deliveryPersonInfo.phone}
                  </p>
                </div>
              )}
              {deliveryPersonInfo?.email && (
                <div>
                  <p className="text-gray-500">Email</p>
                  <p className="font-medium text-gray-900">
                    {deliveryPersonInfo.email}
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Status Timeline */}
        {!hasMultipleSubOrders && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Order Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                {statusSteps.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <div
                      key={step.key}
                      className="flex flex-col items-center flex-1"
                    >
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                          step.completed
                            ? "bg-ethiopian-gold text-white"
                            : step.current
                            ? "bg-blue-100 text-blue-600"
                            : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        <Icon size={20} />
                      </div>
                      <p
                        className={`text-[11px] sm:text-sm font-medium text-center leading-tight px-1 whitespace-normal break-words ${
                          step.completed
                            ? "text-ethiopian-gold"
                            : "text-gray-600"
                        }`}
                      >
                        {step.label}
                      </p>
                      {index < statusSteps.length - 1 && (
                        <div
                          className={`absolute h-0.5 w-full top-6 left-1/2 transform translate-x-1/2 ${
                            step.completed ? "bg-ethiopian-gold" : "bg-gray-200"
                          }`}
                          style={{ zIndex: -1 }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

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
                    {new Date(order.createdAt || Date.now()).toLocaleDateString(
                      "en-US",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }
                    )}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Payment Method</p>
                  <p className="text-gray-600 capitalize">
                    {order.paymentMethod || "Card"}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Shipping Fee</p>
                  <p className="text-gray-600">
                    {formatMinorAmount(
                      order.totals?.shippingMinor,
                      order.currency
                    )}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Discount</p>
                  <p className="text-gray-600">
                    {formatMinorAmount(
                      order.totals?.discountMinor,
                      order.currency
                    )}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Total Amount</p>
                  <p className="text-gray-900 font-bold">
                    {formatMinorAmount(
                      order.totals?.totalMinor,
                      order.currency
                    )}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Payment Status</p>
                  <Badge className={paymentStatusClassName}>
                    {paymentStatus.charAt(0) +
                      paymentStatus.slice(1).toLowerCase()}
                  </Badge>
                </div>
                {typeof order.refundedAmountMinor === "number" &&
                  order.refundedAmountMinor > 0 && (
                    <div>
                      <p className="font-medium text-orange-600">Refunded</p>
                      <p className="text-orange-600 font-bold">
                        {formatMinorAmount(
                          order.refundedAmountMinor,
                          order.currency
                        )}
                      </p>
                    </div>
                  )}
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
                <p className="text-gray-600">
                  {order.shippingAddress?.fullName || "Customer"}
                </p>
              </div>
              <div>
                <p className="font-medium text-gray-900">Delivery Address</p>
                <p className="text-gray-600">{shippingAddressLine}</p>
                {order.shippingAddress?.addressLine2 && (
                  <p className="text-gray-600 text-sm">
                    {order.shippingAddress.addressLine2}
                  </p>
                )}
                <p className="text-gray-600 text-sm">
                  {order.shippingAddress?.city}, {order.shippingAddress?.state}
                </p>
                <p className="text-gray-600 text-sm">
                  {order.shippingAddress?.country} {postalCode}
                </p>
              </div>
              <div>
                <p className="font-medium text-gray-900">Contact</p>
                {contactPhone ? (
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Phone size={14} />
                    <span>{contactPhone}</span>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">
                    No contact information
                  </p>
                )}
                {contactEmail && (
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Mail size={14} />
                    <span>{contactEmail}</span>
                  </div>
                )}
              </div>
              {etaValue && (
                <div>
                  <p className="font-medium text-gray-900">
                    Estimated Delivery
                  </p>
                  <p className="text-gray-600">
                    {new Date(etaValue).toLocaleString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {hasMultipleSubOrders && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Sub-Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {subOrders.map((subOrder, index) => {
                  const subOrderItems = Array.isArray(subOrder.lines)
                    ? subOrder.lines
                    : [];
                  const hasSubOrderAttributes = subOrderItems.some(
                    (item) =>
                      Array.isArray(item.attributes) &&
                      item.attributes.length > 0
                  );
                  const subOrderStatusSteps = getStatusSteps(subOrder.status);
                  const primaryProductName =
                    subOrderItems.find((item) => item.productName)
                      ?.productName || "Product";
                  const primaryProductId =
                    subOrderItems.find((item) => item.productName)
                      ?.productId;
                  const remainingItemCount = Math.max(
                    subOrderItems.length - 1,
                    0
                  );
                  const subOrderTitle =
                    remainingItemCount > 0
                      ? `${primaryProductName} +${remainingItemCount} more`
                      : primaryProductName;

                  return (
                    <div
                      key={subOrder.orderId || subOrder.orderNumber || index}
                      className="py-10 border-b-2 border-gray-100 last:border-b-0"
                    >
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {primaryProductId ? (
                              <a
                                href={`/product/${primaryProductId}`}
                                className="text-ethiopian-gold hover:underline"
                              >
                                {subOrderTitle}
                              </a>
                            ) : (
                              subOrderTitle
                            )}
                          </p>
                          {subOrder.eta && (
                            <p className="text-sm text-gray-500 mt-1">
                              ETA: {new Date(subOrder.eta).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <Badge
                          className={getStatusColor(subOrder.status)}
                          variant="secondary"
                        >
                          {getStatusLabel(subOrder.status)}
                        </Badge>
                      </div>

                      <div className="mb-4">
                        <p className="text-base font-semibold text-gray-900 mb-3">
                          Order Status
                        </p>
                        <div className="relative flex items-center justify-between">
                          {subOrderStatusSteps.map((step, stepIndex) => {
                            const Icon = step.icon;
                            return (
                              <div
                                key={`${
                                  subOrder.orderId ||
                                  subOrder.orderNumber ||
                                  index
                                }-${step.key}`}
                                className="flex flex-col items-center flex-1"
                              >
                                <div
                                  className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                                    step.completed
                                      ? "bg-ethiopian-gold text-white"
                                      : step.current
                                      ? "bg-blue-100 text-blue-600"
                                      : "bg-gray-100 text-gray-400"
                                  }`}
                                >
                                  <Icon size={20} />
                                </div>
                                <p
                                  className={`text-[11px] sm:text-sm font-medium text-center leading-tight px-1 whitespace-normal break-words ${
                                    step.completed
                                      ? "text-ethiopian-gold"
                                      : "text-gray-600"
                                  }`}
                                >
                                  {step.label}
                                </p>
                                {stepIndex < subOrderStatusSteps.length - 1 && (
                                  <div
                                    className={`absolute h-0.5 w-full top-6 left-1/2 transform translate-x-1/2 ${
                                      step.completed
                                        ? "bg-ethiopian-gold"
                                        : "bg-gray-200"
                                    }`}
                                    style={{ zIndex: -1 }}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {subOrder.rejectionReason && (
                        <p className="text-sm text-red-600 mb-3">
                          Reason: {subOrder.rejectionReason}
                        </p>
                      )}

                      {typeof subOrder.refundedAmountMinor === "number" &&
                        subOrder.refundedAmountMinor > 0 && (
                          <div className="mb-3">
                            <p className="text-sm font-medium text-orange-600">
                              Refunded Amount:{" "}
                              {formatMinorAmount(
                                subOrder.refundedAmountMinor,
                                subOrder.currency || order.currency
                              )}
                            </p>
                          </div>
                        )}

                      <div className="pt-6">
                        <div className="rounded-lg border border-gray-200 overflow-hidden">
                          <div className="grid grid-cols-12 gap-3 bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-600">
                            <div
                              className={
                                hasSubOrderAttributes
                                  ? "col-span-5"
                                  : "col-span-8"
                              }
                            >
                              Product
                            </div>
                            <div
                              className={
                                hasSubOrderAttributes
                                  ? "col-span-2"
                                  : "col-span-4"
                              }
                            >
                              Quantity
                            </div>
                            {hasSubOrderAttributes && (
                              <div className="col-span-5">Attributes</div>
                            )}
                          </div>

                          {subOrderItems.map((item) => (
                            <div
                              key={
                                item.id || item.orderItemId || item.productId
                              }
                              className="grid grid-cols-12 gap-3 px-4 py-3 border-t border-gray-100 text-sm"
                            >
                              <div
                                className={`font-semibold text-gray-900 break-words ${
                                  hasSubOrderAttributes
                                    ? "col-span-5"
                                    : "col-span-8"
                                }`}
                              >
                                <a
                                  href={`/product/${item.productId}`}
                                  className="text-ethiopian-gold hover:underline"
                                >
                                  {item.productName || "Product"}
                                </a>
                              </div>
                              <div
                                className={`font-medium text-gray-700 ${
                                  hasSubOrderAttributes
                                    ? "col-span-2"
                                    : "col-span-4"
                                }`}
                              >
                                {item.quantity || 1}
                              </div>
                              {hasSubOrderAttributes && (
                                <div className="col-span-5 text-gray-600 break-words">
                                  {item.attributes && item.attributes.length > 0
                                    ? item.attributes
                                        .map(
                                          (attr) =>
                                            `${attr.name}: ${attr.value}`
                                        )
                                        .join(", ")
                                    : "-"}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Order Items */}
        {!hasMultipleSubOrders && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <div className="grid grid-cols-12 gap-3 bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-600">
                  <div
                    className={
                      hasOrderItemAttributes ? "col-span-5" : "col-span-8"
                    }
                  >
                    Product
                  </div>
                  <div
                    className={
                      hasOrderItemAttributes ? "col-span-2" : "col-span-4"
                    }
                  >
                    Quantity
                  </div>
                  {hasOrderItemAttributes && (
                    <div className="col-span-5">Attributes</div>
                  )}
                </div>

                {orderItems?.map((item) => (
                  <div
                    key={item.id || item.productId}
                    className="grid grid-cols-12 gap-3 px-4 py-3 border-t border-gray-100 text-sm"
                  >
                    <div
                      className={`font-semibold text-gray-900 break-words ${
                        hasOrderItemAttributes ? "col-span-5" : "col-span-8"
                      }`}
                    >
                      <a
                        href={`/product/${item.productId}`}
                        className="text-ethiopian-gold hover:underline"
                      >
                        {item.productName || "Product"}
                      </a>
                    </div>
                    <div
                      className={`font-medium text-gray-700 ${
                        hasOrderItemAttributes ? "col-span-2" : "col-span-4"
                      }`}
                    >
                      {item.quantity || 1}
                    </div>
                    {hasOrderItemAttributes && (
                      <div className="col-span-5 text-gray-600 break-words">
                        {item.attributes && item.attributes.length > 0
                          ? item.attributes
                              .map((attr) => `${attr.name}: ${attr.value}`)
                              .join(", ")
                          : "-"}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Delivery Status Messages */}
        {order.status?.toLowerCase() === "delivered" &&
          !order.deliveryConfirmedAt && (
            <Card className="mb-8 border-amber-200 bg-amber-50">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                    <Clock className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-amber-800">
                      Delivery Pending Verification
                    </h3>
                    <p className="text-sm text-amber-700">
                      Your order has been delivered and is pending verification
                      by our team. You will receive an email confirmation once
                      verified.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

        {/* Already confirmed message */}
        {order.status?.toLowerCase() === "delivered" &&
          order.deliveryConfirmedAt && (
            <Card className="mb-8 border-green-200 bg-green-50">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-green-800">
                      Delivery Confirmed
                    </h3>
                    <p className="text-sm text-green-600">
                      Your order was verified and confirmed on{" "}
                      {new Date(order.deliveryConfirmedAt).toLocaleDateString(
                        "en-US",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

        {showCancelAction && (
          <Card className="mb-8">
            <CardContent className="pt-6">
              <Button
                variant="outline"
                className="w-full border-red-300 text-red-600 hover:bg-red-50"
                onClick={() => setCancelDialogOpen(true)}
                disabled={cancelOrderMutation.isPending}
              >
                Cancel Order
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Order</AlertDialogTitle>
            <AlertDialogDescription>
              {canCancelSubOrders
                ? `This will cancel ${cancellableSubOrders.length} cancellable sub-order(s) and start refund processing.`
                : "This will cancel the order and start refund processing."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Order</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelOrderMutation.mutate()}
              disabled={cancelOrderMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {cancelOrderMutation.isPending ? "Cancelling..." : "Cancel Order"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
