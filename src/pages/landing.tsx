import React, { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  extractPriceAmount,
  Product,
  productService,
} from "@/services/productService";
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
import { useActiveCurrency } from "@/hooks/useActiveCurrency";
import { DiscountBadge } from "@/components/DiscountBadge";
import { PriceWithDiscount } from "@/components/PriceWithDiscount";
import { ExternalLink } from "lucide-react";

import TrendingGiftsSection from "@/components/landing/TrendingGiftsSection";
import ShopGridSection from "@/components/landing/ShopGridSection";
import ShopByRecipient from "@/components/landing/ShopByRecipient";
import FeaturesSection from "@/components/landing/FeaturesSection";
import SectionHeader from "@/components/landing/SectionHeader";
import EventCard from "@/components/EventCard";
import ServiceCard from "@/components/ServiceCard";
import CampaignBanner from "@/components/landing/CampaignBanner";
import AppDownloadSection from "@/components/landing/AppDownloadSection";
import { SHOW_APP_DOWNLOAD } from "@/lib/featureFlags";
import TopCategoriesSection from "@/components/landing/TopCategoriesSection";
import SectionBoundary from "@/components/SectionBoundary";
import { useTranslation } from "react-i18next";

/**
 * ponytail: every landing query used to wait on `isInitialized`, which is a
 * full /auth/refresh round trip. Products are public, so they now fetch on
 * mount and the page paints a grid a whole RTT earlier. Signed-in visitors
 * whose preferred currency differs from the auto-detected guest currency get
 * one refetch under the new cache key; keepPreviousData covers the gap.
 */
const publicFeedQuery = {
  staleTime: 5 * 60 * 1000,
  retry: 1,
  placeholderData: keepPreviousData,
} as const;

/**
 * Mirrors TrendingGiftsSection's grid so the first product row claims its space
 * on the very first frame — no spinner, no layout shift when data lands.
 */
