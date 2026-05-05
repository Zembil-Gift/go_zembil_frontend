import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import FadeIn from "@/components/animations/FadeIn";
import SlideIn from "@/components/animations/SlideIn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  ChevronRight,
  Sparkles,
  X,
  Filter,
  MapPin,
  Clock,
  Calendar,
  Image as ImageIcon,
  Users,
} from "lucide-react";
import {
  serviceService,
  ServiceResponse,
  PagedServiceResponse,
} from "@/services/serviceService";
import { categoryService } from "@/services/categoryService";
import PageNavigator from "@/components/PageNavigator";
import { reviewService } from "@/services/reviewService";
import { CompactRating } from "@/components/reviews";
import { DiscountBadge } from "@/components/DiscountBadge";
import { PriceWithDiscount } from "@/components/PriceWithDiscount";
import { useAuth } from "@/hooks/useAuth";
import { useActiveCurrency } from "@/hooks/useActiveCurrency";
import { useSearchAnalytics } from "@/hooks/useSearchAnalytics";

// Service Card Component with hover image effect
function ServiceCard({ service }: { service: ServiceResponse }) {
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
  const displayCurrency = service.defaultPackage?.currency ?? service.currency;

  // Fetch service rating summary
  const { data: ratingSummary } = useQuery({
    queryKey: ["service-rating-summary", service.id],
    queryFn: () => reviewService.getServiceRatingSummary(service.id),
    enabled: !!service.id,
  });

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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
    </motion.div>
  );
}

// City options for filtering
const CITY_OPTIONS = [
  { value: "all", label: "All Locations" },
  { value: "Addis Ababa", label: "Addis Ababa" },
  { value: "Mekelle", label: "Mekelle" },
  { value: "Dire Dawa", label: "Dire Dawa" },
  { value: "Hawassa", label: "Hawassa" },
  { value: "Bahir Dar", label: "Bahir Dar" },
];

