import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Search, 
  Filter, 
  Globe, 
  Star,
  Users,
  Tag,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

import { 
  Event, 
  Service, 
  EventFilters, 
  ServiceFilters, 
  Country,
  CITIES,
  EVENT_CATEGORIES,
  SERVICE_CATEGORIES
} from '@/types/events';
import { eventsService } from '@/services/eventsService';

// Helper function for badge colors
const getBadgeColor = (badge: string) => {
  switch (badge) {
    case 'new': return 'bg-yellow/20 text-eagle-green border-yellow';
    case 'limited': return 'bg-yellow/20 text-eagle-green border-yellow/50';
    case 'popular': return 'bg-viridian-green/20 text-viridian-green border-viridian-green/50';
    case 'refundable': return 'bg-june-bud/20 text-eagle-green border-june-bud';
    default: return 'bg-gray-100 text-gray-700 border-gray-300';
  }
};

export default function Events() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Parse URL parameters for filters
  const urlParams = new URLSearchParams(location.search);
  const [activeTab, setActiveTab] = useState<'events' | 'services'>(
    urlParams.get('tab') as 'events' | 'services' || 'events'
  );
  
  const [eventFilters, setEventFilters] = useState<EventFilters>({
    q: urlParams.get('q') || '',
    country: urlParams.get('country') as Country || undefined,
    city: urlParams.get('city') || '',
    category: urlParams.get('category') || '',
    sort: urlParams.get('sort') || 'popular',
    dateFrom: urlParams.get('dateFrom') || '',
    dateTo: urlParams.get('dateTo') || '',
    priceMin: urlParams.get('priceMin') ? Number(urlParams.get('priceMin')) : undefined,
    priceMax: urlParams.get('priceMax') ? Number(urlParams.get('priceMax')) : undefined,
  });

  const [serviceFilters, setServiceFilters] = useState<ServiceFilters>({
    country: urlParams.get('country') as Country || undefined,
    city: urlParams.get('city') || '',
    category: urlParams.get('serviceCategory') as any || undefined,
    sort: urlParams.get('sort') || 'rating',
    priceMin: urlParams.get('priceMin') ? Number(urlParams.get('priceMin')) : undefined,
    priceMax: urlParams.get('priceMax') ? Number(urlParams.get('priceMax')) : undefined,
  });

  const [showFilters, setShowFilters] = useState(false);

  // Fetch events
  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ['events', eventFilters],
    queryFn: () => eventsService.getEvents(eventFilters),
    enabled: activeTab === 'events',
  });

  // Fetch services
  const { data: servicesData, isLoading: servicesLoading } = useQuery({
    queryKey: ['services', serviceFilters],
    queryFn: () => eventsService.getServices(serviceFilters),
    enabled: activeTab === 'services',
  });

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('tab', activeTab);
    
    const filters = activeTab === 'events' ? eventFilters : serviceFilters;
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        if (key === 'category' && activeTab === 'services') {
          params.set('serviceCategory', value.toString());
        } else {
          params.set(key, value.toString());
        }
      }
    });

    navigate(`/events?${params.toString()}`, { replace: true });
  }, [activeTab, eventFilters, serviceFilters, navigate]);

  const updateEventFilters = (newFilters: Partial<EventFilters>) => {
    setEventFilters(prev => ({ ...prev, ...newFilters }));
  };

  const updateServiceFilters = (newFilters: Partial<ServiceFilters>) => {
    setServiceFilters(prev => ({ ...prev, ...newFilters }));
  };

  const clearFilters = () => {
    if (activeTab === 'events') {
      setEventFilters({
        q: '',
        sort: 'popular',
      });
    } else {
      setServiceFilters({
        sort: 'rating',
      });
    }
  };

  const getAvailableCities = (country?: Country) => {
    if (!country) return [];
    return CITIES[country];
  };

  const formatEventDate = (dateString: string, timezone: string) => {
    const date = new Date(dateString);
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    const eventTime = date.toLocaleString('en-US', {
      timeZone: timezone,
      weekday: 'short',
      month: 'short',
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

  const formatPrice = (price: number, currency: string) => {
    return eventsService.formatCurrency(price, currency);
  };



  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl lg:text-4xl font-gotham-bold text-eagle-green mb-4">
            Gift Experiences & Professional Services
          </h1>
          <p className="text-lg font-gotham-light text-viridian-green max-w-3xl mx-auto">
            Discover memorable experiences in Ethiopia and U.S. Habesha communities, plus professional services for your special events.
          </p>
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'events' | 'services')} className="mb-8">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 bg-june-bud/10 p-1">
            <TabsTrigger 
              value="events" 
              className="font-gotham-bold data-[state=active]:bg-eagle-green data-[state=active]:text-white"
            >
              Gift Events
            </TabsTrigger>
            <TabsTrigger 
              value="services" 
              className="font-gotham-bold data-[state=active]:bg-eagle-green data-[state=active]:text-white"
            >
              Professional Services
            </TabsTrigger>
          </TabsList>

          {/* Sticky Filter Bar */}
          <motion.div 
            className="sticky top-0 z-20 bg-white border-b border-june-bud/20 py-4 mb-8"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex flex-col lg:flex-row gap-4 items-center">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-eagle-green/60 h-5 w-5" />
                <Input
                  placeholder={activeTab === 'events' ? "Search events..." : "Search services..."}
                  value={activeTab === 'events' ? eventFilters.q : ''}
                  onChange={(e) => {
                    if (activeTab === 'events') {
                      updateEventFilters({ q: e.target.value });
                    }
                  }}
                  className="pl-10 h-12 bg-white border border-eagle-green/30 focus:border-viridian-green focus:ring-2 focus:ring-viridian-green/20 font-gotham-light"
                />
              </div>

              {/* Quick filters */}
              <div className="flex gap-3 flex-wrap">
                {/* Country */}
                <Select 
                  value={(activeTab === 'events' ? eventFilters.country : serviceFilters.country) || 'all'} 
                  onValueChange={(value) => {
                    const country = value === 'all' ? undefined : (value as Country);
                    if (activeTab === 'events') {
                      updateEventFilters({ country, city: '' });
                    } else {
                      updateServiceFilters({ country, city: '' });
                    }
                  }}
                >
                  <SelectTrigger className="w-32 h-12 bg-white border border-eagle-green/30 focus:border-viridian-green">
                    <Globe className="h-4 w-4 text-eagle-green mr-1" />
                    <SelectValue placeholder="Country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Countries</SelectItem>
                    <SelectItem value="ET">🇪🇹 Ethiopia</SelectItem>
                    <SelectItem value="US">🇺🇸 United States</SelectItem>
                  </SelectContent>
                </Select>

                {/* City */}
                <Select 
                  value={(activeTab === 'events' ? eventFilters.city : serviceFilters.city) || 'all'} 
                  onValueChange={(value) => {
                    const city = value === 'all' ? '' : value;
                    if (activeTab === 'events') {
                      updateEventFilters({ city });
                    } else {
                      updateServiceFilters({ city });
                    }
                  }}
                  disabled={!(activeTab === 'events' ? eventFilters.country : serviceFilters.country)}
                >
                  <SelectTrigger className="w-40 h-12 bg-white border border-eagle-green/30 focus:border-viridian-green">
                    <MapPin className="h-4 w-4 text-eagle-green mr-1" />
                    <SelectValue placeholder="City" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cities</SelectItem>
                    {getAvailableCities(activeTab === 'events' ? eventFilters.country : serviceFilters.country).map(city => (
                      <SelectItem key={city.id} value={city.id}>{city.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Sort */}
                <Select 
                  value={(activeTab === 'events' ? eventFilters.sort : serviceFilters.sort) || ''} 
                  onValueChange={(value) => {
                    if (activeTab === 'events') {
                      updateEventFilters({ sort: value });
                    } else {
                      updateServiceFilters({ sort: value });
                    }
                  }}
                >
                  <SelectTrigger className="w-36 h-12 bg-white border border-eagle-green/30 focus:border-viridian-green">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeTab === 'events' ? (
                      <>
                        <SelectItem value="popular">Most Popular</SelectItem>
                        <SelectItem value="date">By Date</SelectItem>
                        <SelectItem value="price-low">Price: Low to High</SelectItem>
                        <SelectItem value="price-high">Price: High to Low</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="rating">Top Rated</SelectItem>
                        <SelectItem value="price-low">Price: Low to High</SelectItem>
                        <SelectItem value="price-high">Price: High to Low</SelectItem>
                        <SelectItem value="newest">Newest</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>

                {/* More Filters Toggle */}
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="h-12 border-eagle-green text-eagle-green hover:bg-eagle-green hover:text-white"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  More Filters
                  <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                </Button>
              </div>
            </div>

            {/* Expanded Filters */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mt-4 pt-4 border-t border-june-bud/20"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {activeTab === 'events' ? (
                      <>
                        {/* Event Category */}
                        <Select 
                          value={eventFilters.category || 'all'} 
                          onValueChange={(value) => updateEventFilters({ category: value === 'all' ? '' : value })}
                        >
                          <SelectTrigger className="bg-white border border-eagle-green/30">
                            <SelectValue placeholder="Event Category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {EVENT_CATEGORIES.map(cat => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.icon} {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* Date From */}
                        <Input
                          type="date"
                          placeholder="From Date"
                          value={eventFilters.dateFrom || ''}
                          onChange={(e) => updateEventFilters({ dateFrom: e.target.value })}
                          className="bg-white border border-eagle-green/30"
                        />

                        {/* Date To */}
                        <Input
                          type="date"
                          placeholder="To Date"
                          value={eventFilters.dateTo || ''}
                          onChange={(e) => updateEventFilters({ dateTo: e.target.value })}
                          className="bg-white border border-eagle-green/30"
                        />
                      </>
                    ) : (
                      <>
                        {/* Service Category */}
                        <Select 
                          value={serviceFilters.category || 'all'} 
                          onValueChange={(value) => updateServiceFilters({ category: value === 'all' ? undefined : (value as any) })}
                        >
                          <SelectTrigger className="bg-white border border-eagle-green/30">
                            <SelectValue placeholder="Service Category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Services</SelectItem>
                            {Object.entries(SERVICE_CATEGORIES).map(([key, value]) => (
                              <SelectItem key={key} value={key}>
                                {value.icon} {value.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    )}

                    {/* Clear Filters */}
                    <Button
                      variant="ghost"
                      onClick={clearFilters}
                      className="text-eagle-green hover:text-viridian-green hover:bg-june-bud/10"
                    >
                      Clear All Filters
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Events Tab Content */}
          <TabsContent value="events" className="space-y-6">
            {eventsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <Skeleton className="h-48 w-full bg-june-bud/20" />
                    <CardContent className="p-4">
                      <Skeleton className="h-6 w-3/4 mb-2 bg-june-bud/20" />
                      <Skeleton className="h-4 w-1/2 mb-2 bg-june-bud/20" />
                      <Skeleton className="h-4 w-2/3 bg-june-bud/20" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : eventsData?.events.length === 0 ? (
              <div className="text-center py-16">
                <Calendar className="h-16 w-16 text-eagle-green/30 mx-auto mb-4" />
                <h3 className="text-xl font-gotham-bold text-eagle-green mb-2">No events found</h3>
                <p className="text-eagle-green/70 font-gotham-light mb-4">Try adjusting your filters to find more events.</p>
                <Button onClick={clearFilters} className="bg-eagle-green hover:bg-viridian-green text-white">
                  Clear Filters
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {eventsData?.events.map((event, index) => (
                  <EventCard key={event.id} event={event} index={index} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Services Tab Content */}
          <TabsContent value="services" className="space-y-6">
            {servicesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <Skeleton className="h-48 w-full bg-june-bud/20" />
                    <CardContent className="p-4">
                      <Skeleton className="h-6 w-3/4 mb-2 bg-june-bud/20" />
                      <Skeleton className="h-4 w-1/2 mb-2 bg-june-bud/20" />
                      <Skeleton className="h-4 w-2/3 bg-june-bud/20" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : servicesData?.services.length === 0 ? (
              <div className="text-center py-16">
                <Users className="h-16 w-16 text-eagle-green/30 mx-auto mb-4" />
                <h3 className="text-xl font-gotham-bold text-eagle-green mb-2">No services found</h3>
                <p className="text-eagle-green/70 font-gotham-light mb-4">Try adjusting your filters to find more services.</p>
                <Button onClick={clearFilters} className="bg-eagle-green hover:bg-viridian-green text-white">
                  Clear Filters
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {servicesData?.services.map((service, index) => (
                  <ServiceCard key={service.id} service={service} index={index} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Event Card Component
function EventCard({ event, index }: { event: Event; index: number }) {
  const navigate = useNavigate();
  const { eventTime, userTime } = formatEventDate(event.startDate, event.timezone);
  const minPrice = Math.min(...event.ticketTypes.map(t => t.price));
  const categoryName = EVENT_CATEGORIES.find(c => c.id === event.categoryId)?.name || 'Event';
  const cityName = CITIES[event.country].find(c => c.id === event.city)?.name || event.city;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <Card 
        className="group cursor-pointer hover:shadow-xl transition-all duration-300 border-eagle-green/10 overflow-hidden"
        onClick={() => navigate(`/events/${event.slug || event.id}`)}
      >
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={event.poster}
            alt={event.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          
          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-1">
            {event.badges.map(badge => (
              <Badge 
                key={badge} 
                className={`text-xs font-gotham-bold ${getBadgeColor(badge)}`}
              >
                {badge.charAt(0).toUpperCase() + badge.slice(1)}
              </Badge>
            ))}
          </div>

          {/* Country flag */}
          <div className="absolute top-3 right-3">
            <Badge className="bg-white/90 text-eagle-green border-none font-gotham-bold">
              {event.country === 'ET' ? '🇪🇹' : '🇺🇸'} {cityName}
            </Badge>
          </div>

          {/* Price */}
          <div className="absolute bottom-3 right-3">
            <Badge className="bg-eagle-green text-white border-none font-gotham-bold">
              From {eventsService.formatCurrency(minPrice, event.baseCurrency)}
            </Badge>
          </div>
        </div>

        <CardContent className="p-4">
          <div className="mb-2">
            <span className="text-sm font-gotham-light text-viridian-green">{categoryName}</span>
          </div>
          
          <h3 className="font-gotham-bold text-eagle-green text-lg mb-2 line-clamp-2 group-hover:text-viridian-green transition-colors">
            {event.title}
          </h3>
          
          <div className="flex items-center gap-2 text-sm text-eagle-green/70 mb-2">
            <MapPin className="h-4 w-4" />
            <span className="font-gotham-light">{event.venue}</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-eagle-green/70 mb-3">
            <Clock className="h-4 w-4" />
            <div className="flex flex-col">
              <span className="font-gotham-light">{eventTime}</span>
              {userTime && (
                <span className="text-xs text-viridian-green font-gotham-light">
                  Your time: {userTime}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-gotham-light text-eagle-green/70">
              {event.ticketTypes.length} ticket type{event.ticketTypes.length !== 1 ? 's' : ''}
            </span>
            <ChevronRight className="h-4 w-4 text-viridian-green group-hover:translate-x-1 transition-transform" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Service Card Component
function ServiceCard({ service, index }: { service: Service; index: number }) {
  const navigate = useNavigate();
  const categoryInfo = SERVICE_CATEGORIES[service.category];
  const cityName = CITIES[service.country].find(c => c.id === service.city)?.name || service.city;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <Card 
        className="group cursor-pointer hover:shadow-xl transition-all duration-300 border-eagle-green/10 overflow-hidden"
        onClick={() => navigate(`/services/${service.id}`)}
      >
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={service.images[0]}
            alt={service.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          
          {/* Verified badge */}
          {service.provider.verified && (
            <div className="absolute top-3 left-3">
              <Badge className="bg-green-500 text-white border-none font-gotham-bold">
                ✓ Verified
              </Badge>
            </div>
          )}

          {/* Location badge */}
          <div className="absolute top-3 right-3">
            <Badge className="bg-white/90 text-eagle-green border-none font-gotham-bold">
              {service.country === 'ET' ? '🇪🇹' : '🇺🇸'} {cityName}
            </Badge>
          </div>

          {/* Price */}
          <div className="absolute bottom-3 right-3">
            <Badge className="bg-eagle-green text-white border-none font-gotham-bold">
              From {eventsService.formatCurrency(service.startingPrice, service.currency)}
            </Badge>
          </div>
        </div>

        <CardContent className="p-4">
          <div className="mb-2">
            <span className="text-sm font-gotham-light text-viridian-green">
              {categoryInfo.icon} {categoryInfo.name}
            </span>
          </div>
          
          <h3 className="font-gotham-bold text-eagle-green text-lg mb-2 line-clamp-2 group-hover:text-viridian-green transition-colors">
            {service.name}
          </h3>
          
          <div className="flex items-center gap-2 text-sm text-eagle-green/70 mb-2">
            <Users className="h-4 w-4" />
            <span className="font-gotham-bold text-eagle-green">{service.provider.name}</span>
            {service.provider.verified && (
              <Badge className="bg-green-100 text-green-700 text-xs border-green-300 px-1 py-0">
                ✓
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-4 text-sm text-eagle-green/70 mb-3">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="font-gotham-bold text-eagle-green">{service.rating}</span>
              <span className="font-gotham-light">({service.reviewCount} reviews)</span>
            </div>
            <span className="font-gotham-light">{service.provider.yearsExperience} years experience</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-gotham-light text-eagle-green/70">
              Service area: {service.serviceAreaKm}km radius
            </span>
            <ChevronRight className="h-4 w-4 text-viridian-green group-hover:translate-x-1 transition-transform" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Helper function for date formatting
function formatEventDate(dateString: string, timezone: string) {
  const date = new Date(dateString);
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  const eventTime = date.toLocaleString('en-US', {
    timeZone: timezone,
    weekday: 'short',
    month: 'short',
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
}