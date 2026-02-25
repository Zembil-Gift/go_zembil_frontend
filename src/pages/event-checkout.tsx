import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  ArrowLeft,
  Calendar,
  MapPin,
  User,
  Mail,
  Phone,
  Gift,
  CheckCircle,
  Ticket,
  CreditCard,
  Loader2,
  AlertCircle
} from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { getEventImageUrl } from '@/utils/imageUtils';
import { paymentMethodConfigService } from '@/services/paymentMethodConfigService';

import { 
  eventOrderService, 
  EventResponse,
  CreateEventOrderRequest,
  TicketPurchaseItem 
} from '@/services/eventOrderService';

interface TicketSelection {
  ticketTypeId: number;
  ticketTypeName: string;
  priceMinor: number;  // Price in minor units
  currency: string;
  recipients: TicketPurchaseItem[];
}

export default function EventCheckout() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  // Get selected tickets from navigation state
  const selectedTicketsFromState = location.state?.selectedTickets as Map<number, TicketPurchaseItem[]> | undefined;
  
  const [ticketSelections, setTicketSelections] = useState<TicketSelection[]>([]);
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [giftMessage, setGiftMessage] = useState('');
  const [paymentProvider, setPaymentProvider] = useState<'stripe' | 'chapa' | 'telebirr'>('stripe');
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch backend-enabled payment methods
  const { data: backendConfigs } = useQuery({
    queryKey: ['payment-method-configs'],
    queryFn: () => paymentMethodConfigService.getAllConfigs(),
    staleTime: 60_000,
  });

  const enabledPaymentMethods = useMemo(() => {
    if (!backendConfigs) return ['stripe', 'chapa', 'telebirr']; // Fallback while loading
    return backendConfigs
      .filter((c) => c.enabled)
      .map((c) => c.paymentMethod.toLowerCase());
  }, [backendConfigs]);

  // Auto-select first enabled method if current selection is disabled
  useEffect(() => {
    if (enabledPaymentMethods.length > 0 && !enabledPaymentMethods.includes(paymentProvider)) {
      setPaymentProvider(enabledPaymentMethods[0] as 'stripe' | 'chapa' | 'telebirr');
    }
  }, [enabledPaymentMethods, paymentProvider]);

  // Fetch event details
  const { data: event, isLoading } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventOrderService.getEvent(Number(eventId)),
    enabled: !!eventId,
  });

  // Initialize ticket selections from state
  useEffect(() => {
    if (event && selectedTicketsFromState) {
      const selections: TicketSelection[] = [];
      
      selectedTicketsFromState.forEach((recipients, ticketTypeId) => {
        const ticketType = event.ticketTypes.find(t => t.id === ticketTypeId);
        if (ticketType && recipients.length > 0) {
          selections.push({
            ticketTypeId,
            ticketTypeName: ticketType.name,
            priceMinor: ticketType.priceMinor,
            currency: ticketType.currency,
            recipients: recipients.map(r => ({ ...r })),
          });
        }
      });
      
      setTicketSelections(selections);
    }
  }, [event, selectedTicketsFromState]);

  // Prefill contact information from user profile
  useEffect(() => {
    if (user) {
      if (user.email && !contactEmail) {
        setContactEmail(user.email);
      }
      if (user.phoneNumber && !contactPhone) {
        setContactPhone(user.phoneNumber);
      }
    }
  }, [user]);

  // Redirect if no tickets selected
  useEffect(() => {
    if (!isLoading && (!selectedTicketsFromState || selectedTicketsFromState.size === 0)) {
      toast({
        title: 'No tickets selected',
        description: 'Please select tickets before proceeding to checkout.',
        variant: 'destructive',
      });
      navigate(`/events/${eventId}`);
    }
  }, [isLoading, selectedTicketsFromState, eventId, navigate, toast]);

  const getTotalTickets = () => {
    return ticketSelections.reduce((sum, sel) => sum + sel.recipients.length, 0);
  };

  const getTotalPrice = () => {
    return ticketSelections.reduce((sum, sel) => sum + (sel.priceMinor * sel.recipients.length), 0);
  };

  const updateRecipient = (selectionIndex: number, recipientIndex: number, field: keyof TicketPurchaseItem, value: string) => {
    setTicketSelections(prev => {
      const updated = [...prev];
      updated[selectionIndex] = {
        ...updated[selectionIndex],
        recipients: updated[selectionIndex].recipients.map((r, i) => 
          i === recipientIndex ? { ...r, [field]: value } : r
        ),
      };
      return updated;
    });
  };

  const handleCheckout = async () => {
    if (!event) return;

    // Validate all recipients have required info
    let allValid = true;
    ticketSelections.forEach((selection) => {
      selection.recipients.forEach(ticket => {
        if (!ticket.recipientName || !ticket.recipientEmail) {
          allValid = false;
        }
      });
    });

    if (!allValid) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in recipient name and email for all tickets.',
        variant: 'destructive',
      });
      return;
    }

    if (!contactEmail) {
      toast({
        title: 'Missing Contact Email',
        description: 'Please enter your contact email.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Flatten all tickets
      const allTickets: TicketPurchaseItem[] = [];
      ticketSelections.forEach((selection) => {
        allTickets.push(...selection.recipients);
      });

      const orderRequest: CreateEventOrderRequest = {
        eventId: event.id,
        tickets: allTickets,
        contactEmail,
        contactPhone,
        giftMessage: giftMessage || undefined,
        paymentProvider: paymentProvider.toUpperCase() as 'STRIPE' | 'CHAPA' | 'TELEBIRR',
      };

      // Create order
      const order = await eventOrderService.createOrder(orderRequest);

      // Initialize payment
      const paymentInit = await eventOrderService.initializePayment(order.id, paymentProvider.toUpperCase());

      // Redirect based on payment provider response
      if (paymentInit.checkoutUrl) {
        // Chapa or Stripe Checkout - redirect to their hosted page
        window.location.href = paymentInit.checkoutUrl;
      } else if (paymentProvider === 'stripe' && paymentInit.clientSecret) {
        // Stripe Payment Intent - navigate to stripe payment page with event order context
        navigate(`/payment/stripe?orderId=${order.id}&orderType=event`, {
          state: {
            clientSecret: paymentInit.clientSecret,
            publishableKey: paymentInit.publishableKey,
            amount: order.totalAmountMinor, // Already in minor units (cents)
            currency: order.currency.toLowerCase(),
            orderId: order.id,
            orderNumber: order.orderNumber,
            returnUrl: `${window.location.origin}/my-tickets`,
          },
        });
      } else {
        // Fallback - show error
        throw new Error('Payment initialization failed. No checkout URL returned.');
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast({
        title: 'Checkout Failed',
        description: error.message || 'Failed to process your order. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatEventDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-eagle-green mx-auto mb-4" />
          <p className="font-light text-eagle-green">Loading checkout...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-eagle-green mb-2">Event Not Found</h2>
          <Button onClick={() => navigate('/events')} className="bg-eagle-green hover:bg-viridian-green text-white">
            Browse Events
          </Button>
        </div>
      </div>
    );
  }

  const currency = ticketSelections[0]?.currency || 'ETB';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Button
            variant="ghost"
            onClick={() => navigate(`/events/${eventId}`)}
            className="mb-4 text-eagle-green hover:text-viridian-green"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Event
          </Button>
          
          <h1 className="text-3xl font-bold text-eagle-green">
            Complete Your Order
          </h1>
          <p className="font-light text-eagle-green/70 mt-1">
            Fill in the details below to purchase your tickets
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Event Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    <img 
                      src={getEventImageUrl(event.images, event.bannerImageUrl)} 
                      alt={event.title}
                      className="w-24 h-24 rounded-lg object-cover"
                      onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }}
                    />
                    <div className="w-24 h-24 rounded-lg bg-eagle-green/10 flex items-center justify-center hidden">
                      <Calendar className="h-8 w-8 text-eagle-green/50" />
                    </div>
                    <div className="flex-1">
                      <h2 className="font-bold text-eagle-green text-xl mb-2">
                        {event.title}
                      </h2>
                      <div className="space-y-1 text-sm text-eagle-green/70">
                        <p className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {formatEventDate(event.eventDate)}
                        </p>
                        <p className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {event.location}, {event.city}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Recipient Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="font-bold text-eagle-green flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Ticket Recipients
                  </CardTitle>
                  <p className="text-sm font-light text-eagle-green/70">
                    Each ticket will be sent to the specified recipient via email
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {ticketSelections.map((selection, selIndex) => (
                    <div key={selection.ticketTypeId} className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Ticket className="h-4 w-4 text-viridian-green" />
                        <h4 className="font-bold text-eagle-green">
                          {selection.ticketTypeName}
                        </h4>
                        <Badge variant="outline">
                          {selection.recipients.length} ticket{selection.recipients.length > 1 ? 's' : ''}
                        </Badge>
                      </div>
                      
                      {selection.recipients.map((recipient, recIndex) => (
                        <div key={recIndex} className="border rounded-lg p-4 bg-white space-y-4">
                          <p className="text-sm font-bold text-eagle-green/60">
                            Ticket #{recIndex + 1}
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-light">Recipient Name *</Label>
                              <div className="relative mt-1">
                                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-eagle-green/50" />
                                <Input
                                  placeholder="Full name"
                                  value={recipient.recipientName}
                                  onChange={(e) => updateRecipient(selIndex, recIndex, 'recipientName', e.target.value)}
                                  className="pl-10 border-eagle-green/30"
                                />
                              </div>
                            </div>
                            <div>
                              <Label className="text-sm font-light">Recipient Email *</Label>
                              <div className="relative mt-1">
                                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-eagle-green/50" />
                                <Input
                                  type="email"
                                  placeholder="email@example.com"
                                  value={recipient.recipientEmail}
                                  onChange={(e) => updateRecipient(selIndex, recIndex, 'recipientEmail', e.target.value)}
                                  className="pl-10 border-eagle-green/30"
                                />
                              </div>
                            </div>
                            <div className="md:col-span-2">
                              <Label className="text-sm font-light">Recipient Phone (optional)</Label>
                              <div className="relative mt-1">
                                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-eagle-green/50" />
                                <Input
                                  placeholder="+251..."
                                  value={recipient.recipientPhone}
                                  onChange={(e) => updateRecipient(selIndex, recIndex, 'recipientPhone', e.target.value)}
                                  className="pl-10 border-eagle-green/30"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>

            {/* Contact Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="font-bold text-eagle-green flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Your Contact Information
                  </CardTitle>
                  <p className="text-sm font-light text-eagle-green/70">
                    We'll send the order confirmation to this email
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-light">Your Email *</Label>
                      <div className="relative mt-1">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-eagle-green/50" />
                        <Input
                          type="email"
                          placeholder="your@email.com"
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          className="pl-10 border-eagle-green/30"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-light">Your Phone (optional)</Label>
                      <div className="relative mt-1">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-eagle-green/50" />
                        <Input
                          placeholder="+251..."
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value)}
                          className="pl-10 border-eagle-green/30"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Gift Message */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="font-bold text-eagle-green flex items-center gap-2">
                    <Gift className="h-5 w-5" />
                    Gift Message (optional)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Add a personal message for the recipients..."
                    value={giftMessage}
                    onChange={(e) => setGiftMessage(e.target.value)}
                    className="border-eagle-green/30 min-h-[100px]"
                  />
                </CardContent>
              </Card>
            </motion.div>

            {/* Payment Method */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="font-bold text-eagle-green flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payment Method
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {enabledPaymentMethods.length === 0 ? (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        No payment methods are currently available. Please try again later or contact support.
                      </AlertDescription>
                    </Alert>
                  ) : (
                  <RadioGroup value={paymentProvider} onValueChange={(value) => setPaymentProvider(value as 'stripe' | 'chapa' | 'telebirr')}>
                    {enabledPaymentMethods.includes('stripe') && (
                    <div className={`flex items-center space-x-3 border rounded-lg p-4 cursor-pointer transition-colors ${paymentProvider === 'stripe' ? 'border-eagle-green bg-june-bud/10' : 'border-gray-200 hover:border-eagle-green/50'}`}>
                      <RadioGroupItem value="stripe" id="stripe" />
                      <Label htmlFor="stripe" className="flex-1 cursor-pointer">
                        <span className="font-bold text-eagle-green">Card Payment (Stripe)</span>
                        <p className="text-sm font-light text-eagle-green/70">
                          Pay with Visa, Mastercard, or American Express
                        </p>
                      </Label>
                      <img src="/stripe-logo.png" alt="Stripe" className="h-6 w-auto" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    </div>
                    )}
                    {enabledPaymentMethods.includes('chapa') && (
                    <div className={`flex items-center space-x-3 border rounded-lg p-4 cursor-pointer transition-colors ${paymentProvider === 'chapa' ? 'border-eagle-green bg-june-bud/10' : 'border-gray-200 hover:border-eagle-green/50'}`}>
                      <RadioGroupItem value="chapa" id="chapa" />
                      <Label htmlFor="chapa" className="flex-1 cursor-pointer">
                        <span className="font-bold text-eagle-green">Chapa</span>
                        <p className="text-sm font-light text-eagle-green/70">
                          Pay with CBE Birr, Awash Bank, or other local banks
                        </p>
                      </Label>
                      <img src="/chapa-logo.png" alt="Chapa" className="h-8 w-auto" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    </div>
                    )}
                    {enabledPaymentMethods.includes('telebirr') && (
                    <div className={`flex items-center space-x-3 border rounded-lg p-4 cursor-pointer transition-colors ${paymentProvider === 'telebirr' ? 'border-eagle-green bg-june-bud/10' : 'border-gray-200 hover:border-eagle-green/50'}`}>
                      <RadioGroupItem value="telebirr" id="telebirr" />
                      <Label htmlFor="telebirr" className="flex-1 cursor-pointer">
                        <span className="font-bold text-eagle-green">TeleBirr</span>
                        <p className="text-sm font-light text-eagle-green/70">
                          Pay with TeleBirr Wallet, Bank Account, or Cards
                        </p>
                      </Label>
                      <img src="/telebirr-logo.png" alt="TeleBirr" className="h-8 w-auto" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    </div>
                    )}
                  </RadioGroup>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="sticky top-8"
            >
              <Card className="border-eagle-green/20">
                <CardHeader className="bg-gradient-to-r from-june-bud/10 to-white">
                  <CardTitle className="font-bold text-eagle-green">
                    Order Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {/* Ticket breakdown */}
                  <div className="space-y-3">
                    {ticketSelections.map((selection) => (
                      <div key={selection.ticketTypeId} className="flex justify-between text-sm">
                        <span className="font-light text-eagle-green">
                          {selection.ticketTypeName} × {selection.recipients.length}
                        </span>
                        <span className="font-bold text-eagle-green">
                          {eventOrderService.formatCurrency(selection.priceMinor * selection.recipients.length, selection.currency)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  {/* Total */}
                  <div className="bg-june-bud/10 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-light text-eagle-green text-sm">Total</span>
                        <p className="text-xs text-eagle-green/60">{getTotalTickets()} ticket{getTotalTickets() !== 1 ? 's' : ''}</p>
                      </div>
                      <span className="font-bold text-eagle-green text-2xl">
                        {eventOrderService.formatCurrency(getTotalPrice(), currency)}
                      </span>
                    </div>
                  </div>

                  <Button 
                    className="w-full bg-eagle-green hover:bg-viridian-green text-white font-bold h-12"
                    onClick={handleCheckout}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Pay {eventOrderService.formatCurrency(getTotalPrice(), currency)}
                      </>
                    )}
                  </Button>

                  <p className="text-xs font-light text-eagle-green/60 text-center">
                    By completing this purchase, you agree to our terms of service.
                    Tickets will be emailed to recipients after payment.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
