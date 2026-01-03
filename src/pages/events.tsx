import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import FadeIn from '@/components/animations/FadeIn';
import SlideIn from '@/components/animations/SlideIn';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Search, 
  Filter, 
  Globe, 
  ChevronDown,
  ChevronRight,
  Ticket,
  Sparkles
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getEventImageUrl } from '@/utils/imageUtils';
import { useAuth } from '@/hooks/useAuth';
import { formatPrice } from '@/lib/currency';
import PageNavigator from '@/components/PageNavigator';
import { reviewService } from '@/services/reviewService';
import { CompactRating } from '@/components/reviews';

import { 
  EventFilters, 
  Country,
  CITIES,
  EVENT_CATEGORIES
} from '@/types/events';
import { eventOrderService, EventResponse } from '@/services/eventOrderService';

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
  
  // Get user's preferred currency for API calls
  const { user } = useAuth();
  const preferredCurrency = user?.preferredCurrencyCode || 'ETB';
  
  // Parse URL parameters for filters
  const urlParams = new URLSearchParams(location.search);
  
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

  const [showFilters, setShowFilters] = useState(false);
  
  // Pagination state
  const [eventsPage, setEventsPage] = useState(0);
  const eventsPerPage = 12;

  // Fetch real events from API with currency conversion
  const { data: realEventsData, isLoading: realEventsLoading, error: eventsError, isFetching: eventsFetching } = useQuery({
    queryKey: ['real-events', eventFilters, preferredCurrency, eventsPage],
    queryFn: async () => {
      try {
        // Try real API first with user's preferred currency for price conversion
        const response = await eventOrderService.searchEvents(
          eventFilters.q,
          eventFilters.city,
          eventFilters.category ? parseInt(eventFilters.category) : undefined,
          eventsPage, // page from state
          eventsPerPage, // size
          preferredCurrency // Pass preferred currency for backend conversion
        );
        return response;
      } catch (error) {
        console.error('Failed to fetch events from API:', error);
        throw error;
      }
    },
    staleTime: 30000, // 30 seconds
  });

  // Display events from API
  const displayEvents = realEventsData?.content || [];
  const isEventsLoading = realEventsLoading;

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    
    Object.entries(eventFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.set(key, value.toString());
      }
    });

    navigate(`/events?${params.toString()}`, { replace: true });
  }, [eventFilters, navigate]);

  const updateEventFilters = (newFilters: Partial<EventFilters>) => {
    setEventFilters(prev => ({ ...prev, ...newFilters }));
    setEventsPage(0); // Reset to first page when filters change
  };

  const clearFilters = () => {
    setEventFilters({
      q: '',
      sort: 'popular',
    });
    setEventsPage(0);
  };

  const getAvailableCities = (country?: Country) => {
    if (!country) return [];
    return CITIES[country];
  };
  return (
    <div className="min-h-screen bg-gradient-to-b from-light-cream to-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-eagle-green via-eagle-green to-viridian-green overflow-hidden">
        {/* Pattern overlay */}
        <div className="absolute inset-0 opacity-10">
          <div className="w-full h-full" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 10L40 30L30 50L20 30L30 10Z' fill='white'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat'
          }}></div>
        </div>

        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-june-bud/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-20 w-96 h-96 bg-viridian-green/30 rounded-full blur-3xl"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <FadeIn delay={0.1}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-june-bud/20 rounded-xl backdrop-blur-sm">
                <Ticket className="h-6 w-6 text-june-bud" />
              </div>
              <span className="text-june-bud font-gotham-medium text-sm uppercase tracking-wider">
                Gift Experiences
              </span>
            </div>
            <h1 className="text-4xl lg:text-5xl xl:text-6xl font-gotham-bold text-white mb-4 leading-tight">
              Discover Amazing
              <span className="block text-june-bud">Events & Experiences</span>
            </h1>
            <p className="text-lg lg:text-xl font-gotham-light text-white/80 max-w-2xl leading-relaxed">
              Gift unforgettable moments and memories. From concerts to cultural celebrations,
              find the perfect event in Ethiopia and U.S. Habesha communities.
            </p>
          </FadeIn>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
            <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" className="fill-light-cream" />
          </svg>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 -mt-4 relative z-10">
        {/* Sticky Filter Bar */}
        <motion.div 
          className="sticky top-0 z-20 bg-white border-b border-june-bud/20 py-4 mb-8 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex flex-col lg:flex-row gap-4 items-center">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-eagle-green/60 h-5 w-5" />
              <Input
                placeholder="Search events..."
                value={eventFilters.q}
                onChange={(e) => updateEventFilters({ q: e.target.value })}
                className="pl-10 h-12 bg-white border border-eagle-green/30 focus:border-viridian-green focus:ring-2 focus:ring-viridian-green/20 font-light"
              />
            </div>

            {/* Quick filters */}
            <div className="flex gap-3 flex-wrap">
              {/* Country */}
              <Select 
                value={eventFilters.country || 'all'} 
                onValueChange={(value) => {
                  const country = value === 'all' ? undefined : (value as Country);
                  updateEventFilters({ country, city: '' });
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
                value={eventFilters.city || 'all'} 
                onValueChange={(value) => {
                  const city = value === 'all' ? '' : value;
                  updateEventFilters({ city });
                }}
                disabled={!eventFilters.country}
              >
                <SelectTrigger className="w-40 h-12 bg-white border border-eagle-green/30 focus:border-viridian-green">
                  <MapPin className="h-4 w-4 text-eagle-green mr-1" />
                  <SelectValue placeholder="City" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cities</SelectItem>
                  {getAvailableCities(eventFilters.country).map(city => (
                    <SelectItem key={city.id} value={city.id}>{city.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select 
                value={eventFilters.sort || ''} 
                onValueChange={(value) => updateEventFilters({ sort: value })}
              >
                <SelectTrigger className="w-36 h-12 bg-white border border-eagle-green/30 focus:border-viridian-green">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="popular">Most Popular</SelectItem>
                  <SelectItem value="date">By Date</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
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

        {/* Events Content */}
        <div className="space-y-6">
          {isEventsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
          ) : displayEvents.length === 0 ? (
            <div className="text-center py-16">
              <Calendar className="h-16 w-16 text-eagle-green/30 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-eagle-green mb-2">No events found</h3>
              <p className="text-eagle-green/70 font-light mb-4">Try adjusting your filters to find more events.</p>
              <Button onClick={clearFilters} className="bg-eagle-green hover:bg-viridian-green text-white">
                Clear Filters
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {realEventsData?.content?.map((event, index) => (
                  <RealEventCard key={event.id} event={event} index={index} />
                ))}
              </div>
              
              {/* Events Pagination */}
              {realEventsData && (
                <PageNavigator
                  currentPage={eventsPage}
                  totalPages={realEventsData.totalPages}
                  onPageChange={(page) => {
                    setEventsPage(page);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  isLoading={eventsFetching}
                  totalItems={realEventsData.totalElements}
                  itemsPerPage={eventsPerPage}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Event Card Component
function RealEventCard({ event, index }: { event: EventResponse; index: number }) {
  const navigate = useNavigate();
  const minPrice = event.ticketTypes?.length > 0 
    ? Math.min(...event.ticketTypes.map(t => t.priceMinor)) 
    : 0;
  const currency = event.ticketTypes?.[0]?.currency || 'ETB';

  // Fetch event rating summary
  const { data: ratingSummary } = useQuery({
    queryKey: ['event-rating-summary', event.id],
    queryFn: () => reviewService.getEventRatingSummary(event.id),
    enabled: !!event.id,
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <Card 
        className="group cursor-pointer hover:shadow-xl transition-all duration-300 border-eagle-green/10 overflow-hidden"
        onClick={() => navigate(`/events/${event.id}`)}
      >
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={getEventImageUrl(event.images, event.bannerImageUrl)}
            alt={event.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
            onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }}
          />
          <div className="w-full h-full bg-gradient-to-br from-eagle-green to-viridian-green flex items-center justify-center hidden">
            <Calendar className="h-16 w-16 text-white/50" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          
          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-1">
            {event.isFeatured && (
              <Badge className="text-xs font-bold bg-yellow/20 text-eagle-green border-yellow">
                Featured
              </Badge>
            )}
            {event.isSoldOut && (
              <Badge className="text-xs font-bold bg-red-100 text-red-700 border-red-300">
                Sold Out
              </Badge>
            )}
          </div>

          {/* Location badge */}
          <div className="absolute top-3 right-3">
            <Badge className="bg-white/90 text-eagle-green border-none font-bold">
              📍 {event.city}
            </Badge>
          </div>

          {/* Price */}
          <div className="absolute bottom-3 right-3">
            <Badge className="bg-eagle-green text-white border-none font-bold">
              From {formatPrice(minPrice / 100, currency)}
            </Badge>
          </div>
        </div>

        <CardContent className="p-4">
          <div className="mb-2">
            <span className="text-sm font-light text-viridian-green">
              {event.categoryName || 'Event'}
            </span>
          </div>
          
          <h3 className="font-bold text-eagle-green text-lg mb-2 line-clamp-2 group-hover:text-viridian-green transition-colors">
            {event.title}
          </h3>
          
          <div className="flex items-center gap-2 text-sm text-eagle-green/70 mb-2">
            <MapPin className="h-4 w-4" />
            <span className="font-light">{event.location}</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-eagle-green/70 mb-3">
            <Clock className="h-4 w-4" />
            <span className="font-light">{formatDate(event.eventDate)}</span>
          </div>

          {/* Rating */}
          <div className="mb-3">
            <CompactRating 
              rating={ratingSummary?.averageRating || 0} 
              reviewCount={ratingSummary?.totalReviews || 0}
              size="sm"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-sm font-light text-eagle-green/70">
              <Ticket className="h-4 w-4" />
              <span>{event.ticketTypes?.length || 0} ticket types</span>
            </div>
            <ChevronRight className="h-4 w-4 text-viridian-green group-hover:translate-x-1 transition-transform" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
