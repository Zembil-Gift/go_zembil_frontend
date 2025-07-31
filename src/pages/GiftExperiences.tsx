import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Heart, MapPin, Calendar, Clock, Gift, CreditCard, Smartphone, Globe } from 'lucide-react';
import SocialShareButton from '@/components/SocialShareButton';
import { format } from 'date-fns';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface Event {
  id: number;
  name: string;
  description: string;
  date: Date;
  location: { name: string; city: string; country: string };
  basePrice: number;
  currency: string;
  imageUrl?: string;
  packages?: EventPackage[];
  maxCapacity: number;
  currentBookings: number;
  eventType: string;
}

interface Service {
  id: number;
  name: string;
  description: string;
  category: string;
  basePrice: number;
  currency: string;
  imageUrl?: string;
  locations: { name: string; city: string; country: string }[];
  providerId: string;
  duration?: string;
}

interface EventPackage {
  id: number;
  name: string;
  description: string;
  packagePrice: number;
  features: string[];
  maxGuests: number;
}

interface GiftOrderData {
  recipientName: string;
  recipientEmail: string;
  recipientPhone: string;
  personalMessage?: string;
  deliveryDate?: string;
  isAnonymous: boolean;
  paymentProvider: 'stripe' | 'chapa' | 'telebir';
  paymentMethodId?: string;
  totalAmount: number;
  numberOfTickets?: number;
  packageId?: number;
  eventId?: number;
  serviceId?: number;
  locationId?: number;
  serviceDate?: string;
  additionalRequests?: string;
}

