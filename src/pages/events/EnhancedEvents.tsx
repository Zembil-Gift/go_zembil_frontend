import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, MapPin, Users, Clock, Star, ChevronRight, Music, Heart, Book, Sparkles, LogIn, CreditCard, Filter, Search, X, Coffee, Utensils, Camera, Palette, PartyPopper, Church, Mic, Crown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { EventWishlistButton } from "@/components/EventWishlistButton";
import { Input } from "@/components/ui/input";
import { format, isValid } from "date-fns";

type Event = {
  id: number;
  name: string;
  description: string;
  eventDate: string;
  endDate: string;
  location: { id: number; name: string; country: string };
  type: string;
  ticketPrice: string;
  maxAttendees: number;
  currentAttendees: number;
  featuredImage: string;
  packages: Array<{
    id: number;
    name: string;
    price: number;
    description: string;
    features: string[];
  }>;
};

type Service = {
  id: number;
  name: string;
  description: string;
  category: string;
  basePrice: number;
  duration: string;
  location: { id: number; name: string; country: string };
  providerName: string;
  providerRating: number;
  featuredImage: string;
  features: string[];
};

type Location = {
  id: number;
  name: string;
  country: string;
};

// Ethiopian-inspired gradient patterns
const EthiopianPatterns = {
  zembil: "bg-gradient-to-br from-amber-50 via-orange-50 to-red-50",
  cultural: "bg-gradient-to-br from-green-50 via-yellow-50 to-red-50",
  gold: "bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50",
  earth: "bg-gradient-to-br from-orange-50 via-red-50 to-yellow-50"
};

const CategoryIcons = {
  'Concerts': Music,
  'Religious': Church,
  'Cultural': Crown,
  'Wedding': Heart,
  'Community': Users,
  'Food': Utensils,
  'Photography': Camera,
  'Art': Palette,
  'Entertainment': PartyPopper,
  'Catering': Coffee,
  'Music': Mic,
  'Traditional': Sparkles
};

// Safe date formatter utility
const formatEventDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Date TBD';
  
  try {
    const date = new Date(dateString);
    if (!isValid(date)) return 'Date TBD';
    return format(date, 'PPP');
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Date TBD';
  }
};

