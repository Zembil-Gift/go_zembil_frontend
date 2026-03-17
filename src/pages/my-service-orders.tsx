import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  MapPin,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  X,
  CalendarClock,
  DollarSign,
  Info,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

import {
  serviceOrderService,
  ServiceOrderResponse,
  ServiceOrderStatus,
} from "@/services/serviceOrderService";
import { serviceService } from "@/services/serviceService";

export default function MyServiceOrders() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const [selectedOrder, setSelectedOrder] =
    useState<ServiceOrderResponse | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [pendingRescheduleDialogOpen, setPendingRescheduleDialogOpen] =
    useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [newScheduledDate, setNewScheduledDate] = useState("");
  const [newScheduledTime, setNewScheduledTime] = useState("");
  const [retryingPaymentOrderId, setRetryingPaymentOrderId] = useState<
    number | null
  >(null);

  // Fetch user's service orders
  const {
    data: ordersData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["my-service-orders"],
    queryFn: () => serviceOrderService.getCustomerOrders(0, 50),
  });

  const orders = ordersData?.content || [];

  // Cancel order mutation
  const cancelMutation = useMutation({
    mutationFn: ({ orderId, reason }: { orderId: number; reason?: string }) =>
      serviceOrderService.cancelOrder(orderId, reason),
    onSuccess: () => {
      toast({
        title: "Order Cancelled",
        description: "Your service order has been cancelled successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["my-service-orders"] });
      setCancelDialogOpen(false);
      setSelectedOrder(null);
      setCancelReason("");
    },
    onError: (error: Error) => {
      toast({
        title: "Cancellation Failed",
        description:
          error.message || "Failed to cancel order. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Reschedule order mutation
  const rescheduleMutation = useMutation({
    mutationFn: ({
      orderId,
      newDateTime,
    }: {
      orderId: number;
      newDateTime: string;
    }) => serviceOrderService.rescheduleOrder(orderId, newDateTime),
    onSuccess: () => {
      toast({
        title: "Order Rescheduled",
        description: "Your service has been rescheduled successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["my-service-orders"] });
      setRescheduleDialogOpen(false);
      setSelectedOrder(null);
      setNewScheduledDate("");
      setNewScheduledTime("");
    },
    onError: (error: Error) => {
      toast({
        title: "Reschedule Failed",
        description:
          error.message || "Failed to reschedule order. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Approve/reject vendor reschedule mutation
  const approveRescheduleMutation = useMutation({
    mutationFn: ({
      orderId,
      approved,
    }: {
      orderId: number;
      approved: boolean;
    }) => serviceOrderService.approveReschedule(orderId, approved),
    onSuccess: (_, variables) => {
      toast({
        title: variables.approved
          ? "Reschedule Approved"
          : "Reschedule Rejected",
        description: variables.approved
          ? "The new schedule has been confirmed."
          : "The vendor reschedule request has been rejected.",
      });
      queryClient.invalidateQueries({ queryKey: ["my-service-orders"] });
      setPendingRescheduleDialogOpen(false);
      setSelectedOrder(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Action Failed",
        description: error.message || "Failed to process reschedule request.",
        variant: "destructive",
      });
    },
  });

  const preferredCurrencyCode = (
    user?.preferredCurrencyCode || "ETB"
  ).toUpperCase();

  const handleContinueCheckout = async (order: ServiceOrderResponse) => {
    const isPendingPayment = ["PENDING", "FAILED"].includes(
      order.paymentStatus
    );
    const isPayableStatus = !["CANCELLED", "COMPLETED", "NO_SHOW"].includes(
      order.status
    );

    if (!isPendingPayment || !isPayableStatus) {
      return;
    }

    const provider: "STRIPE" | "CHAPA" =
      preferredCurrencyCode === "ETB" ? "CHAPA" : "STRIPE";

    try {
      setRetryingPaymentOrderId(order.id);

      if (provider === "CHAPA") {
        navigate(`/payment/chapa?orderId=${order.id}&orderType=service`);
        return;
      }

      const paymentInit = await serviceOrderService.initializePayment(
        order.id,
        "STRIPE"
      );

      if (paymentInit.checkoutUrl) {
        window.location.href = paymentInit.checkoutUrl;
        return;
      }

      if (paymentInit.clientSecret) {
        navigate(`/payment/stripe?orderId=${order.id}&orderType=service`, {
          state: {
            clientSecret: paymentInit.clientSecret,
            publishableKey: paymentInit.publishableKey,
            amount: order.totalAmountMinor,
            currency: order.currency.toLowerCase(),
            orderId: order.id,
            orderNumber: order.orderNumber,
            returnUrl: `${window.location.origin}/my-service-orders`,
          },
        });
        return;
      }

      throw new Error(
        "Payment initialization failed. No checkout URL returned."
      );
    } catch (error: any) {
      toast({
        title: "Checkout Failed",
        description:
          error?.message || "Failed to continue checkout. Please try again.",
        variant: "destructive",
      });
      setRetryingPaymentOrderId(null);
    }
  };

  const getStatusIcon = (status: ServiceOrderStatus) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle className="h-4 w-4" />;
      case "CONFIRMED_BY_VENDOR":
        return <CheckCircle className="h-4 w-4" />;
      case "IN_PROGRESS":
        return <Clock className="h-4 w-4" />;
      case "CANCELLED":
      case "NO_SHOW":
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusBadgeClass = (status: ServiceOrderStatus) => {
    switch (status) {
      case "BOOKED":
        return "bg-yellow-100 text-yellow-800 border-none";
      case "CONFIRMED_BY_VENDOR":
        return "bg-amber-100 text-amber-800 border-none";
      case "IN_PROGRESS":
        return "bg-yellow-200 text-yellow-900 border-none";
      case "COMPLETED":
        return "bg-yellow-50 text-yellow-800 border-none";
      case "RESCHEDULED":
        return "bg-amber-100 text-amber-900 border-none";
      case "CANCELLED":
      case "NO_SHOW":
        return "bg-orange-100 text-orange-800 border-none";
      default:
        return "bg-yellow-100 text-yellow-800 border-none";
    }
  };

  const handleCancelOrder = () => {
    if (selectedOrder) {
      cancelMutation.mutate({
        orderId: selectedOrder.id,
        reason: cancelReason || undefined,
      });
    }
  };

  const handleRescheduleOrder = () => {
    if (selectedOrder && newScheduledDate && newScheduledTime) {
      const newDateTime = `${newScheduledDate}T${newScheduledTime}:00`;
      rescheduleMutation.mutate({ orderId: selectedOrder.id, newDateTime });
    }
  };

  const handleApproveReschedule = (approved: boolean) => {
    if (selectedOrder) {
      approveRescheduleMutation.mutate({ orderId: selectedOrder.id, approved });
    }
  };

  const OrderCard = ({ order }: { order: ServiceOrderResponse }) => {
    const statusDisplay = serviceOrderService.getStatusDisplay(order.status);
    const paymentStatusDisplay = serviceOrderService.getPaymentStatusDisplay(
      order.paymentStatus
    );
    const canReschedule = serviceOrderService.canRescheduleOrder(order);
    const hasPendingReschedule =
      serviceOrderService.hasPendingReschedule(order);
    const hoursUntilService = serviceOrderService.getHoursUntilService(order);
    const isPendingPayment = ["PENDING", "FAILED"].includes(
      order.paymentStatus
    );
    const isPayableStatus = !["CANCELLED", "COMPLETED", "NO_SHOW"].includes(
      order.status
    );
    const canContinueCheckout = isPendingPayment && isPayableStatus;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card
          className="cursor-pointer hover:shadow-lg transition-all duration-300 border-eagle-green/10"
          onClick={() => navigate(`/my-service-orders/${order.id}`)}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-4 flex-1">
                {/* Service Image */}
                {order.service &&
                serviceService.getPrimaryImageUrl(order.service) ? (
                  <img
                    src={serviceService.getPrimaryImageUrl(order.service)}
                    alt={order.service.title}
                    className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-lg bg-eagle-green/10 flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-8 w-8 text-eagle-green/50" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Badge className={getStatusBadgeClass(order.status)}>
                      {getStatusIcon(order.status)}
                      <span className="ml-1">{statusDisplay.text}</span>
                    </Badge>
                    <Badge
                      className={`${paymentStatusDisplay.bgColor} ${paymentStatusDisplay.color} border-none`}
                    >
                      {paymentStatusDisplay.text}
                    </Badge>
                    {hasPendingReschedule && (
                      <Badge className="bg-purple-100 text-purple-700 border-none">
                        <CalendarClock className="h-3 w-3 mr-1" />
                        Reschedule Pending
                      </Badge>
                    )}
                  </div>

                  <h3 className="font-bold text-eagle-green text-lg mb-1 truncate">
                    {order.service?.title || "Service"}
                  </h3>

                  <div className="flex items-center gap-2 text-sm text-eagle-green/70 mb-1">
                    <Calendar className="h-4 w-4 flex-shrink-0" />
                    <span className="font-light">
                      {serviceOrderService.formatDate(order.scheduledDateTime)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-eagle-green/70 mb-1">
                    <Clock className="h-4 w-4 flex-shrink-0" />
                    <span className="font-light">
                      {serviceOrderService.formatTime(order.scheduledDateTime)}
                    </span>
                  </div>

                  {order.service?.city && (
                    <div className="flex items-center gap-2 text-sm text-eagle-green/70">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      <span className="font-light truncate">
                        {order.service.city}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <p className="font-bold text-eagle-green text-lg">
                  {serviceOrderService.formatPrice(
                    order.totalAmountMinor,
                    order.currency
                  )}
                </p>
                {hoursUntilService > 0 && order.status !== "CANCELLED" && (
                  <p className="text-xs text-eagle-green/60 mt-1">
                    {hoursUntilService}h until service
                  </p>
                )}
                <ChevronRight className="h-5 w-5 text-eagle-green/50 mt-2 ml-auto" />
              </div>
            </div>

            {/* Refund Eligibility Info
            {order.refundEligibility && canCancel && (
              <div className="mt-3 pt-3 border-t border-eagle-green/10">
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-viridian-green" />
                  <span className="font-light text-eagle-green/70">
                    Estimated refund: 
                  </span>
                  <span className="font-bold text-viridian-green">
                    {order.refundEligibility.refundPercentage}% 
                    ({serviceOrderService.formatPrice(order.refundEligibility.estimatedRefundMinor || 0, order.currency)})
                  </span>
                </div>
              </div>
            )} */}

            {/* Quick Actions */}
            {(canContinueCheckout || canReschedule || hasPendingReschedule) && (
              <div className="mt-3 pt-3 border-t border-eagle-green/10 flex gap-2 flex-wrap">
                {canContinueCheckout && (
                  <Button
                    size="sm"
                    className="bg-eagle-green hover:bg-viridian-green text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleContinueCheckout(order);
                    }}
                    disabled={retryingPaymentOrderId === order.id}
                  >
                    {retryingPaymentOrderId === order.id ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                        Initializing...
                      </>
                    ) : (
                      "Continue Checkout"
                    )}
                  </Button>
                )}
                {hasPendingReschedule && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-purple-300 text-purple-700 hover:bg-purple-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedOrder(order);
                      setPendingRescheduleDialogOpen(true);
                    }}
                  >
                    <CalendarClock className="h-4 w-4 mr-1" />
                    Review Reschedule
                  </Button>
                )}
                {canReschedule && !hasPendingReschedule && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-eagle-green/30 text-eagle-green hover:bg-eagle-green hover:text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedOrder(order);
                      setRescheduleDialogOpen(true);
                    }}
                  >
                    <CalendarClock className="h-4 w-4 mr-1" />
                    Reschedule
                  </Button>
                )}
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
      <Button
        onClick={() => navigate("/services")}
        className="mt-4 bg-eagle-green hover:bg-viridian-green text-white"
      >
        Browse Services
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-eagle-green mb-2">
                My Service Bookings
              </h1>
              <p className="font-light text-eagle-green/70">
                View and manage your service bookings
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

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <Skeleton className="h-20 w-20 rounded-lg bg-june-bud/20" />
                    <div className="flex-1">
                      <Skeleton className="h-6 w-1/4 mb-2 bg-june-bud/20" />
                      <Skeleton className="h-4 w-3/4 mb-2 bg-june-bud/20" />
                      <Skeleton className="h-4 w-1/2 bg-june-bud/20" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {orders.length === 0 ? (
              <EmptyState message="No service bookings yet. Browse services to book!" />
            ) : (
              orders.map((order: ServiceOrderResponse) => (
                <OrderCard key={order.id} order={order} />
              ))
            )}
          </div>
        )}

        {/* Order Detail Modal */}
        <Dialog
          open={
            !!selectedOrder &&
            !cancelDialogOpen &&
            !rescheduleDialogOpen &&
            !pendingRescheduleDialogOpen
          }
          onOpenChange={() => setSelectedOrder(null)}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
            {selectedOrder && (
              <>
                <DialogHeader>
                  <DialogTitle className="font-bold text-eagle-green">
                    Order #{selectedOrder.orderNumber}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                  {/* Service Info */}
                  <div className="bg-june-bud/10 rounded-lg p-4">
                    <div className="flex gap-4">
                      {selectedOrder.service &&
                      serviceService.getPrimaryImageUrl(
                        selectedOrder.service
                      ) ? (
                        <img
                          src={serviceService.getPrimaryImageUrl(
                            selectedOrder.service
                          )}
                          alt={selectedOrder.service.title}
                          className="w-24 h-24 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-lg bg-eagle-green/10 flex items-center justify-center">
                          <Calendar className="h-10 w-10 text-eagle-green/50" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-eagle-green text-lg mb-1">
                          {selectedOrder.service?.title || "Service"}
                        </h3>
                        {selectedOrder.vendorName && (
                          <p className="text-sm font-light text-eagle-green/70 mb-2">
                            by {selectedOrder.vendorName}
                          </p>
                        )}
                        <div className="space-y-1 text-sm text-eagle-green/70">
                          <p className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {serviceOrderService.formatDate(
                              selectedOrder.scheduledDateTime
                            )}
                          </p>
                          <p className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {serviceOrderService.formatTime(
                              selectedOrder.scheduledDateTime
                            )}
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

                  {/* Order Status */}
                  <div className="flex items-center gap-4 flex-wrap">
                    <div>
                      <span className="text-sm font-light text-eagle-green/70">
                        Status
                      </span>
                      <Badge
                        className={`ml-2 ${getStatusBadgeClass(
                          selectedOrder.status
                        )}`}
                      >
                        {getStatusIcon(selectedOrder.status)}
                        <span className="ml-1">
                          {
                            serviceOrderService.getStatusDisplay(
                              selectedOrder.status
                            ).text
                          }
                        </span>
                      </Badge>
                    </div>
                    <div>
                      <span className="text-sm font-light text-eagle-green/70">
                        Payment
                      </span>
                      <Badge
                        className={`ml-2 ${
                          serviceOrderService.getPaymentStatusDisplay(
                            selectedOrder.paymentStatus
                          ).bgColor
                        } ${
                          serviceOrderService.getPaymentStatusDisplay(
                            selectedOrder.paymentStatus
                          ).color
                        } border-none`}
                      >
                        {
                          serviceOrderService.getPaymentStatusDisplay(
                            selectedOrder.paymentStatus
                          ).text
                        }
                      </Badge>
                    </div>
                  </div>

                  <Separator />

                  {/* Recipient Info */}
                  {(selectedOrder.recipientName ||
                    selectedOrder.giftMessage) && (
                    <>
                      <div>
                        <h4 className="font-bold text-eagle-green mb-3">
                          Gift Details
                        </h4>
                        {selectedOrder.recipientName && (
                          <p className="text-sm font-light text-eagle-green/70 mb-1">
                            <span className="font-bold">Recipient:</span>{" "}
                            {selectedOrder.recipientName}
                          </p>
                        )}
                        {selectedOrder.recipientEmail && (
                          <p className="text-sm font-light text-eagle-green/70 mb-1">
                            <span className="font-bold">Email:</span>{" "}
                            {selectedOrder.recipientEmail}
                          </p>
                        )}
                        {selectedOrder.recipientPhone && (
                          <p className="text-sm font-light text-eagle-green/70 mb-1">
                            <span className="font-bold">Phone:</span>{" "}
                            {selectedOrder.recipientPhone}
                          </p>
                        )}
                        {selectedOrder.giftMessage && (
                          <div className="mt-2 p-3 bg-yellow/10 rounded-lg">
                            <p className="text-sm font-light text-eagle-green/80 italic">
                              "{selectedOrder.giftMessage}"
                            </p>
                          </div>
                        )}
                      </div>
                      <Separator />
                    </>
                  )}

                  {/* Cancellation Info */}
                  {selectedOrder.cancellationInfo?.cancelledAt && (
                    <>
                      <div className="bg-red-50 rounded-lg p-4">
                        <h4 className="font-bold text-red-700 mb-2">
                          Cancellation Details
                        </h4>
                        <div className="space-y-1 text-sm">
                          <p className="text-red-600">
                            <span className="font-bold">Cancelled:</span>{" "}
                            {serviceOrderService.formatDateTime(
                              selectedOrder.cancellationInfo.cancelledAt
                            )}
                          </p>
                          <p className="text-red-600">
                            <span className="font-bold">By:</span>{" "}
                            {selectedOrder.cancellationInfo.cancelledBy}
                          </p>
                          {selectedOrder.cancellationInfo.reason && (
                            <p className="text-red-600">
                              <span className="font-bold">Reason:</span>{" "}
                              {selectedOrder.cancellationInfo.reason}
                            </p>
                          )}
                          {selectedOrder.cancellationInfo.refundAmountMinor !==
                            undefined && (
                            <p className="text-red-600">
                              <span className="font-bold">Refund:</span>{" "}
                              {serviceOrderService.formatPrice(
                                selectedOrder.cancellationInfo
                                  .refundAmountMinor,
                                selectedOrder.currency
                              )}{" "}
                              ({selectedOrder.cancellationInfo.refundPercentage}
                              %)
                            </p>
                          )}
                        </div>
                      </div>
                      <Separator />
                    </>
                  )}

                  {/* Reschedule Info */}
                  {selectedOrder.rescheduleInfo?.originalDateTime && (
                    <>
                      <div className="bg-purple-50 rounded-lg p-4">
                        <h4 className="font-bold text-purple-700 mb-2">
                          Reschedule History
                        </h4>
                        <div className="space-y-1 text-sm">
                          <p className="text-purple-600">
                            <span className="font-bold">Original Date:</span>{" "}
                            {serviceOrderService.formatDateTime(
                              selectedOrder.rescheduleInfo.originalDateTime
                            )}
                          </p>
                          {selectedOrder.rescheduleInfo.rescheduledAt && (
                            <p className="text-purple-600">
                              <span className="font-bold">Rescheduled:</span>{" "}
                              {serviceOrderService.formatDateTime(
                                selectedOrder.rescheduleInfo.rescheduledAt
                              )}
                            </p>
                          )}
                          <p className="text-purple-600">
                            <span className="font-bold">By:</span>{" "}
                            {selectedOrder.rescheduleInfo.rescheduledBy}
                          </p>
                        </div>
                      </div>
                      <Separator />
                    </>
                  )}

                  {/* Order Summary */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-eagle-green mb-3">
                      Payment Summary
                    </h4>
                    <div className="flex justify-between text-sm">
                      <span className="font-light text-eagle-green/70">
                        Subtotal
                      </span>
                      <span className="font-light text-eagle-green">
                        {serviceOrderService.formatPrice(
                          selectedOrder.subtotalMinor,
                          selectedOrder.currency
                        )}
                      </span>
                    </div>
                    {selectedOrder.discountMinor &&
                      selectedOrder.discountMinor > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="font-light text-eagle-green/70">
                            Discount
                          </span>
                          <span className="font-light text-green-600">
                            -
                            {serviceOrderService.formatPrice(
                              selectedOrder.discountMinor,
                              selectedOrder.currency
                            )}
                          </span>
                        </div>
                      )}
                    {selectedOrder.vatAmountMinor &&
                      selectedOrder.vatAmountMinor > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="font-light text-eagle-green/70">
                            VAT
                          </span>
                          <span className="font-light text-eagle-green">
                            {serviceOrderService.formatPrice(
                              selectedOrder.vatAmountMinor,
                              selectedOrder.currency
                            )}
                          </span>
                        </div>
                      )}
                    <Separator />
                    <div className="flex justify-between">
                      <span className="font-bold text-eagle-green">Total</span>
                      <span className="font-bold text-eagle-green text-xl">
                        {serviceOrderService.formatPrice(
                          selectedOrder.totalAmountMinor,
                          selectedOrder.currency
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Refund Eligibility */}
                  {selectedOrder.refundEligibility &&
                    serviceOrderService.canCancelOrder(selectedOrder) && (
                      <>
                        <Separator />
                        <div className="bg-june-bud/10 rounded-lg p-4">
                          <h4 className="font-bold text-eagle-green mb-2 flex items-center gap-2">
                            <Info className="h-4 w-4" />
                            Refund Eligibility
                          </h4>
                          <p className="text-sm font-light text-eagle-green/70 mb-2">
                            {selectedOrder.refundEligibility.reason}
                          </p>
                          <p className="text-sm font-bold text-viridian-green">
                            Estimated refund:{" "}
                            {selectedOrder.refundEligibility.refundPercentage}%
                            (
                            {serviceOrderService.formatPrice(
                              selectedOrder.refundEligibility
                                .estimatedRefundMinor || 0,
                              selectedOrder.currency
                            )}
                            )
                          </p>
                        </div>
                      </>
                    )}

                  {/* Actions */}
                  <div className="flex gap-2 flex-wrap">
                    {serviceOrderService.hasPendingReschedule(
                      selectedOrder
                    ) && (
                      <Button
                        variant="outline"
                        className="border-purple-300 text-purple-700 hover:bg-purple-50"
                        onClick={() => {
                          setPendingRescheduleDialogOpen(true);
                        }}
                      >
                        <CalendarClock className="h-4 w-4 mr-2" />
                        Review Reschedule Request
                      </Button>
                    )}
                    {serviceOrderService.canRescheduleOrder(selectedOrder) &&
                      !serviceOrderService.hasPendingReschedule(
                        selectedOrder
                      ) && (
                        <Button
                          variant="outline"
                          className="border-eagle-green/30 text-eagle-green hover:bg-eagle-green hover:text-white"
                          onClick={() => {
                            setRescheduleDialogOpen(true);
                          }}
                        >
                          <CalendarClock className="h-4 w-4 mr-2" />
                          Reschedule
                        </Button>
                      )}
                    {serviceOrderService.canCancelOrder(selectedOrder) && (
                      <Button
                        variant="outline"
                        className="border-red-300 text-red-600 hover:bg-red-50"
                        onClick={() => {
                          setCancelDialogOpen(true);
                        }}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel Order
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="border-eagle-green/30 text-eagle-green"
                      onClick={() =>
                        navigate(`/my-service-orders/${selectedOrder.id}`)
                      }
                    >
                      View Full Details
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Cancel Order Dialog */}
        <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <DialogContent className="max-w-md bg-white">
            <DialogHeader>
              <DialogTitle className="font-bold text-eagle-green">
                Cancel Service Booking
              </DialogTitle>
              <DialogDescription className="text-eagle-green/70">
                Are you sure you want to cancel this booking?
              </DialogDescription>
            </DialogHeader>

            {selectedOrder && (
              <div className="space-y-4">
                <div className="bg-june-bud/10 rounded-lg p-4">
                  <h4 className="font-bold text-eagle-green mb-2">
                    {selectedOrder.service?.title || "Service"}
                  </h4>
                  <p className="text-sm font-light text-eagle-green/70">
                    {serviceOrderService.formatDateTime(
                      selectedOrder.scheduledDateTime
                    )}
                  </p>
                </div>

                {selectedOrder.refundEligibility && (
                  <div className="bg-yellow/10 rounded-lg p-4">
                    <h5 className="font-bold text-eagle-green text-sm mb-1">
                      Refund Information
                    </h5>
                    <p className="text-sm font-light text-eagle-green/70 mb-2">
                      {selectedOrder.refundEligibility.reason}
                    </p>
                    <p className="text-sm font-bold text-viridian-green">
                      Estimated refund:{" "}
                      {selectedOrder.refundEligibility.refundPercentage}% (
                      {serviceOrderService.formatPrice(
                        selectedOrder.refundEligibility.estimatedRefundMinor ||
                          0,
                        selectedOrder.currency
                      )}
                      )
                    </p>
                  </div>
                )}

                <div>
                  <Label htmlFor="cancelReason" className="text-eagle-green">
                    Reason for cancellation (optional)
                  </Label>
                  <Textarea
                    id="cancelReason"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Please let us know why you're cancelling..."
                    className="mt-2"
                  />
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setCancelDialogOpen(false);
                  setCancelReason("");
                }}
                className="border-eagle-green/30"
              >
                Keep Booking
              </Button>
              <Button
                onClick={handleCancelOrder}
                disabled={cancelMutation.isPending}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {cancelMutation.isPending ? "Cancelling..." : "Cancel Booking"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reschedule Order Dialog */}
        <Dialog
          open={rescheduleDialogOpen}
          onOpenChange={setRescheduleDialogOpen}
        >
          <DialogContent className="max-w-md bg-white">
            <DialogHeader>
              <DialogTitle className="font-bold text-eagle-green">
                Reschedule Service
              </DialogTitle>
              <DialogDescription className="text-eagle-green/70">
                Select a new date and time for your service.
              </DialogDescription>
            </DialogHeader>

            {selectedOrder && (
              <div className="space-y-4">
                <div className="bg-june-bud/10 rounded-lg p-4">
                  <h4 className="font-bold text-eagle-green mb-2">
                    {selectedOrder.service?.title || "Service"}
                  </h4>
                  <p className="text-sm font-light text-eagle-green/70">
                    Current:{" "}
                    {serviceOrderService.formatDateTime(
                      selectedOrder.scheduledDateTime
                    )}
                  </p>
                </div>

                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-sm font-light text-blue-700">
                    <Info className="h-4 w-4 inline mr-1" />
                    You can only reschedule once per booking. The new date must
                    be at least 48 hours from now.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="newDate" className="text-eagle-green">
                      New Date
                    </Label>
                    <Input
                      id="newDate"
                      type="date"
                      value={newScheduledDate}
                      onChange={(e) => setNewScheduledDate(e.target.value)}
                      min={
                        new Date(Date.now() + 48 * 60 * 60 * 1000)
                          .toISOString()
                          .split("T")[0]
                      }
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="newTime" className="text-eagle-green">
                      New Time
                    </Label>
                    <Input
                      id="newTime"
                      type="time"
                      value={newScheduledTime}
                      onChange={(e) => setNewScheduledTime(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setRescheduleDialogOpen(false);
                  setNewScheduledDate("");
                  setNewScheduledTime("");
                }}
                className="border-eagle-green/30"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRescheduleOrder}
                disabled={
                  rescheduleMutation.isPending ||
                  !newScheduledDate ||
                  !newScheduledTime
                }
                className="bg-eagle-green hover:bg-viridian-green text-white"
              >
                {rescheduleMutation.isPending
                  ? "Rescheduling..."
                  : "Confirm Reschedule"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Pending Reschedule Dialog */}
        <Dialog
          open={pendingRescheduleDialogOpen}
          onOpenChange={setPendingRescheduleDialogOpen}
        >
          <DialogContent className="max-w-md bg-white">
            <DialogHeader>
              <DialogTitle className="font-bold text-eagle-green">
                Vendor Reschedule Request
              </DialogTitle>
              <DialogDescription className="text-eagle-green/70">
                The vendor has requested to reschedule your service.
              </DialogDescription>
            </DialogHeader>

            {selectedOrder && (
              <div className="space-y-4">
                <div className="bg-june-bud/10 rounded-lg p-4">
                  <h4 className="font-bold text-eagle-green mb-2">
                    {selectedOrder.service?.title || "Service"}
                  </h4>
                  <div className="space-y-2 text-sm">
                    <p className="font-light text-eagle-green/70">
                      <span className="font-bold">Current:</span>{" "}
                      {serviceOrderService.formatDateTime(
                        selectedOrder.scheduledDateTime
                      )}
                    </p>
                    {selectedOrder.rescheduleInfo
                      ?.pendingRescheduleDateTime && (
                      <p className="font-light text-purple-700">
                        <span className="font-bold">Proposed:</span>{" "}
                        {serviceOrderService.formatDateTime(
                          selectedOrder.rescheduleInfo.pendingRescheduleDateTime
                        )}
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-yellow/10 rounded-lg p-3">
                  <p className="text-sm font-light text-eagle-green/70">
                    <AlertCircle className="h-4 w-4 inline mr-1" />
                    If you reject this request, the booking will be cancelled
                    and you will receive a full refund.
                  </p>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => handleApproveReschedule(false)}
                disabled={approveRescheduleMutation.isPending}
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                {approveRescheduleMutation.isPending
                  ? "Processing..."
                  : "Reject & Cancel"}
              </Button>
              <Button
                onClick={() => handleApproveReschedule(true)}
                disabled={approveRescheduleMutation.isPending}
                className="bg-eagle-green hover:bg-viridian-green text-white"
              >
                {approveRescheduleMutation.isPending
                  ? "Processing..."
                  : "Accept New Time"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
