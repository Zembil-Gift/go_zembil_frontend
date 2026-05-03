import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  Loader2,
  Mail,
  MapPin,
  Phone,
  User,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  serviceOrderService,
  type ServiceOrderResponse,
  type ServiceOrderStatus,
} from "@/services/serviceOrderService";
import { serviceService } from "@/services/serviceService";

const TRACKING_STEPS: Array<{
  key: ServiceOrderStatus;
  label: string;
  icon: typeof Clock;
}> = [
  { key: "BOOKED", label: "Booked", icon: Calendar },
  { key: "CONFIRMED_BY_VENDOR", label: "Confirmed", icon: CheckCircle },
  { key: "IN_PROGRESS", label: "In Progress", icon: Clock },
  { key: "COMPLETED", label: "Completed", icon: CheckCircle },
];

const statusRank: Record<ServiceOrderStatus, number> = {
  BOOKED: 0,
  CONFIRMED_BY_VENDOR: 1,
  RESCHEDULED: 1,
  IN_PROGRESS: 2,
  COMPLETED: 3,
  CANCELLED: 0,
  NO_SHOW: 0,
};

const getStatusIcon = (status: ServiceOrderStatus) => {
  switch (status) {
    case "BOOKED":
      return <Calendar className="h-4 w-4" />;
    case "CONFIRMED_BY_VENDOR":
    case "RESCHEDULED":
      return <CheckCircle className="h-4 w-4" />;
    case "IN_PROGRESS":
      return <Clock className="h-4 w-4" />;
    case "COMPLETED":
      return <CheckCircle className="h-4 w-4" />;
    case "CANCELLED":
    case "NO_SHOW":
      return <XCircle className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
};

const getStatusBadgeClass = (status: ServiceOrderStatus) => {
  switch (status) {
    case "BOOKED":
      return "bg-yellow-100 text-yellow-800";
    case "CONFIRMED_BY_VENDOR":
      return "bg-amber-100 text-amber-800";
    case "RESCHEDULED":
      return "bg-amber-100 text-amber-900";
    case "IN_PROGRESS":
      return "bg-yellow-200 text-yellow-900";
    case "COMPLETED":
      return "bg-yellow-50 text-yellow-800";
    case "CANCELLED":
    case "NO_SHOW":
      return "bg-orange-100 text-orange-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export default function TrackServiceOrder() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isContinuingCheckout, setIsContinuingCheckout] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const {
    data: order,
    isLoading,
    isError,
  } = useQuery<ServiceOrderResponse>({
    queryKey: ["service-order", orderId],
    queryFn: () => serviceOrderService.getOrder(Number(orderId)),
    enabled: !!orderId,
    retry: false,
  });

  const preferredCurrencyCode = (
    user?.preferredCurrencyCode || "ETB"
  ).toUpperCase();

  const continueCheckoutMutation = useMutation({
    mutationFn: async (targetOrder: ServiceOrderResponse) => {
      const provider: "STRIPE" | "CHAPA" =
        preferredCurrencyCode === "ETB" ? "CHAPA" : "STRIPE";

      if (provider === "CHAPA") {
        navigate(`/payment/chapa?orderId=${targetOrder.id}&orderType=service`);
        return;
      }

      const paymentInit = await serviceOrderService.initializePayment(
        targetOrder.id,
        "STRIPE"
      );

      if (paymentInit.checkoutUrl) {
        window.location.href = paymentInit.checkoutUrl;
        return;
      }

      if (paymentInit.clientSecret) {
        navigate(
          `/payment/stripe?orderId=${targetOrder.id}&orderType=service`,
          {
            state: {
              clientSecret: paymentInit.clientSecret,
              publishableKey: paymentInit.publishableKey,
              amount: targetOrder.totalAmountMinor,
              currency: targetOrder.currency.toLowerCase(),
              orderId: targetOrder.id,
              orderNumber: targetOrder.orderNumber,
              returnUrl: `${window.location.origin}/my-service-orders`,
            },
          }
        );
        return;
      }

      throw new Error(
        "Payment initialization failed. No checkout URL returned."
      );
    },
    onError: (error: any) => {
      toast({
        title: "Checkout Failed",
        description:
          error?.message || "Failed to continue checkout. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsContinuingCheckout(false);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!order) {
        throw new Error("Service order is not available.");
      }
      return serviceOrderService.cancelOrder(
        order.id,
        cancelReason || undefined
      );
    },
    onSuccess: async () => {
      toast({
        title: "Booking Cancelled",
        description: "Your service booking has been cancelled successfully.",
      });
      setCancelDialogOpen(false);
      setCancelReason("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["service-order", orderId] }),
        queryClient.invalidateQueries({ queryKey: ["my-service-orders"] }),
      ]);
    },
    onError: (error: any) => {
      toast({
        title: "Cancellation Failed",
        description:
          error?.message || "Failed to cancel booking. Please try again.",
        variant: "destructive",
      });
    },
  });

  const statusSteps = useMemo(() => {
    if (!order) return [];

    if (order.status === "CANCELLED" || order.status === "NO_SHOW") {
      return TRACKING_STEPS.map((step, index) => ({
        ...step,
        completed: index === 0,
        current: index === 0,
      }));
    }

    const currentRank = statusRank[order.status] ?? 0;

    return TRACKING_STEPS.map((step, index) => ({
      ...step,
      completed: index <= currentRank,
      current: index === currentRank,
    }));
  }, [order]);

  const canContinueCheckout = useMemo(() => {
    if (!order) return false;
    return (
      ["PENDING", "FAILED"].includes(order.paymentStatus) &&
      !["CANCELLED", "COMPLETED", "NO_SHOW"].includes(order.status)
    );
  }, [order]);

  const canCancelOrder = useMemo(() => {
    if (!order) return false;
    const normalizedStatus = String(order.status).toUpperCase();
    if (normalizedStatus === "PENDING" || order.paymentStatus === "PENDING") {
      return false;
    }
    return serviceOrderService.canCancelOrder(order);
  }, [order]);

  const handleContinueCheckout = () => {
    if (!order || isContinuingCheckout) return;
    setIsContinuingCheckout(true);
    continueCheckoutMutation.mutate(order);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-eagle-green mx-auto mb-4" />
          <p className="text-eagle-green/70">Loading service booking...</p>
        </div>
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-16 text-center">
              <XCircle className="h-14 w-14 text-orange-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-eagle-green mb-2">
                Service Order Not Found
              </h2>
              <p className="text-eagle-green/70 mb-6">
                We couldn't find this service booking.
              </p>
              <Button asChild>
                <Link to="/my-service-orders">Back to My Services</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const statusDisplay = serviceOrderService.getStatusDisplay(order.status);
  const paymentStatusDisplay = serviceOrderService.getPaymentStatusDisplay(
    order.paymentStatus
  );
  const cancellationByLabel = order.cancellationInfo?.cancelledBy
    ? order.cancellationInfo.cancelledBy
        .toLowerCase()
        .replace("_", " ")
        .replace(/\b\w/g, (char) => char.toUpperCase())
    : "Unknown";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Button asChild variant="ghost" className="mb-4">
            <Link to="/my-service-orders" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to My Services
            </Link>
          </Button>

          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold text-eagle-green mb-1">
                Track Service Booking
              </h1>
              <p className="text-eagle-green/70">Order #{order.orderNumber}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getStatusBadgeClass(order.status)}>
                {getStatusIcon(order.status)}
                <span className="ml-1">{statusDisplay.text}</span>
              </Badge>
              <Badge
                className={`${paymentStatusDisplay.bgColor} ${paymentStatusDisplay.color}`}
              >
                <CreditCard className="h-3.5 w-3.5 mr-1" />
                {paymentStatusDisplay.text}
              </Badge>
            </div>
          </div>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Order Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3">
              {statusSteps.map((step) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.key}
                    className="flex flex-col items-center flex-1 text-center"
                  >
                    <div
                      className={`w-11 h-11 rounded-full flex items-center justify-center mb-2 ${
                        step.completed
                          ? "bg-ethiopian-gold text-white"
                          : step.current
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      <Icon size={18} />
                    </div>
                    <p
                      className={`text-xs font-medium ${
                        step.completed ? "text-ethiopian-gold" : "text-gray-600"
                      }`}
                    >
                      {step.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Service Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                {order.service &&
                serviceService.getPrimaryImageUrl(order.service) ? (
                  <img
                    src={serviceService.getPrimaryImageUrl(order.service)}
                    alt={order.service.title}
                    className="w-20 h-20 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-lg bg-eagle-green/10 flex items-center justify-center">
                    <Calendar className="h-8 w-8 text-eagle-green/50" />
                  </div>
                )}
                <div>
                  <p className="font-bold text-eagle-green">
                    {order.service?.title || "Service"}
                  </p>
                  {order.vendorName && (
                    <p className="text-sm text-eagle-green/70">
                      by {order.vendorName}
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                <p className="flex items-center gap-2 text-eagle-green/80">
                  <Calendar className="h-4 w-4" />
                  {serviceOrderService.formatDate(order.scheduledDateTime)}
                </p>
                <p className="flex items-center gap-2 text-eagle-green/80">
                  <Clock className="h-4 w-4" />
                  {serviceOrderService.formatTime(order.scheduledDateTime)}
                </p>
                {order.service?.city && (
                  <p className="flex items-center gap-2 text-eagle-green/80">
                    <MapPin className="h-4 w-4" />
                    {order.service.city}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-eagle-green/70">Subtotal</span>
                <span>
                  {serviceOrderService.formatPrice(
                    order.subtotalMinor,
                    order.currency
                  )}
                </span>
              </div>
              {(order.discountMinor || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-eagle-green/70">Discount</span>
                  <span className="text-green-700">
                    -
                    {serviceOrderService.formatPrice(
                      order.discountMinor || 0,
                      order.currency
                    )}
                  </span>
                </div>
              )}
              {(order.vatAmountMinor || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-eagle-green/70">VAT</span>
                  <span>
                    {serviceOrderService.formatPrice(
                      order.vatAmountMinor || 0,
                      order.currency
                    )}
                  </span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-eagle-green text-base">
                <span>Total</span>
                <span>
                  {serviceOrderService.formatPrice(
                    order.totalAmountMinor,
                    order.currency
                  )}
                </span>
              </div>

              {canContinueCheckout && (
                <Button
                  className="w-full mt-3 bg-eagle-green hover:bg-viridian-green text-white"
                  onClick={handleContinueCheckout}
                  disabled={isContinuingCheckout}
                >
                  {isContinuingCheckout ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Initializing...
                    </>
                  ) : (
                    "Continue Checkout"
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Contact Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-eagle-green mb-1">
                Customer Contact
              </p>
              <p className="flex items-center gap-2 text-eagle-green/80 mb-1">
                <Mail className="h-4 w-4" />
                {order.contactEmail || "Not provided"}
              </p>
              {order.contactPhone && (
                <p className="flex items-center gap-2 text-eagle-green/80">
                  <Phone className="h-4 w-4" />
                  {order.contactPhone}
                </p>
              )}
            </div>

            <div>
              <p className="font-medium text-eagle-green mb-1">Recipient</p>
              <p className="flex items-center gap-2 text-eagle-green/80 mb-1">
                <User className="h-4 w-4" />
                {order.recipientName || "Same as customer"}
              </p>
              {order.recipientEmail && (
                <p className="flex items-center gap-2 text-eagle-green/80 mb-1">
                  <Mail className="h-4 w-4" />
                  {order.recipientEmail}
                </p>
              )}
              {order.recipientPhone && (
                <p className="flex items-center gap-2 text-eagle-green/80">
                  <Phone className="h-4 w-4" />
                  {order.recipientPhone}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Cancellation & Refund</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {order.cancellationInfo && (
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                <p className="text-sm font-semibold text-orange-800 mb-2">
                  Cancellation Details
                </p>
                <div className="space-y-1 text-sm text-orange-900">
                  <p>
                    <span className="font-medium">Cancelled by:</span>{" "}
                    {cancellationByLabel}
                  </p>
                  <p>
                    <span className="font-medium">Reason:</span>{" "}
                    {order.cancellationInfo.reason || "No reason provided"}
                  </p>
                  <p>
                    <span className="font-medium">Refund amount:</span>{" "}
                    {typeof order.cancellationInfo.refundAmountMinor === "number"
                      ? serviceOrderService.formatPrice(
                          order.cancellationInfo.refundAmountMinor,
                          order.currency
                        )
                      : "N/A"}
                  </p>
                </div>
              </div>
            )}

            {order.refundEligibility ? (
              <>
                <div className="rounded-lg bg-june-bud/10 p-4">
                  <p className="text-sm text-eagle-green/80 mb-2">
                    {order.refundEligibility.reason ||
                      "Refund amount is calculated from the current policy and your booking time."}
                  </p>
                  <p className="text-sm font-medium text-eagle-green">
                    Refund Tier: {order.refundEligibility.refundTier || "N/A"}
                  </p>
                  <p className="text-sm font-medium text-eagle-green">
                    Refund Percentage:{" "}
                    {order.refundEligibility.refundPercentage ?? 0}%
                  </p>
                  <p className="text-base font-bold text-viridian-green mt-1">
                    You will get:{" "}
                    {serviceOrderService.formatPrice(
                      order.refundEligibility.estimatedRefundMinor || 0,
                      order.currency
                    )}
                  </p>
                </div>

                <ul className="text-xs text-eagle-green/70 space-y-1 list-disc pl-5">
                  <li>48+ hours before service: up to full refund.</li>
                  <li>
                    24-48 hours before service: partial refund based on policy.
                  </li>
                  <li>Less than 24 hours: refund may not apply.</li>
                </ul>
              </>
            ) : (
              <p className="text-sm text-eagle-green/70">
                Refund information is not available for this booking.
              </p>
            )}

            {canCancelOrder && (
              <Button
                variant="outline"
                className="w-full border-red-300 text-red-600 hover:bg-red-50"
                onClick={() => setCancelDialogOpen(true)}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cancel Booking
              </Button>
            )}
          </CardContent>
        </Card>

        <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <DialogContent className="max-w-md bg-white">
            <DialogHeader>
              <DialogTitle className="text-eagle-green">
                Cancel Service Booking
              </DialogTitle>
              <DialogDescription className="text-eagle-green/70">
                Your refund will follow the policy shown above. Confirm to
                proceed with cancellation.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <Label htmlFor="cancelReason" className="text-eagle-green">
                Reason (optional)
              </Label>
              <Textarea
                id="cancelReason"
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                placeholder="Tell us why you want to cancel..."
              />
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setCancelDialogOpen(false);
                  setCancelReason("");
                }}
              >
                Keep Booking
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending ? "Cancelling..." : "Confirm Cancel"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
