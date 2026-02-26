import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  ShoppingCart, 
  ArrowLeft, 
  CreditCard, 
  Smartphone, 
  Loader2, 
  CheckCircle,
  MapPin,
  Phone,
  Mail,
  Gift,
  Tag,
  Truck,
  FileText
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/currency";
import { orderService } from "@/services/orderService";

interface OrderTotals {
  subtotalMinor: number;
  giftWrapMinor?: number;
  netSubtotalMinor?: number;
  vatAmountMinor?: number;
  salesTaxMinor?: number;
  discountMinor: number;
  shippingMinor: number;
  platformFeeMinor?: number;
  totalMinor: number;
  vatRate?: number;
  salesTaxRate?: number;
  vatApplied?: boolean;
  salesTaxApplied?: boolean;
  taxScenario?: string;
}

interface OrderLine {
  productId: number;
  skuId?: number;
  productName: string;
  skuCode?: string;
  quantity: number;
  currency: string;
  unitAmountMinor: number;
  giftWrapping?: boolean;
  giftMessage?: string;
}

interface AddressInfo {
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  contactName?: string;
  contactPhone?: string;
  email?: string;
}

interface OrderDetails {
  orderId: number;
  orderNumber: string;
  status: string;
  currency: string;
  totals: OrderTotals;
  lines: OrderLine[];
  createdAt: string;
  giftWrap?: boolean;
  cardMessage?: string;
  shippingAddress?: AddressInfo;
  billingAddress?: AddressInfo;
  contactEmail?: string;
  contactPhone?: string;
}

