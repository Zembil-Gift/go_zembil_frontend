import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  Globe,
  Ticket,
  ShoppingCart,
  Plus,
  Minus,
  ChevronLeft,
  ChevronRight,
  X,
  ZoomIn
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { getEventImageUrl } from '@/utils/imageUtils';
import { VendorCard, EventReviewsSection } from '@/components/reviews';
import { reviewService } from '@/services/reviewService';

import { 
  Event, 
  TicketType as EventTicketType,
  EVENT_CATEGORIES,
} from '@/types/events';
import { eventsService } from '@/services/eventsService';
import { 
  eventOrderService, 
  EventResponse, 
  TicketPurchaseItem,
  TicketType
} from '@/services/eventOrderService';
import { useAuth } from '@/hooks/useAuth';
import { useActiveCurrency } from '@/hooks/useActiveCurrency';

export default function EventDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isInitialized } = useAuth();
  const activeCurrency = useActiveCurrency();
  
  // Ticket selection state - map of ticketTypeId to array of recipient info
  const [selectedTickets, setSelectedTickets] = useState<Map<number, TicketPurchaseItem[]>>(new Map());
  
  // Image gallery state
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Determine if slug is numeric (API event) or string (mock event)
  const isNumericId = slug ? !isNaN(Number(slug)) : false;

  // Fetch real event from API (by ID) - wait for auth so currency is correct
  const { data: apiEvent, isLoading: apiLoading } = useQuery({
    queryKey: ['api-event', slug, activeCurrency],
    queryFn: () => eventOrderService.getEvent(Number(slug!)),
    enabled: !!slug && isNumericId && isInitialized,
  });

  // Fetch mock event by slug (fallback)
  const { data: mockEvent, isLoading: mockLoading } = useQuery({
    queryKey: ['event', slug],
    queryFn: () => slug ? eventsService.getEventBySlug(slug) : null,
    enabled: !!slug && !isNumericId,
  });

  const isLoading = isNumericId ? apiLoading : mockLoading;
  const event = apiEvent || mockEvent;
  const isAPIEvent = !!apiEvent;

  // Fetch vendor profile for API events
  const vendorId = isAPIEvent ? (apiEvent as EventResponse)?.vendorId : null;
  const { data: vendorProfile } = useQuery({
    queryKey: ['vendor-profile', vendorId],
    queryFn: () => vendorId ? reviewService.getVendorPublicProfile(vendorId) : null,
    enabled: !!vendorId,
  });

  // Helper to get ticket count for a type
  const getTicketCount = (ticketTypeId: number) => {
    return selectedTickets.get(ticketTypeId)?.length || 0;
  };

  // Helper to get total tickets
  const getTotalTickets = () => {
    let total = 0;
    selectedTickets.forEach(tickets => total += tickets.length);
    return total;
  };

  // Helper to get total price (in minor units)
  const getTotalPrice = () => {
    if (!isAPIEvent || !apiEvent || !apiEvent.ticketTypes) return 0;
    let total = 0;
    selectedTickets.forEach((tickets, ticketTypeId) => {
      const ticketType = apiEvent.ticketTypes.find(t => t.id === ticketTypeId);
      if (ticketType) {
        total += ticketType.priceMinor * tickets.length;
      }
    });
    return total;
  };

  // Add ticket for a type
  const addTicket = (ticketTypeId: number) => {
    const ticketType = apiEvent?.ticketTypes?.find(t => t.id === ticketTypeId);
    if (!ticketType || ticketType.availableCount === 0) return;
    
    const currentTickets = selectedTickets.get(ticketTypeId) || [];
    if (currentTickets.length >= Math.min(ticketType.availableCount, 10)) return;

    const newTicket: TicketPurchaseItem = {
      ticketTypeId,
      recipientName: '',
      recipientEmail: '',
      recipientPhone: '',
    };

    const newMap = new Map(selectedTickets);
    newMap.set(ticketTypeId, [...currentTickets, newTicket]);
    setSelectedTickets(newMap);
  };

  // Remove ticket for a type
  const removeTicket = (ticketTypeId: number) => {
    const currentTickets = selectedTickets.get(ticketTypeId) || [];
    if (currentTickets.length === 0) return;

    const newMap = new Map(selectedTickets);
    newMap.set(ticketTypeId, currentTickets.slice(0, -1));
    if (newMap.get(ticketTypeId)?.length === 0) {
      newMap.delete(ticketTypeId);
    }
    setSelectedTickets(newMap);
  };

  // Navigate to checkout page
  const handleProceedToCheckout = () => {
    if (!isAPIEvent || getTotalTickets() === 0) {
      toast({
        title: 'No tickets selected',
        description: 'Please select at least one ticket to proceed.',
        variant: 'destructive',
      });
      return;
    }

    // Navigate to checkout page with selected tickets
    navigate(`/events/${slug}/checkout`, {
      state: {
        selectedTickets: selectedTickets,
      },
    });
  };

  const formatEventDate = (dateString: string, timezone?: string) => {
    const date = new Date(dateString);
    const tz = timezone || 'Africa/Addis_Ababa';
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    const eventTime = date.toLocaleString('en-US', {
      timeZone: tz,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const userTime = userTimeZone !== tz ? 
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
          <p className="font-light text-eagle-green">Loading event details...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-eagle-green mb-2">Event Not Found</h2>
          <p className="font-light text-eagle-green/70 mb-4">The event you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/events')} className="bg-eagle-green hover:bg-viridian-green text-white">
            Browse All Events
          </Button>
        </div>
      </div>
    );
  }

  // Adapt data based on source (API vs Mock)
  const eventTitle = isAPIEvent ? (apiEvent as EventResponse).title : (mockEvent as Event).title;
  const eventDescription = isAPIEvent ? (apiEvent as EventResponse).description : (mockEvent as Event).description;
  const eventLocation = isAPIEvent ? (apiEvent as EventResponse).location : (mockEvent as Event).venue;
  const eventCity = isAPIEvent ? (apiEvent as EventResponse).city : (mockEvent as Event).city;
  const eventDate = isAPIEvent ? (apiEvent as EventResponse).eventDate : (mockEvent as Event).startDate;
  const eventEndDate = isAPIEvent ? (apiEvent as EventResponse).eventEndDate : (mockEvent as Event).endDate;
  const eventBanner = isAPIEvent 
    ? getEventImageUrl((apiEvent as EventResponse).images, (apiEvent as EventResponse).bannerImageUrl) 
    : (mockEvent as Event).poster;
  const eventTimezone = isAPIEvent ? 'Africa/Addis_Ababa' : (mockEvent as Event).timezone;
  const baseCurrency = isAPIEvent 
    ? ((apiEvent as EventResponse).ticketTypes?.[0]?.currency || 'ETB')
    : (mockEvent as Event).baseCurrency;
  const ticketTypes = isAPIEvent 
    ? (apiEvent as EventResponse).ticketTypes 
    : (mockEvent as Event).ticketTypes;
  const minPrice = isAPIEvent && ticketTypes?.length > 0
    ? Math.min(...(ticketTypes as TicketType[]).map(t => t.priceMinor))
    : ticketTypes?.length > 0 
      ? Math.min(...(ticketTypes as EventTicketType[]).map(t => t.price)) * 100  // Convert to minor units
      : 0;

  const { eventTime, userTime } = formatEventDate(eventDate, eventTimezone);
  const endDateFormatted = eventEndDate ? formatEventDate(eventEndDate, eventTimezone) : null;

  const apiImages = isAPIEvent ? (apiEvent as EventResponse).images : undefined;
  const eventImages: string[] = apiImages && apiImages.length > 0
    ? apiImages.map(img => getEventImageUrl([img], ''))
    : eventBanner ? [eventBanner] : [];

  const nextImage = () => {
    if (eventImages.length === 0) return;
    setSelectedImageIndex((prev) => (prev + 1) % eventImages.length);
  };

  const prevImage = () => {
    if (eventImages.length === 0) return;
    setSelectedImageIndex((prev) => (prev - 1 + eventImages.length) % eventImages.length);
  };

  const openLightbox = (index: number) => {
    setSelectedImageIndex(index);
    setLightboxOpen(true);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Lightbox Modal */}
      <AnimatePresence>
        {lightboxOpen && eventImages.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
            onClick={() => setLightboxOpen(false)}
          >
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-50"
            >
              <X className="h-8 w-8" />
            </button>
            
            {eventImages.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); prevImage(); }}
                  className="absolute left-4 text-white hover:text-gray-300 z-50 p-2 bg-black/50 rounded-full"
                >
                  <ChevronLeft className="h-8 w-8" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); nextImage(); }}
                  className="absolute right-4 text-white hover:text-gray-300 z-50 p-2 bg-black/50 rounded-full"
                >
                  <ChevronRight className="h-8 w-8" />
                </button>
              </>
            )}
            
            <motion.img
              key={selectedImageIndex}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              src={eventImages[selectedImageIndex]}
              alt={`${eventTitle} - Image ${selectedImageIndex + 1}`}
              className="max-h-[90vh] max-w-[90vw] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            
            {eventImages.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white font-light">
                {selectedImageIndex + 1} / {eventImages.length}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

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
            {/* Hero Section with Image Gallery */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              {/* Main Image */}
              <div 
                className="relative aspect-[3/2] rounded-2xl overflow-hidden mb-4 cursor-pointer group"
                onClick={() => eventImages.length > 0 && openLightbox(selectedImageIndex)}
              >
                {eventImages.length > 0 ? (
                  <>
                    <img
                      src={eventImages[selectedImageIndex]}
                      alt={eventTitle}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <ZoomIn className="h-12 w-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-eagle-green to-viridian-green flex items-center justify-center">
                    <Calendar className="h-24 w-24 text-white/50" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                
                {/* Navigation arrows for main image */}
                {eventImages.length > 1 && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); prevImage(); }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 hover:bg-white rounded-full shadow-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <ChevronLeft className="h-5 w-5 text-eagle-green" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); nextImage(); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 hover:bg-white rounded-full shadow-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <ChevronRight className="h-5 w-5 text-eagle-green" />
                    </button>
                  </>
                )}
                
                {/* Badges */}
                {isAPIEvent && (apiEvent as EventResponse).isFeatured && (
                  <div className="absolute top-4 left-4">
                    <Badge className="font-bold bg-yellow/20 text-eagle-green border-yellow">
                      Featured
                    </Badge>
                  </div>
                )}
                {!isAPIEvent && (mockEvent as Event).badges?.map(badge => (
                  <div key={badge} className="absolute top-4 left-4 flex flex-wrap gap-2">
                    <Badge className={`font-bold ${getBadgeColor(badge)}`}>
                      {badge.charAt(0).toUpperCase() + badge.slice(1)}
                    </Badge>
                  </div>
                ))}

                {/* Location */}
                <div className="absolute top-4 right-4">
                  <Badge className="bg-white/90 text-eagle-green border-none font-bold">
                    📍 {eventCity}
                  </Badge>
                </div>

                {/* Price */}
                <div className="absolute bottom-4 right-4">
                  <Badge className="bg-eagle-green text-white border-none font-bold text-lg px-3 py-1">
                    From {eventOrderService.formatCurrency(minPrice, baseCurrency)}
                  </Badge>
                </div>
                
                {/* Image counter */}
                {eventImages.length > 1 && (
                  <div className="absolute bottom-4 left-4">
                    <Badge className="bg-black/60 text-white border-none font-light">
                      {selectedImageIndex + 1} / {eventImages.length}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Thumbnail Gallery */}
              {eventImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
                  {eventImages.map((img, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                        index === selectedImageIndex 
                          ? 'border-eagle-green ring-2 ring-eagle-green/30' 
                          : 'border-transparent hover:border-gray-300'
                      }`}
                    >
                      <img
                        src={img}
                        alt={`${eventTitle} thumbnail ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <span className="text-sm font-light text-viridian-green">
                    {isAPIEvent ? (apiEvent as EventResponse).categoryName || 'Event' : 
                      EVENT_CATEGORIES.find(c => c.id === (mockEvent as Event).categoryId)?.name || 'Event'}
                  </span>
                  <h1 className="text-3xl lg:text-4xl font-bold text-eagle-green mt-1">
                    {eventTitle}
                  </h1>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-viridian-green" />
                    <span className="font-light text-eagle-green">
                      {eventTime}
                      {endDateFormatted && (
                        <> — {endDateFormatted.eventTime}</>
                      )}
                    </span>
                  </div>
                  
                  {userTime && (
                    <>
                      <Separator orientation="vertical" className="h-4" />
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-viridian-green" />
                        <span className="font-light text-eagle-green">
                          Your time: {userTime}
                          {endDateFormatted?.userTime && (
                            <> — {endDateFormatted.userTime}</>
                          )}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-viridian-green" />
                    <span className="font-light text-eagle-green">{eventLocation}</span>
                  </div>
                  
                  <Separator orientation="vertical" className="h-4" />
                  
                  <div className="flex items-center gap-1">
                    <Globe className="h-4 w-4 text-viridian-green" />
                    <span className="font-light text-eagle-green">{eventTimezone}</span>
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
                  <CardTitle className="font-bold text-eagle-green">About This Event</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-light text-eagle-green/80 leading-relaxed">
                    {eventDescription}
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Event Organizer/Vendor */}
            {vendorProfile && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <h3 className="font-bold text-eagle-green mb-3">Event Organizer</h3>
                <VendorCard vendor={vendorProfile} />
              </motion.div>
            )}

            {/* Event Reviews Section */}
            {isAPIEvent && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.35 }}
              >
                <EventReviewsSection eventId={Number(slug)} />
              </motion.div>
            )}

            {/* Ticket Types - API Events with selection */}
            {isAPIEvent && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="font-bold text-eagle-green flex items-center gap-2">
                      <Ticket className="h-5 w-5" />
                      Select Your Tickets
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {((apiEvent as EventResponse).ticketTypes || []).map((ticket) => {
                        const availability = eventOrderService.getAvailabilityStatus(ticket);
                        const count = getTicketCount(ticket.id);
                        
                        return (
                          <div 
                            key={ticket.id} 
                            className={`p-4 rounded-lg border transition-all ${
                              count > 0 
                                ? 'border-eagle-green bg-june-bud/10' 
                                : 'border-gray-200'
                            } ${!availability.available ? 'opacity-60' : ''}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-bold text-eagle-green">{ticket.name}</h4>
                                  {!availability.available ? (
                                    <Badge variant="secondary">Sold Out</Badge>
                                  ) : ticket.availableCount <= 10 && (
                                    <Badge className="bg-yellow/20 text-eagle-green border-yellow">
                                      {availability.message}
                                    </Badge>
                                  )}
                                </div>
                                {ticket.description && (
                                  <p className="font-light text-eagle-green/70 text-sm mt-1">
                                    {ticket.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <p className="font-bold text-eagle-green text-lg">
                                    {eventOrderService.formatCurrency(ticket.priceMinor, ticket.currency)}
                                  </p>
                                  <p className="font-light text-eagle-green/70 text-sm">
                                    {ticket.availableCount} available
                                  </p>
                                </div>
                                
                                {/* Quantity controls */}
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 border-eagle-green"
                                    onClick={() => removeTicket(ticket.id)}
                                    disabled={count === 0}
                                  >
                                    <Minus className="h-4 w-4" />
                                  </Button>
                                  <span className="w-8 text-center font-bold text-eagle-green">
                                    {count}
                                  </span>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 border-eagle-green"
                                    onClick={() => addTicket(ticket.id)}
                                    disabled={!availability.available || count >= Math.min(ticket.availableCount, 10)}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>

          {/* Booking Panel for API Events */}
          {isAPIEvent && (
            <div className="lg:col-span-1">
              <div className="sticky top-8 space-y-4">
                <Card className="border-eagle-green/20">
                  <CardHeader className="bg-gradient-to-r from-june-bud/10 to-white">
                    <CardTitle className="font-bold text-eagle-green flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5" />
                      Order Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    {getTotalTickets() === 0 ? (
                      <div className="text-center py-8">
                        <Ticket className="h-12 w-12 mx-auto text-eagle-green/30 mb-2" />
                        <p className="font-light text-eagle-green/70">
                          Select tickets from the list to continue
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Selected tickets summary */}
                        <div className="space-y-2">
                          {Array.from(selectedTickets.entries()).map(([ticketTypeId, tickets]) => {
                            const ticketType = (apiEvent as EventResponse).ticketTypes?.find(t => t.id === ticketTypeId);
                            if (!ticketType || tickets.length === 0) return null;
                            return (
                              <div key={ticketTypeId} className="flex justify-between text-sm">
                                <span className="font-light text-eagle-green">
                                  {ticketType.name} × {tickets.length}
                                </span>
                                <span className="font-bold text-eagle-green">
                                  {eventOrderService.formatCurrency(ticketType.priceMinor * tickets.length, ticketType.currency)}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        <Separator />

                        {/* Total */}
                        <div className="bg-june-bud/10 rounded-lg p-4">
                          <div className="flex justify-between items-center">
                            <span className="font-light text-eagle-green">Total ({getTotalTickets()} tickets)</span>
                            <span className="font-bold text-eagle-green text-xl">
                              {eventOrderService.formatCurrency(getTotalPrice(), baseCurrency)}
                            </span>
                          </div>
                        </div>

                        <Button 
                          className="w-full bg-eagle-green hover:bg-viridian-green text-white font-bold h-12"
                          onClick={handleProceedToCheckout}
                        >
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Continue to Checkout
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
