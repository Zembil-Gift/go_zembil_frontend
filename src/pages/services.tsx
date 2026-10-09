import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import ServiceCard from "@/components/ServiceCard";
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
  Calendar,
} from "lucide-react";
import { serviceService, PagedServiceResponse } from "@/services/serviceService";
import { categoryService } from "@/services/categoryService";
import PageNavigator from "@/components/PageNavigator";
import { useAuth } from "@/hooks/useAuth";
import { useActiveCurrency } from "@/hooks/useActiveCurrency";
import { useSearchAnalytics } from "@/hooks/useSearchAnalytics";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
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
          <div className="page-shell py-5">
            <Skeleton className="h-7 w-72 mb-2 bg-white/20" />
            <Skeleton className="h-4 w-80 bg-white/20" />
          </div>
        </div>

        <div className="page-shell py-6">
          {/* Category pills skeleton */}
          <div className="flex flex-wrap gap-2 mb-5">
            {[...Array(6)].map((_, i) => (
              <Skeleton
                key={i}
                className="h-9 w-28 rounded-full bg-june-bud/20"
              />
            ))}
          </div>

          {/* Search skeleton */}
          <div className="flex gap-2 mb-5">
            <Skeleton className="flex-1 h-11 rounded-xl bg-june-bud/20" />
            <Skeleton className="w-11 h-11 rounded-xl bg-june-bud/20" />
          </div>

          {/* Services grid skeleton */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4">
            {[...Array(12)].map((_, i) => (
              <Card
                key={i}
                className="group overflow-hidden border-0 shadow-md bg-white rounded-md"
              >
                <CardContent className="p-0">
                  <Skeleton className="aspect-[4/3] w-full bg-june-bud/10" />
                  <div className="p-4">
                    <Skeleton className="h-4 w-20 mb-2 bg-june-bud/20" />
                    <Skeleton className="h-5 w-3/4 mb-2 bg-june-bud/20" />
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
        <div className="page-shell py-5">
          <FadeIn delay={0.1}>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-white" />
              <h1 className="text-xl lg:text-2xl font-bold text-white">
                {t("Services & Experiences")}
              </h1>
            </div>
            <p className="mt-1 text-xs lg:text-sm font-light text-white/80">
              {t("Book services from photography to catering for any occasion")}
            </p>
          </FadeIn>
        </div>
      </section>

      <div className="page-shell py-6 relative z-10">
        {/* Category Pills */}
        <FadeIn delay={0.2}>
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-2.5">
              <Sparkles className="h-4 w-4 text-viridian-green" />
              <h2 className="font-bold text-base text-eagle-green">
                {t("Browse by Category")}
              </h2>
            </div>
            <div className="flex overflow-x-auto scrollbar-hide gap-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
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
                        flex items-center px-3.5 h-9 rounded-full text-sm transition-colors
                        ${
                          isActive
                            ? "bg-eagle-green text-white border-0"
                            : "bg-white border border-eagle-green/20 text-eagle-green hover:border-viridian-green hover:bg-viridian-green/5 hover:text-viridian-green"
                        }
                      `}
                      aria-pressed={isActive}
                    >
                      <span className="font-semibold">{t(category.name)}</span>
                    </Button>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </FadeIn>

        {/* Search and Filters */}
        <SlideIn direction="up" delay={0.3}>
          <div className="flex items-center gap-2 mb-5">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <div className="relative bg-white rounded-xl shadow-sm border border-eagle-green/10 overflow-hidden">
                <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-eagle-green/40 h-4 w-4" />
                <Input
                  placeholder={t("Search for services, experiences...")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 h-11 bg-transparent border-0 focus:ring-0 focus-visible:ring-0 text-sm text-eagle-green placeholder:text-eagle-green/40 w-full"
                />
              </div>
            </div>

            {/* City Filter - Icon Only */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-11 w-11 rounded-xl bg-white border-eagle-green/10 shadow-sm hover:border-viridian-green hover:bg-viridian-green/5 transition-colors p-0 shrink-0"
                >
                  <MapPin className="h-4 w-4 text-viridian-green" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 bg-white border border-eagle-green/10 shadow-xl rounded-xl p-1"
              >
                <div className="px-2 py-1.5 text-xs font-bold text-eagle-green/40 uppercase tracking-wider">
                  {t("Locations")}
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
            className="flex flex-wrap items-center gap-2 mb-5 px-3 py-2 bg-june-bud/10 rounded-xl border border-june-bud/20"
          >
            <span className="text-sm font-bold text-eagle-green flex items-center gap-2">
              <Filter className="h-4 w-4" />
              {t("Active filters:")}
            </span>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="px-3 h-8 text-xs font-medium text-eagle-green/70 hover:text-viridian-green hover:bg-transparent"
              >
                {t("All Services")}
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
              {t("Clear all")}
            </Button>
          </motion.div>
        )}

        {/* Services Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm font-light text-eagle-green/70">
              {isFetching ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-viridian-green/30 border-t-viridian-green rounded-full animate-spin"></span>
                  {t("Loading...")}
                </span>
              ) : (
                <>
                  {t("Showing")}{" "}
                  <span className="font-bold text-eagle-green">
                    {services.length}
                  </span>{" "}
                  of{" "}
                  <span className="font-bold text-eagle-green">
                    {totalServices}
                  </span>{" "}
                  {t("services")}
                </>
              )}
            </p>
          </div>

          {services.length === 0 && !isFetching ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-14 px-6"
            >
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 mx-auto mb-4 bg-june-bud/20 rounded-2xl flex items-center justify-center">
                  <Calendar className="h-8 w-8 text-eagle-green/40" />
                </div>
                <h3 className="text-lg font-bold text-eagle-green mb-2">
                  {t("No services found")}
                </h3>
                <p className="text-sm font-light text-eagle-green/60 mb-5 leading-relaxed">
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
                    {t("Show all services")}
                  </Button>
                )}
              </div>
            </motion.div>
          ) : (
            <>
              <div
                className={`grid gap-3 sm:gap-4 ${
                  viewMode === "grid"
                    ? "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6"
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
                <div className="mt-8">
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
