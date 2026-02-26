import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import FadeIn from '@/components/animations/FadeIn';
import {
  Calendar, 
  MapPin, 
  Clock, 
  Search, 
  Filter, 
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { getEventImageUrl } from '@/utils/imageUtils';
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
import { useAuth } from '@/hooks/useAuth';
import { useActiveCurrency } from '@/hooks/useActiveCurrency';

// Helper function for badge colors
export default function Events() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isInitialized } = useAuth();
  const activeCurrency = useActiveCurrency();
  
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

  // Fetch real events from API with currency conversion (wait for auth so currency is correct)
  const { data: realEventsData, isLoading: realEventsLoading, isFetching: eventsFetching } = useQuery({
    queryKey: ['real-events', eventFilters, eventsPage, activeCurrency],
    queryFn: async () => {
      try {
        // Try real API first - backend resolves currency from user session
        const response = await eventOrderService.searchEvents(
          eventFilters.q,
          eventFilters.city,
          eventFilters.category ? parseInt(eventFilters.category) : undefined,
          eventsPage, // page from state
          eventsPerPage // size
        );
        return response;
      } catch (error) {
        console.error('Failed to fetch events from API:', error);
        throw error;
      }
    },
    staleTime: 30000, // 30 seconds
    enabled: isInitialized,
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
  return (
    <div className="min-h-screen bg-gradient-to-b from-light-cream to-white">
      {/* Simplified Hero Section */}
      <section className="bg-gradient-to-r from-eagle-green to-viridian-green">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <FadeIn delay={0.1}>
            <div className="flex items-center gap-2 mb-2">
              <Ticket className="h-5 w-5 text-june-bud" />
              <h1 className="text-2xl lg:text-3xl font-bold text-white">
                Events & Experiences
              </h1>
            </div>
            <p className="text-sm lg:text-base font-light text-white/80 max-w-2xl">
              Gift unforgettable moments from concerts to cultural celebrations
            </p>
          </FadeIn>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Sticky Filter Bar */}
        <motion.div 
          className="sticky top-0 z-20 bg-white border-b border-june-bud/20 py-4 mb-8 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex flex-col lg:flex-row gap-4 items-center">
            {/* Search */}
            <div className="flex-1 relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-eagle-green/60 h-4 w-4" />
              <Input
                placeholder="Search events, cities or categories..."
                value={eventFilters.q}
                onChange={(e) => updateEventFilters({ q: e.target.value })}
                className="pl-9 h-10 bg-light-cream/50 border-none focus:ring-1 focus:ring-viridian-green/20 rounded-xl text-sm font-light"
              />
            </div>

            {/* Quick filters */}
            <div className="flex gap-2 w-full lg:w-auto overflow-x-auto no-scrollbar pb-1 lg:pb-0">
              {/* Location Select (combines country and city) */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-10 px-3 bg-light-cream/50 text-eagle-green border-none rounded-xl gap-2 flex-shrink-0">
                    <MapPin className="h-4 w-4" />
                    <span className="text-xs font-semibold">
                      {eventFilters.city ? 
                        Object.values(CITIES).flat().find(c => c.id === eventFilters.city)?.name : 
                        eventFilters.country === 'ET' ? 'Ethiopia' :
                        eventFilters.country === 'US' ? 'United States' : 'All Locations'
                      }
                    </span>
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-xl border-eagle-green/10">
                  <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-eagle-green/50">Location</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => updateEventFilters({ country: undefined, city: '' })} className="text-sm">
                    All Locations
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-eagle-green/50">Ethiopia</DropdownMenuLabel>
                  {CITIES.ET.map(city => (
                    <DropdownMenuItem 
                      key={city.id} 
                      onClick={() => updateEventFilters({ country: 'ET', city: city.id })}
                      className="text-sm"
                    >
                      {city.name}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-eagle-green/50">United States</DropdownMenuLabel>
                  {CITIES.US.map(city => (
                    <DropdownMenuItem 
                      key={city.id} 
                      onClick={() => updateEventFilters({ country: 'US', city: city.id })}
                      className="text-sm"
                    >
                      {city.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Sort Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-10 px-3 bg-light-cream/50 text-eagle-green border-none rounded-xl gap-2 flex-shrink-0">
                    <Filter className="h-4 w-4" />
                    <span className="text-xs font-semibold">
                      {eventFilters.sort === 'price-low' ? 'Price: Low' :
                       eventFilters.sort === 'price-high' ? 'Price: High' :
                       eventFilters.sort === 'date' ? 'By Date' : 'Popular'}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 rounded-xl border-eagle-green/10">
                  <DropdownMenuItem onClick={() => updateEventFilters({ sort: 'popular' })} className="text-sm">Most Popular</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateEventFilters({ sort: 'date' })} className="text-sm">By Date</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateEventFilters({ sort: 'price-low' })} className="text-sm">Price: Low to High</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateEventFilters({ sort: 'price-high' })} className="text-sm">Price: High to Low</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* More Filters Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className={`h-10 px-3 rounded-xl gap-2 flex-shrink-0 ${showFilters ? 'bg-eagle-green text-white' : 'bg-light-cream/50 text-eagle-green'}`}
              >
                <Sparkles className="h-4 w-4" />
                <span className="text-xs font-semibold whitespace-nowrap">More Filters</span>
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
