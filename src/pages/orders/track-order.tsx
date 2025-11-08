import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Package, 
  Truck, 
  MapPin, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Phone,
  MessageCircle 
} from "lucide-react";
import { Link } from "react-router-dom";

export default function TrackOrder() {
  const params = useParams();
  const orderId = params.orderId;

  const { data: order, isLoading, error } = useQuery({
    queryKey: ["/api/orders", orderId],
    enabled: !!orderId,
    retry: false,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="text-amber-500" size={20} />;
      case "confirmed": return <CheckCircle className="text-blue-500" size={20} />;
      case "processing": return <Package className="text-purple-500" size={20} />;
      case "shipped": return <Truck className="text-orange-500" size={20} />;
      case "delivered": return <CheckCircle className="text-green-500" size={20} />;
      case "cancelled": return <AlertCircle className="text-red-500" size={20} />;
      default: return <Clock className="text-gray-500" size={20} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-amber-100 text-amber-800";
      case "confirmed": return "bg-blue-100 text-blue-800";
      case "processing": return "bg-purple-100 text-purple-800";
      case "shipped": return "bg-orange-100 text-orange-800";
      case "delivered": return "bg-green-100 text-green-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusSteps = () => {
    const allSteps = [
      { key: "pending", label: "Order Placed", description: "Your order has been received" },
      { key: "confirmed", label: "Confirmed", description: "Order confirmed and being prepared" },
      { key: "processing", label: "Processing", description: "Your items are being prepared" },
      { key: "shipped", label: "Shipped", description: "Order is on its way" },
      { key: "delivered", label: "Delivered", description: "Order has been delivered" },
    ];

    const statusOrder = ["pending", "confirmed", "processing", "shipped", "delivered"];
    const currentIndex = statusOrder.indexOf(order?.status || "pending");
    
    return allSteps.map((step, index) => ({
      ...step,
      isCompleted: index <= currentIndex,
      isCurrent: index === currentIndex,
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-48 bg-gray-200 rounded"></div>
          </div>
        </div>
        
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50">
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-16">
            <AlertCircle size={64} className="text-gray-400 mx-auto mb-6" />
            <h2 className="font-display text-2xl font-bold text-charcoal mb-4">
              Order Not Found
            </h2>
            <p className="text-gray-600 mb-8">
              We couldn't find an order with that tracking number.
            </p>
            <div className="space-y-4">
              <Button asChild className="bg-ethiopian-gold hover:bg-amber text-white">
                <Link href="/orders">View My Orders</Link>
              </Button>
              <br />
              <Button asChild variant="outline">
                <Link href="/gifts">Continue Shopping</Link>
              </Button>
            </div>
          </div>
        </div>
        
      </div>
    );
  }

  const statusSteps = getStatusSteps();

  return (
    <div className="min-h-screen bg-gray-50">
      

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-charcoal mb-2">
            Track Your Order
          </h1>
          <p className="text-gray-600">
            Order ID: {order.id}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Tracking Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  {getStatusIcon(order.status)}
                  <span>Order Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <Badge className={getStatusColor(order.status)}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </Badge>
                  {order.trackingNumber && (
                    <div className="text-sm text-gray-600">
                      Tracking: {order.trackingNumber}
                    </div>
                  )}
                </div>
                
                {order.deliveryDate && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Clock size={16} />
                    <span>
                      Expected delivery: {new Date(order.deliveryDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Progress Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Order Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {statusSteps.map((step, index) => (
                    <div key={step.key} className="flex items-start space-x-4">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        step.isCompleted 
                          ? "bg-ethiopian-gold text-white" 
                          : step.isCurrent
                          ? "bg-ethiopian-gold/20 text-ethiopian-gold border-2 border-ethiopian-gold"
                          : "bg-gray-200 text-gray-400"
                      }`}>
                        {step.isCompleted ? (
                          <CheckCircle size={16} />
                        ) : (
                          <div className="w-2 h-2 bg-current rounded-full"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className={`font-medium ${
                          step.isCompleted || step.isCurrent ? "text-charcoal" : "text-gray-500"
                        }`}>
                          {step.label}
                        </h4>
                        <p className="text-sm text-gray-600">{step.description}</p>
                        {step.isCurrent && (
                          <p className="text-xs text-ethiopian-gold mt-1">Current status</p>
                        )}
                      </div>
                      {index < statusSteps.length - 1 && (
                        <div className={`absolute left-4 mt-8 w-0.5 h-6 ${
                          step.isCompleted ? "bg-ethiopian-gold" : "bg-gray-200"
                        }`} style={{ marginTop: '2rem' }}></div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Delivery Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MapPin className="text-ethiopian-gold" size={20} />
                  <span>Delivery Address</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-medium">{order.recipientName}</p>
                  <p className="text-gray-600">{order.recipientAddress}</p>
                  <p className="text-gray-600">{order.recipientCity}</p>
                  <p className="text-gray-600">{order.recipientPhone}</p>
                </div>
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle>Order Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.items?.map((item: any) => (
                    <div key={item.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                      <div className="w-16 h-16 flex-shrink-0">
                        <img
                          src={item.product?.images?.[0] || "https://images.unsplash.com/photo-1447933601403-0c6688de566e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"}
                          alt={item.product?.name || "Product"}
                          className="w-full h-full object-cover rounded"
                        />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{item.product?.name || "Product"}</h4>
                        <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{item.price} ETB</p>
                      </div>
                    </div>
                  )) || (
                    <p className="text-gray-500">Order items not available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{order.subtotal} ETB</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery</span>
                    <span>{order.deliveryFee} ETB</span>
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span className="text-ethiopian-gold">{order.total} ETB</span>
                </div>

                <div className="pt-4 space-y-2">
                  <div className="text-sm">
                    <span className="font-medium">Delivery Type:</span>
                    <span className="ml-2 capitalize">{order.deliveryType}</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Payment:</span>
                    <span className="ml-2 capitalize">{order.paymentMethod}</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Order Date:</span>
                    <span className="ml-2">{new Date(order.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Personal Message */}
            {order.personalMessage && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MessageCircle className="text-ethiopian-gold" size={20} />
                    <span>Personal Message</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 italic">"{order.personalMessage}"</p>
                </CardContent>
              </Card>
            )}

            {/* Contact Support */}
            <Card>
              <CardHeader>
                <CardTitle>Need Help?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">
                  Have questions about your order? Contact our support team.
                </p>
                
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    <Phone size={16} className="mr-2" />
                    Call Support
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <MessageCircle size={16} className="mr-2" />
                    Live Chat
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Related Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button asChild variant="outline" className="w-full">
                  <Link href="/orders">View All Orders</Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/gifts">Shop Again</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      
    </div>
  );
}
