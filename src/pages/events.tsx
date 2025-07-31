import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, MapPin, Users, Clock, Star, ChevronRight, Music, Heart, Book, Sparkles, LogIn } from "lucide-react";
import SocialShareButton from "@/components/SocialShareButton";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { EventWishlistButton } from "@/components/EventWishlistButton";
import FadeIn from "@/components/animations/FadeIn";
import SlideIn from "@/components/animations/SlideIn";
import { StaggerContainer, StaggerItem } from "@/components/animations/StaggerAnimations";

interface Location {
  id: number;
  name: string;
  country: string;
  timezone: string;
  isActive: boolean;
}

interface Event {
  id: number;
  name: string;
  slug: string;
  type: string;
  description: string;
  eventDate: string;
  endDate: string;
  locationId: number;
  venue: string;
  venueAddress: string;
  ticketPrice: string;
  status: string;
  tags: string[];
  currentAttendees: number;
  maxAttendees?: number;
}

interface Service {
  id: number;
  name: string;
  slug: string;
  category: string;
  description: string;
  basePrice: string;
  duration: string;
  locationIds: number[];
  isActive: boolean;
}

interface EventPackage {
  id: number;
  eventId: number;
  name: string;
  description: string;
  packagePrice: string;
  isActive: boolean;
}

const eventTypeIcons = {
  cultural: Sparkles,
  religious: Star,
  wedding: Heart,
  concert: Music,
  workshop: Book,
};

const eventTypeColors = {
  cultural: "bg-amber-100 text-amber-800 border-amber-200",
  religious: "bg-purple-100 text-purple-800 border-purple-200",
  wedding: "bg-rose-100 text-rose-800 border-rose-200", 
  concert: "bg-blue-100 text-blue-800 border-blue-200",
  workshop: "bg-green-100 text-green-800 border-green-200",
};

