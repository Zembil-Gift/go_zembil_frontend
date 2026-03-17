import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Clock,
  Home,
  Loader2,
  ShoppingBag,
  Ticket,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/services/apiService";

interface OrderPaymentStatusResponse {
  orderId: number;
  orderNumber?: string;
  orderStatus: string;
  paymentStatus: string;
  provider: string | null;
  providerRef: string | null;
  providerStatus: string | null;
  providerVerified: boolean;
  message: string;
  checkedAt: string;
}

const COMPLETED_PAYMENT_STATUSES = new Set(["COMPLETED", "PAID", "CONFIRMED"]);
const PENDING_PAYMENT_STATUSES = new Set([
  "PENDING",
  "PROCESSING",
  "AWAITING_PAYMENT",
]);

export default function PaymentSuccess() {
  const [paymentStatus, setPaymentStatus] = useState<
    "loading" | "success" | "failed" | "pending"
  >("loading");
  const [orderInfo, setOrderInfo] = useState<any>(null);
  const [statusMessage, setStatusMessage] = useState(
    "Please wait while we confirm your payment."
  );
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;

    const verifyChapaOrderPayment = async (
      targetOrderId: string,
      targetOrderType: string,
      trxRef: string,
      maxAttempts: number = 5
    ) => {
      setStatusMessage("Checking payment status...");

      const normalizedOrderType = targetOrderType.toUpperCase();

      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        try {
          const result =
            await apiService.getRequest<OrderPaymentStatusResponse>(
              `/api/orders/${targetOrderId}/payment-status?orderType=${encodeURIComponent(
                normalizedOrderType
              )}`
            );

          if (cancelled) {
            return;
          }

          if (COMPLETED_PAYMENT_STATUSES.has(result.paymentStatus)) {
            if (normalizedOrderType === "SERVICE") {
              window.location.href = `/service-order-success?orderId=${targetOrderId}`;
              return;
            }

            if (normalizedOrderType === "EVENT") {
              window.location.href = `/event-order-success?orderId=${targetOrderId}`;
              return;
            }

            setPaymentStatus("success");
            setOrderInfo({
              id: targetOrderId,
              orderNumber: result.orderNumber,
              orderType: targetOrderType,
              paymentMethod: "Chapa",
              paymentId: result.providerRef || trxRef,
              backendStatus: result.paymentStatus,
              providerStatus: result.providerStatus,
              verifiedAt: result.checkedAt,
            });
            setStatusMessage("Your payment has been confirmed.");
            toast({
              title: "Payment Successful!",
              description:
                result.message || "Your Chapa payment has been confirmed.",
            });
            return;
          }

          if (PENDING_PAYMENT_STATUSES.has(result.paymentStatus)) {
            setStatusMessage(
              result.message || "Your payment is being verified."
            );

            if (attempt < maxAttempts - 1) {
              await new Promise((resolve) => setTimeout(resolve, 3000));
              continue;
            }

            setPaymentStatus("pending");
            setOrderInfo({
              id: targetOrderId,
              orderNumber: result.orderNumber,
              orderType: targetOrderType,
              paymentMethod: "Chapa",
              paymentId: result.providerRef || trxRef,
              backendStatus: result.paymentStatus,
              providerStatus: result.providerStatus,
              verifiedAt: result.checkedAt,
            });
            return;
          }

          setPaymentStatus("failed");
          setStatusMessage(
            result.message || "The payment could not be confirmed."
          );
          toast({
            title: "Payment Not Confirmed",
            description:
              result.message ||
              "The backend could not confirm your Chapa payment.",
            variant: "destructive",
          });
          return;
        } catch (error: any) {
          if (cancelled) {
            return;
          }

          if (attempt < maxAttempts - 1) {
            await new Promise((resolve) => setTimeout(resolve, 3000));
            continue;
          }

          setPaymentStatus("pending");
          setStatusMessage(
            error?.message ||
              "We could not verify the payment yet. Please refresh in a moment or check your orders."
          );
          setOrderInfo({
            id: targetOrderId,
            orderType: targetOrderType,
            paymentMethod: "Chapa",
            paymentId: trxRef,
          });
          return;
        }
      }
    };

    const processReturn = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const paymentIntent = urlParams.get("payment_intent");
      const orderId = urlParams.get("orderId");
      const orderType = (urlParams.get("orderType") || "PRODUCT").toUpperCase();
      const trxRef = urlParams.get("trx_ref");
      const status = urlParams.get("status");

      if (paymentIntent) {
        setPaymentStatus("success");
        setOrderInfo({
          id: orderId,
          orderType,
          paymentMethod: "Stripe",
          paymentId: paymentIntent,
        });
        setStatusMessage(
          "Your Stripe payment has been processed successfully."
        );
        return;
      }

      if (trxRef) {
        if (status !== "success") {
          setPaymentStatus("failed");
          setStatusMessage(
            "Your Chapa payment was not successful. Please try again."
          );
          toast({
            title: "Payment Failed",
            description:
              "Your Chapa payment was not successful. Please try again.",
            variant: "destructive",
          });
          return;
        }

        if (
          orderId &&
          (orderType === "PRODUCT" ||
            orderType === "SERVICE" ||
            orderType === "EVENT")
        ) {
          await verifyChapaOrderPayment(orderId, orderType, trxRef);
          return;
        }

        setPaymentStatus("success");
        setOrderInfo({
          id: orderId,
          orderType,
          paymentMethod: "Chapa",
          paymentId: trxRef,
        });
        setStatusMessage("Chapa returned a successful payment result.");
        toast({
          title: "Payment Successful!",
          description: "Your Chapa payment has been processed successfully.",
        });
        return;
      }

      if (orderId) {
        setPaymentStatus("success");
        setOrderInfo({
          id: orderId,
          orderType,
          paymentMethod: "Unknown",
        });
        setStatusMessage("Order details loaded successfully.");
        return;
      }

      setTimeout(() => {
        if (!cancelled) {
          setPaymentStatus("failed");
          setStatusMessage(
            "No payment information was found in the return URL."
          );
        }
      }, 2000);
    };

    void processReturn();

    return () => {
      cancelled = true;
    };
  }, [toast]);

  if (paymentStatus === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="animate-spin w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full mx-auto"></div>
              <h2 className="text-xl font-semibold">Verifying Payment...</h2>
              <p className="text-gray-600">{statusMessage}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (paymentStatus === "pending") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-amber-600">
              <Clock className="w-6 h-6" />
              <span>Payment Processing</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>{statusMessage}</AlertDescription>
            </Alert>

            {orderInfo?.id && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                <p>
                  <span className="font-medium">Order ID:</span> {orderInfo.id}
                </p>
                <p>
                  <span className="font-medium">Payment Method:</span>{" "}
                  {orderInfo.paymentMethod}
                </p>
                {orderInfo.paymentId && (
                  <p>
                    <span className="font-medium">Payment ID:</span>{" "}
                    {orderInfo.paymentId}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-3">
              <Button
                onClick={() => window.location.reload()}
                className="w-full"
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                Check Again
              </Button>

              <Button variant="outline" asChild className="w-full">
                <a href="/my-orders">
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  View My Orders
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (paymentStatus === "failed") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-600">
              <AlertTriangle className="w-6 h-6" />
              <span>Payment Failed</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {statusMessage ||
                  "Your payment could not be processed. This could be due to insufficient funds, network issues, or payment cancellation."}
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <Button asChild className="w-full">
                <a href="/checkout">
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Try Again
                </a>
              </Button>

              <Button variant="outline" asChild className="w-full">
                <a href="/cart">
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  Back to Cart
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-green-600">
            <CheckCircle className="w-6 h-6" />
            <span>Payment Successful!</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              {statusMessage ||
                "Your payment has been processed successfully. You will receive an email confirmation shortly with your order details."}
            </AlertDescription>
          </Alert>

          {/* {orderInfo && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <h3 className="font-semibold text-gray-800">Order Information</h3>
              {orderInfo.id && (
                <p className="text-sm">
                  <span className="font-medium">Order ID:</span> {orderInfo.id}
                </p>
              )}
              <p className="text-sm">
                <span className="font-medium">Payment Method:</span> {orderInfo.paymentMethod}
              </p>
              {orderInfo.paymentId && (
                <p className="text-sm">
                  <span className="font-medium">Payment ID:</span> {orderInfo.paymentId}
                </p>
              )}
              {orderInfo.backendStatus && (
                <p className="text-sm">
                  <span className="font-medium">Backend Status:</span> {orderInfo.backendStatus}
                </p>
              )}
            </div>
          )} */}

          <div className="space-y-3">
            {orderInfo?.id && orderInfo?.orderType === "EVENT" ? (
              // For event orders, show View Tickets button
              <Button
                asChild
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <a href="/my-tickets">
                  <Ticket className="w-4 h-4 mr-2" />
                  View My Tickets
                </a>
              </Button>
            ) : orderInfo?.id ? (
              // For product orders, show Track Order button
              <Button
                asChild
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <a href={`/track/${orderInfo.orderNumber || orderInfo.id}`}>
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  Track Your Order
                </a>
              </Button>
            ) : null}

            <Button variant="outline" asChild className="w-full">
              <a href={orderInfo?.orderType === "EVENT" ? "/events" : "/shop"}>
                <Home className="w-4 h-4 mr-2" />
                {orderInfo?.orderType === "EVENT"
                  ? "Browse More Events"
                  : "Continue Shopping"}
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
