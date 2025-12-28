import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Ticket, 
  Calendar, 
  MapPin, 
  ChevronRight,
  QrCode,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  Mail,
  RefreshCw
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

import { eventOrderService, EventOrderResponse, TicketResponse } from '@/services/eventOrderService';

export default function MyEventTickets() {
  const navigate = useNavigate();
  const [selectedOrder, setSelectedOrder] = useState<EventOrderResponse | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<TicketResponse | null>(null);

  // Fetch user's event orders
  const { data: ordersData, isLoading, refetch } = useQuery({
    queryKey: ['my-event-orders'],
    queryFn: () => eventOrderService.getMyOrders(0, 50),
  });

  const orders = ordersData?.content || [];

  // Filter orders by status
  const upcomingOrders = orders.filter((order: EventOrderResponse) => 
    order.status !== 'CANCELLED' && 
    order.paymentStatus === 'PAID' &&
    new Date(order.eventDate) > new Date()
  );

  const pastOrders = orders.filter((order: EventOrderResponse) => 
    order.paymentStatus === 'PAID' &&
    new Date(order.eventDate) <= new Date()
  );

  const pendingOrders = orders.filter((order: EventOrderResponse) => 
    order.paymentStatus === 'PENDING'
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
      case 'COMPLETED':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'CANCELLED':
        return 'bg-red-100 text-red-700 border-red-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'FAILED':
      case 'REFUNDED':
        return 'bg-red-100 text-red-700 border-red-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getTicketStatusIcon = (status: string) => {
    switch (status) {
      case 'ISSUED':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'CHECKED_IN':
        return <CheckCircle className="h-4 w-4 text-blue-600" />;
      case 'CANCELLED':
      case 'EXPIRED':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const OrderCard = ({ order }: { order: EventOrderResponse }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card 
        className="cursor-pointer hover:shadow-lg transition-all duration-300 border-eagle-green/10"
        onClick={() => setSelectedOrder(order)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge className={getPaymentStatusColor(order.paymentStatus)}>
                  {order.paymentStatus}
                </Badge>
                <Badge className={getStatusColor(order.status)}>
                  {order.status}
                </Badge>
              </div>
              
              <h3 className="font-bold text-eagle-green text-lg mb-1">
                {order.eventTitle}
              </h3>
              
              <div className="flex items-center gap-2 text-sm text-eagle-green/70 mb-1">
                <Calendar className="h-4 w-4" />
                <span className="font-light">{formatDate(order.eventDate)}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-eagle-green/70 mb-2">
                <MapPin className="h-4 w-4" />
                <span className="font-light">{order.eventLocation}</span>
              </div>

              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Ticket className="h-4 w-4 text-viridian-green" />
                  <span className="font-bold text-eagle-green">
                    {order.totalTicketCount} ticket{order.totalTicketCount !== 1 ? 's' : ''}
                  </span>
                </div>
                <span className="font-bold text-eagle-green">
                  {eventOrderService.formatCurrency(order.totalAmountMinor, order.currency)}
                </span>
              </div>
            </div>
            
            <ChevronRight className="h-5 w-5 text-eagle-green/50" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  const EmptyState = ({ message }: { message: string }) => (
    <div className="text-center py-12">
      <Ticket className="h-16 w-16 text-eagle-green/20 mx-auto mb-4" />
      <p className="font-light text-eagle-green/60">{message}</p>
      <Button 
        onClick={() => navigate('/events')}
        className="mt-4 bg-eagle-green hover:bg-viridian-green text-white"
      >
        Browse Events
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
                My Event Tickets
              </h1>
              <p className="font-light text-eagle-green/70">
                View and manage your event tickets
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
                  <Skeleton className="h-6 w-1/4 mb-2 bg-june-bud/20" />
                  <Skeleton className="h-4 w-3/4 mb-2 bg-june-bud/20" />
                  <Skeleton className="h-4 w-1/2 bg-june-bud/20" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Tabs defaultValue="upcoming" className="space-y-6">
            <TabsList className="bg-june-bud/10 p-1">
              <TabsTrigger 
                value="upcoming"
                className="font-bold data-[state=active]:bg-eagle-green data-[state=active]:text-white"
              >
                Upcoming ({upcomingOrders.length})
              </TabsTrigger>
              <TabsTrigger 
                value="past"
                className="font-bold data-[state=active]:bg-eagle-green data-[state=active]:text-white"
              >
                Past ({pastOrders.length})
              </TabsTrigger>
              {pendingOrders.length > 0 && (
                <TabsTrigger 
                  value="pending"
                  className="font-bold data-[state=active]:bg-eagle-green data-[state=active]:text-white"
                >
                  Pending ({pendingOrders.length})
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="upcoming" className="space-y-4">
              {upcomingOrders.length === 0 ? (
                <EmptyState message="No upcoming events. Browse events to get tickets!" />
              ) : (
                upcomingOrders.map((order: EventOrderResponse) => (
                  <OrderCard key={order.id} order={order} />
                ))
              )}
            </TabsContent>

            <TabsContent value="past" className="space-y-4">
              {pastOrders.length === 0 ? (
                <EmptyState message="No past events yet." />
              ) : (
                pastOrders.map((order: EventOrderResponse) => (
                  <OrderCard key={order.id} order={order} />
                ))
              )}
            </TabsContent>

            <TabsContent value="pending" className="space-y-4">
              {pendingOrders.length === 0 ? (
                <EmptyState message="No pending orders." />
              ) : (
                pendingOrders.map((order: EventOrderResponse) => (
                  <OrderCard key={order.id} order={order} />
                ))
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Order Detail Modal */}
        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
            {selectedOrder && (
              <>
                <DialogHeader>
                  <DialogTitle className="font-bold text-eagle-green">
                    Order #{selectedOrder.orderNumber}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                  {/* Event Info */}
                  <div className="bg-june-bud/10 rounded-lg p-4">
                    <h3 className="font-bold text-eagle-green text-lg mb-2">
                      {selectedOrder.eventTitle}
                    </h3>
                    <div className="space-y-1 text-sm text-eagle-green/70">
                      <p className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {formatDate(selectedOrder.eventDate)}
                      </p>
                      <p className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {selectedOrder.eventLocation}
                      </p>
                    </div>
                  </div>

                  {/* Order Status */}
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-sm font-light text-eagle-green/70">Payment</span>
                      <Badge className={`ml-2 ${getPaymentStatusColor(selectedOrder.paymentStatus)}`}>
                        {selectedOrder.paymentStatus}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-sm font-light text-eagle-green/70">Order</span>
                      <Badge className={`ml-2 ${getStatusColor(selectedOrder.status)}`}>
                        {selectedOrder.status}
                      </Badge>
                    </div>
                  </div>

                  <Separator />

                  {/* Tickets */}
                  <div>
                    <h4 className="font-bold text-eagle-green mb-4">
                      Tickets ({selectedOrder.tickets?.length || 0})
                    </h4>
                    <div className="space-y-3">
                      {selectedOrder.tickets?.map((ticket: TicketResponse) => (
                        <Card 
                          key={ticket.id} 
                          className="cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => setSelectedTicket(ticket)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  {getTicketStatusIcon(ticket.status)}
                                  <span className="font-bold text-eagle-green">
                                    {ticket.ticketTypeName}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {ticket.status}
                                  </Badge>
                                </div>
                                <p className="text-sm font-light text-eagle-green/70">
                                  {ticket.recipientName} • {ticket.recipientEmail}
                                </p>
                                <p className="text-xs font-light text-eagle-green/50 mt-1">
                                  Code: {ticket.ticketCode}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-eagle-green">
                                  {eventOrderService.formatCurrency(ticket.pricePaidMinor || ticket.pricePaid || 0, ticket.currency)}
                                </p>
                                {ticket.status === 'ISSUED' && (
                                  <QrCode className="h-5 w-5 text-viridian-green mt-1 ml-auto" />
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Order Summary */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-light text-eagle-green/70">Subtotal</span>
                      <span className="font-light text-eagle-green">
                        {eventOrderService.formatCurrency(selectedOrder.subtotalMinor, selectedOrder.currency)}
                      </span>
                    </div>
                    {selectedOrder.discountMinor > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="font-light text-eagle-green/70">Discount</span>
                        <span className="font-light text-green-600">
                          -{eventOrderService.formatCurrency(selectedOrder.discountMinor, selectedOrder.currency)}
                        </span>
                      </div>
                    )}
                    {selectedOrder.vatAmountMinor > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="font-light text-eagle-green/70">VAT (15%)</span>
                        <span className="font-light text-eagle-green">
                          {eventOrderService.formatCurrency(selectedOrder.vatAmountMinor, selectedOrder.currency)}
                        </span>
                      </div>
                    )}
                    {selectedOrder.salesTaxMinor > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="font-light text-eagle-green/70">Sales Tax</span>
                        <span className="font-light text-eagle-green">
                          {eventOrderService.formatCurrency(selectedOrder.salesTaxMinor, selectedOrder.currency)}
                        </span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between">
                      <span className="font-bold text-eagle-green">Total</span>
                      <span className="font-bold text-eagle-green text-xl">
                        {eventOrderService.formatCurrency(selectedOrder.totalAmountMinor, selectedOrder.currency)}
                      </span>
                    </div>
                  </div>

                  {/* Gift Message */}
                  {selectedOrder.giftMessage && (
                    <div className="bg-yellow/10 rounded-lg p-4">
                      <h5 className="font-bold text-eagle-green text-sm mb-1">Gift Message</h5>
                      <p className="font-light text-eagle-green/80 text-sm italic">
                        "{selectedOrder.giftMessage}"
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Ticket Detail Modal */}
        <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
          <DialogContent className="max-w-md bg-white">
            {selectedTicket && (
              <>
                <DialogHeader>
                  <DialogTitle className="font-bold text-eagle-green">
                    Ticket Details
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                  {/* QR Code - Generated from ticket code */}
                  <div className="flex justify-center">
                    <div className="bg-white p-4 rounded-lg border-2 border-eagle-green/20">
                      <QRCodeSVG 
                        value={selectedTicket.ticketCode}
                        size={192}
                        level="H"
                        includeMargin={true}
                        data-ticket-code={selectedTicket.ticketCode}
                      />
                    </div>
                  </div>

                  {/* Ticket Info */}
                  <div className="text-center">
                    <h3 className="font-bold text-eagle-green text-xl mb-1">
                      {selectedTicket.ticketTypeName}
                    </h3>
                    <p className="font-light text-eagle-green/70 text-sm">
                      Code: {selectedTicket.ticketCode}
                    </p>
                    <Badge className={`mt-2 ${
                      selectedTicket.status === 'ISSUED' ? 'bg-green-100 text-green-700' :
                      selectedTicket.status === 'CHECKED_IN' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {selectedTicket.status}
                    </Badge>
                  </div>

                  <Separator />

                  {/* Recipient */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-eagle-green text-sm">Recipient</h4>
                    <p className="font-light text-eagle-green">
                      {selectedTicket.recipientName}
                    </p>
                    <p className="font-light text-eagle-green/70 text-sm">
                      {selectedTicket.recipientEmail}
                    </p>
                    {selectedTicket.recipientPhone && (
                      <p className="font-light text-eagle-green/70 text-sm">
                        {selectedTicket.recipientPhone}
                      </p>
                    )}
                  </div>

                  {/* Check-in Info */}
                  {selectedTicket.checkedInAt && (
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-sm font-light text-blue-700">
                        Checked in: {formatDate(selectedTicket.checkedInAt)}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1 border-eagle-green text-eagle-green hover:bg-eagle-green hover:text-white"
                      onClick={() => {
                        // Create a canvas element to draw the QR code
                        const canvas = document.createElement('canvas');
                        const size = 512;
                        canvas.width = size;
                        canvas.height = size;
                        const ctx = canvas.getContext('2d');
                        
                        if (ctx) {
                          // White background
                          ctx.fillStyle = '#FFFFFF';
                          ctx.fillRect(0, 0, size, size);
                          
                          // Get the QR code SVG element
                          const svgElement = document.querySelector(`[data-ticket-code="${selectedTicket.ticketCode}"]`);
                          if (svgElement) {
                            // Clone the SVG to avoid modifying the original
                            const clonedSvg = svgElement.cloneNode(true) as SVGElement;
                            const svgData = new XMLSerializer().serializeToString(clonedSvg);
                            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
                            const url = URL.createObjectURL(svgBlob);
                            
                            const img = new Image();
                            img.onload = () => {
                              // Draw QR code centered on canvas
                              const qrSize = size * 0.8;
                              const offset = (size - qrSize) / 2;
                              ctx.drawImage(img, offset, offset, qrSize, qrSize);
                              
                              // Convert canvas to JPG and download
                              canvas.toBlob((blob) => {
                                if (blob) {
                                  const link = document.createElement('a');
                                  link.href = URL.createObjectURL(blob);
                                  link.download = `ticket-${selectedTicket.ticketCode}.jpg`;
                                  link.click();
                                  URL.revokeObjectURL(link.href);
                                }
                              }, 'image/jpeg', 0.95);
                              
                              URL.revokeObjectURL(url);
                            };
                            img.src = url;
                          }
                        }
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download QR
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex-1 border-eagle-green text-eagle-green hover:bg-eagle-green hover:text-white"
                      onClick={() => {
                        if (navigator.share) {
                          navigator.share({
                            title: `Ticket - ${selectedTicket.ticketTypeName}`,
                            text: `Ticket Code: ${selectedTicket.ticketCode}`,
                          }).catch(() => {
                            // Fallback: copy ticket code to clipboard
                            navigator.clipboard.writeText(selectedTicket.ticketCode);
                            alert('Ticket code copied to clipboard!');
                          });
                        } else {
                          // Fallback: copy ticket code to clipboard
                          navigator.clipboard.writeText(selectedTicket.ticketCode);
                          alert('Ticket code copied to clipboard!');
                        }
                      }}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