export default function Events() {
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedEventType, setSelectedEventType] = useState<string>("all");
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
  });

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const { data: eventPackages = [] } = useQuery<EventPackage[]>({
    queryKey: ["/api/events", selectedEvent?.id, "packages"],
    enabled: !!selectedEvent?.id,
  });

  const filteredEvents = events.filter(event => {
    const locationMatch = selectedLocation === "all" || event.locationId.toString() === selectedLocation;
    const typeMatch = selectedEventType === "all" || event.type === selectedEventType;
    return locationMatch && typeMatch;
  });

  // Handle authentication flow for booking
  const handleBookNow = (event: Event, packageInfo?: EventPackage) => {
    console.log('handleBookNow called with event:', event, 'packageInfo:', packageInfo);
    console.log('isAuthenticated:', isAuthenticated);
    
    if (!isAuthenticated) {
      // Store booking information for after login
      const bookingData = {
        eventId: event.id,
        eventName: event.name,
        packageId: packageInfo?.id,
        packageName: packageInfo?.name,
        returnUrl: window.location.pathname + window.location.search
      };
      localStorage.setItem('pendingBooking', JSON.stringify(bookingData));
      
      toast({
        title: "Sign in required",
        description: "Please sign in to book this service. You'll be redirected back after login.",
        variant: "default",
      });
      
      // Show modal instead of immediate redirect
      setShowSignInModal(true);
      return;
    }
    
    // User is authenticated, proceed with booking
    proceedToBooking(event, packageInfo);
  };

  const handleServiceBookNow = (service: Service) => {
    console.log('handleServiceBookNow called with service:', service);
    console.log('isAuthenticated:', isAuthenticated);
    
    if (!isAuthenticated) {
      // Store service booking information
      const serviceBookingData = {
        serviceId: service.id,
        serviceName: service.name,
        serviceCategory: service.category,
        returnUrl: window.location.pathname + window.location.search
      };
      localStorage.setItem('pendingServiceBooking', JSON.stringify(serviceBookingData));
      
      toast({
        title: "Sign in required", 
        description: "Please sign in to book this service. You'll be redirected back after login.",
        variant: "default",
      });
      
      setSelectedService(service);
      setShowSignInModal(true);
      return;
    }
    
    // User is authenticated, proceed with service booking
    proceedToServiceBooking(service);
  };

  const proceedToBooking = (event: Event, packageInfo?: EventPackage) => {
    // Navigate to booking page with event details
    const bookingUrl = `/events/booking?eventId=${event.id}&eventName=${encodeURIComponent(event.name)}${
      packageInfo ? `&packageId=${packageInfo.id}&packageName=${encodeURIComponent(packageInfo.name)}` : ''
    }`;
    window.location.href = bookingUrl;
  };

  const proceedToServiceBooking = (service: Service) => {
    // Navigate to service booking page
    const serviceBookingUrl = `/services/booking?serviceId=${service.id}&serviceName=${encodeURIComponent(service.name)}&category=${service.category}`;
    window.location.href = serviceBookingUrl;
  };

  const handleSignInRedirect = () => {
    // Store current page for return after login
    localStorage.setItem('returnTo', window.location.pathname + window.location.search);
    window.location.href = "/api/login";
  };

  const handleSignInModalClose = () => {
    setShowSignInModal(false);
    setSelectedService(null);
    // Clear pending booking data if user cancels
    localStorage.removeItem('pendingBooking');
    localStorage.removeItem('pendingServiceBooking');
  };

  // Handle return from authentication
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      // Check for pending bookings after successful login
      const pendingBooking = localStorage.getItem('pendingBooking');
      const pendingServiceBooking = localStorage.getItem('pendingServiceBooking');
      
      if (pendingBooking) {
        try {
          const bookingData = JSON.parse(pendingBooking);
          const event = events.find(e => e.id === bookingData.eventId);
          if (event) {
            const pkg = eventPackages.find(p => p.id === bookingData.packageId);
            toast({
              title: "Welcome back!",
              description: `Continuing with your ${event.name} booking.`,
              variant: "default",
            });
            proceedToBooking(event, pkg);
          }
          localStorage.removeItem('pendingBooking');
        } catch (error) {
          console.error('Error processing pending booking:', error);
          localStorage.removeItem('pendingBooking');
        }
      }
      
      if (pendingServiceBooking) {
        try {
          const serviceData = JSON.parse(pendingServiceBooking);
          const service = services.find(s => s.id === serviceData.serviceId);
          if (service) {
            toast({
              title: "Welcome back!",
              description: `Continuing with your ${service.name} booking.`,
              variant: "default",
            });
            proceedToServiceBooking(service);
          }
          localStorage.removeItem('pendingServiceBooking');
        } catch (error) {
          console.error('Error processing pending service booking:', error);
          localStorage.removeItem('pendingServiceBooking');
        }
      }
    }
  }, [isAuthenticated, isLoading, events, services, eventPackages]);

  const getLocationName = (locationId: number) => {
    return locations.find(loc => loc.id === locationId)?.name || "Unknown Location";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getEventTypeIcon = (type: string) => {
    const IconComponent = eventTypeIcons[type as keyof typeof eventTypeIcons] || Sparkles;
    return <IconComponent className="w-4 h-4" />;
  };

  const getEventTypeColor = (type: string) => {
    return eventTypeColors[type as keyof typeof eventTypeColors] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <FadeIn duration={0.8} className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Ethiopian Events & Services
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Connect with your culture through authentic events, traditional services, and meaningful celebrations across key diaspora communities.
          </p>
        </FadeIn>

        <FadeIn delay={0.2} duration={0.6}>
          <Tabs defaultValue="events" className="space-y-8">
            <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
              <TabsTrigger value="events" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Events
              </TabsTrigger>
              <TabsTrigger value="services" className="flex items-center gap-2">
                <Star className="w-4 h-4" />
                Services
              </TabsTrigger>
            </TabsList>

          <TabsContent value="events" className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger className="w-full md:w-64">
                  <SelectValue placeholder="Select Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map(location => (
                    <SelectItem key={location.id} value={location.id.toString()}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedEventType} onValueChange={setSelectedEventType}>
                <SelectTrigger className="w-full md:w-64">
                  <SelectValue placeholder="Event Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="cultural">Cultural</SelectItem>
                  <SelectItem value="religious">Religious</SelectItem>
                  <SelectItem value="wedding">Wedding</SelectItem>
                  <SelectItem value="concert">Concert</SelectItem>
                  <SelectItem value="workshop">Workshop</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Events Grid */}
            <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" staggerDelay={0.1}>
              {filteredEvents.map(event => (
                <StaggerItem key={event.id}>
                  <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm">
                  <CardHeader className="space-y-3">
                    <div className="flex items-start justify-between">
                      <Badge className={`${getEventTypeColor(event.type)} flex items-center gap-1`}>
                        {getEventTypeIcon(event.type)}
                        {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                      </Badge>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-amber-600">${event.ticketPrice}</p>
                        <p className="text-xs text-gray-500">per person</p>
                      </div>
                    </div>
                    <CardTitle className="text-xl group-hover:text-amber-600 transition-colors">
                      {event.name}
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <p className="text-gray-600 text-sm line-clamp-3">
                      {event.description}
                    </p>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(event.eventDate)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>{formatTime(event.eventDate)} - {formatTime(event.endDate)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>{getLocationName(event.locationId)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Users className="w-4 h-4" />
                        <span>{event.currentAttendees} attending</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 mt-3">
                      {event.tags.slice(0, 3).map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button 
                        className="flex-1 bg-amber-600 hover:bg-amber-700" 
                        onClick={() => setSelectedEvent(event)}
                      >
                        View Details
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                      <EventWishlistButton
                        eventId={event.id}
                        eventName={event.name}
                        showLabel={false}
                        size="default"
                        className="flex-shrink-0"
                      />
                    </div>
                    <div className="mt-2">
                      <SocialShareButton
                        title={`${event.name} - Ethiopian Cultural Event`}
                        description={`Join us for ${event.name} on ${formatDate(event.eventDate)} at ${event.venue}. ${event.description}`}
                        url={`${window.location.origin}/events?event=${event.id}`}
                        hashtags={['goZembil', 'EthiopianEvents', event.type, ...event.tags.slice(0, 2)]}
                        size="sm"
                        variant="ghost"
                        className="w-full"
                      />
                    </div>
                  </CardContent>
                  </Card>
                </StaggerItem>
              ))}
            </StaggerContainer>

            {filteredEvents.length === 0 && (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No Events Found</h3>
                <p className="text-gray-500">Try adjusting your filters to find events.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="services" className="space-y-6">
            <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" staggerDelay={0.1}>
              {services.map(service => (
                <StaggerItem key={service.id}>
                  <Card className="hover:shadow-lg transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <Badge variant="outline" className="mb-2">
                        {service.category.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-amber-600">${service.basePrice}</p>
                        <p className="text-xs text-gray-500">{service.duration}</p>
                      </div>
                    </div>
                    <CardTitle className="text-xl">{service.name}</CardTitle>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <p className="text-gray-600 text-sm">
                      {service.description}
                    </p>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>
                        {service.locationIds.length} location{service.locationIds.length !== 1 ? 's' : ''} available
                      </span>
                    </div>

                    <div className="space-y-2">
                      <Button 
                        className="w-full bg-amber-600 hover:bg-amber-700"
                        onClick={() => handleServiceBookNow(service)}
                      >
                        Book Service
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                      <SocialShareButton
                        title={`${service.name} - Professional Ethiopian Service`}
                        description={`Experience ${service.name} - ${service.category} service. ${service.description}`}
                        url={`${window.location.origin}/events?service=${service.id}`}
                        hashtags={['goZembil', 'EthiopianServices', service.category.replace(/\s+/g, ''), 'ProfessionalService']}
                        size="sm"
                        variant="outline"
                        className="w-full"
                      />
                    </div>
                  </CardContent>
                  </Card>
                </StaggerItem>
              ))}
            </StaggerContainer>

            {services.length === 0 && (
              <div className="text-center py-12">
                <Star className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No Services Available</h3>
                <p className="text-gray-500">Services will be displayed here once available.</p>
              </div>
            )}
          </TabsContent>
          </Tabs>
        </FadeIn>

        {/* Event Details Modal */}
        {selectedEvent && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <Badge className={`${getEventTypeColor(selectedEvent.type)} flex items-center gap-1 mb-2`}>
                      {getEventTypeIcon(selectedEvent.type)}
                      {selectedEvent.type.charAt(0).toUpperCase() + selectedEvent.type.slice(1)}
                    </Badge>
                    <CardTitle className="text-2xl">{selectedEvent.name}</CardTitle>
                  </div>
                  <Button variant="ghost" onClick={() => setSelectedEvent(null)}>
                    ✕
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <p className="text-gray-600">
                  {selectedEvent.description}
                </p>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-amber-600" />
                      <span>{formatDate(selectedEvent.eventDate)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <span>{formatTime(selectedEvent.eventDate)} - {formatTime(selectedEvent.endDate)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-amber-600" />
                      <span>{selectedEvent.venue}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4 text-amber-600" />
                      <span>{selectedEvent.currentAttendees} attending</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">
                      <strong>Address:</strong><br />
                      {selectedEvent.venueAddress}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Base Price:</strong> ${selectedEvent.ticketPrice}
                    </p>
                  </div>
                </div>

                {eventPackages.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">Event Packages</h3>
                    <div className="grid gap-3">
                      {eventPackages.map(pkg => (
                        <Card key={pkg.id} className="bg-amber-50">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-semibold">{pkg.name}</h4>
                                <p className="text-sm text-gray-600 mt-1">{pkg.description}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold text-amber-600">${pkg.packagePrice}</p>
                                <Button 
                                  size="sm" 
                                  className="mt-2 bg-amber-600 hover:bg-amber-700"
                                  onClick={() => handleBookNow(selectedEvent, pkg)}
                                >
                                  Select
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-1">
                  {selectedEvent.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>

                <div className="space-y-3 pt-4">
                  <div className="flex gap-3">
                    <Button 
                      className="flex-1 bg-amber-600 hover:bg-amber-700"
                      onClick={() => handleBookNow(selectedEvent)}
                    >
                      Book Now - ${selectedEvent.ticketPrice}
                    </Button>
                    <EventWishlistButton
                      eventId={selectedEvent.id}
                      eventName={selectedEvent.name}
                      showLabel={true}
                      size="default"
                      className="flex-1"
                    />
                  </div>
                  <SocialShareButton
                    title={`${selectedEvent.name} - Ethiopian Cultural Event`}
                    description={`Join us for ${selectedEvent.name} on ${formatDate(selectedEvent.eventDate)} at ${selectedEvent.venue}. ${selectedEvent.description}`}
                    url={`${window.location.origin}/events?event=${selectedEvent.id}`}
                    hashtags={['goZembil', 'EthiopianEvents', selectedEvent.type, ...selectedEvent.tags.slice(0, 2)]}
                    size="default"
                    variant="outline"
                    className="w-full"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Sign In Modal */}
        <Dialog open={showSignInModal} onOpenChange={setShowSignInModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <LogIn className="w-5 h-5 text-amber-600" />
                Sign In Required
              </DialogTitle>
              <DialogDescription>
                {selectedService ? (
                  <>You need to sign in to book <strong>{selectedService.name}</strong>. This ensures secure payment and proper coordination for your service.</>
                ) : (
                  <>You need to sign in to book this event. This ensures secure payment and proper coordination for your booking.</>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 pt-4">
              <Button 
                className="w-full bg-amber-600 hover:bg-amber-700"
                onClick={handleSignInRedirect}
              >
                <LogIn className="w-4 h-4 mr-2" />
                Sign In to Continue
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleSignInModalClose}
              >
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}