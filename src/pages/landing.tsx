import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import LiveChatButton from "@/components/live-chat-button";
import { MockApiService } from "@/services/mockApiService";

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
  const [activeCategory, setActiveCategory] = useState("occasions");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBudget, setSelectedBudget] = useState("all");

  // Fetch trending gifts using mock data
  const { data: trendingProducts = [] } = useQuery({
    queryKey: ["/api/products?isTrending=true&limit=12"],
    queryFn: () => MockApiService.getTrendingProducts(12),
  });

  // Use real products or fallback to featured products
  const trendingGifts = trendingProducts || [];

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
      
      <TrendingGiftsSection 
        trendingGifts={trendingGifts}
        selectedBudget={selectedBudget}
        onBudgetChange={setSelectedBudget}
      />
      
      <GiftRecipientsSection />
      
      <DiasporaSection />
      
      <SubscriptionBanner />
      
      <FeaturesSection />
      
      <TestimonialsSection />
      
      <LiveChatButton />
    </div>
  );
}
