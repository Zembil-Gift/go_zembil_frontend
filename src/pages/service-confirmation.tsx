import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  CheckCircle,
  Calendar,
  Clock,
  MapPin,
  User,
  Mail,
  Phone,
  Gift,
  Shield,
  AlertCircle,
  ArrowRight,
  Loader2,
  Copy
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

import { serviceOrderService } from '@/services/serviceOrderService';
import { serviceService } from '@/services/serviceService';

export default function ServiceConfirmation() {
  const { orderId } = useParams<{ orderId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Can also get order by order number from query params
  const orderNumber = searchParams.get('orderNumber');

  // Fetch order details
  const { data: order, isLoading, error } = useQuery({
    queryKey: ['service-order', orderId, orderNumber],
    queryFn: async () => {
      if (orderId) {
        return serviceOrderService.getOrder(Number(orderId));
      } else if (orderNumber) {
        return serviceOrderService.getOrderByNumber(orderNumber);
      }
      throw new Error('No order ID or order number provided');
    },
    enabled: !!orderId || !!orderNumber,
  });

  // Copy order number to clipboard
  const copyOrderNumber = () => {
    if (order?.orderNumber) {
      navigator.clipboard.writeText(order.orderNumber);
      toast({
        title: 'Copied!',
        description: 'Order number copied to clipboard',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-eagle-green mx-auto mb-4" />
          <p className="font-light text-eagle-green">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-eagle-green mb-2">Order Not Found</h2>
          <p className="font-light text-eagle-green/70 mb-4">
            We couldn't find the order you're looking for.
          </p>
          <Button 
            onClick={() => navigate('/my-service-orders')} 
            className="bg-eagle-green hover:bg-viridian-green text-white"
          >
            View My Orders
          </Button>
        </div>
      </div>
    );
  }

  const statusDisplay = serviceOrderService.getStatusDisplay(order.status);
  const paymentStatusDisplay = serviceOrderService.getPaymentStatusDisplay(order.paymentStatus);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Success Header */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center mb-8"
        >
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-eagle-green mb-2">
            Booking Confirmed!
          </h1>
          <p className="font-light text-eagle-green/70">
            Your service has been booked successfully
          </p>
        </motion.div>

        {/* Order Number */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-light text-eagle-green/70">Order Number</p>
                  <p className="text-xl font-bold text-eagle-green">{order.orderNumber}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyOrderNumber}
                  className="border-eagle-green/30"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
              <div className="flex gap-2 mt-4">
                <Badge className={`${statusDisplay.bgColor} ${statusDisplay.color} border-none`}>
                  {statusDisplay.text}
                </Badge>
                <Badge className={`${paymentStatusDisplay.bgColor} ${paymentStatusDisplay.color} border-none`}>
                  {paymentStatusDisplay.text}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Booking Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="font-bold text-eagle-green">Booking Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Service Info */}
              {order.service && (
                <div className="flex gap-4">
                  {serviceService.getPrimaryImageUrl(order.service) ? (
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
                    <h3 className="font-bold text-eagle-green text-lg">{order.service.title}</h3>
                    {order.vendorName && (
                      <p className="text-sm font-light text-eagle-green/70">
                        by {order.vendorName}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <Separator />

              {/* Date & Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-june-bud/20 rounded-lg flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-viridian-green" />
                  </div>
                  <div>
                    <p className="text-sm font-light text-eagle-green/70">Date</p>
                    <p className="font-bold text-eagle-green">
                      {serviceOrderService.formatDate(order.scheduledDateTime)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-june-bud/20 rounded-lg flex items-center justify-center">
                    <Clock className="h-5 w-5 text-viridian-green" />
                  </div>
                  <div>
                    <p className="text-sm font-light text-eagle-green/70">Time</p>
                    <p className="font-bold text-eagle-green">
                      {serviceOrderService.formatTime(order.scheduledDateTime)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Location */}
              {order.service?.city && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-june-bud/20 rounded-lg flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-viridian-green" />
                  </div>
                  <div>
                    <p className="text-sm font-light text-eagle-green/70">Location</p>
                    <p className="font-bold text-eagle-green">
                      {order.service.city}{order.service.location ? `, ${order.service.location}` : ''}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Contact & Recipient Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="font-bold text-eagle-green">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {order.contactEmail && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-viridian-green" />
                    <span className="font-light text-eagle-green">{order.contactEmail}</span>
                  </div>
                )}
                {order.contactPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-viridian-green" />
                    <span className="font-light text-eagle-green">{order.contactPhone}</span>
                  </div>
                )}
              </div>

              {/* Recipient Info */}
              {(order.recipientName || order.recipientEmail) && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-bold text-eagle-green mb-2 flex items-center gap-2">
                      <Gift className="h-4 w-4" />
                      Gift Recipient
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      {order.recipientName && (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-eagle-green/50" />
                          <span className="font-light text-eagle-green">{order.recipientName}</span>
                        </div>
                      )}
                      {order.recipientEmail && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-eagle-green/50" />
                          <span className="font-light text-eagle-green">{order.recipientEmail}</span>
                        </div>
                      )}
                      {order.recipientPhone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-eagle-green/50" />
                          <span className="font-light text-eagle-green">{order.recipientPhone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Gift Message */}
              {order.giftMessage && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-bold text-eagle-green mb-2">Gift Message</p>
                    <p className="font-light text-eagle-green/80 italic">"{order.giftMessage}"</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Payment Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="font-bold text-eagle-green">Payment Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="font-light text-eagle-green/70">Subtotal</span>
                <span className="font-bold text-eagle-green">
                  {serviceOrderService.formatPrice(order.subtotalMinor, order.currency)}
                </span>
              </div>
              {order.discountMinor && order.discountMinor > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="font-light text-eagle-green/70">Discount</span>
                  <span className="font-bold text-green-600">
                    -{serviceOrderService.formatPrice(order.discountMinor, order.currency)}
                  </span>
                </div>
              )}
              {order.vatAmountMinor && order.vatAmountMinor > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="font-light text-eagle-green/70">VAT</span>
                  <span className="font-bold text-eagle-green">
                    {serviceOrderService.formatPrice(order.vatAmountMinor, order.currency)}
                  </span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between">
                <span className="font-bold text-eagle-green">Total Paid</span>
                <span className="font-bold text-eagle-green text-xl">
                  {serviceOrderService.formatPrice(order.totalAmountMinor, order.currency)}
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Cancellation Policy */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="font-bold text-eagle-green flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Cancellation & Refund Policy
              </CardTitle>
            </CardHeader>
            <CardContent>
              {order.refundEligibility && (
                <div className="mb-4 p-3 bg-june-bud/10 rounded-lg">
                  <p className="text-sm font-bold text-eagle-green mb-1">
                    Current Refund Eligibility
                  </p>
                  <p className="text-sm font-light text-eagle-green/70">
                    {order.refundEligibility.reason}
                  </p>
                  {order.refundEligibility.canCancel && order.refundEligibility.estimatedRefundMinor && (
                    <p className="text-sm font-bold text-viridian-green mt-1">
                      Estimated refund: {serviceOrderService.formatPrice(order.refundEligibility.estimatedRefundMinor, order.currency)}
                    </p>
                  )}
                </div>
              )}
              <ul className="space-y-2 text-sm font-light text-eagle-green/70">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>48+ hours before service: 100% refund (minus platform fee)</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <span>24-48 hours before service: 50% refund</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <span>Less than 24 hours before service: No refund</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <Button 
            onClick={() => navigate('/my-service-orders')}
            className="flex-1 bg-eagle-green hover:bg-viridian-green text-white font-bold h-12"
          >
            View My Bookings
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          <Button 
            variant="outline"
            onClick={() => navigate('/services')}
            className="flex-1 border-eagle-green text-eagle-green hover:bg-eagle-green hover:text-white font-bold h-12"
          >
            Browse More Services
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
