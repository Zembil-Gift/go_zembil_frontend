import React, {useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {useLocation} from "react-router-dom";
import LiveChatButton from "@/components/live-chat-button";
import {extractPriceAmount, Product, productService} from "@/services/productService";
import {parseUrlParams} from "@/shared/categories";
import {getProductImageUrl, getAllProductImages} from "@/utils/imageUtils";

// Landing page components
import HeroSection from "@/components/landing/HeroSection";
import CategoryCarousel from "@/components/landing/CategoryCarousel";
import TrendingGiftsSection from "@/components/landing/TrendingGiftsSection";
import GiftRecipientsSection from "@/components/landing/GiftRecipientsSection";
import DiasporaSection from "@/components/landing/DiasporaSection";
import SubscriptionBanner from "@/components/landing/SubscriptionBanner";
import FeaturesSection from "@/components/landing/FeaturesSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";


export default function Landing() {
  const location = useLocation();
  
  // Parse URL parameters to set initial category
  const urlParams = new URLSearchParams(location.search);
  const categoryFilters = parseUrlParams(urlParams);
  
  const [activeCategory, setActiveCategory] = useState(categoryFilters.category || "occasions");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBudget, setSelectedBudget] = useState("all");

  // Fetch products using real API
  const { data: productsResponse, isLoading, error } = useQuery({
    queryKey: ["products", "all"],
    queryFn: async () => {
      try {
          return await productService.getAllProducts(0, 3);
      } catch (err) {
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  const trendingGifts = React.useMemo(() => {
    if (!productsResponse?.content) return [];
    
    // Backend already filters out out-of-stock products
    return productsResponse.content.map((product: Product) => {
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
    }});
  }, [productsResponse]);

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
      
      {isLoading ? (
        <div className="py-16 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ethiopian-gold mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading products...</p>
        </div>
      ) : error ? (
        <div className="py-16 text-center">
          <p className="text-red-600">Failed to load products. Please try again later.</p>
        </div>
      ) : (
        <TrendingGiftsSection 
          trendingGifts={trendingGifts}
          selectedBudget={selectedBudget}
          onBudgetChange={setSelectedBudget}
        />
      )}
      
      <GiftRecipientsSection />
      
      <DiasporaSection />
      
      <SubscriptionBanner />
      
      <FeaturesSection />
      
      <TestimonialsSection />
      
      <LiveChatButton />
    </div>
  );
}
