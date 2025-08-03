import React, { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import FadeIn from "@/components/animations/FadeIn";

import { CategoryItem, getCategoryContent } from "./categoryData";

interface CategoryCarouselProps {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

export default function CategoryCarousel({ 
  activeCategory, 
  onCategoryChange
}: CategoryCarouselProps) {
  const { t } = useTranslation();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const categoryTabs = [
    { key: "occasions", label: t('homepage.categories.occasions') },
    { key: "cultural", label: t('homepage.categories.cultural') },
    { key: "emotions", label: t('homepage.categories.emotions') },
    { key: "custom", label: t('homepage.categories.custom') },
  ];

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 320; // Width of one card + gap
      const newScrollLeft = scrollContainerRef.current.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);
      
      scrollContainerRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      });

      // Update scroll buttons after a short delay
      setTimeout(() => {
        updateScrollButtons();
      }, 300);
    }
  };

  const updateScrollButtons = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  // Update scroll buttons when category changes
  React.useEffect(() => {
    setTimeout(updateScrollButtons, 100);
  }, [activeCategory]);

  return (
    <section id="occasions" className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn delay={0.2} duration={0.8}>
          <div className="text-center mb-12">
            <h2 className="font-gotham-extra-bold text-3xl sm:text-4xl text-eagle-green mb-4">
              {t('homepage.categories.title')}
            </h2>
            <p className="font-gotham-light text-xl text-eagle-green/70 max-w-2xl mx-auto">
              {t('homepage.categories.subtitle')}
            </p>
          </div>
        </FadeIn>

        {/* Category Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-white border border-viridian-green/20 p-1 rounded-xl inline-flex flex-wrap shadow-sm max-w-full overflow-x-auto">
            {categoryTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => onCategoryChange(tab.key)}
                className={`px-3 sm:px-4 md:px-6 py-2 sm:py-3 rounded-lg font-medium transition-all duration-200 text-xs sm:text-sm whitespace-nowrap flex-shrink-0 ${
                  activeCategory === tab.key
                    ? "bg-viridian-green text-white hover:bg-viridian-green shadow-md"
                    : "text-eagle-green hover:bg-eagle-green/10 hover:text-viridian-green"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category Content - Manual scroll carousel */}
        <div className="relative">
          {/* Scroll Buttons */}
          {canScrollLeft && (
            <button
              onClick={() => scroll('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 backdrop-blur-sm border border-viridian-green/20 rounded-full p-1.5 sm:p-2 shadow-lg hover:bg-white transition-all duration-200 hover:scale-110"
              aria-label="Scroll left"
            >
              <ChevronLeft size={20} className="text-eagle-green sm:w-6 sm:h-6" />
            </button>
          )}
          
          {canScrollRight && (
            <button
              onClick={() => scroll('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 backdrop-blur-sm border border-viridian-green/20 rounded-full p-1.5 sm:p-2 shadow-lg hover:bg-white transition-all duration-200 hover:scale-110"
              aria-label="Scroll right"
            >
              <ChevronRight size={20} className="text-eagle-green sm:w-6 sm:h-6" />
            </button>
          )}

          {/* Scrollable Container */}
          <div 
            ref={scrollContainerRef}
            className="overflow-x-auto scrollbar-hide"
            onScroll={updateScrollButtons}
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <div className="flex gap-3 sm:gap-4 md:gap-6 pb-4" style={{ minWidth: 'max-content' }}>
              {getCategoryContent(activeCategory).map((category, index) => {
                const IconComponent = category.icon;
                return (
                  <Link 
                    key={`${category.name}-${index}`} 
                    to={`/gifts/${category.name.toLowerCase().replace(/\s+/g, '-')}`}
                    className="flex-shrink-0"
                  >
                    <div className="group cursor-pointer w-64 sm:w-72">
                      <div className={`bg-gradient-to-br ${category.gradient} rounded-2xl p-4 sm:p-6 text-white transform group-hover:scale-105 transition-all duration-300 shadow-lg h-36 sm:h-40 flex flex-col justify-center`}>
                        <div className="text-center">
                          <IconComponent size={28} className="mx-auto mb-3 sm:mb-4 sm:w-8 sm:h-8" />
                          <h3 className="font-semibold text-base sm:text-lg mb-2">{category.name}</h3>
                          <p className="text-xs sm:text-sm opacity-90 leading-relaxed">{category.description}</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 