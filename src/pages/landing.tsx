import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { extractPriceAmount, Product, productService } from "@/services/productService";
import { parseUrlParams } from "@/shared/categories";
import { getProductImageUrl, getAllProductImages, getEventImageUrl } from "@/utils/imageUtils";
import { eventOrderService, EventResponse } from "@/services/eventOrderService";
import { serviceService, ServicePackageResponse, ServiceResponse } from "@/services/serviceService";

import HeroSection from "@/components/landing/HeroSection";
import CategoryCarousel from "@/components/landing/CategoryCarousel";
import TrendingGiftsSection from "@/components/landing/TrendingGiftsSection";
import GiftRecipientsSection from "@/components/landing/GiftRecipientsSection";
import DiasporaSection from "@/components/landing/DiasporaSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import EventCard from "@/components/EventCard";
import ServiceCard from "@/components/ServiceCard";
import SectionTransition from "@/components/landing/SectionTransition";
// import TestimonialsSection from "@/components/landing/TestimonialsSection";


export default function Landing() {
  const location = useLocation();

  // Parse URL parameters to set initial category
  const urlParams = new URLSearchParams(location.search);
  const categoryFilters = parseUrlParams(urlParams);

  const [activeCategory, setActiveCategory] = useState(categoryFilters.category || "occasions");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBudget, setSelectedBudget] = useState("all");

  // Fetch featured products
  const { data: featuredProducts, isLoading: isLoadingProducts, error: productsError } = useQuery({
    queryKey: ["products", "featured"],
    queryFn: async () => {
      try {
        return await productService.getFeaturedProducts(10);
      } catch (err) {
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  // Fetch featured events
  const { data: featuredEventsResponse} = useQuery({
    queryKey: ["events", "featured"],
    queryFn: async () => {
      try {
        return await eventOrderService.getFeaturedEvents(0, 6);
      } catch (err) {
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Fetch featured services
  const { data: featuredServicesResponse} = useQuery({
    queryKey: ["services", "featured"],
    queryFn: async () => {
      try {
        return await serviceService.getFeaturedServices(0, 6);
      } catch (err) {
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Fetch ads (products, events, or services)
  const { data: adProducts } = useQuery({
    queryKey: ["products", "ads"],
    queryFn: async () => {
      try {
        return await productService.getAdProducts(3);
      } catch (err) {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const { data: adEvents } = useQuery({
    queryKey: ["events", "ads"],
    queryFn: async () => {
      try {
        return await eventOrderService.getAdEvents(2);
      } catch (err) {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });


  const { data: adServices } = useQuery({
    queryKey: ["services", "ads"],
    queryFn: async () => {
      try {
        return await serviceService.getAdServicePackages(2);
      } catch (err) {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const trendingGifts = React.useMemo(() => {
    if (!featuredProducts) return [];

    return featuredProducts.map((product: Product) => {
      const priceAmount = extractPriceAmount(product.price) || extractPriceAmount(product.productSku?.[0]?.price);
      const currencyCode = product.price?.currencyCode ?? product.productSku?.[0]?.price?.currencyCode ?? 'USD';

      return {
        id: product.id,
        name: product.name,
        description: product.description || '',
        price: priceAmount,
        originalPrice: undefined,
        currency: currencyCode,
        image: getProductImageUrl(product.images, '/placeholder-product.jpg'),
        images: getAllProductImages(product.images),
        category: product.occasion || 'Gift',
        categorySlug: product.categorySlug || 'gifts',
        isTrending: product.isTrending || false,
        isFeatured: product.isFeatured || false,
        rating: product.rating || 4.5,
        reviewCount: product.reviewCount || 0,
        inStock: true,
        stockQuantity: product.stockQuantity || (product.productSku?.[0]?.stockQuantity) || 10,
        badges: product.isFeatured ? ['Featured'] : [],
        tags: product.tags || [],
      }
    });
  }, [featuredProducts]);

  // Combine all ads into a single array for display
  const allAds = React.useMemo(() => {
    const ads: Array<{ type: 'product' | 'event' | 'service', data: any, id: string | number }> = [];

    if (adProducts && adProducts.length > 0) {
      adProducts.forEach((product: Product) => {
        ads.push({
          type: 'product',
          data: product,
          id: product.id
        });
      });
    }

    if (adEvents && adEvents.length > 0) {
      adEvents.forEach((event: any) => {
        ads.push({
          type: 'event',
          data: event,
          id: event.id
        });
      });
    }

    if (adServices && adServices.length > 0) {
      adServices.forEach((service: ServicePackageResponse) => {
        ads.push({
          type: 'service',
          data: service,
          id: service.id
        });
      });
    }

    return ads;
  }, [adProducts, adEvents, adServices]);

  return (
    <div className="min-h-screen bg-light-cream">
      <HeroSection
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />

      <CategoryCarousel
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />

      {/* Ad Banner Section - Enhanced UI */}
      {allAds.length > 0 && (
        <>
          <SectionTransition 
            variant="gradient" 
            fromColor="from-light-cream" 
            toColor="to-gray-50"
            className="mt-8"
          />
          <section className="py-20 relative overflow-hidden bg-gray-50">
          {/* Decorative background elements - Extremely subtle */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
            <div className="absolute top-[-10%] right-[-5%] w-[30%] h-[30%] rounded-full bg-ethiopian-gold/2 blur-[100px]"></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-viridian-green/2 blur-[120px]"></div>
          </div>

          <div className="container mx-auto px-4 relative z-10">
            <div className="flex items-center justify-center gap-3 mb-10">
              <span className="h-[1px] w-16 bg-gray-200"></span>
              <span className="text-xs font-bold tracking-[0.25em] text-gray-400 uppercase">Sponsored</span>
              <span className="h-[1px] w-16 bg-gray-200"></span>
            </div>

            <h2 className="text-3xl md:text-5xl font-extrabold text-center mb-16 text-charcoal tracking-tight">
              Featured Highlights
            </h2>

            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 px-4 sm:px-6 lg:px-8">
              {allAds.slice(0, 3).map((ad) => (
                <div key={`${ad.type}-${ad.id}`} className="group relative h-full">
                  {/* Card Background & Border Effect - Very subtle border on hover */}
                  <div className="absolute -inset-px bg-gray-100 rounded-2xl opacity-0 group-hover:opacity-100 transition duration-500"></div>

                  <div className="relative h-full bg-white rounded-2xl overflow-hidden shadow-lg transition-all duration-300 hover:shadow-2xl flex flex-col">
                    {ad.type === 'product' && (
                      <a href={`/product/${ad.data.id}`} className="flex flex-col h-full">
                        <div className="relative h-64 overflow-hidden">
                          <div className="absolute top-4 left-4 z-20">
                            <span className="px-3 py-1 text-[10px] font-bold tracking-widest text-white bg-black/40 backdrop-blur-md rounded-full border border-white/20 uppercase">
                              Spotlight
                            </span>
                          </div>
                          <img
                            src={getProductImageUrl(ad.data.images, '/placeholder-product.jpg')}
                            alt={ad.data.name}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-300"></div>
                        </div>
                        <div className="p-6 flex-1 flex flex-col relative">
                          <h3 className="font-bold text-xl mb-2 text-gray-900 leading-tight group-hover:text-ethiopian-gold transition-colors line-clamp-2">{ad.data.name}</h3>
                          <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between items-end">
                            <p className="text-2xl font-bold text-ethiopian-gold">
                              {extractPriceAmount(ad.data.price || ad.data.productSku?.[0]?.price) || 0}
                              <span className="text-sm font-medium text-gray-500 ml-1 translate-y-[-5px] inline-block">{ad.data.price?.currencyCode || 'USD'}</span>
                            </p>
                            <span className="text-xs font-semibold text-ethiopian-gold uppercase tracking-wide group-hover:underline transition-all underline-offset-4">View &rarr;</span>
                          </div>
                        </div>
                      </a>
                    )}
                    {ad.type === 'event' && (
                      <a href={`/events/${ad.data.id}`} className="flex flex-col h-full">
                        <div className="relative h-64 overflow-hidden">
                          <div className="absolute top-4 left-4 z-20">
                            <span className="px-3 py-1 text-[10px] font-bold tracking-widest text-white bg-black/40 backdrop-blur-md rounded-full border border-white/20 uppercase">
                              Event
                            </span>
                          </div>
                          <img
                            src={getEventImageUrl(ad.data.images, ad.data.bannerImageUrl) || ad.data.bannerImageUrl || '/placeholder-event.jpg'}
                            alt={ad.data.title}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-70 group-hover:opacity-50 transition-opacity duration-300"></div>
                          <div className="absolute bottom-4 left-4 text-white p-2">
                            <p className="text-sm font-medium opacity-90 backdrop-blur-sm bg-white/10 px-2 py-1 rounded inline-block">{ad.data.location}</p>
                          </div>
                        </div>
                        <div className="p-6 flex-1 flex flex-col relative">
                          <h3 className="font-bold text-xl mb-3 text-gray-900 leading-tight group-hover:text-ethiopian-gold transition-colors line-clamp-2">{ad.data.title}</h3>
                          <div className="mt-auto pt-4 border-t border-gray-100">
                            <span className="inline-block px-2 py-1 bg-ethiopian-gold/10 text-ethiopian-gold rounded text-xs font-bold tracking-wide">GET TICKETS</span>
                          </div>
                        </div>
                      </a>
                    )}
                    {ad.type === 'service' && (
                      <a href={`/service-detail/${ad.data.serviceId}`} className="flex flex-col h-full">
                        <div className="relative h-64 overflow-hidden">
                          <div className="absolute top-4 left-4 z-20">
                            <span className="px-3 py-1 text-[10px] font-bold tracking-widest text-white bg-black/40 backdrop-blur-md rounded-full border border-white/20 uppercase">
                              Service
                            </span>
                          </div>
                          <img
                            src={ad.data.primaryImageUrl || '/placeholder-service.jpg'}
                            alt={ad.data.name}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-300"></div>
                        </div>
                        <div className="p-6 flex-1 flex flex-col relative">
                          <h3 className="font-bold text-xl mb-2 text-gray-900 leading-tight group-hover:text-ethiopian-gold transition-colors line-clamp-2">{ad.data.name}</h3>
                          <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between items-end">
                            <p className="text-2xl font-bold text-ethiopian-gold">
                              {(ad.data.basePriceMinor || 0) / 100}
                              <span className="text-sm font-medium text-gray-500 ml-1 translate-y-[-5px] inline-block">{ad.data.currency || 'USD'}</span>
                            </p>
                            <span className="text-xs font-semibold text-ethiopian-gold uppercase tracking-wide group-hover:underline transition-all underline-offset-4">Book Now &rarr;</span>
                          </div>
                        </div>
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

      {/* Transition: Ads to Products */}
      {allAds.length > 0 && trendingGifts.length > 0 && (
        <div className="relative">
          <SectionTransition 
            variant="wave" 
            fromColor="bg-gray-50" 
            toColor="bg-light-cream"
          />
        </div>
      )}

      {/* Featured Products Section */}
      {isLoadingProducts ? (
        <div className="py-24 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ethiopian-gold mx-auto"></div>
          <p className="mt-6 text-gray-500 font-medium tracking-wide">Curating collections...</p>
        </div>
      ) : productsError ? (
        <div className="py-24 text-center">
          <p className="text-red-500 font-medium">Unable to load collections at this time.</p>
        </div>
      ) : trendingGifts.length > 0 ? (
        <TrendingGiftsSection
          trendingGifts={trendingGifts}
          selectedBudget={selectedBudget}
          onBudgetChange={setSelectedBudget}
        />
      ) : null}

      {/* Transition: Products to Events */}
      {trendingGifts.length > 0 && featuredEventsResponse?.content && featuredEventsResponse.content.length > 0 && (
        <SectionTransition 
          variant="gradient" 
          fromColor="from-light-cream" 
          toColor="to-white"
        />
      )}

      {/* Featured Events Section */}
      {featuredEventsResponse?.content && featuredEventsResponse.content.length > 0 && (
        <section className="py-20 bg-white relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center mb-12">
              <h2 className="text-4xl font-extrabold text-charcoal mb-4">Upcoming Events</h2>
              <div className="w-16 h-1 bg-ethiopian-gold rounded-full"></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
              {featuredEventsResponse.content.map((event: EventResponse, index: number) => (
                <div key={event.id} className="hover:-translate-y-2 transition-transform duration-300">
                  <EventCard event={event} index={index} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Transition: Events to Services */}
      {featuredEventsResponse?.content && featuredEventsResponse.content.length > 0 && featuredServicesResponse?.content && featuredServicesResponse.content.length > 0 && (
        <div className="relative">
          <SectionTransition 
            variant="curve" 
            fromColor="bg-white" 
            toColor="bg-light-cream"
          />
        </div>
      )}

      {/* Featured Services Section */}
      {featuredServicesResponse?.content && featuredServicesResponse.content.length > 0 && (
        <section className="py-20 bg-light-cream relative">
          {/* Subtle texture overlay */}
          <div className="absolute inset-0 opacity-[0.4] mix-blend-multiply bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none"></div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="flex flex-col items-center mb-12">
              <h2 className="text-4xl font-extrabold text-charcoal mb-4">Featured Services</h2>
              <div className="w-16 h-1 bg-ethiopian-gold rounded-full"></div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
              {featuredServicesResponse.content.map((service: ServiceResponse, index: number) => (
                <div key={service.id} className="hover:-translate-y-2 transition-transform duration-300">
                  <ServiceCard key={service.id} service={service} index={index} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Transition: Services to Gift Recipients */}
      {featuredServicesResponse?.content && featuredServicesResponse.content.length > 0 && (
        <SectionTransition 
          variant="divider" 
        />
      )}

      <GiftRecipientsSection />

      <DiasporaSection />

      {/* <SubscriptionBanner /> */}

      <FeaturesSection />

      {/* <TestimonialsSection /> */}

      {/* <LiveChatButton /> */}
    </div>
  );
}
