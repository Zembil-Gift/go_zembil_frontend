import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  ArrowLeft,
  Star,
  MapPin,
  Calendar,
  Clock,
  Users,
  Globe,
  Ticket,
  CheckCircle,
  ShoppingCart,
  Heart,
  Share2,
  Info
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { 
  Event, 
  TicketType,
  CITIES,
  EVENT_CATEGORIES
} from '@/types/events';
import { eventsService } from '@/services/eventsService';

export default function EventDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  
  const [selectedTicketType, setSelectedTicketType] = useState<string>('');
  const [ticketQuantity, setTicketQuantity] = useState(1);
  const [showBookingModal, setShowBookingModal] = useState(false);

  // Fetch event details
  const { data: event, isLoading } = useQuery({
    queryKey: ['event', slug],
    queryFn: () => slug ? eventsService.getEventBySlug(slug) : null,
    enabled: !!slug,
  });

  // Booking mutation
  const bookingMutation = useMutation({
    mutationFn: (bookingData: any) => eventsService.bookEvent(event?.id!, bookingData),
    onSuccess: () => {
      setShowBookingModal(false);
      // Navigate to booking confirmation or payment
      navigate(`/events/${slug}/booking-success`);
    },
  });

  const handleBooking = () => {
    if (!selectedTicketType) return;

    const ticketType = event?.ticketTypes.find(t => t.id === selectedTicketType);
    if (!ticketType) return;

    const bookingData = {
      eventId: event?.id!,
      ticketTypeId: selectedTicketType,
      quantity: ticketQuantity,
      totalAmount: ticketType.price * ticketQuantity,
    };

    bookingMutation.mutate(bookingData);
  };

  const formatEventDate = (dateString: string, timezone: string) => {
    const date = new Date(dateString);
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    const eventTime = date.toLocaleString('en-US', {
      timeZone: timezone,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const userTime = userTimeZone !== timezone ? 
      date.toLocaleString('en-US', {
        timeZone: userTimeZone,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }) : null;

    return { eventTime, userTime };
  };

  const getBadgeColor = (badge: string) => {
    switch (badge) {
      case 'new': return 'bg-yellow/20 text-eagle-green border-yellow';
      case 'limited': return 'bg-yellow/20 text-eagle-green border-yellow/50';
      case 'popular': return 'bg-viridian-green/20 text-viridian-green border-viridian-green/50';
      case 'refundable': return 'bg-june-bud/20 text-eagle-green border-june-bud';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-eagle-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="font-gotham-light text-eagle-green">Loading event details...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-gotham-bold text-eagle-green mb-2">Event Not Found</h2>
          <p className="font-gotham-light text-eagle-green/70 mb-4">The event you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/events')} className="bg-eagle-green hover:bg-viridian-green text-white">
            Browse All Events
          </Button>
        </div>
      </div>
    );
  }

  const categoryName = EVENT_CATEGORIES.find(c => c.id === event.categoryId)?.name || 'Event';
  const cityName = CITIES[event.country].find(c => c.id === event.city)?.name || event.city;
  const countryFlag = event.country === 'ET' ? '🇪🇹' : '🇺🇸';
  const { eventTime, userTime } = formatEventDate(event.startDate, event.timezone);
  const minPrice = Math.min(...event.ticketTypes.map(t => t.price));

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/events')}
          className="mb-6 text-eagle-green hover:text-viridian-green hover:bg-june-bud/10"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Events
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Hero Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="relative aspect-[16/9] rounded-2xl overflow-hidden mb-6">
                <img
                  src={event.poster}
                  alt={event.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                
                {/* Badges */}
                <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                  {event.badges.map(badge => (
                    <Badge 
                      key={badge} 
                      className={`font-gotham-bold ${getBadgeColor(badge)}`}
                    >
                      {badge.charAt(0).toUpperCase() + badge.slice(1)}
                    </Badge>
                  ))}
                </div>

                {/* Location */}
                <div className="absolute top-4 right-4">
                  <Badge className="bg-white/90 text-eagle-green border-none font-gotham-bold">
                    {countryFlag} {cityName}
                  </Badge>
                </div>

                {/* Price */}
                <div className="absolute bottom-4 right-4">
                  <Badge className="bg-eagle-green text-white border-none font-gotham-bold text-lg px-3 py-1">
                    From {eventsService.formatCurrency(minPrice, event.baseCurrency)}
                  </Badge>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-sm font-gotham-light text-viridian-green">
                    {categoryName}
                  </span>
                  <h1 className="text-3xl lg:text-4xl font-gotham-bold text-eagle-green mt-1">
                    {event.title}
                  </h1>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-viridian-green" />
                    <span className="font-gotham-light text-eagle-green">{eventTime}</span>
                  </div>
                  
                  {userTime && (
                    <>
                      <Separator orientation="vertical" className="h-4" />
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-viridian-green" />
                        <span className="font-gotham-light text-eagle-green">Your time: {userTime}</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-viridian-green" />
                    <span className="font-gotham-light text-eagle-green">{event.venue}</span>
                  </div>
                  
                  <Separator orientation="vertical" className="h-4" />
                  
                  <div className="flex items-center gap-1">
                    <Globe className="h-4 w-4 text-viridian-green" />
                    <span className="font-gotham-light text-eagle-green">{event.timezone}</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Description */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="font-gotham-bold text-eagle-green">About This Event</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-gotham-light text-eagle-green/80 leading-relaxed">
                    {event.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Event Details */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="font-gotham-bold text-eagle-green">Event Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-gotham-bold text-eagle-green mb-1">Organizer</h4>
                      <p className="font-gotham-light text-eagle-green/70">{event.organizer.name}</p>
                    </div>
                    
                    <div>
                      <h4 className="font-gotham-bold text-eagle-green mb-1">Contact</h4>
                      <p className="font-gotham-light text-eagle-green/70">{event.organizer.contact}</p>
                    </div>
                    
                    <div>
                      <h4 className="font-gotham-bold text-eagle-green mb-1">Duration</h4>
                      <p className="font-gotham-light text-eagle-green/70">
                        {Math.ceil((new Date(event.endDate).getTime() - new Date(event.startDate).getTime()) / (1000 * 60 * 60))} hours
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-gotham-bold text-eagle-green mb-1">Language</h4>
                      <p className="font-gotham-light text-eagle-green/70">
                        {event.languages?.join(', ') || 'Not specified'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Ticket Types */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="font-gotham-bold text-eagle-green flex items-center gap-2">
                    <Ticket className="h-5 w-5" />
                    Available Tickets
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {event.ticketTypes.map((ticket, index) => (
                      <div 
                        key={ticket.id} 
                        className={`p-4 rounded-lg border transition-all cursor-pointer ${
                          selectedTicketType === ticket.id 
                            ? 'border-eagle-green bg-june-bud/10' 
                            : 'border-gray-200 hover:border-eagle-green/50'
                        }`}
                        onClick={() => setSelectedTicketType(ticket.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-gotham-bold text-eagle-green">{ticket.name}</h4>
                              {(ticket.remaining || 0) === 0 && (
                                <Badge variant="secondary">Sold Out</Badge>
                              )}
                              {(ticket.remaining || 0) > 0 && (ticket.remaining || 0) <= 5 && (
                                <Badge className="bg-yellow/20 text-eagle-green border-yellow">
                                  Only {ticket.remaining} left
                                </Badge>
                              )}
                            </div>
                            {ticket.description && (
                              <p className="font-gotham-light text-eagle-green/70 text-sm mt-1">
                                {ticket.description}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-gotham-bold text-eagle-green text-lg">
                              {eventsService.formatCurrency(ticket.price, event.baseCurrency)}
                            </p>
                            <p className="font-gotham-light text-eagle-green/70 text-sm">
                              {ticket.remaining || 0} available
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Booking Panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-4">
              <Card className="border-eagle-green/20">
                <CardHeader className="bg-gradient-to-r from-june-bud/10 to-white">
                  <CardTitle className="font-gotham-bold text-eagle-green flex items-center gap-2">
                    <Ticket className="h-5 w-5" />
                    Book Your Tickets
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {/* Ticket Selection */}
                  <div>
                    <label className="block font-gotham-light text-eagle-green mb-2">Select Ticket Type</label>
                    <Select value={selectedTicketType} onValueChange={setSelectedTicketType}>
                      <SelectTrigger className="border-eagle-green/30 focus:border-viridian-green">
                        <SelectValue placeholder="Choose ticket type" />
                      </SelectTrigger>
                      <SelectContent>
                        {event.ticketTypes.map(ticket => (
                          <SelectItem 
                            key={ticket.id} 
                            value={ticket.id}
                            disabled={(ticket.remaining || 0) === 0}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span>{ticket.name}</span>
                              <span className="ml-2">
                                {eventsService.formatCurrency(ticket.price, event.baseCurrency)}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Quantity Selection */}
                  {selectedTicketType && (
                    <div>
                      <label className="block font-gotham-light text-eagle-green mb-2">Quantity</label>
                      <Select 
                        value={ticketQuantity.toString()} 
                        onValueChange={(value) => setTicketQuantity(parseInt(value))}
                      >
                        <SelectTrigger className="border-eagle-green/30 focus:border-viridian-green">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: Math.min(10, event.ticketTypes.find(t => t.id === selectedTicketType)?.remaining || 0) }, (_, i) => (
                            <SelectItem key={i + 1} value={(i + 1).toString()}>
                              {i + 1}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Total */}
                  {selectedTicketType && (
                    <div className="bg-june-bud/10 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <span className="font-gotham-light text-eagle-green">Total</span>
                        <span className="font-gotham-bold text-eagle-green text-xl">
                          {eventsService.formatCurrency(
                            (event.ticketTypes.find(t => t.id === selectedTicketType)?.price || 0) * ticketQuantity,
                            event.baseCurrency
                          )}
                        </span>
                      </div>
                    </div>
                  )}

                  <Dialog open={showBookingModal} onOpenChange={setShowBookingModal}>
                    <DialogTrigger asChild>
                      <Button 
                        className="w-full bg-eagle-green hover:bg-viridian-green text-white font-gotham-bold h-12"
                        disabled={!selectedTicketType}
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Book Now
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle className="font-gotham-bold text-eagle-green">
                          Confirm Your Booking
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="bg-june-bud/10 rounded-lg p-4">
                          <h3 className="font-gotham-bold text-eagle-green mb-2">{event.title}</h3>
                          <div className="text-sm text-eagle-green/70 space-y-1">
                            <p>{eventTime}</p>
                            <p>{event.venue}</p>
                            <p>
                              {event.ticketTypes.find(t => t.id === selectedTicketType)?.name} × {ticketQuantity}
                            </p>
                          </div>
                        </div>

                        <div className="flex justify-between items-center font-gotham-bold text-eagle-green">
                          <span>Total Amount:</span>
                          <span className="text-xl">
                            {eventsService.formatCurrency(
                              (event.ticketTypes.find(t => t.id === selectedTicketType)?.price || 0) * ticketQuantity,
                              event.baseCurrency
                            )}
                          </span>
                        </div>

                        <Button
                          onClick={handleBooking}
                          disabled={bookingMutation.isPending}
                          className="w-full bg-eagle-green hover:bg-viridian-green text-white font-gotham-bold"
                        >
                          {bookingMutation.isPending ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                              Processing...
                            </>
                          ) : (
                            'Confirm Booking'
                          )}
                        </Button>

                        <p className="text-xs font-gotham-light text-eagle-green/70 text-center">
                          You will be redirected to secure payment after confirmation.
                        </p>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 border-eagle-green text-eagle-green hover:bg-eagle-green hover:text-white">
                      <Heart className="h-4 w-4 mr-1" />
                      Save
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 border-eagle-green text-eagle-green hover:bg-eagle-green hover:text-white">
                      <Share2 className="h-4 w-4 mr-1" />
                      Share
                    </Button>
                  </div>

                  <div className="flex items-center gap-2 text-sm font-gotham-light text-eagle-green/70">
                    <Info className="h-4 w-4" />
                    <span>Free cancellation up to 24 hours before the event</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
