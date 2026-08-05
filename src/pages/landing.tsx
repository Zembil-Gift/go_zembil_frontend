import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import {
  extractPriceAmount,
  Product,
  productService,
} from "@/services/productService";
import { parseUrlParams } from "@/shared/categories";
import {
  getProductImageUrl,
  getAllProductImages,
  getEventImageUrl,
} from "@/utils/imageUtils";
import { eventOrderService, EventResponse } from "@/services/eventOrderService";
import {
  serviceService,
  ServicePackageResponse,
  ServiceResponse,
} from "@/services/serviceService";
import {
  packageService,
  ProductPackageResponse,
} from "@/services/packageService";
import { customOrderTemplateService } from "@/services/customOrderTemplateService";
import type { CustomOrderTemplate } from "@/types/customOrders";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveCurrency } from "@/hooks/useActiveCurrency";
import { DiscountBadge } from "@/components/DiscountBadge";
import { PriceWithDiscount } from "@/components/PriceWithDiscount";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink } from "lucide-react";

import HeroSection from "@/components/landing/HeroSection";
import CategoryCarousel from "@/components/landing/CategoryCarousel";
import TrendingGiftsSection from "@/components/landing/TrendingGiftsSection";
import ShopGridSection from "@/components/landing/ShopGridSection";
import TrustStrip from "@/components/landing/TrustStrip";
import ShopByRecipient from "@/components/landing/ShopByRecipient";
import FeaturesSection from "@/components/landing/FeaturesSection";
import SectionHeader from "@/components/landing/SectionHeader";
import EventCard from "@/components/EventCard";
import ServiceCard from "@/components/ServiceCard";
import CampaignBanner from "@/components/landing/CampaignBanner";
import { useSearchAnalytics } from "@/hooks/useSearchAnalytics";
import { useTranslation } from "react-i18next";

