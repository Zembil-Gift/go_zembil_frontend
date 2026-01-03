import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, Clock, Calendar, ChevronRight, Ticket } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EventResponse } from "@/services/eventOrderService";
import { getEventImageUrl } from "@/utils/imageUtils";
import { formatPrice } from "@/lib/currency";
import { useQuery } from "@tanstack/react-query";
import { reviewService } from "@/services/reviewService";
import { CompactRating } from "@/components/reviews";

interface EventCardProps {
  event: EventResponse;
  index?: number;
}

export default function EventCard({ event, index = 0 }: EventCardProps) {
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
