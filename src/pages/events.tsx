import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import FadeIn from "@/components/animations/FadeIn";
import {
  Calendar,
  ChevronDown,
  Filter,
  MapPin,
  Search,
  Sparkles,
  Ticket,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import PageNavigator from "@/components/PageNavigator";
import EventCard from "@/components/EventCard";

import {
  CITIES,
  Country,
  EVENT_CATEGORIES,
  EventFilters,
} from "@/types/events";
import { eventOrderService } from "@/services/eventOrderService";
import { useAuth } from "@/hooks/useAuth";
import { useActiveCurrency } from "@/hooks/useActiveCurrency";
import { useSearchAnalytics } from "@/hooks/useSearchAnalytics";
import { useTranslation } from "react-i18next";

// Helper function for badge colors
export default function Events() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { isInitialized } = useAuth();
  const activeCurrency = useActiveCurrency();

  // Parse URL parameters for filters
  const urlParams = new URLSearchParams(location.search);

  const [eventFilters, setEventFilters] = useState<EventFilters>({
    q: urlParams.get("q") || "",
    country: (urlParams.get("country") as Country) || undefined,
    city: urlParams.get("city") || "",
    category: urlParams.get("category") || "",
    sort: urlParams.get("sort") || "popular",
    dateFrom: urlParams.get("dateFrom") || "",
    dateTo: urlParams.get("dateTo") || "",
    priceMin: urlParams.get("priceMin")
      ? Number(urlParams.get("priceMin"))
      : undefined,
    priceMax: urlParams.get("priceMax")
      ? Number(urlParams.get("priceMax"))
      : undefined,
  });

  const [showFilters, setShowFilters] = useState(false);
  const [searchInput, setSearchInput] = useState(urlParams.get("q") || "");

  // Pagination state
  const [eventsPage, setEventsPage] = useState(0);
  const eventsPerPage = 12;

  // Fetch real events from API with currency conversion (wait for auth so currency is correct)
  const {
    data: realEventsData,
    isLoading: realEventsLoading,
    isFetching: eventsFetching,
  } = useQuery({
    queryKey: ["real-events", eventFilters, eventsPage, activeCurrency],
    queryFn: async () => {
      try {
        // Try real API first - backend resolves currency from user session
        return await eventOrderService.searchEvents(
          eventFilters.q,
          eventFilters.city,
          eventFilters.category ? parseInt(eventFilters.category) : undefined,
          eventsPage, // page from state
          eventsPerPage // size
        );
      } catch (error) {
        console.error("Failed to fetch events from API:", error);
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
      if (value !== undefined && value !== "") {
        params.set(key, value.toString());
      }
    });

    navigate(`/events?${params.toString()}`, { replace: true });
  }, [eventFilters, navigate]);

  const updateEventFilters = (newFilters: Partial<EventFilters>) => {
    setEventFilters((prev) => ({ ...prev, ...newFilters }));
    setEventsPage(0); // Reset to first page when filters change
  };

  useEffect(() => {
    setSearchInput(eventFilters.q || "");
  }, [eventFilters.q]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setEventFilters((prev) => ({ ...prev, q: searchInput }));
      setEventsPage(0);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const clearFilters = () => {
    setEventFilters({
      q: "",
      sort: "popular",
    });
    setEventsPage(0);
  };

  useSearchAnalytics(
    {
      searchTerm: eventFilters.q || "",
      pageName: "Events",
      pageType: "EVENT_LIST",
      searchSource: "PAGE_SEARCH_BAR",
      resultCount: realEventsData?.totalElements || displayEvents.length,
      context: {
        filters: {
          country: eventFilters.country,
          city: eventFilters.city,
          category: eventFilters.category,
          dateFrom: eventFilters.dateFrom,
          dateTo: eventFilters.dateTo,
          priceMin: eventFilters.priceMin,
          priceMax: eventFilters.priceMax,
        },
        sort: eventFilters.sort,
      },
    },
    {
      enabled: !eventsFetching,
    }
  );
  return (
    <div className="min-h-screen bg-gradient-to-b from-light-cream to-white">
      {/* Simplified Hero Section */}
      <section className="bg-eagle-green">
        <div className="page-shell py-5">
          <FadeIn delay={0.1}>
            <div className="flex items-center gap-2">
              <Ticket className="h-5 w-5 text-white" />
              <h1 className="text-xl lg:text-2xl font-bold text-white">
                {t("Events & Experiences")}
              </h1>
            </div>
            <p className="mt-1 text-xs lg:text-sm font-light text-white/80">
              {t("Gift unforgettable moments from concerts to cultural celebrations")}
            </p>
          </FadeIn>
        </div>
      </section>

      <div className="page-shell py-6 relative z-10">
        {/* Sticky Filter Bar */}
        <div className="sticky top-0 z-20 bg-white border-b border-june-bud/20 py-3 mb-5 -mx-4 sm:-mx-6 lg:-mx-10 2xl:-mx-14 px-4 sm:px-6 lg:px-10 2xl:px-14">
          <div className="flex flex-col lg:flex-row gap-2.5 items-center">
            {/* Search */}
            <div className="flex-1 relative w-full">
              <div className="relative bg-white rounded-xl shadow-sm border border-eagle-green/10 overflow-hidden">
                <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-eagle-green/40 h-4 w-4" />
                <Input
                  placeholder={t("Search events, cities or categories...")}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-10 pr-4 h-11 bg-transparent border-0 focus:ring-0 focus-visible:ring-0 text-sm text-eagle-green placeholder:text-eagle-green/40 w-full"
                />
              </div>
            </div>

            {/* Quick filters */}
            <div className="flex gap-2 w-full lg:w-auto overflow-x-auto no-scrollbar">
              {/* Location Select (combines country and city) */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-11 px-3.5 bg-white border-eagle-green/10 shadow-sm rounded-xl gap-1.5 text-eagle-green hover:border-viridian-green hover:bg-viridian-green/5 flex-shrink-0"
                  >
                    <MapPin className="h-4 w-4" />
                    <span className="text-xs font-semibold">
                      {eventFilters.city
                        ? Object.values(CITIES)
                            .flat()
                            .find((c) => c.id === eventFilters.city)?.name
                        : eventFilters.country === "ET"
                        ? "Ethiopia"
                        : eventFilters.country === "US"
                        ? "United States"
                        : "All Locations"}
                    </span>
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 rounded-xl border-eagle-green/10"
                >
                  <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-eagle-green/50">
                    {t("Location")}
                  </DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() =>
                      updateEventFilters({ country: undefined, city: "" })
                    }
                    className="text-sm"
                  >
                    {t("All Locations")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-eagle-green/50">
                    {t("Ethiopia")}
                  </DropdownMenuLabel>
                  {CITIES.ET.map((city) => (
                    <DropdownMenuItem
                      key={city.id}
                      onClick={() =>
                        updateEventFilters({ country: "ET", city: city.id })
                      }
                      className="text-sm"
                    >
                      {city.name}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-eagle-green/50">
                    {t("United States")}
                  </DropdownMenuLabel>
                  {CITIES.US.map((city) => (
                    <DropdownMenuItem
                      key={city.id}
                      onClick={() =>
                        updateEventFilters({ country: "US", city: city.id })
                      }
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
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-11 px-3.5 bg-white border-eagle-green/10 shadow-sm rounded-xl gap-1.5 text-eagle-green hover:border-viridian-green hover:bg-viridian-green/5 flex-shrink-0"
                  >
                    <Filter className="h-4 w-4" />
                    <span className="text-xs font-semibold">
                      {eventFilters.sort === "price-low"
                        ? "Price: Low"
                        : eventFilters.sort === "price-high"
                        ? "Price: High"
                        : eventFilters.sort === "date"
                        ? "By Date"
                        : "Popular"}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-48 rounded-xl border-eagle-green/10"
                >
                  <DropdownMenuItem
                    onClick={() => updateEventFilters({ sort: "popular" })}
                    className="text-sm"
                  >
                    {t("Most Popular")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => updateEventFilters({ sort: "date" })}
                    className="text-sm"
                  >
                    {t("By Date")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => updateEventFilters({ sort: "price-low" })}
                    className="text-sm"
                  >
                    {t("Price: Low to High")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => updateEventFilters({ sort: "price-high" })}
                    className="text-sm"
                  >
                    {t("Price: High to Low")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* More Filters Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className={`h-11 px-3.5 rounded-xl gap-1.5 flex-shrink-0 shadow-sm border ${
                  showFilters
                    ? "bg-eagle-green text-white border-eagle-green"
                    : "bg-white text-eagle-green border-eagle-green/10 hover:border-viridian-green hover:bg-viridian-green/5"
                }`}
              >
                <Sparkles className="h-4 w-4" />
                <span className="text-xs font-semibold whitespace-nowrap">
                  {t("More Filters")}
                </span>
              </Button>
            </div>
          </div>

          {/* Expanded Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-4 pt-4 border-t border-june-bud/20"
              >
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Event Category */}
                  <Select
                    value={eventFilters.category || "all"}
                    onValueChange={(value) =>
                      updateEventFilters({
                        category: value === "all" ? "" : value,
                      })
                    }
                  >
                    <SelectTrigger className="bg-white border border-eagle-green/30">
                      <SelectValue placeholder={t("Event Category")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("All Categories")}</SelectItem>
                      {EVENT_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.icon} {t(cat.name)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Date From */}
                  <Input
                    type="date"
                    placeholder={t("From Date")}
                    value={eventFilters.dateFrom || ""}
                    onChange={(e) =>
                      updateEventFilters({ dateFrom: e.target.value })
                    }
                    className="bg-white border border-eagle-green/30"
                  />

                  {/* Date To */}
                  <Input
                    type="date"
                    placeholder={t("To Date")}
                    value={eventFilters.dateTo || ""}
                    onChange={(e) =>
                      updateEventFilters({ dateTo: e.target.value })
                    }
                    className="bg-white border border-eagle-green/30"
                  />

                  {/* Clear Filters */}
                  <Button
                    variant="ghost"
                    onClick={clearFilters}
                    className="text-eagle-green hover:text-viridian-green hover:bg-june-bud/10"
                  >
                    {t("Clear All Filters")}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Events Content */}
        <div className="space-y-5">
          {isEventsLoading ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4">
              {[...Array(12)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="aspect-[4/3] w-full bg-june-bud/20" />
                  <CardContent className="p-4">
                    <Skeleton className="h-5 w-3/4 mb-2 bg-june-bud/20" />
                    <Skeleton className="h-4 w-1/2 mb-2 bg-june-bud/20" />
                    <Skeleton className="h-4 w-2/3 bg-june-bud/20" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : displayEvents.length === 0 ? (
            <div className="text-center py-14">
              <Calendar className="h-12 w-12 text-eagle-green/30 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-eagle-green mb-1">
                {t("No events found")}
              </h3>
              <p className="text-sm text-eagle-green/70 font-light mb-4">
                {t("Try adjusting your filters to find more events.")}
              </p>
              <Button
                onClick={clearFilters}
                className="bg-eagle-green hover:bg-viridian-green text-white"
              >
                {t("Clear Filters")}
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4">
                {realEventsData?.content?.map((event, index) => (
                  <EventCard key={event.id} event={event} index={index} />
                ))}
              </div>

              {/* Events Pagination */}
              {realEventsData && (
                <PageNavigator
                  currentPage={eventsPage}
                  totalPages={realEventsData.totalPages}
                  onPageChange={(page) => {
                    setEventsPage(page);
                    window.scrollTo({ top: 0, behavior: "smooth" });
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