export default function OrderReview() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  const orderId = searchParams.get("orderId");
  const paymentMethod = searchParams.get("paymentMethod") || "stripe";

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/signin?redirect=/order-review');
      return;
    }

    if (!orderId) {
      toast({
        title: "Error",
        description: "No order ID provided",
        variant: "destructive",
      });
      navigate('/cart');
      return;
    }

    fetchOrderDetails();
  }, [orderId, isAuthenticated]);

  const fetchOrderDetails = async () => {
    try {
      setIsLoading(true);
      const orderData = await orderService.getOrderDetails(Number(orderId));
      
      const mappedOrder: OrderDetails = {
        orderId: (orderData as any).orderId || orderData.orderNumber,
        orderNumber: (orderData as any).orderNumber || orderData.orderNumber,
        status: (orderData as any).status || orderData.status,
        currency: (orderData as any).currency || orderData.currency || 'USD',
        totals: (orderData as any).totals || {
          subtotalMinor: (orderData.subtotal || 0) * 100,
          discountMinor: (orderData.discount || 0) * 100,
          shippingMinor: (orderData.shippingCost || 0) * 100,
          totalMinor: (orderData.totalAmount || 0) * 100,
        },
        lines: (orderData as any).lines || orderData.items?.map((item: any) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          currency: orderData.currency || 'USD',
          unitAmountMinor: (item.unitPrice || 0) * 100,
        })) || [],
        createdAt: (orderData as any).createdAt || orderData.createdAt,
        giftWrap: (orderData as any).giftWrap,
        cardMessage: (orderData as any).cardMessage,
        shippingAddress: orderData.shippingAddress ? {
          street: orderData.shippingAddress.addressLine1,
          city: orderData.shippingAddress.city,
          state: orderData.shippingAddress.state,
          country: orderData.shippingAddress.country,
          postalCode: orderData.shippingAddress.postalCode,
          contactName: orderData.shippingAddress.fullName,
          contactPhone: orderData.shippingAddress.phone,
          email: orderData.shippingAddress.email,
        } : undefined,
        billingAddress: orderData.billingAddress ? {
          street: orderData.billingAddress.addressLine1,
          city: orderData.billingAddress.city,
          state: orderData.billingAddress.state,
          country: orderData.billingAddress.country,
          postalCode: orderData.billingAddress.postalCode,
          contactName: orderData.billingAddress.fullName,
          contactPhone: orderData.billingAddress.phone,
          email: orderData.billingAddress.email,
        } : undefined,
        contactEmail: (orderData as any).contactEmail || orderData.shippingAddress?.email,
        contactPhone: (orderData as any).contactPhone || orderData.shippingAddress?.phone,
      };

      setOrder(mappedOrder);
    } catch (error: any) {
      console.error('Failed to fetch order details:', error);
      toast({
        title: "Error",
        description: "Failed to load order details. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Convert minor units to major units (cents to dollars, etc.)
  const fromMinor = (minorAmount: number): number => {
    return minorAmount / 100;
  };

  const handleProceedToPayment = () => {
    if (!order) return;

    setIsProcessing(true);

    let paymentPath: string;
    if (paymentMethod === 'chapa') {
      paymentPath = `/payment/chapa?orderId=${order.orderId}`;
    } else if (paymentMethod === 'telebirr') {
      paymentPath = `/payment/telebirr?orderId=${order.orderId}`;
    } else {
      paymentPath = `/payment/stripe?orderId=${order.orderId}`;
    }
    
    navigate(paymentPath);
  };

  const handleBackToCheckout = () => {
    navigate('/checkout');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-ethiopian-gold mx-auto mb-4" />
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Order not found</p>
          <Button onClick={() => navigate('/cart')}>Back to Cart</Button>
        </div>
      </div>
    );
  }

  const currency = order.currency;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={handleBackToCheckout}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Checkout
          </Button>

          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Review Your Order</h1>
              <p className="text-gray-600 mt-1">
                Please review your order details before payment
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Order Items & Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex flex-col items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Order Items ({order.lines.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {order.lines.map((line, index) => (
                  <div key={index} className="flex justify-between items-start py-3 border-b last:border-0">
                    <div className="flex-1">
                      <h4 className="font-medium">{line.productName}</h4>
                      <p className="text-sm text-gray-500">
                        Qty: {line.quantity} × {formatPrice(fromMinor(line.unitAmountMinor), currency)}
                      </p>
                      {line.giftWrapping && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-green-600 font-medium">
                          <Gift className="h-3 w-3" />
                          <span>Gift wrapped</span>
                        </div>
                      )}
                      {line.giftMessage && (
                        <p className="mt-1 text-xs text-gray-500 italic">"{line.giftMessage}"</p>
                      )}
                    </div>
                    <p className="font-semibold">
                      {formatPrice(fromMinor(line.unitAmountMinor * line.quantity), currency)}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Shipping Address */}
            {order.shippingAddress && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Shipping Address
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {order.shippingAddress.contactName && (
                      <p className="font-medium">{order.shippingAddress.contactName}</p>
                    )}
                    <p>{order.shippingAddress.street}</p>
                    <p>
                      {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
                    </p>
                    <p>{order.shippingAddress.country}</p>
                    {order.contactPhone && (
                      <p className="flex items-center gap-2 text-gray-600">
                        <Phone className="h-4 w-4" />
                        {order.contactPhone}
                      </p>
                    )}
                    {order.contactEmail && (
                      <p className="flex items-center gap-2 text-gray-600">
                        <Mail className="h-4 w-4" />
                        {order.contactEmail}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Billing Address - Only show if different from shipping */}
            {order.billingAddress && order.shippingAddress && (
              order.billingAddress.street !== order.shippingAddress.street ||
              order.billingAddress.city !== order.shippingAddress.city ||
              order.billingAddress.country !== order.shippingAddress.country
            ) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Billing Address
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {order.billingAddress.contactName && (
                      <p className="font-medium">{order.billingAddress.contactName}</p>
                    )}
                    <p>{order.billingAddress.street}</p>
                    <p>
                      {order.billingAddress.city}, {order.billingAddress.state} {order.billingAddress.postalCode}
                    </p>
                    <p>{order.billingAddress.country}</p>
                    {order.billingAddress.contactPhone && (
                      <p className="flex items-center gap-2 text-gray-600">
                        <Phone className="h-4 w-4" />
                        {order.billingAddress.contactPhone}
                      </p>
                    )}
                    {order.billingAddress.email && (
                      <p className="flex items-center gap-2 text-gray-600">
                        <Mail className="h-4 w-4" />
                        {order.billingAddress.email}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Gift Options */}
            {(order.giftWrap || order.lines.some(l => l.giftWrapping)) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gift className="h-5 w-5" />
                    Gift Options
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {order.lines.some(l => l.giftWrapping) && (
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Gift wrapping selected for {order.lines.filter(l => l.giftWrapping).length} item(s)</span>
                    </div>
                  )}
                  {order.giftWrap && !order.lines.some(l => l.giftWrapping) && (
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Gift wrapping included</span>
                    </div>
                  )}
                  {order.cardMessage && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1 font-medium">Gift Message:</p>
                      <p className="text-sm text-gray-600 italic">"{order.cardMessage}"</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-2">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Subtotal */}
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span>{formatPrice(fromMinor(order.totals.subtotalMinor), currency)}</span>
                </div>

                {/* Gift Wrap Fee */}
                {order.totals.giftWrapMinor != null && order.totals.giftWrapMinor > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 flex items-center gap-1">
                      <Gift className="h-4 w-4" />
                      Gift Wrapping
                    </span>
                    <span>{formatPrice(fromMinor(order.totals.giftWrapMinor), currency)}</span>
                  </div>
                )}

                {/* US Sales Tax - For US domestic orders */}
                {order.totals.salesTaxApplied && order.totals.salesTaxMinor && order.totals.salesTaxMinor > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      Sales Tax ({((order.totals.salesTaxRate || 0) * 100).toFixed(2)}%)
                    </span>
                    <span>{formatPrice(fromMinor(order.totals.salesTaxMinor), currency)}</span>
                  </div>
                )}

                {/* Shipping */}
                <div className="flex justify-between">
                  <span className="text-gray-600 flex items-center gap-1">
                    <Truck className="h-4 w-4" />
                    Shipping
                  </span>
                  {order.totals.shippingMinor === 0 ? (
                    <span className="text-green-600">Free</span>
                  ) : (
                    <span>{formatPrice(fromMinor(order.totals.shippingMinor), currency)}</span>
                  )}
                </div>

                {/* Discount */}
                {order.totals.discountMinor > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span className="flex items-center gap-1">
                      <Tag className="h-4 w-4" />
                      Discount
                    </span>
                    <span>-{formatPrice(fromMinor(order.totals.discountMinor), currency)}</span>
                  </div>
                )}

                <Separator />

                {/* Total */}
                <div className="flex justify-between text-xl font-bold">
                  <span>Total</span>
                  <span className="text-ethiopian-gold">
                    {formatPrice(fromMinor(order.totals.totalMinor), currency)}
                  </span>
                </div>

                {/* Tax Scenario Info - for transparency */}
                {order.totals.taxScenario && (
                  <p className="text-xs text-gray-500 text-center">
                    {order.totals.taxScenario === 'DIASPORA_TO_ETHIOPIA' && 
                      'International purchase with delivery in Ethiopia'}
                    {order.totals.taxScenario === 'DOMESTIC_ETHIOPIA' && 
                      'Domestic Ethiopian order'}
                    {order.totals.taxScenario === 'US_DOMESTIC' && 
                      'US domestic order'}
                    {order.totals.taxScenario === 'FOREIGN_TO_US' && 
                      'International purchase with US delivery'}
                    {order.totals.taxScenario === 'ETHIOPIA_EXPORT' && 
                      'Export from Ethiopia (VAT zero-rated)'}
                    {order.totals.taxScenario === 'DIASPORA_EXPORT' && 
                      'Export order (no tax)'}
                  </p>
                )}

                {/* Payment Method Badge */}
                <div className="pt-2">
                  <Badge variant="outline" className="w-full justify-center py-2">
                    {paymentMethod === 'chapa' ? (
                      <span className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />
                        Pay with Chapa
                      </span>
                    ) : paymentMethod === 'telebirr' ? (
                      <span className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />
                        Pay with TeleBirr
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Pay with Stripe
                      </span>
                    )}
                  </Badge>
                </div>

                {/* Proceed to Payment Button */}
                <Button
                  onClick={handleProceedToPayment}
                  disabled={isProcessing}
                  className="w-full h-12 text-lg bg-ethiopian-gold hover:bg-amber text-white"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-5 w-5" />
                      Proceed to Payment
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