const GiftPaymentForm = ({ clientSecret, onSuccess }: { clientSecret: string; onSuccess: () => void }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/gift-success`,
        },
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Gift Order Successful! 🎁",
          description: "Your gift has been processed and the recipient will be notified.",
        });
        onSuccess();
      }
    } catch (err) {
      toast({
        title: "Payment Error",
        description: "An unexpected error occurred during payment processing.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <h3 className="font-semibold text-amber-800 mb-2">🎁 Secure Gift Payment</h3>
        <p className="text-sm text-amber-700">
          Complete your payment to send this beautiful experience as a gift. The recipient will receive a confirmation email with their gift details.
        </p>
      </div>
      
      <PaymentElement 
        options={{
          layout: "tabs"
        }}
      />
      
      <Button 
        type="submit" 
        className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
        disabled={!stripe || isProcessing}
      >
        {isProcessing ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Processing Gift...
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4" />
            Complete Gift Order
          </div>
        )}
      </Button>
    </form>
  );
};

const GiftModal = ({ 
  item, 
  type, 
  isOpen, 
  onClose 
}: { 
  item: Event | Service; 
  type: 'event' | 'service'; 
  isOpen: boolean; 
  onClose: () => void; 
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<'details' | 'payment'>('details');
  const [clientSecret, setClientSecret] = useState<string>('');
  const [formData, setFormData] = useState<Partial<GiftOrderData>>({
    isAnonymous: false,
    paymentProvider: 'stripe',
    numberOfTickets: 1,
    totalAmount: item.basePrice,
  });

  const createGiftOrder = useMutation({
    mutationFn: async (data: GiftOrderData) => {
      const endpoint = type === 'event' ? '/api/gift-orders/events' : '/api/gift-orders/services';
      return apiRequest('POST', endpoint, data);
    },
    onSuccess: (response) => {
      setClientSecret(response.paymentClientSecret);
      setStep('payment');
      toast({
        title: "Gift Order Created! 🎁",
        description: "Please complete the payment to finalize your gift.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to Create Gift Order",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleGiftOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.recipientName || !formData.recipientEmail) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required recipient details.",
        variant: "destructive",
      });
      return;
    }

    const giftData: GiftOrderData = {
      ...formData as GiftOrderData,
      totalAmount: formData.totalAmount || item.basePrice,
    };

    if (type === 'event') {
      giftData.eventId = item.id;
    } else {
      giftData.serviceId = item.id;
      giftData.locationId = 1; // Default location for now
    }

    createGiftOrder.mutate(giftData);
  };

  const handlePaymentSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/gift-orders/user'] });
    onClose();
    setStep('details');
    setClientSecret('');
  };

  const isEvent = type === 'event';
  const event = isEvent ? item as Event : null;
  const service = !isEvent ? item as Service : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-amber-500" />
            Gift This {type === 'event' ? 'Event' : 'Service'}
          </DialogTitle>
          <DialogDescription>
            Send "{item.name}" as a thoughtful gift to someone special
          </DialogDescription>
        </DialogHeader>

        {step === 'details' && (
          <form onSubmit={handleGiftOrderSubmit} className="space-y-6">
            {/* Gift Preview */}
            <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg">
              <h3 className="font-semibold text-amber-800 mb-2">{item.name}</h3>
              <p className="text-sm text-amber-700 mb-3">{item.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-amber-600">
                  {isEvent && event && (
                    <>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {event.date ? format(new Date(event.date), 'MMM d, yyyy') : 'Date TBD'}
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {event.location?.city}
                      </div>
                    </>
                  )}
                  {!isEvent && service && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {service.category}
                    </div>
                  )}
                </div>
                <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                  {item.currency} {item.basePrice}
                </Badge>
              </div>
            </div>

            {/* Recipient Details */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-800">Gift Recipient</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="recipientName">Recipient Name *</Label>
                  <Input
                    id="recipientName"
                    value={formData.recipientName || ''}
                    onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                    placeholder="Enter recipient's full name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="recipientEmail">Recipient Email *</Label>
                  <Input
                    id="recipientEmail"
                    type="email"
                    value={formData.recipientEmail || ''}
                    onChange={(e) => setFormData({ ...formData, recipientEmail: e.target.value })}
                    placeholder="recipient@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="recipientPhone">Recipient Phone</Label>
                <Input
                  id="recipientPhone"
                  value={formData.recipientPhone || ''}
                  onChange={(e) => setFormData({ ...formData, recipientPhone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div>
                <Label htmlFor="personalMessage">Personal Message</Label>
                <Textarea
                  id="personalMessage"
                  value={formData.personalMessage || ''}
                  onChange={(e) => setFormData({ ...formData, personalMessage: e.target.value })}
                  placeholder="Write a heartfelt message to accompany your gift..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="deliveryDate">Delivery Date (Optional)</Label>
                  <Input
                    id="deliveryDate"
                    type="date"
                    value={formData.deliveryDate || ''}
                    onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <Label htmlFor="paymentProvider">Payment Method</Label>
                  <Select 
                    value={formData.paymentProvider} 
                    onValueChange={(value: 'stripe' | 'chapa' | 'telebir') => 
                      setFormData({ ...formData, paymentProvider: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stripe">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4" />
                          International (Stripe)
                        </div>
                      </SelectItem>
                      <SelectItem value="chapa">
                        <div className="flex items-center gap-2">
                          <Smartphone className="w-4 h-4" />
                          Ethiopian (Chapa)
                        </div>
                      </SelectItem>
                      <SelectItem value="telebir">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4" />
                          Mobile Money (Telebir)
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {isEvent && (
                <div>
                  <Label htmlFor="numberOfTickets">Number of Tickets</Label>
                  <Input
                    id="numberOfTickets"
                    type="number"
                    min="1"
                    max="10"
                    value={formData.numberOfTickets || 1}
                    onChange={(e) => {
                      const tickets = parseInt(e.target.value);
                      setFormData({ 
                        ...formData, 
                        numberOfTickets: tickets,
                        totalAmount: item.basePrice * tickets
                      });
                    }}
                  />
                </div>
              )}

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isAnonymous"
                  checked={formData.isAnonymous}
                  onChange={(e) => setFormData({ ...formData, isAnonymous: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="isAnonymous" className="text-sm">
                  Send this gift anonymously
                </Label>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-lg font-semibold">
                Total: {item.currency} {formData.totalAmount}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                  disabled={createGiftOrder.isPending}
                >
                  {createGiftOrder.isPending ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creating Gift...
                    </div>
                  ) : (
                    "Continue to Payment"
                  )}
                </Button>
              </div>
            </div>
          </form>
        )}

        {step === 'payment' && clientSecret && (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <GiftPaymentForm clientSecret={clientSecret} onSuccess={handlePaymentSuccess} />
          </Elements>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default function GiftExperiences() {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const [selectedItem, setSelectedItem] = useState<Event | Service | null>(null);
  const [selectedType, setSelectedType] = useState<'event' | 'service'>('event');
  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'events' | 'services'>('events');
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState<string>('all');

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['/api/events'],
    enabled: true,
  });

  const { data: services, isLoading: servicesLoading } = useQuery({
    queryKey: ['/api/services'],
    enabled: true,
  });

  const { data: userGifts } = useQuery({
    queryKey: ['/api/gift-orders/user'],
    enabled: isAuthenticated,
  });

  const handleGiftClick = (item: Event | Service, type: 'event' | 'service') => {
    if (!isAuthenticated) {
      toast({
        title: "Sign In Required",
        description: "Please sign in to send gifts.",
        variant: "destructive",
      });
      return;
    }

    setSelectedItem(item);
    setSelectedType(type);
    setIsGiftModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent mb-4">
            Gift Experiences
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Share the joy of Ethiopian culture and unforgettable experiences with your loved ones. 
            Send meaningful gifts that create lasting memories.
          </p>
        </div>

        {/* User's Gift Orders Summary */}
        {isAuthenticated && userGifts && (
          <div className="mb-8 p-4 bg-white rounded-lg shadow-sm border border-amber-200">
            <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-500" />
              Your Gift Summary
            </h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-amber-600">{userGifts.totalGifts || 0}</div>
                <div className="text-sm text-gray-600">Total Gifts Sent</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{userGifts.eventGifts?.length || 0}</div>
                <div className="text-sm text-gray-600">Event Gifts</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{userGifts.serviceGifts?.length || 0}</div>
                <div className="text-sm text-gray-600">Service Gifts</div>
              </div>
            </div>
          </div>
        )}

        {/* Toggle Tabs */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
            <button
              onClick={() => setActiveTab('events')}
              className={`px-6 py-3 rounded-md font-medium transition-all duration-300 ${
                activeTab === 'events'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              🎁 Gift Events ({events?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('services')}
              className={`px-6 py-3 rounded-md font-medium transition-all duration-300 ${
                activeTab === 'services'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              🎯 Professional Services ({services?.length || 0})
            </button>
          </div>

          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Input
              placeholder={`Search ${activeTab === 'events' ? 'events' : 'services'}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64"
            />
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                <SelectItem value="washington-dc">Washington DC</SelectItem>
                <SelectItem value="dallas">Dallas</SelectItem>
                <SelectItem value="seattle">Seattle</SelectItem>
                <SelectItem value="addis-ababa">Addis Ababa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Events Tab Content */}
        {activeTab === 'events' && (
          <section className="mb-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {eventsLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-gray-200 h-48 rounded-lg mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </div>
                ))
              ) : (
                events
                  ?.filter((event: Event) => {
                    const matchesSearch = searchTerm === '' || 
                      event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      event.eventType.toLowerCase().includes(searchTerm.toLowerCase());
                    
                    const matchesLocation = locationFilter === 'all' || 
                      event.location?.city?.toLowerCase().replace(' ', '-') === locationFilter;
                    
                    return matchesSearch && matchesLocation;
                  })
                  ?.map((event: Event) => (
                    <Card key={event.id} className="hover:shadow-lg transition-shadow duration-300 border-amber-200">
                      <CardHeader>
                        <div className="flex justify-between items-start mb-2">
                          <CardTitle className="text-lg">{event.name}</CardTitle>
                          <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                            {event.currency} {event.basePrice}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">{event.description}</p>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="w-4 h-4" />
                            {event.date ? format(new Date(event.date), 'MMM d, yyyy') : 'Date TBD'}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <MapPin className="w-4 h-4" />
                            {event.location?.city}, {event.location?.country}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock className="w-4 h-4" />
                            {event.currentBookings}/{event.maxCapacity} spots filled
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            onClick={() => handleGiftClick(event, 'event')}
                            className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                          >
                            <Gift className="w-4 h-4 mr-2" />
                            Gift This Event
                          </Button>
                          <SocialShareButton
                            title={`Gift Experience: ${event.name}`}
                            description={`Join us for ${event.name} in ${event.location?.city}! ${event.description}`}
                            url={`${window.location.origin}/gift-experiences?event=${event.id}`}
                            hashtags={['goZembil', 'EthiopianGifts', 'GiftEvent', event.eventType]}
                            size="default"
                            variant="outline"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))
              )}
              {!eventsLoading && events?.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <div className="text-gray-500 text-lg">No gift events available at the moment.</div>
                  <p className="text-gray-400 mt-2">Check back soon for exciting gifting experiences and special events!</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Services Tab Content */}
        {activeTab === 'services' && (
          <section>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {servicesLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-gray-200 h-48 rounded-lg mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </div>
                ))
              ) : (
                services
                  ?.filter((service: Service) => {
                    const matchesSearch = searchTerm === '' || 
                      service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      service.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      service.category.toLowerCase().includes(searchTerm.toLowerCase());
                    
                    const matchesLocation = locationFilter === 'all' || 
                      service.locations?.some(loc => 
                        loc.city?.toLowerCase().replace(' ', '-') === locationFilter
                      );
                    
                    return matchesSearch && matchesLocation;
                  })
                  ?.map((service: Service) => (
                    <Card key={service.id} className="hover:shadow-lg transition-shadow duration-300 border-green-200">
                      <CardHeader>
                        <div className="flex justify-between items-start mb-2">
                          <CardTitle className="text-lg">{service.name}</CardTitle>
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            {service.currency} {service.basePrice}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">{service.description}</p>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                            {service.category}
                          </div>
                          {service.duration && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Clock className="w-4 h-4" />
                              {service.duration}
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <MapPin className="w-4 h-4" />
                            {service.locations?.length || 0} location{service.locations?.length !== 1 ? 's' : ''} available
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            onClick={() => handleGiftClick(service, 'service')}
                            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                          >
                            <Gift className="w-4 h-4 mr-2" />
                            Gift This Service
                          </Button>
                          <SocialShareButton
                            title={`Professional Service: ${service.name}`}
                            description={`Experience ${service.name} - ${service.category} service. ${service.description}`}
                            url={`${window.location.origin}/gift-experiences?service=${service.id}`}
                            hashtags={['goZembil', 'EthiopianServices', 'ProfessionalService', service.category.replace(/\s+/g, '')]}
                            size="default"
                            variant="outline"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))
              )}
              {!servicesLoading && services?.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <div className="text-gray-500 text-lg">No professional services available at the moment.</div>
                  <p className="text-gray-400 mt-2">Check back soon for exciting Ethiopian professional services!</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Gift Modal */}
        {selectedItem && (
          <GiftModal
            item={selectedItem}
            type={selectedType}
            isOpen={isGiftModalOpen}
            onClose={() => {
              setIsGiftModalOpen(false);
              setSelectedItem(null);
            }}
          />
        )}
      </div>
    </div>
  );
}