export default function EnhancedEvents() {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [bookingType, setBookingType] = useState<'event' | 'service'>('event');
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priceFilter, setPriceFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  // Data fetching
  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['/api/events'],
    enabled: true,
  });

  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ['/api/services'],
    enabled: true,
  });

  const { data: locations = [], isLoading: locationsLoading } = useQuery({
    queryKey: ['/api/locations'],
    enabled: true,
  });

  // Booking mutations
  const createEventBooking = useMutation({
    mutationFn: async (bookingData: any) => {
      const response = await apiRequest("POST", "/api/event-bookings", bookingData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Event Booked Successfully!",
        description: "Your booking has been confirmed. Check your bookings in your profile.",
      });
      setShowBookingDialog(false);
      queryClient.invalidateQueries({ queryKey: ['/api/event-bookings'] });
    },
    onError: (error: any) => {
      toast({
        title: "Booking Failed",
        description: error.message || "Unable to book event. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createServiceBooking = useMutation({
    mutationFn: async (bookingData: any) => {
      const response = await apiRequest("POST", "/api/service-bookings", bookingData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Service Booked Successfully!",
        description: "Your service booking has been confirmed. The provider will contact you soon.",
      });
      setShowBookingDialog(false);
      queryClient.invalidateQueries({ queryKey: ['/api/service-bookings'] });
    },
    onError: (error: any) => {
      toast({
        title: "Booking Failed",
        description: error.message || "Unable to book service. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Filter functions
  const filteredEvents = events.filter((event: Event) => {
    const matchesSearch = event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLocation = locationFilter === "all" || event.location?.id?.toString() === locationFilter;
    const matchesCategory = categoryFilter === "all" || event.type === categoryFilter;
    const matchesPrice = priceFilter === "all" || 
                        (priceFilter === "free" && parseFloat(event.ticketPrice) === 0) ||
                        (priceFilter === "paid" && parseFloat(event.ticketPrice) > 0);
    return matchesSearch && matchesLocation && matchesCategory && matchesPrice;
  });

  const filteredServices = services.filter((service: Service) => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLocation = locationFilter === "all" || service.location?.id?.toString() === locationFilter;
    const matchesCategory = categoryFilter === "all" || service.category === categoryFilter;
    const matchesPrice = priceFilter === "all" || 
                        (priceFilter === "free" && service.basePrice === 0) ||
                        (priceFilter === "paid" && service.basePrice > 0);
    return matchesSearch && matchesLocation && matchesCategory && matchesPrice;
  });

  const handleBookEvent = (event: Event, packageData?: any) => {
    if (!isAuthenticated) {
      toast({
        title: "Please Sign In",
        description: "You need to be signed in to book events.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 1500);
      return;
    }
    
    setSelectedEvent(event);
    setSelectedPackage(packageData);
    setBookingType('event');
    setShowBookingDialog(true);
  };

  const handleBookService = (service: Service) => {
    if (!isAuthenticated) {
      toast({
        title: "Please Sign In",
        description: "You need to be signed in to book services.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 1500);
      return;
    }
    
    setSelectedService(service);
    setBookingType('service');
    setShowBookingDialog(true);
  };

  const handleConfirmBooking = () => {
    if (bookingType === 'event' && selectedEvent) {
      createEventBooking.mutate({
        eventId: selectedEvent.id,
        packageId: selectedPackage?.id,
        numberOfTickets: 1,
        totalAmount: selectedPackage?.price || selectedEvent.price,
        specialRequests: ""
      });
    } else if (bookingType === 'service' && selectedService) {
      createServiceBooking.mutate({
        serviceId: selectedService.id,
        preferredDate: new Date().toISOString(),
        message: "",
        totalAmount: selectedService.price
      });
    }
  };

  const getCategoryIcon = (category: string) => {
    const IconComponent = CategoryIcons[category as keyof typeof CategoryIcons] || Sparkles;
    return <IconComponent className="w-4 h-4" />;
  };

  const getServiceTypeColor = (category: string) => {
    const colors = {
      'Catering': 'bg-gradient-to-r from-orange-500 to-red-500',
      'Music': 'bg-gradient-to-r from-purple-500 to-pink-500',
      'Photography': 'bg-gradient-to-r from-blue-500 to-cyan-500',
      'Art': 'bg-gradient-to-r from-green-500 to-teal-500',
      'Entertainment': 'bg-gradient-to-r from-yellow-500 to-orange-500',
      'Traditional': 'bg-gradient-to-r from-amber-500 to-yellow-500',
    };
    return colors[category as keyof typeof colors] || 'bg-gradient-to-r from-gray-500 to-gray-600';
  };

  if (eventsLoading || servicesLoading || locationsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl text-white shadow-lg">
              <Calendar className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                Events & Services
              </h1>
              <p className="text-gray-600 mt-1">
                Discover authentic Ethiopian cultural experiences and professional services
              </p>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search events and services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/80 border-amber-200 focus:border-amber-400"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="bg-white/80 border-amber-200 hover:bg-amber-50"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>

          {showFilters && (
            <Card className="bg-white/80 border-amber-200 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Location</label>
                    <Select value={locationFilter} onValueChange={setLocationFilter}>
                      <SelectTrigger className="bg-white border-amber-200">
                        <SelectValue placeholder="All locations" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Locations</SelectItem>
                        {locations.map((location: Location) => (
                          <SelectItem key={location.id} value={location.id.toString()}>
                            {location.name}, {location.country}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Category</label>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="bg-white border-amber-200">
                        <SelectValue placeholder="All categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="Cultural">Cultural</SelectItem>
                        <SelectItem value="Religious">Religious</SelectItem>
                        <SelectItem value="Concerts">Concerts</SelectItem>
                        <SelectItem value="Wedding">Wedding</SelectItem>
                        <SelectItem value="Community">Community</SelectItem>
                        <SelectItem value="Food">Food</SelectItem>
                        <SelectItem value="Photography">Photography</SelectItem>
                        <SelectItem value="Art">Art</SelectItem>
                        <SelectItem value="Entertainment">Entertainment</SelectItem>
                        <SelectItem value="Catering">Catering</SelectItem>
                        <SelectItem value="Music">Music</SelectItem>
                        <SelectItem value="Traditional">Traditional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Price</label>
                    <Select value={priceFilter} onValueChange={setPriceFilter}>
                      <SelectTrigger className="bg-white border-amber-200">
                        <SelectValue placeholder="All prices" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Prices</SelectItem>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main Content */}
        <Tabs defaultValue="events" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 bg-white/80 border border-amber-200">
            <TabsTrigger value="events" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white">
              Events ({filteredEvents.length})
            </TabsTrigger>
            <TabsTrigger value="services" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white">
              Services ({filteredServices.length})
            </TabsTrigger>
          </TabsList>

          {/* Events Tab */}
          <TabsContent value="events" className="space-y-6">
            {filteredEvents.length === 0 ? (
              <Card className="bg-white/80 border-amber-200 backdrop-blur-sm">
                <CardContent className="p-8 text-center">
                  <Calendar className="w-16 h-16 mx-auto mb-4 text-amber-500" />
                  <h3 className="text-xl font-semibold mb-2">No Events Found</h3>
                  <p className="text-gray-600">Try adjusting your search or filters to find events.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEvents.map((event: Event) => (
                  <Card key={event.id} className="group bg-white/90 border-amber-200 backdrop-blur-sm hover:shadow-xl transition-all duration-300 hover:scale-105 overflow-hidden">
                    <div className="relative h-48 overflow-hidden">
                      <img 
                        src={event.imageUrl} 
                        alt={event.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      <div className="absolute top-4 right-4 z-10">
                        <EventWishlistButton eventId={event.id} />
                      </div>
                      <div className="absolute bottom-4 left-4 z-10">
                        <Badge className={`${getServiceTypeColor(event.category)} text-white border-none shadow-lg`}>
                          {getCategoryIcon(event.category)}
                          <span className="ml-2">{event.category}</span>
                        </Badge>
                      </div>
                    </div>
                    
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-xl font-bold text-gray-800 line-clamp-2">{event.name}</h3>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-amber-600">
                            ${event.price}
                          </p>
                          {event.price === 0 && (
                            <Badge variant="outline" className="border-green-500 text-green-600">
                              Free
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-gray-600 mb-4 line-clamp-2">{event.description}</p>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4 text-amber-500" />
                          <span>{formatEventDate(event.eventDate)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin className="w-4 h-4 text-amber-500" />
                          <span>{event.location?.name || 'Location TBD'}, {event.location?.country || ''}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Users className="w-4 h-4 text-amber-500" />
                          <span>{event.currentAttendees}/{event.maxCapacity} attending</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => handleBookEvent(event)}
                          className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium shadow-lg"
                        >
                          <CreditCard className="w-4 h-4 mr-2" />
                          Book Event
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setSelectedEvent(event)}
                          className="border-amber-200 hover:bg-amber-50"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Services Tab */}
          <TabsContent value="services" className="space-y-6">
            {filteredServices.length === 0 ? (
              <Card className="bg-white/80 border-amber-200 backdrop-blur-sm">
                <CardContent className="p-8 text-center">
                  <Sparkles className="w-16 h-16 mx-auto mb-4 text-amber-500" />
                  <h3 className="text-xl font-semibold mb-2">No Services Found</h3>
                  <p className="text-gray-600">Try adjusting your search or filters to find services.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredServices.map((service: Service) => (
                  <Card key={service.id} className="group bg-white/90 border-amber-200 backdrop-blur-sm hover:shadow-xl transition-all duration-300 hover:scale-105 overflow-hidden">
                    <div className="relative h-48 overflow-hidden">
                      <img 
                        src={service.imageUrl} 
                        alt={service.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      <div className="absolute bottom-4 left-4 z-10">
                        <Badge className={`${getServiceTypeColor(service.category)} text-white border-none shadow-lg`}>
                          {getCategoryIcon(service.category)}
                          <span className="ml-2">{service.category}</span>
                        </Badge>
                      </div>
                    </div>
                    
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-xl font-bold text-gray-800 line-clamp-2">{service.name}</h3>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-amber-600">
                            ${service.price}
                          </p>
                          {service.price === 0 && (
                            <Badge variant="outline" className="border-green-500 text-green-600">
                              Free
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-gray-600 mb-4 line-clamp-2">{service.description}</p>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4 text-amber-500" />
                          <span>{service.duration}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin className="w-4 h-4 text-amber-500" />
                          <span>{service.location?.name || 'Location TBD'}, {service.location?.country || ''}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Star className="w-4 h-4 text-amber-500 fill-current" />
                          <span>{service.providerRating}/5 • {service.providerName}</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => handleBookService(service)}
                          className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium shadow-lg"
                        >
                          <CreditCard className="w-4 h-4 mr-2" />
                          Book Service
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setSelectedService(service)}
                          className="border-amber-200 hover:bg-amber-50"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Booking Dialog */}
        <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
          <DialogContent className="sm:max-w-md bg-white/95 backdrop-blur-sm border-amber-200">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-amber-600">
                Confirm Booking
              </DialogTitle>
              <DialogDescription>
                {bookingType === 'event' ? 
                  `Book your spot for ${selectedEvent?.name}` : 
                  `Book service with ${selectedService?.providerName}`
                }
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {bookingType === 'event' && selectedEvent && (
                <div className="bg-amber-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-amber-800 mb-2">{selectedEvent.name}</h4>
                  <p className="text-sm text-amber-700 mb-2">{selectedEvent.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-amber-700">
                      {formatEventDate(selectedEvent.eventDate)}
                    </span>
                    <span className="font-bold text-amber-800">
                      ${selectedPackage?.price || selectedEvent.price}
                    </span>
                  </div>
                </div>
              )}
              
              {bookingType === 'service' && selectedService && (
                <div className="bg-amber-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-amber-800 mb-2">{selectedService.name}</h4>
                  <p className="text-sm text-amber-700 mb-2">{selectedService.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-amber-700">
                      Duration: {selectedService.duration}
                    </span>
                    <span className="font-bold text-amber-800">
                      ${selectedService.price}
                    </span>
                  </div>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowBookingDialog(false)}
                  className="flex-1 border-amber-200 hover:bg-amber-50"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmBooking}
                  disabled={createEventBooking.isPending || createServiceBooking.isPending}
                  className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                >
                  {(createEventBooking.isPending || createServiceBooking.isPending) ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Booking...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Confirm Booking
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}