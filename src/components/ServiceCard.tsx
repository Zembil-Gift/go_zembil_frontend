import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Clock, Users, ImageIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ServiceResponse, serviceService } from "@/services/serviceService";
import { useQuery } from "@tanstack/react-query";
import { reviewService } from "@/services/reviewService";
import { CompactRating } from "@/components/reviews";
import { DiscountBadge } from "@/components/DiscountBadge";
import { PriceWithDiscount } from "@/components/PriceWithDiscount";

interface ServiceCardProps {
  service: ServiceResponse;
  index?: number;
}

export default function ServiceCard({ service, index = 0 }: ServiceCardProps) {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const [primaryImageLoaded, setPrimaryImageLoaded] = useState(false);
  const [secondaryImageLoaded, setSecondaryImageLoaded] = useState(false);
  const [primaryImageError, setPrimaryImageError] = useState(false);
  const [secondaryImageError, setSecondaryImageError] = useState(false);

  // Get images sorted by sortOrder - prefer default package images if available
  const sortedImages = useMemo(() => {
    // First check if default package has images
    if (
      service.defaultPackage?.images &&
      service.defaultPackage.images.length > 0
    ) {
      return [...service.defaultPackage.images].sort(
        (a, b) => a.sortOrder - b.sortOrder
      );
    }
    // Fall back to service images
    if (!service.images || service.images.length === 0) return [];
    return [...service.images].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [service.images, service.defaultPackage]);

  const primaryImage =
    sortedImages[0]?.fullUrl ||
    service.defaultPackage?.primaryImageUrl ||
    serviceService.getPrimaryImageUrl(service);
  const secondaryImage = sortedImages[1]?.fullUrl || null;
  const hasSecondImage = !!secondaryImage && !secondaryImageError;

  // Get price from default package if available, otherwise use base price
  // Prefer backend-calculated major units (basePrice) over minor units
  const displayPriceMajor =
    service.defaultPackage?.basePrice ?? service.basePrice;
  const displayPriceMinor =
    service.defaultPackage?.basePriceMinor ?? service.basePriceMinor;
  const displayCurrency = service.defaultPackage?.currency ?? service.currency;

  // Fetch service rating summary
  const { data: ratingSummary } = useQuery({
    queryKey: ["service-rating-summary", service.id],
    queryFn: () => reviewService.getServiceRatingSummary(service.id),
    enabled: !!service.id,
  });

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="transition-transform duration-200 hover:-translate-y-1"
    >
      <Card
        className="group overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white rounded-md cursor-pointer"
        onClick={() => navigate(`/services/${service.id}`)}
      >
        <CardContent className="p-0">
          <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
            {!primaryImageLoaded && !primaryImageError && primaryImage && (
              <div
                className="absolute inset-0 bg-gradient-to-r from-june-bud/10 via-white to-june-bud/10 animate-shimmer"
                style={{ backgroundSize: "200% 100%" }}
              />
            )}

            {primaryImage ? (
              <img
                src={
                  primaryImageError ? "/placeholder-service.jpg" : primaryImage
                }
                alt={service.title}
                className={`w-full h-full object-cover transition-all duration-500 ease-out
                  ${primaryImageLoaded ? "opacity-100" : "opacity-0"}
                  ${isHovered && hasSecondImage ? "opacity-0" : "opacity-100"}
                `}
                onLoad={() => setPrimaryImageLoaded(true)}
                onError={() => {
                  setPrimaryImageError(true);
                  setPrimaryImageLoaded(true);
                }}
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="h-12 w-12 text-gray-300" />
              </div>
            )}

            {/* Secondary Image (shown on hover) */}
            {secondaryImage && (
              <img
                src={secondaryImageError ? primaryImage! : secondaryImage}
                alt={`${service.title} - alternate view`}
                className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ease-out
                  ${secondaryImageLoaded ? "" : "opacity-0"}
                  ${
                    isHovered && hasSecondImage
                      ? "opacity-100 scale-105"
                      : "opacity-0 scale-100"
                  }
                `}
                onLoad={() => setSecondaryImageLoaded(true)}
                onError={() => {
                  setSecondaryImageError(true);
                  setSecondaryImageLoaded(true);
                }}
                loading="lazy"
              />
            )}

            {/* Gradient overlay on hover */}
            <div
              className={`absolute inset-0 bg-gradient-to-t from-eagle-green/60 via-transparent to-transparent
              transition-opacity duration-500 ${
                isHovered ? "opacity-100" : "opacity-0"
              }`}
            />

            {/* Discount Badge */}
            {service.activeDiscount && (
              <div className="absolute top-3 left-3">
                <DiscountBadge
                  discount={service.activeDiscount}
                  variant="compact"
                  size="small"
                  targetCurrency={displayCurrency}
                />
              </div>
            )}

            {/* Price Badge */}
            <div className="absolute bottom-3 right-3">
              {service.activeDiscount ? (
                <div className="bg-white/95 px-3 py-1.5 rounded-lg backdrop-blur-sm shadow-md">
                  <PriceWithDiscount
                    originalPrice={displayPriceMajor || 0}
                    currency={displayCurrency}
                    discount={service.activeDiscount}
                    size="small"
                    showSavings={false}
                  />
                </div>
              ) : (
                <Badge className="bg-eagle-green/90 text-white border-none font-bold backdrop-blur-sm">
                  From{" "}
                  {serviceService.formatPrice(
                    displayPriceMajor ?? 0,
                    displayCurrency
                  )}
                </Badge>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-4 space-y-3">
            {/* Category */}
            {service.categoryName && (
              <span className="text-xs font-medium text-viridian-green uppercase tracking-wide">
                {service.categoryName}
              </span>
            )}

            {/* Title */}
            <h3 className="font-bold text-eagle-green text-lg line-clamp-2 group-hover:text-viridian-green transition-colors">
              {service.title}
            </h3>

            {/* Description */}
            {service.description && (
              <p className="text-sm text-eagle-green/60 line-clamp-2">
                {service.description}
              </p>
            )}

            {/* Rating */}
            <div className="mb-2">
              <CompactRating
                rating={ratingSummary?.averageRating || 0}
                reviewCount={ratingSummary?.totalReviews || 0}
                size="sm"
              />
            </div>

            {/* Meta Info */}
            <div className="flex items-center gap-4 text-sm text-eagle-green/70">
              {service.city && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{service.city}</span>
                </div>
              )}
              {service.durationMinutes != null &&
                service.durationMinutes > 0 && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{service.durationMinutes} min</span>
                  </div>
                )}
            </div>

            {/* Vendor */}
            {service.vendorName && (
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                <Users className="h-4 w-4 text-viridian-green" />
                <span className="text-sm text-eagle-green/70">
                  by {service.vendorName}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