export default function Landing() {
  const { t } = useTranslation();
  const location = useLocation();
  const { isInitialized } = useAuth();
  const activeCurrency = useActiveCurrency();

  // Parse URL parameters to set initial category
  const urlParams = new URLSearchParams(location.search);
  const categoryFilters = parseUrlParams(urlParams);

  const [activeCategory, setActiveCategory] = useState(
    categoryFilters.category || "occasions"
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [selectedBudget, setSelectedBudget] = useState("all");

  const normalizedSearch = useMemo(
    () => submittedSearch.trim(),
    [submittedSearch]
  );

  const handleSearchSubmit = () => {
    setSubmittedSearch(searchTerm.trim());
  };

  const clearCombinedSearch = () => {
    setSearchTerm("");
    setSubmittedSearch("");
  };

  const {
    data: combinedSearchResults,
    isFetching: isSearchingCombined,
    isError: combinedSearchError,
  } = useQuery({
    queryKey: ["landing", "combined-search", normalizedSearch, activeCurrency],
    queryFn: async () => {
      const [productsRes, servicesRes, eventsRes, templatesRes] =
        await Promise.all([
          productService.getFilteredProducts({
            page: 0,
            size: 6,
            search: normalizedSearch,
          }),
          serviceService.getServices({
            page: 0,
            size: 6,
            query: normalizedSearch,
          }),
          eventOrderService.searchEvents(
            normalizedSearch,
            undefined,
            undefined,
            0,
            6
          ),
          customOrderTemplateService.searchTemplates(
            normalizedSearch,
            undefined,
            0,
            6
          ),
        ]);

      return {
        products: productsRes.content || [],
        services: servicesRes.content || [],
        events: eventsRes.content || [],
        templates: templatesRes.content || [],
      };
    },
    enabled: isInitialized && normalizedSearch.length >= 2,
    staleTime: 60 * 1000,
  });

  const searchCounts = useMemo(() => {
    const productsCount = combinedSearchResults?.products.length || 0;
    const servicesCount = combinedSearchResults?.services.length || 0;
    const eventsCount = combinedSearchResults?.events.length || 0;
    const templatesCount = combinedSearchResults?.templates.length || 0;
    return {
      productsCount,
      servicesCount,
      eventsCount,
      templatesCount,
      total: productsCount + servicesCount + eventsCount + templatesCount,
    };
  }, [combinedSearchResults]);

  useSearchAnalytics(
    {
      searchTerm: normalizedSearch,
      pageName: "Landing",
      pageType: "LANDING_SEARCH",
      searchSource: "HERO_SEARCH_BAR",
      resultCount: searchCounts.total,
      context: {
        filters: {
          activeCategory,
        },
      },
    },
    {
      enabled: !isSearchingCombined,
    }
  );

  // Fetch featured products (wait for auth so currency is correct)
  const {
    data: featuredProducts,
    isLoading: isLoadingProducts,
    error: productsError,
  } = useQuery({
    queryKey: ["products", "featured", activeCurrency],
    queryFn: async () => {
      try {
        return await productService.getFeaturedProducts(10);
      } catch (err) {
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    enabled: isInitialized,
  });

  // Fetch featured events (wait for auth for consistent behaviour)
  const { data: featuredEventsResponse } = useQuery({
    queryKey: ["events", "featured", activeCurrency],
    queryFn: async () => {
      try {
        return await eventOrderService.getFeaturedEvents(0, 6);
      } catch (err) {
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
    enabled: isInitialized,
  });

  // Fetch featured services (wait for auth for consistent behaviour)
  const { data: featuredServicesResponse } = useQuery({
    queryKey: ["services", "featured", activeCurrency],
    queryFn: async () => {
      try {
        return await serviceService.getFeaturedServices(0, 6);
      } catch (err) {
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
    enabled: isInitialized,
  });

  // Fetch featured product packages
  const { data: featuredProductPackagesResponse } = useQuery({
    queryKey: ["packages", "featured", activeCurrency],
    queryFn: async () => {
      try {
        return await packageService.getFeaturedPackages(0, 8);
      } catch (err) {
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
    enabled: isInitialized,
  });

  // Fetch ads (products, events, or services) — wait for auth so product currency is correct
  const { data: adProducts } = useQuery({
    queryKey: ["products", "ads", activeCurrency],
    queryFn: async () => {
      try {
        return await productService.getAdProducts(3);
      } catch (err) {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
    enabled: isInitialized,
  });

  const { data: adEvents } = useQuery({
    queryKey: ["events", "ads", activeCurrency],
    queryFn: async () => {
      try {
        return await eventOrderService.getAdEvents(2);
      } catch (err) {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
    enabled: isInitialized,
  });

  const { data: adServices } = useQuery({
    queryKey: ["services", "ads", activeCurrency],
    queryFn: async () => {
      try {
        return await serviceService.getAdServicePackages(2);
      } catch (err) {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
    enabled: isInitialized,
  });

  const { data: adPackages } = useQuery({
    queryKey: ["packages", "ads", activeCurrency],
    queryFn: async () => {
      try {
        return await packageService.getAdPackages(2);
      } catch (err) {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
    enabled: isInitialized,
  });

  const trendingGifts = React.useMemo(() => {
    if (!featuredProducts) return [];

    return featuredProducts.map((product: Product) => {
      const priceAmount =
        extractPriceAmount(product.price) ||
        extractPriceAmount(product.productSku?.[0]?.price);
      const currencyCode =
        product.price?.currencyCode ??
        product.productSku?.[0]?.price?.currencyCode ??
        "ETB";

      return {
        id: product.id,
        name: product.name,
        description: product.description || "",
        price: priceAmount,
        originalPrice: undefined,
        currency: currencyCode,
        activeDiscount: product.activeDiscount,
        image: getProductImageUrl(product.images, "/placeholder-product.jpg"),
        images: getAllProductImages(product.images),
        category: product.occasion || "Gift",
        categorySlug: product.categorySlug || "gifts",
        isTrending: product.isTrending || false,
        isFeatured: product.isFeatured || false,
        rating: product.rating || 4.5,
        reviewCount: product.reviewCount || 0,
        inStock: true,
        stockQuantity:
          product.stockQuantity || product.productSku?.[0]?.stockQuantity || 10,
        badges: product.isFeatured ? ["Featured"] : [],
        tags: product.tags || [],
      };
    });
  }, [featuredProducts]);

  // Combine all ads into a single array for display
  const allAds = React.useMemo(() => {
    const ads: Array<{
      type: "product" | "event" | "service" | "package";
      data: any;
      id: string | number;
    }> = [];

    if (adProducts && adProducts.length > 0) {
      adProducts.forEach((product: Product) => {
        ads.push({
          type: "product",
          data: product,
          id: product.id,
        });
      });
    }

    if (adEvents && adEvents.length > 0) {
      adEvents.forEach((event: any) => {
        ads.push({
          type: "event",
          data: event,
          id: event.id,
        });
      });
    }

    if (adServices && adServices.length > 0) {
      adServices.forEach((service: ServicePackageResponse) => {
        ads.push({
          type: "service",
          data: service,
          id: service.id,
        });
      });
    }

    if (adPackages && adPackages.length > 0) {
      adPackages.forEach((pkg: ProductPackageResponse) => {
        ads.push({
          type: "package",
          data: pkg,
          id: pkg.id,
        });
      });
    }

    return ads;
  }, [adProducts, adEvents, adServices, adPackages]);

  const trendingPackages = React.useMemo(
    () => featuredProductPackagesResponse?.content || [],
    [featuredProductPackagesResponse]
  );

  return (
    <div className="min-h-screen bg-light-cream">
      <HeroSection
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onSearchSubmit={handleSearchSubmit}
        resultsPanel={
          normalizedSearch.length > 0 ? (
            <div className="rounded-2xl border border-eagle-green/10 bg-white shadow-xl p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Badge className="bg-june-bud/20 text-eagle-green border-june-bud/30">
                    {searchCounts.total} {t("results")}
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearCombinedSearch}
                  className="text-charcoal border-charcoal/30 hover:text-white"
                >
                  {t("Clear")}
                </Button>
              </div>

              {normalizedSearch.length < 2 && (
                <p className="text-sm text-eagle-green/70">
                  {t("Type at least 2 characters and press Enter (or click search) to search products, services, events, and custom orders.")}
                </p>
              )}

              {normalizedSearch.length >= 2 && isSearchingCombined && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <Skeleton className="h-12 rounded-lg" />
                    <Skeleton className="h-12 rounded-lg" />
                    <Skeleton className="h-12 rounded-lg" />
                    <Skeleton className="h-12 rounded-lg" />
                  </div>
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, idx) => (
                      <Skeleton key={idx} className="h-14 rounded-lg" />
                    ))}
                  </div>
                </div>
              )}

              {normalizedSearch.length >= 2 &&
                !isSearchingCombined &&
                combinedSearchError && (
                  <p className="text-sm text-red-600">
                    {t("Something went wrong while searching. Please try again.")}
                  </p>
                )}

              {normalizedSearch.length >= 2 &&
                !isSearchingCombined &&
                !combinedSearchError && (
                  <div className="space-y-4">
                    {searchCounts.total === 0 && (
                      <div className="rounded-lg border border-dashed border-eagle-green/20 p-4 text-center text-eagle-green/70 text-sm">
                        {t("No matches found. Try another keyword.")}
                      </div>
                    )}

                    {searchCounts.total > 0 && (
                      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                        {(combinedSearchResults?.products || []).map(
                          (product: Product) => (
                            <a
                              key={`product-${product.id}`}
                              href={`/product/${product.id}`}
                              className="rounded-lg border border-eagle-green/10 hover:border-viridian-green/40 transition-colors p-2.5 flex items-start gap-2.5"
                            >
                              <img
                                src={getProductImageUrl(
                                  product.images,
                                  "/placeholder-product.jpg"
                                )}
                                alt={product.name}
                                className="h-10 w-10 rounded-md object-cover"
                              />
                              <div className="min-w-0">
                                <p className="font-semibold text-sm text-eagle-green truncate">
                                  {product.name}
                                </p>
                                <p className="text-xs text-eagle-green/60">
                                  {t("Shop")}
                                </p>
                              </div>
                              <ExternalLink className="h-4 w-4 text-eagle-green/40 ml-auto" />
                            </a>
                          )
                        )}

                        {(combinedSearchResults?.services || []).map(
                          (service: ServiceResponse) => (
                            <a
                              key={`service-${service.id}`}
                              href={`/services/${service.id}`}
                              className="rounded-lg border border-eagle-green/10 hover:border-viridian-green/40 transition-colors p-2.5 flex items-start gap-2.5"
                            >
                              <div className="h-10 w-10 rounded-md bg-viridian-green/10 flex items-center justify-center text-eagle-green font-bold text-sm">
                                S
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-sm text-eagle-green truncate">
                                  {service.title ||
                                    service.name ||
                                    `Service #${service.id}`}
                                </p>
                                <p className="text-xs text-eagle-green/60">
                                  {t("Services")}
                                </p>
                              </div>
                              <ExternalLink className="h-4 w-4 text-eagle-green/40 ml-auto" />
                            </a>
                          )
                        )}

                        {(combinedSearchResults?.events || []).map(
                          (event: EventResponse) => (
                            <a
                              key={`event-${event.id}`}
                              href={`/events/${event.id}`}
                              className="rounded-lg border border-eagle-green/10 hover:border-viridian-green/40 transition-colors p-2.5 flex items-start gap-2.5"
                            >
                              <img
                                src={getEventImageUrl(
                                  event.images,
                                  event.bannerImageUrl || ""
                                )}
                                alt={event.title}
                                className="h-10 w-10 rounded-md object-cover"
                              />
                              <div className="min-w-0">
                                <p className="font-semibold text-sm text-eagle-green truncate">
                                  {event.title}
                                </p>
                                <p className="text-xs text-eagle-green/60">
                                  {t("Events")}
                                </p>
                              </div>
                              <ExternalLink className="h-4 w-4 text-eagle-green/40 ml-auto" />
                            </a>
                          )
                        )}

                        {(combinedSearchResults?.templates || []).map(
                          (template: CustomOrderTemplate) => (
                            <a
                              key={`template-${template.id}`}
                              href={`/custom-orders/template/${template.id}`}
                              className="rounded-lg border border-eagle-green/10 hover:border-viridian-green/40 transition-colors p-2.5 flex items-start gap-2.5"
                            >
                              <div className="h-10 w-10 rounded-md bg-june-bud/20 flex items-center justify-center text-eagle-green font-bold text-sm">
                                C
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-sm text-eagle-green truncate">
                                  {template.name}
                                </p>
                                <p className="text-xs text-eagle-green/60">
                                  {t("Custom Orders")}
                                </p>
                              </div>
                              <ExternalLink className="h-4 w-4 text-eagle-green/40 ml-auto" />
                            </a>
                          )
                        )}
                      </div>
                    )}
                  </div>
                )}
            </div>
          ) : null
        }
      />

      <TrustStrip />

      <CampaignBanner />

      <CategoryCarousel
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />

      <ShopByRecipient />

      {/* Ad Banner Section - Enhanced UI */}
      {allAds.length > 0 && (
        <>
          <section className="py-10 relative overflow-hidden bg-gray-50">
            {/* Decorative background elements - Extremely subtle */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
              <div className="absolute top-[-10%] right-[-5%] w-[30%] h-[30%] rounded-full bg-ethiopian-gold/2 blur-[100px]"></div>
              <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-viridian-green/2 blur-[120px]"></div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
              <div className="flex items-baseline gap-3 mb-5">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-charcoal tracking-tight">
                  {t("Featured Highlights")}
                </h2>
                <span className="text-xs font-medium tracking-wide text-gray-400 uppercase">
                  {t("Sponsored")}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {allAds.slice(0, 3).map((ad) => (
                  <div
                    key={`${ad.type}-${ad.id}`}
                    className="group relative h-full"
                  >
                    {/* Card Background & Border Effect - Very subtle border on hover */}
                    <div className="absolute -inset-px bg-gray-100 rounded-lg opacity-0 group-hover:opacity-100 transition duration-500"></div>

                    <div className="relative h-full bg-white rounded-lg overflow-hidden shadow-lg transition-all duration-300 hover:shadow-2xl flex flex-col">
                      {ad.type === "product" && (
                        <a
                          href={`/product/${ad.data.id}`}
                          className="flex flex-col h-full"
                        >
                          <div className="relative h-64 overflow-hidden">
                            <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
                              {ad.data.activeDiscount && (
                                <DiscountBadge
                                  discount={ad.data.activeDiscount}
                                />
                              )}
                            </div>
                            <img
                              src={getProductImageUrl(
                                ad.data.images,
                                "/placeholder-product.jpg"
                              )}
                              alt={ad.data.name}
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-300"></div>
                          </div>
                          <div className="p-6 flex-1 flex flex-col relative">
                            <h3 className="font-bold text-xl mb-2 text-gray-900 leading-tight group-hover:text-ethiopian-gold transition-colors line-clamp-2">
                              {ad.data.name}
                            </h3>
                            <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between items-end">
                              <div className="text-ethiopian-gold">
                                <PriceWithDiscount
                                  originalPrice={
                                    extractPriceAmount(
                                      ad.data.price ||
                                        ad.data.productSku?.[0]?.price
                                    ) || 0
                                  }
                                  currency={
                                    ad.data.price?.currencyCode ||
                                    ad.data.productSku?.[0]?.price
                                      ?.currencyCode ||
                                    "ETB"
                                  }
                                  discount={ad.data.activeDiscount}
                                  size="medium"
                                />
                              </div>
                              <span className="text-xs font-semibold text-ethiopian-gold uppercase tracking-wide group-hover:underline transition-all underline-offset-4">
                                {t("View →")}
                              </span>
                            </div>
                          </div>
                        </a>
                      )}
                      {ad.type === "event" && (
                        <a
                          href={`/events/${ad.data.id}`}
                          className="flex flex-col h-full"
                        >
                          <div className="relative h-64 overflow-hidden">
                            <div className="absolute top-4 left-4 z-20">
                              <span className="px-3 py-1 text-[10px] font-bold tracking-widest text-white bg-black/40 backdrop-blur-md rounded-full border border-white/20 uppercase">
                                {t("Event")}
                              </span>
                            </div>
                            <img
                              src={
                                getEventImageUrl(
                                  ad.data.images,
                                  ad.data.bannerImageUrl
                                ) ||
                                ad.data.bannerImageUrl ||
                                "/placeholder-event.jpg"
                              }
                              alt={ad.data.title}
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-70 group-hover:opacity-50 transition-opacity duration-300"></div>
                            <div className="absolute bottom-4 left-4 text-white p-2">
                              <p className="text-sm font-medium opacity-90 backdrop-blur-sm bg-white/10 px-2 py-1 rounded inline-block">
                                {ad.data.location}
                              </p>
                            </div>
                          </div>
                          <div className="p-6 flex-1 flex flex-col relative">
                            <h3 className="font-bold text-xl mb-3 text-gray-900 leading-tight group-hover:text-ethiopian-gold transition-colors line-clamp-2">
                              {ad.data.title}
                            </h3>
                            <div className="mt-auto pt-4 border-t border-gray-100">
                              <span className="inline-block px-2 py-1 bg-ethiopian-gold/10 text-ethiopian-gold rounded text-xs font-bold tracking-wide">
                                {t("GET TICKETS")}
                              </span>
                            </div>
                          </div>
                        </a>
                      )}
                      {ad.type === "service" && (
                        <a
                          href={`/service-detail/${ad.data.serviceId}`}
                          className="flex flex-col h-full"
                        >
                          <div className="relative h-64 overflow-hidden">
                            <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
                              <span className="px-3 py-1 text-[10px] font-bold tracking-widest text-white bg-black/40 backdrop-blur-md rounded-full border border-white/20 uppercase">
                                {t("Service")}
                              </span>
                              {ad.data.activeDiscount && (
                                <DiscountBadge
                                  discount={ad.data.activeDiscount}
                                />
                              )}
                            </div>
                            <img
                              src={
                                ad.data.primaryImageUrl ||
                                "/placeholder-service.jpg"
                              }
                              alt={ad.data.name}
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-300"></div>
                          </div>
                          <div className="p-6 flex-1 flex flex-col relative">
                            <h3 className="font-bold text-xl mb-2 text-gray-900 leading-tight group-hover:text-ethiopian-gold transition-colors line-clamp-2">
                              {ad.data.name}
                            </h3>
                            <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between items-end">
                              <div className="text-ethiopian-gold">
                                <PriceWithDiscount
                                  originalPrice={serviceService.getPackagePrice(
                                    ad.data
                                  )}
                                  currency={ad.data.currency || "ETB"}
                                  discount={ad.data.activeDiscount}
                                  size="medium"
                                />
                              </div>
                              <span className="text-xs font-semibold text-ethiopian-gold uppercase tracking-wide group-hover:underline transition-all underline-offset-4">
                                {t("Book Now →")}
                              </span>
                            </div>
                          </div>
                        </a>
                      )}
                      {ad.type === "package" && (
                        <a
                          href={`/packages/${ad.data.id}`}
                          className="flex flex-col h-full"
                        >
                          {(() => {
                            const packageData = ad.data as ProductPackageResponse;
                            const packageImage =
                              packageData.images?.[0] ||
                              packageData.items?.find((item) => item.productImage)
                                ?.productImage;
                            return (
                              <>
                                <div className="relative h-64 overflow-hidden">
                                  <div className="absolute top-4 left-4 z-20">
                                    <span className="px-3 py-1 text-[10px] font-bold tracking-widest text-white bg-black/40 backdrop-blur-md rounded-full border border-white/20 uppercase">
                                      {t("Package")}
                                    </span>
                                  </div>
                                  <img
                                    src={packageImage || "/placeholder-product.jpg"}
                                    alt={packageData.name}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-300"></div>
                                </div>
                                <div className="p-6 flex-1 flex flex-col relative">
                                  <h3 className="font-bold text-xl mb-2 text-gray-900 leading-tight group-hover:text-ethiopian-gold transition-colors line-clamp-2">
                                    {packageData.name}
                                  </h3>
                                  <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between items-end">
                                    <div className="text-ethiopian-gold">
                                      <PriceWithDiscount
                                        originalPrice={
                                          (packageData.startingFromPriceMinor || 0) / 100
                                        }
                                        currency={packageData.displayCurrency || "ETB"}
                                        size="medium"
                                      />
                                    </div>
                                    <span className="text-xs font-semibold text-ethiopian-gold uppercase tracking-wide group-hover:underline transition-all underline-offset-4">
                                      {t("View →")}
                                    </span>
                                  </div>
                                </div>
                              </>
                            );
                          })()}
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      {/* Featured Products Section */}
      {isLoadingProducts ? (
        <div className="py-16 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ethiopian-gold mx-auto"></div>
          <p className="mt-6 text-gray-500 font-medium tracking-wide">
            {t("Curating collections...")}
          </p>
        </div>
      ) : productsError ? (
        <div className="py-24 text-center">
          <p className="text-red-500 font-medium">
            {t("Unable to load collections at this time.")}
          </p>
        </div>
      ) : trendingGifts.length > 0 ? (
        <TrendingGiftsSection
          trendingGifts={trendingGifts}
          selectedBudget={selectedBudget}
          onBudgetChange={setSelectedBudget}
        />
      ) : null}

      {/* Trending Packages Section */}
      {trendingPackages.length > 0 && (
        <section className="py-10 bg-white relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader title={t("Trending Packages")} href="/packages" />

            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {trendingPackages.map((pkg: ProductPackageResponse) => {
                const packageImage =
                  pkg.images?.[0] ||
                  pkg.items?.find((item) => item.productImage)?.productImage;

                return (
                  <a
                    key={pkg.id}
                    href={`/packages/${pkg.id}`}
                    className="group block bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300"
                  >
                    <div className="aspect-square bg-gray-100 overflow-hidden">
                      {packageImage ? (
                        <img
                          src={packageImage}
                          alt={pkg.name}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <ExternalLink className="h-8 w-8" />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="font-bold text-sm text-charcoal line-clamp-2">
                        {pkg.name}
                      </h3>
                      <p className="text-xs text-gray-600 line-clamp-1 mt-0.5">
                        {pkg.vendorName || "Zembil"}
                      </p>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Featured Events Section */}
      {featuredEventsResponse?.content &&
        featuredEventsResponse.content.length > 0 && (
          <section className="py-10 bg-white relative">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <SectionHeader title={t("Upcoming Events")} href="/events" />
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                {featuredEventsResponse.content.map(
                  (event: EventResponse, index: number) => (
                    <EventCard key={event.id} event={event} index={index} />
                  )
                )}
              </div>
            </div>
          </section>
        )}

      {/* Featured Services Section */}
      {featuredServicesResponse?.content &&
        featuredServicesResponse.content.length > 0 && (
          <section className="py-10 bg-light-cream relative">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
              <SectionHeader title={t("Featured Services")} href="/services" />

              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                {featuredServicesResponse.content.map(
                  (service: ServiceResponse, index: number) => (
                    <ServiceCard
                      key={service.id}
                      service={service}
                      index={index}
                    />
                  )
                )}
              </div>
            </div>
          </section>
        )}

      <FeaturesSection />

      {/* The page ends in the shop itself: browsable, filterable, paged */}
      <ShopGridSection />

      {/* <LiveChatButton /> */}
    </div>
  );
}
