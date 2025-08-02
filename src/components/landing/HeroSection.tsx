import React, { useState } from "react";
import { motion } from "framer-motion";
import { Search, Truck, Heart } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import FadeIn from "@/components/animations/FadeIn";

interface HeroSectionProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

export default function HeroSection({ searchTerm, onSearchChange }: HeroSectionProps) {
  const { t } = useTranslation();

  return (
    <section className="relative bg-gradient-to-br from-deep-forest to-ethiopian-gold text-white">
      {/* Ethiopian cultural pattern overlay */}
      <div className="absolute inset-0 opacity-10">
        <div className="w-full h-full" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 10L40 30L30 50L20 30L30 10Z' fill='currentColor'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat'
        }}></div>
      </div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="lg:grid lg:grid-cols-2 lg:gap-12 items-center">
          {/* Content */}
          <div className="mb-12 lg:mb-0">
            <FadeIn delay={0.2} duration={0.8}>
              <h1 className="font-gotham-extra-bold text-4xl sm:text-5xl lg:text-6xl leading-tight mb-6">
                {t('homepage.hero.title')}
                <span className="text-amber block">{t('homepage.hero.subtitle')}</span>
              </h1>
            </FadeIn>
            <FadeIn delay={0.4} duration={0.8}>
              <p className="font-gotham-light text-xl sm:text-2xl mb-8 leading-relaxed opacity-90">
                {t('homepage.hero.description')}
              </p>
            </FadeIn>
            
            {/* Search Bar */}
            <FadeIn delay={0.6} duration={0.8}>
              <div className="bg-white rounded-xl p-2 flex items-center shadow-xl max-w-md">
                <Input 
                  type="text" 
                  placeholder={t('homepage.hero.searchPlaceholder')} 
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="flex-1 px-4 py-3 text-charcoal placeholder-gray-500 bg-transparent border-none outline-none"
                />
                <Button className="bg-ethiopian-gold hover:bg-amber text-white px-6 py-3 rounded-lg">
                  <Search size={16} />
                </Button>
              </div>
            </FadeIn>
            
            {/* Quick Stats */}
            <div className="flex items-center space-x-8 mt-8 text-sm">
              <div className="flex items-center space-x-2">
                <Truck className="text-amber" size={16} />
                <span>{t('homepage.hero.freeDelivery')}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Heart className="text-amber" size={16} />
                <span>{t('homepage.hero.happyRecipients')}</span>
              </div>
            </div>
          </div>

          {/* Hero Image - Hidden on mobile */}
          <FadeIn delay={0.6} duration={0.8}>
            <div className="relative w-full h-full hidden lg:block">
              <img 
                src="/attached_assets/landing_page_img.png" 
                alt="Ethiopian Gifts - Send Love Through Meaningful Gifts" 
                className="w-full h-full object-cover"
              />
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
} 