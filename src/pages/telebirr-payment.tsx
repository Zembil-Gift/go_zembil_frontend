import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
  ExternalLink,
  Phone,
  Wallet,
  Clock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { paymentService } from "@/services/paymentService";
import { apiService } from "@/services/apiService";
import { eventOrderService } from "@/services/eventOrderService";

export default function TelebirrPaymentPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const orderId = searchParams.get("orderId");
  const orderType = searchParams.get("orderType"); // 'event', 'service', 'custom', or null (product)

  const [isInitializing, setIsInitializing] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string>("");
  interface CurrencyConversionDto {
    amount: number;
    fromCurrency: string;
    toCurrency: string;
    convertedAmount: number;
    rate: number;
    rateTimestamp?: string;
  }

  const [paymentData, setPaymentData] = useState<{
    amount: number;
    currency: string;
    orderId: number;
    merchOrderId: string;
  } | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!orderId) {
      setError("No order ID provided");
      setIsInitializing(false);
      return;
    }

    initializePayment(parseInt(orderId), orderType);
  }, [orderId, orderType]);

  const initializePayment = async (
    orderIdNum: number,
    type?: string | null
  ) => {
    try {
      setIsInitializing(true);
      setError("");

      console.log(
        "🔄 Initializing TeleBirr payment for order:",
        orderIdNum,
        "type:",
        type
      );

      let orderDetails: any;
      let response: any;

      // Use appropriate service based on order type
      if (type === "event") {
        orderDetails = await eventOrderService.getOrder(orderIdNum);
        response = await eventOrderService.initializePayment(
          orderIdNum,
          "TELEBIRR"
        );
      } else if (type === "service") {
        orderDetails = await apiService.getRequest<any>(
          `/api/service-orders/${orderIdNum}`
        );
        response = await apiService.postRequest<any>(
          `/api/service-orders/${orderIdNum}/payments/initialize?provider=TELEBIRR`,
          {}
        );
      } else if (type === "custom") {
        orderDetails = await apiService.getRequest<any>(
          `/api/custom-orders/${orderIdNum}`
        );
        response = await apiService.postRequest<any>(
          `/api/custom-orders/${orderIdNum}/payments/initialize?provider=TELEBIRR`,
          {}
        );
      } else {
        // Product order
        orderDetails = await apiService.getRequest<any>(
          `/api/orders/${orderIdNum}`
        );
        response = await paymentService.initializePayment(
          orderIdNum,
          "TELEBIRR"
        );
      }

      // Extract amount from order details (in minor units or regular units depending on order type)
      const orderAmountMinor =
        type === "event"
          ? orderDetails?.totalAmountMinor || 0
          : type === "service"
          ? orderDetails?.totalAmountMinor || 0
          : type === "custom"
          ? orderDetails?.totalMinor ||
            orderDetails?.finalPriceMinor ||
            orderDetails?.basePriceMinor ||
            0
          : orderDetails?.totals?.totalMinor || 0;

      const orderCurrency =
        orderDetails?.currency || orderDetails?.currencyCode || "ETB";

      let displayAmountMinor = orderAmountMinor;
      let displayCurrency = orderCurrency;

      if (orderCurrency.toUpperCase() !== "ETB") {
        try {
          const conversion = await apiService.getRequest<CurrencyConversionDto>(
            `/api/currencies/convert?amount=${encodeURIComponent(
              orderAmountMinor / 100
            )}&from=${encodeURIComponent(orderCurrency)}&to=ETB`
          );
          displayAmountMinor = Math.round(conversion.convertedAmount * 100);
          displayCurrency = "ETB";
        } catch (conversionError) {
          console.warn(
            "Failed to convert to ETB for TeleBirr display:",
            conversionError
          );
        }
      }

      console.log("TeleBirr initialization response:", response);

      if (!response.checkoutUrl) {
        throw new Error("No checkout URL received from server");
      }

      setCheckoutUrl(response.checkoutUrl);
      setPaymentData({
        amount: displayAmountMinor,
        currency: displayCurrency,
        orderId: orderIdNum,
        merchOrderId: response.paymentId || "",
      });

      toast({
        title: "Payment Ready",
        description: "Click the button below to proceed to TeleBirr payment.",
      });
    } catch (err: any) {
      console.error("❌ TeleBirr payment initialization failed:", err);
      const errorMsg = err.message || "Failed to initialize payment";
      setError(errorMsg);

      toast({
        title: "Initialization Failed",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsInitializing(false);
    }
  };

  const handleProceedToTelebirr = () => {
    if (!checkoutUrl) return;

    setIsRedirecting(true);
    toast({
      title: "Redirecting to TeleBirr",
      description: "You will be redirected to complete your payment.",
    });

    // Store order info for return
    if (orderId) {
      localStorage.setItem("goGerami_currentOrderId", orderId);
      localStorage.setItem("goGerami_currentOrderType", orderType || "product");
      localStorage.setItem("goGerami_paymentProvider", "TELEBIRR");
    }

    // Small delay for user to see the message
    setTimeout(() => {
      window.location.href = checkoutUrl;
    }, 1000);
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const formatAmount = (amountMinor: number, currency: string) => {
    const amount = amountMinor / 100;
    return new Intl.NumberFormat("en-ET", {
      style: "currency",
      currency: currency || "ETB",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Loading state
  if (isInitializing) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-16">
        <Card className="border-green-200">
          <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="relative">
              <Loader2 className="h-12 w-12 animate-spin text-green-600" />
              <Phone className="h-5 w-5 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-green-700" />
            </div>
            <p className="text-lg font-medium">
              Initializing TeleBirr payment...
            </p>
            <p className="text-sm text-gray-500">
              Please wait while we prepare your payment
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error || !orderId || !checkoutUrl || !paymentData) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-16">
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center text-red-600">
              <AlertCircle className="mr-2 h-6 w-6" />
              Payment Initialization Failed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>
                {error ||
                  "Unable to initialize TeleBirr payment. Please try again."}
              </AlertDescription>
            </Alert>
            <div className="flex gap-4">
              <Button
                onClick={handleGoBack}
                variant="outline"
                className="flex-1"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
              </Button>
              <Button
                onClick={() =>
                  orderId && initializePayment(parseInt(orderId), orderType)
                }
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Ready state
  return (
    <div className="container max-w-2xl mx-auto px-4 py-8">
      <Button onClick={handleGoBack} variant="ghost" className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <Card className="border-green-200 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white p-2 rounded-full">
                <Phone className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-xl">TeleBirr Payment</CardTitle>
                <CardDescription className="text-green-100">
                  Ethio Telecom Mobile Money
                </CardDescription>
              </div>
            </div>
            <Badge className="bg-white text-green-700 hover:bg-green-50">
              Secure
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {/* Payment Summary */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-gray-700 flex items-center">
              <Wallet className="mr-2 h-4 w-4" />
              Payment Summary
            </h3>
            <Separator />
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Order ID:</span>
                <span className="font-medium">#{paymentData.orderId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Order Type:</span>
                <span className="font-medium capitalize">
                  {orderType || "Product"}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between items-center text-lg">
                <span className="font-semibold">Total Amount:</span>
                <span className="font-bold text-green-600">
                  {formatAmount(paymentData.amount, paymentData.currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-700">
              Accepted Payment Methods
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">TeleBirr Wallet</span>
              </div>
              <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Bank Account</span>
              </div>
              <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Mobile Balance</span>
              </div>
              <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Debit Card</span>
              </div>
            </div>
          </div>

          {/* Timeout Notice */}
          <div className="flex items-center space-x-2 text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
            <Clock className="h-4 w-4" />
            <span>
              Payment link expires in 2 hours. Please complete your payment
              promptly.
            </span>
          </div>

          {/* Redirecting State */}
          {isRedirecting && (
            <Alert className="bg-green-50 border-green-200">
              <Loader2 className="h-4 w-4 animate-spin text-green-600" />
              <AlertDescription className="text-green-700 ml-2">
                Redirecting to TeleBirr checkout page...
              </AlertDescription>
            </Alert>
          )}
        </CardContent>

        <CardFooter className="flex flex-col space-y-4 pt-4">
          <Button
            onClick={handleProceedToTelebirr}
            disabled={isRedirecting}
            className="w-full h-12 text-lg bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
            size="lg"
          >
            {isRedirecting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Redirecting...
              </>
            ) : (
              <>
                <ExternalLink className="mr-2 h-5 w-5" />
                Pay with TeleBirr -{" "}
                {formatAmount(paymentData.amount, paymentData.currency)}
              </>
            )}
          </Button>

          <p className="text-xs text-center text-gray-500">
            By clicking "Pay with TeleBirr", you will be redirected to
            TeleBirr's secure payment page. After completing the payment, you
            will be redirected back to our site.
          </p>
        </CardFooter>
      </Card>

      {/* Help Section */}
      <Card className="mt-6 border-gray-200">
        <CardContent className="pt-4">
          <h4 className="font-medium text-gray-700 mb-3">Need Help?</h4>
          <div className="space-y-2 text-sm text-gray-600">
            <p>
              • Make sure you have sufficient balance in your TeleBirr wallet
            </p>
            <p>• Your TeleBirr account must be active and verified</p>
            <p>• For payment issues, contact TeleBirr support at *127#</p>
            <p>• For order issues, contact our support team</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