function ProductGridSkeleton() {
  return (
    <section className="py-10 bg-gray-50">
      <div className="page-shell">
        <div className="mb-5 space-y-2">
          <div className="h-7 w-56 animate-pulse rounded bg-eagle-green/10" />
          <div className="h-4 w-72 animate-pulse rounded bg-eagle-green/[0.07]" />
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2.5 sm:gap-3">
          {Array.from({ length: 16 }).map((_, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-xl border border-eagle-green/[0.07] bg-white"
            >
              <div className="aspect-square animate-pulse bg-eagle-green/[0.06]" />
              <div className="space-y-2 p-3">
                <div className="h-3.5 w-5/6 animate-pulse rounded bg-eagle-green/10" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-eagle-green/[0.07]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Landing() {
  const { t } = useTranslation();
  const activeCurrency = useActiveCurrency();

  const [selectedBudget, setSelectedBudget] = useState("all");

  // Fetch featured products
  const {
    data: featuredProducts,
    isLoading: isLoadingProducts,
    error: productsError,
  } = useQuery({
    queryKey: ["products", "featured", activeCurrency],
    queryFn: () => productService.getFeaturedProducts(16),
    ...publicFeedQuery,
  });

  // Fetch featured events
  const { data: featuredEventsResponse } = useQuery({
    queryKey: ["events", "featured", activeCurrency],
    queryFn: () => eventOrderService.getFeaturedEvents(0, 12),
    ...publicFeedQuery,
  });

  // Fetch featured services
  const { data: featuredServicesResponse } = useQuery({
    queryKey: ["services", "featured", activeCurrency],
    queryFn: () => serviceService.getFeaturedServices(0, 12),
    ...publicFeedQuery,
  });

  // Fetch featured product packages
  const { data: featuredProductPackagesResponse } = useQuery({
    queryKey: ["packages", "featured", activeCurrency],
    queryFn: () => packageService.getFeaturedPackages(0, 12),
    ...publicFeedQuery,
  });

  // Fetch ads (products, events, services, or packages)
  const { data: adProducts } = useQuery({
    queryKey: ["products", "ads", activeCurrency],
    queryFn: () => productService.getAdProducts(3).catch(() => []),
    ...publicFeedQuery,
  });

  const { data: adEvents } = useQuery({
    queryKey: ["events", "ads", activeCurrency],
    queryFn: () => eventOrderService.getAdEvents(2).catch(() => []),
    ...publicFeedQuery,
  });

  const { data: adServices } = useQuery({
    queryKey: ["services", "ads", activeCurrency],
    queryFn: () => serviceService.getAdServicePackages(2).catch(() => []),
    ...publicFeedQuery,
  });

  const { data: adPackages } = useQuery({
    queryKey: ["packages", "ads", activeCurrency],
    queryFn: () => packageService.getAdPackages(2).catch(() => []),
    ...publicFeedQuery,
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
      <SectionBoundary name="CampaignBanner">
        <CampaignBanner />
      </SectionBoundary>

      <SectionBoundary name="TopCategories">
        <TopCategoriesSection />
      </SectionBoundary>

      {/* Products come straight after the categories. */}
      {isLoadingProducts ? (
        <ProductGridSkeleton />
      ) : productsError ? (
        <div className="py-16 text-center">
          <p className="text-red-500 font-medium">
            {t("Unable to load collections at this time.")}
          </p>
        </div>
      ) : trendingGifts.length > 0 ? (
        <SectionBoundary name="TrendingGifts">
          <TrendingGiftsSection
            trendingGifts={trendingGifts}
            selectedBudget={selectedBudget}
            onBudgetChange={setSelectedBudget}
          />
        </SectionBoundary>
      ) : null}

      <SectionBoundary name="ShopByRecipient">
        <ShopByRecipient />
      </SectionBoundary>

      {/* Ad Banner Section - Enhanced UI */}
      {allAds.length > 0 && (
        <>
          <section className="py-10 relative overflow-hidden bg-gray-50">
            {/* Decorative background elements - Extremely subtle */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
              <div className="absolute top-[-10%] right-[-5%] w-[30%] h-[30%] rounded-full bg-ethiopian-gold/2 blur-[100px]"></div>
              <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-viridian-green/2 blur-[120px]"></div>
            </div>

            <div className="page-shell relative z-10">
              <div className="flex items-baseline gap-3 mb-5">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-charcoal tracking-tight">
                  {t("Featured Highlights")}
                </h2>
                <span className="text-xs font-medium tracking-wide text-gray-400 uppercase">
                  {t("Sponsored")}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                {allAds.slice(0, 6).map((ad) => (
                  <div
                    key={`${ad.type}-${ad.id}`}
                    className="group relative h-full"
                  >
                    {/* Card Background & Border Effect - Very subtle border on hover */}
                    <div className="absolute -inset-px bg-gray-100 rounded-xl opacity-0 group-hover:opacity-100 transition duration-500"></div>

                    <div className="relative h-full bg-white rounded-xl overflow-hidden shadow-md transition-all duration-300 hover:shadow-2xl flex flex-col">
                      {ad.type === "product" && (
                        <a
                          href={`/product/${ad.data.id}`}
                          className="flex flex-col h-full"
                        >
                          <div className="relative aspect-square overflow-hidden">
                            <div className="absolute top-2 left-2 z-20 flex flex-col gap-2">
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
                          <div className="p-3 flex-1 flex flex-col relative">
                            <h3 className="font-bold text-sm mb-1 text-gray-900 leading-tight group-hover:text-ethiopian-gold transition-colors line-clamp-2">
                              {ad.data.name}
                            </h3>
                            <div className="mt-auto pt-2 border-t border-gray-100 flex justify-between items-end">
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
                                  size="small"
                                />
                              </div>
                              <span className="text-[10px] font-semibold text-ethiopian-gold uppercase tracking-wide group-hover:underline transition-all underline-offset-4">
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
                          <div className="relative aspect-square overflow-hidden">
                            <div className="absolute top-2 left-2 z-20">
                              <span className="px-2 py-0.5 text-[9px] font-bold tracking-wider text-white bg-black/40 backdrop-blur-md rounded-full border border-white/20 uppercase">
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
                            <div className="absolute bottom-2 left-2 text-white p-1">
                              <p className="text-[10px] font-medium opacity-90 backdrop-blur-sm bg-white/10 px-1.5 py-0.5 rounded inline-block">
                                {ad.data.location}
                              </p>
                            </div>
                          </div>
                          <div className="p-3 flex-1 flex flex-col relative">
                            <h3 className="font-bold text-sm mb-1 text-gray-900 leading-tight group-hover:text-ethiopian-gold transition-colors line-clamp-2">
                              {ad.data.title}
                            </h3>
                            <div className="mt-auto pt-2 border-t border-gray-100">
                              <span className="inline-block px-1.5 py-0.5 bg-ethiopian-gold/10 text-ethiopian-gold rounded text-[10px] font-bold tracking-wide">
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
                          <div className="relative aspect-square overflow-hidden">
                            <div className="absolute top-2 left-2 z-20 flex flex-col gap-2">
                              <span className="px-2 py-0.5 text-[9px] font-bold tracking-wider text-white bg-black/40 backdrop-blur-md rounded-full border border-white/20 uppercase">
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
                          <div className="p-3 flex-1 flex flex-col relative">
                            <h3 className="font-bold text-sm mb-1 text-gray-900 leading-tight group-hover:text-ethiopian-gold transition-colors line-clamp-2">
                              {ad.data.name}
                            </h3>
                            <div className="mt-auto pt-2 border-t border-gray-100 flex justify-between items-end">
                              <div className="text-ethiopian-gold">
                                <PriceWithDiscount
                                  originalPrice={serviceService.getPackagePrice(
                                    ad.data
                                  )}
                                  currency={ad.data.currency || "ETB"}
                                  discount={ad.data.activeDiscount}
                                  size="small"
                                />
                              </div>
                              <span className="text-[10px] font-semibold text-ethiopian-gold uppercase tracking-wide group-hover:underline transition-all underline-offset-4">
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
                                <div className="relative aspect-square overflow-hidden">
                                  <div className="absolute top-2 left-2 z-20">
                                    <span className="px-2 py-0.5 text-[9px] font-bold tracking-wider text-white bg-black/40 backdrop-blur-md rounded-full border border-white/20 uppercase">
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
                                <div className="p-3 flex-1 flex flex-col relative">
                                  <h3 className="font-bold text-sm mb-1 text-gray-900 leading-tight group-hover:text-ethiopian-gold transition-colors line-clamp-2">
                                    {packageData.name}
                                  </h3>
                                  <div className="mt-auto pt-2 border-t border-gray-100 flex justify-between items-end">
                                    <div className="text-ethiopian-gold">
                                      <PriceWithDiscount
                                        originalPrice={
                                          (packageData.startingFromPriceMinor || 0) / 100
                                        }
                                        currency={packageData.displayCurrency || "ETB"}
                                        size="small"
                                      />
                                    </div>
                                    <span className="text-[10px] font-semibold text-ethiopian-gold uppercase tracking-wide group-hover:underline transition-all underline-offset-4">
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

      {/* Trending Packages Section */}
      {trendingPackages.length > 0 && (
        <section className="py-10 bg-white relative">
          <div className="page-shell">
            <SectionHeader title={t("Trending Packages")} href="/packages" />

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
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
            <div className="page-shell">
              <SectionHeader title={t("Upcoming Events")} href="/events" />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
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
            <div className="page-shell relative z-10">
              <SectionHeader title={t("Featured Services")} href="/services" />

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
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

      {SHOW_APP_DOWNLOAD && (
        <SectionBoundary name="AppDownload">
          <AppDownloadSection />
        </SectionBoundary>
      )}

      <SectionBoundary name="Features">
        <FeaturesSection />
      </SectionBoundary>

      {/* The page ends in the shop itself: browsable, filterable, paged */}
      <SectionBoundary name="ShopGrid">
        <ShopGridSection />
      </SectionBoundary>

      {/* <LiveChatButton /> */}
    </div>
  );
}