export default function Services() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isInitialized } = useAuth();
  const activeCurrency = useActiveCurrency();

  // Parse URL parameters
  const urlParams = new URLSearchParams(location.search);
  const categoryIdParam = urlParams.get("categoryId");
  const cityParam = urlParams.get("city") || "";
  const searchParam = urlParams.get("search") || "";

  const [viewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState(searchParam);
  const [debouncedSearch, setDebouncedSearch] = useState(searchParam);
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage] = useState(12);
  const [selectedCategoryId, setSelectedCategoryId] = useState<
    number | undefined
  >(categoryIdParam ? parseInt(categoryIdParam) : undefined);
  const [selectedCity, setSelectedCity] = useState(cityParam || "all");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch categories for filtering
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoryService.getCategories(),
    staleTime: 5 * 60 * 1000,
  });

  // Fetch services with filters (wait for auth so currency is correct)
  const {
    data: servicesData,
    isLoading: servicesLoading,
    isFetching,
  } = useQuery<PagedServiceResponse>({
    queryKey: [
      "services",
      {
        page: currentPage,
        size: itemsPerPage,
        query: debouncedSearch,
        city: selectedCity,
        categoryId: selectedCategoryId,
        currency: activeCurrency,
      },
    ],
    queryFn: () =>
      serviceService.getServices({
        page: currentPage,
        size: itemsPerPage,
        query: debouncedSearch || undefined,
        city: selectedCity === "all" ? undefined : selectedCity || undefined,
        categoryId: selectedCategoryId,
      }),
    enabled: isInitialized,
  });

  const services = useMemo(() => {
    const allServices = servicesData?.content || [];

    return allServices.filter(
      (service) =>
        service.hasPackages ||
        !!service.defaultPackage ||
        (service.packages?.length ?? 0) > 0
    );
  }, [servicesData?.content]);
  const totalServices = servicesData?.totalElements || 0;
  const totalPages = servicesData?.totalPages || 0;

  // Get current category
  const currentCategory = useMemo(
    () => categories.find((c) => c.id === selectedCategoryId),
    [categories, selectedCategoryId]
  );

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedCategoryId)
      params.set("categoryId", selectedCategoryId.toString());
    if (selectedCity && selectedCity !== "all")
      params.set("city", selectedCity);
    if (debouncedSearch) params.set("search", debouncedSearch);

    const newSearch = params.toString();
    const currentSearch = location.search.replace("?", "");

    if (newSearch !== currentSearch) {
      navigate(`/services${newSearch ? `?${newSearch}` : ""}`, {
        replace: true,
      });
    }
  }, [
    selectedCategoryId,
    selectedCity,
    debouncedSearch,
    navigate,
    location.search,
  ]);

  // Handle category selection
  const handleCategorySelect = (categoryId: number) => {
    if (selectedCategoryId === categoryId) {
      setSelectedCategoryId(undefined);
    } else {
      setSelectedCategoryId(categoryId);
    }
    setCurrentPage(0);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setSelectedCategoryId(undefined);
    setSelectedCity("all");
    setCurrentPage(0);
  };

  const isLoading = servicesLoading || categoriesLoading;
  const hasFilters =
    selectedCategoryId ||
    (selectedCity && selectedCity !== "all") ||
    debouncedSearch;

  useSearchAnalytics(
    {
      searchTerm: debouncedSearch,
      pageName: "Services",
      pageType: "SERVICE_LIST",
      searchSource: "PAGE_SEARCH_BAR",
      resultCount: totalServices,
      context: {
        filters: {
          categoryId: selectedCategoryId,
          city: selectedCity === "all" ? undefined : selectedCity,
        },
        routeParams: {
          categoryId: categoryIdParam,
          city: cityParam || undefined,
        },
      },
    },
    {
      enabled: !isFetching,
    }
  );

  // Loading state
  if (isLoading && !isFetching) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-light-cream to-white">
        {/* Hero skeleton */}
        <div className="relative bg-eagle-green">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <Skeleton className="h-12 w-96 mb-4 bg-white/20" />
            <Skeleton className="h-6 w-80 bg-white/20" />
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Category pills skeleton */}
          <div className="flex flex-wrap gap-3 mb-8">
            {[...Array(5)].map((_, i) => (
              <Skeleton
                key={i}
                className="h-12 w-36 rounded-full bg-june-bud/20"
              />
            ))}
          </div>

          {/* Search skeleton */}
          <div className="flex flex-col lg:flex-row gap-4 mb-8">
            <Skeleton className="flex-1 h-14 rounded-md bg-june-bud/20" />
            <div className="flex gap-3">
              <Skeleton className="w-48 h-14 rounded-xl bg-june-bud/20" />
              <Skeleton className="w-28 h-14 rounded-xl bg-june-bud/20" />
            </div>
          </div>

          {/* Services grid skeleton */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card
                key={i}
                className="group overflow-hidden border-0 shadow-md bg-white rounded-md"
              >
                <CardContent className="p-0">
                  <Skeleton className="h-48 w-full bg-june-bud/10" />
                  <div className="p-4">
                    <Skeleton className="h-4 w-20 mb-2 bg-june-bud/20" />
                    <Skeleton className="h-5 w-3/4 mb-2 bg-june-bud/20" />
                    <Skeleton className="h-4 w-full mb-3 bg-june-bud/20" />
                    <Skeleton className="h-4 w-1/2 bg-june-bud/20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-light-cream to-white">
      {/* Simplified Hero Section */}
      <section className="bg-eagle-green">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <FadeIn delay={0.1}>
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-5 w-5 text-white" />
              <h1 className="text-2xl lg:text-3xl font-bold text-white">
                Services & Experiences
              </h1>
            </div>
            <p className="text-sm lg:text-base font-light text-white/80 max-w-2xl">
              Book services from photography to catering for any occasion
            </p>
          </FadeIn>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Category Pills */}
        <FadeIn delay={0.2}>
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-viridian-green" />
              <span className="font-bold text-eagle-green">
                Browse by Category
              </span>
            </div>
            <div className="flex overflow-x-auto scrollbar-hide gap-3 py-2 -mx-4 px-4 sm:mx-0 sm:px-2 sm:flex-wrap">
              {categories.map((category, index) => {
                const isActive = selectedCategoryId === category.id;

                return (
                  <motion.div
                    key={category.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Button
                      variant={isActive ? "default" : "outline"}
                      onClick={() => handleCategorySelect(category.id)}
                      className={`
                        flex items-center gap-2 px-5 py-3 h-12 rounded-full transition-all duration-300
                        ${
                          isActive
                            ? "bg-gradient-to-r from-eagle-green to-viridian-green text-white border-0 shadow-lg shadow-eagle-green/25 scale-105"
                            : "bg-white border-2 border-eagle-green/20 text-eagle-green hover:border-viridian-green hover:bg-viridian-green/5 hover:text-viridian-green hover:scale-105"
                        }
                      `}
                      aria-pressed={isActive}
                    >
                      <span className="font-bold">{category.name}</span>
                    </Button>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </FadeIn>

        {/* Search and Filters */}
        <SlideIn direction="up" delay={0.3}>
          <div className="flex items-center gap-3 mb-8">
            {/* Search Bar */}
            <div className="flex-1 relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-eagle-green/20 to-viridian-green/20 rounded-md blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"></div>
              <div className="relative bg-white rounded-md shadow-lg shadow-eagle-green/5 border border-eagle-green/10 overflow-hidden">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-eagle-green/40 h-5 w-5" />
                <Input
                  placeholder="Search for services, experiences..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 pr-4 h-14 bg-transparent border-0 focus:ring-0 focus-visible:ring-0 font-light text-eagle-green placeholder:text-eagle-green/40 w-full"
                />
              </div>
            </div>

            {/* City Filter - Icon Only */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-14 w-14 rounded-xl bg-white border-eagle-green/10 shadow-lg shadow-eagle-green/5 hover:border-viridian-green hover:bg-viridian-green/5 transition-all duration-300 p-0 shrink-0"
                >
                  <MapPin className="h-5 w-5 text-viridian-green" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 bg-white border border-eagle-green/10 shadow-xl rounded-xl p-1"
              >
                <div className="px-2 py-1.5 text-xs font-bold text-eagle-green/40 uppercase tracking-wider">
                  Locations
                </div>
                {CITY_OPTIONS.map((city) => (
                  <DropdownMenuItem
                    key={city.value}
                    onClick={() => {
                      setSelectedCity(city.value);
                      setCurrentPage(0);
                    }}
                    className={`rounded-lg cursor-pointer ${
                      selectedCity === city.value
                        ? "bg-june-bud/20 text-eagle-green font-medium"
                        : "text-eagle-green/70 hover:bg-june-bud/10"
                    }`}
                  >
                    {city.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </SlideIn>

        {/* Active Filters */}
        {hasFilters && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap items-center gap-3 mb-8 p-4 bg-gradient-to-r from-june-bud/10 to-viridian-green/5 rounded-md border border-june-bud/20"
          >
            <span className="text-sm font-bold text-eagle-green flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Active filters:
            </span>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="px-3 h-8 text-xs font-medium text-eagle-green/70 hover:text-viridian-green hover:bg-transparent"
              >
                All Services
              </Button>

              {currentCategory && (
                <>
                  <ChevronRight className="h-3 w-3 text-eagle-green/30" />
                  <Badge className="flex items-center gap-1.5 bg-gradient-to-r from-eagle-green to-viridian-green text-white border-0 px-3 py-1 rounded-full font-medium">
                    {currentCategory.name}
                    <button
                      onClick={() => setSelectedCategoryId(undefined)}
                      className="ml-1 hover:bg-white/20 rounded-full p-0.5 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                </>
              )}

              {selectedCity && selectedCity !== "all" && (
                <>
                  <ChevronRight className="h-3 w-3 text-eagle-green/30" />
                  <Badge className="flex items-center gap-1.5 bg-viridian-green/20 text-viridian-green border border-viridian-green/30 px-3 py-1 rounded-full font-medium">
                    <MapPin className="h-3 w-3" />
                    {selectedCity}
                    <button
                      onClick={() => setSelectedCity("all")}
                      className="ml-1 hover:bg-viridian-green/20 rounded-full p-0.5 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                </>
              )}

              {debouncedSearch && (
                <>
                  <ChevronRight className="h-3 w-3 text-eagle-green/30" />
                  <Badge className="flex items-center gap-1.5 bg-june-bud/20 text-eagle-green border border-june-bud/30 px-3 py-1 rounded-full font-medium">
                    "{debouncedSearch}"
                    <button
                      onClick={() => {
                        setSearchTerm("");
                        setDebouncedSearch("");
                      }}
                      className="ml-1 hover:bg-june-bud/30 rounded-full p-0.5 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                </>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="ml-auto text-eagle-green/70 hover:text-viridian-green hover:bg-viridian-green/10 font-medium rounded-full px-4"
            >
              Clear all
            </Button>
          </motion.div>
        )}

        {/* Services Section */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <p className="font-light text-eagle-green/70">
              {isFetching ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-viridian-green/30 border-t-viridian-green rounded-full animate-spin"></span>
                  Loading...
                </span>
              ) : (
                <>
                  Showing{" "}
                  <span className="font-bold text-eagle-green">
                    {services.length}
                  </span>{" "}
                  of{" "}
                  <span className="font-bold text-eagle-green">
                    {totalServices}
                  </span>{" "}
                  services
                </>
              )}
            </p>
          </div>

          {services.length === 0 && !isFetching ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20 px-6"
            >
              <div className="max-w-md mx-auto">
                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-june-bud/20 to-viridian-green/10 rounded-3xl flex items-center justify-center">
                  <Calendar className="h-12 w-12 text-eagle-green/40" />
                </div>
                <h3 className="text-2xl font-bold text-eagle-green mb-3">
                  No services found
                </h3>
                <p className="font-light text-eagle-green/60 mb-8 leading-relaxed">
                  {hasFilters
                    ? "We couldn't find any services matching your criteria. Try adjusting your search or filters."
                    : "No services are available at the moment. Please check back soon!"}
                </p>
                {hasFilters && (
                  <Button
                    onClick={handleClearFilters}
                    className="bg-gradient-to-r from-eagle-green to-viridian-green hover:from-viridian-green hover:to-eagle-green text-white font-bold px-8 py-3 rounded-full shadow-lg shadow-eagle-green/25 transition-all duration-300 hover:scale-105"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Show all services
                  </Button>
                )}
              </div>
            </motion.div>
          ) : (
            <>
              <div
                className={`grid gap-6 ${
                  viewMode === "grid"
                    ? "grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                    : "grid-cols-1"
                }`}
              >
                {services.map((service, index) => (
                  <motion.div
                    key={service.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <ServiceCard service={service} />
                  </motion.div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-12">
                  <PageNavigator
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    isLoading={isFetching}
                    totalItems={totalServices}
                    itemsPerPage={itemsPerPage}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
