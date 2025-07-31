import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Package, Truck, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ProtectedRoute from "@/components/protected-route";
import { formatDualCurrency } from "@/lib/currency";

function TrackContent() {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [searchedOrder, setSearchedOrder] = useState<string | null>(null);

  const { data: orderData, isLoading, error } = useQuery({
    queryKey: ["/api/orders", searchedOrder],
    enabled: !!searchedOrder,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackingNumber.trim()) {
      setSearchedOrder(trackingNumber.trim());
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="text-yellow-500" size={24} />;
      case "processing":
        return <Package className="text-blue-500" size={24} />;
      case "shipped":
        return <Truck className="text-orange-500" size={24} />;
      case "delivered":
        return <CheckCircle className="text-green-500" size={24} />;
      default:
        return <Clock className="text-gray-400" size={24} />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Order Received";
      case "processing":
        return "Preparing Your Gift";
      case "shipped":
        return "On the Way";
      case "delivered":
        return "Delivered";
      default:
        return "Unknown Status";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="font-display text-4xl font-bold text-charcoal mb-4">
            Track Your Order
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Enter your order number or tracking ID to see the latest status of your gift delivery.
          </p>
        </div>

        {/* Search Form */}
        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-charcoal">Find Your Order</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="flex gap-4">
              <Input
                type="text"
                placeholder="Enter order number or tracking ID"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                className="flex-1 h-12 text-lg"
              />
              <Button 
                type="submit" 
                disabled={isLoading}
                className="bg-ethiopian-gold hover:bg-amber text-white h-12 px-8"
              >
                <Search size={18} className="mr-2" />
                {isLoading ? "Searching..." : "Track"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Order Results */}
        {error && (
          <Card className="mb-8 border-red-200">
            <CardContent className="p-6 text-center">
              <div className="text-red-500 mb-4">
                <Package size={48} className="mx-auto" />
              </div>
              <h3 className="text-xl font-semibold text-red-700 mb-2">Order Not Found</h3>
              <p className="text-red-600">
                We couldn't find an order with that tracking number. Please check the number and try again.
              </p>
            </CardContent>
          </Card>
        )}

        {orderData && (
          <div className="space-y-6">
            {/* Order Summary */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl text-charcoal flex items-center justify-between">
                  Order #{orderData.id}
                  <span className="text-lg font-normal text-gray-600">
                    {new Date(orderData.createdAt).toLocaleDateString()}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h4 className="font-semibold text-charcoal mb-2">Delivery Address</h4>
                    <p className="text-gray-600">
                      {orderData.shippingAddress?.street}<br/>
                      {orderData.shippingAddress?.city}, {orderData.shippingAddress?.region}<br/>
                      {orderData.shippingAddress?.country}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-charcoal mb-2">Order Total</h4>
                    <p className="text-2xl font-bold text-ethiopian-gold">
                      {formatDualCurrency(orderData.total).etb}
                    </p>
                    <p className="text-gray-600">
                      {formatDualCurrency(orderData.total).usd}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-charcoal mb-2">Estimated Delivery</h4>
                    <p className="text-gray-600">
                      {orderData.estimatedDelivery 
                        ? new Date(orderData.estimatedDelivery).toLocaleDateString()
                        : "3-7 business days"
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Status Timeline */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl text-charcoal">Order Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                    {getStatusIcon(orderData.status)}
                    <div>
                      <h3 className="text-xl font-semibold text-charcoal">
                        {getStatusText(orderData.status)}
                      </h3>
                      <p className="text-gray-600">
                        Last updated: {new Date(orderData.updatedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Status Timeline */}
                  <div className="space-y-4">
                    {[
                      { status: "pending", label: "Order Received", time: orderData.createdAt },
                      { status: "processing", label: "Preparing Your Gift", time: orderData.processingAt },
                      { status: "shipped", label: "On the Way", time: orderData.shippedAt },
                      { status: "delivered", label: "Delivered", time: orderData.deliveredAt },
                    ].map((step, index) => {
                      const isCompleted = orderData.status === step.status || 
                        (step.status === "pending" && ["processing", "shipped", "delivered"].includes(orderData.status)) ||
                        (step.status === "processing" && ["shipped", "delivered"].includes(orderData.status)) ||
                        (step.status === "shipped" && orderData.status === "delivered");
                      
                      return (
                        <div key={step.status} className="flex items-center space-x-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            isCompleted ? "bg-ethiopian-gold text-white" : "bg-gray-200 text-gray-400"
                          }`}>
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <h4 className={`font-medium ${isCompleted ? "text-charcoal" : "text-gray-400"}`}>
                              {step.label}
                            </h4>
                            {step.time && (
                              <p className="text-sm text-gray-500">
                                {new Date(step.time).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Items */}
            {orderData.items && orderData.items.length > 0 && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl text-charcoal">Order Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {orderData.items.map((item: any, index: number) => (
                      <div key={index} className="flex items-center space-x-4 p-4 border rounded-lg">
                        <div className="w-16 h-16 bg-gray-200 rounded-lg flex-shrink-0"></div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-charcoal">{item.product?.name}</h4>
                          <p className="text-gray-600">Quantity: {item.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-ethiopian-gold">
                            {formatDualCurrency(item.price).etb}
                          </p>
                          <p className="text-sm text-gray-600">
                            {formatDualCurrency(item.price).usd}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Help Section */}
        <Card className="mt-8">
          <CardContent className="p-6 text-center">
            <h3 className="text-xl font-semibold text-charcoal mb-4">Need Help?</h3>
            <p className="text-gray-600 mb-4">
              Can't find your order or have questions about delivery? We're here to help.
            </p>
            <Button variant="outline" className="mr-4">
              Contact Support
            </Button>
            <Button className="bg-ethiopian-gold hover:bg-amber text-white">
              Chat with Us
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default function Track() {
  return (
    <ProtectedRoute>
      <TrackContent />
    </ProtectedRoute>
  );
}