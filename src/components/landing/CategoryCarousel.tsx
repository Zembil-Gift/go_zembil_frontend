import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import FadeIn from "../animations/FadeIn";
import { parseUrlParams, buildUrlParams } from "../../shared/categories";
import { useCategories, SubCategoryResponse } from "@/hooks/useCategories";
import { getIconByName } from "./iconMapping";

const getImagePath = (slug: string): string | null => {
  const imageMap: Record<string, string> = {
    'birthday': 'birthday.png',
    'graduation': 'graduation.png',
    'new-baby': 'new-baby.png',
    'wedding': 'wedding.png',
    'housewarming': 'housewarming.png',
    'family-reunion': 'family-reunion.png',
    'promotion': 'promotion.png',
    'anniversary': 'anniversary.png',
    'retirement': 'retirement.png',
    'first-day-school': 'first-day-school.png',
    'engagement': 'engagement.png',
    'mothers-day': 'mothers-day.png',
    'fathers-day': 'fathers-day.png',
    'valentines-day': 'valentines-day.png'
  };
  
  return imageMap[slug] ? `/attached_assets/${imageMap[slug]}` : null;
};

interface CategoryCarouselProps {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

export default function CategoryCarousel({ 
  activeCategory, 
  onCategoryChange
}: CategoryCarouselProps) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Fetch categories from API with fallback
  const { data: categories, isLoading} = useCategories();
  
  // Parse URL parameters to get initial state
  const urlParams = new URLSearchParams(location.search);
  const categoryFilters = parseUrlParams(urlParams);
  
  // Set initial active category from URL or default
  const [selectedCategory, setSelectedCategory] = useState(categoryFilters.category || activeCategory || "occasions");
  const [selectedSubcategory, setSelectedSubcategory] = useState(categoryFilters.sub);
  
  // Carousel state
  const carouselRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  // Update from URL changes
  useEffect(() => {
    if (categoryFilters.category) {
      setSelectedCategory(categoryFilters.category);
      onCategoryChange(categoryFilters.category);
    }
    setSelectedSubcategory(categoryFilters.sub);
  }, [location.search, onCategoryChange, categoryFilters.category, categoryFilters.sub]);

  // Get current category data from API response
  const currentCategoryData = categories?.find(cat => cat.slug === selectedCategory);
  const currentSubcategories = React.useMemo(() => {
    if (!currentCategoryData?.subcategories) return [];
    
    // Sort subcategories to prioritize those with images
    return [...currentCategoryData.subcategories].sort((a, b) => {
      const aHasImage = selectedCategory === 'occasions' ? !!getImagePath(a.slug) : !!a.imageUrl;
      const bHasImage = selectedCategory === 'occasions' ? !!getImagePath(b.slug) : !!b.imageUrl;
      
      if (aHasImage && !bHasImage) return -1;
      if (!aHasImage && bHasImage) return 1;
      
      // Secondary sort by display order if both have or both don't have images
      return (a.displayOrder || 0) - (b.displayOrder || 0);
    });
  }, [currentCategoryData, selectedCategory]);

  // Main category selection handler
  const handleCategorySelect = (categorySlug: string) => {
    setSelectedCategory(categorySlug);
    setSelectedSubcategory(undefined);
    onCategoryChange(categorySlug);
    
    // Update URL without navigation
    const params = new URLSearchParams(location.search);
    params.set('category', categorySlug);
    params.delete('sub');
    const newUrl = `${location.pathname}?${params.toString()}`;
    window.history.pushState({}, '', newUrl);
  };

  // Subcategory selection handler
  const handleSubcategoryClick = (subcategorySlug: string) => {
    // Navigate to shop with category and subcategory
    const urlParams = buildUrlParams({ 
      category: selectedCategory, 
      sub: subcategorySlug 
    });
    navigate(`/shop?${urlParams}`);
  };

  // Update scroll button states
  const updateScrollButtons = () => {
    if (!carouselRef.current) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
  };

  // Scroll carousel
  const scrollCarousel = (direction: 'left' | 'right') => {
    if (!carouselRef.current) return;
    
    const scrollAmount = carouselRef.current.clientWidth * 0.8;
    const currentScroll = carouselRef.current.scrollLeft;
    const targetScroll = direction === 'left' 
      ? currentScroll - scrollAmount 
      : currentScroll + scrollAmount;
    
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    carouselRef.current.scrollTo({
      left: targetScroll,
      behavior: prefersReducedMotion ? 'auto' : 'smooth'
    });
  };

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent, index: number, slug: string) => {
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        if (index > 0) {
          setFocusedIndex(index - 1);
        }
        break;
      case 'ArrowRight':
        event.preventDefault();
        if (index < currentSubcategories.length - 1) {
          setFocusedIndex(index + 1);
        }
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        handleSubcategoryClick(slug);
        break;
    }
  };

  // Scroll to focused item
  useEffect(() => {
    if (focusedIndex >= 0 && carouselRef.current) {
      const cards = carouselRef.current.querySelectorAll('[data-card-index]');
      const targetCard = cards[focusedIndex] as HTMLElement;
      if (targetCard) {
        targetCard.focus();
        const cardRect = targetCard.getBoundingClientRect();
        const containerRect = carouselRef.current.getBoundingClientRect();
        
        if (cardRect.left < containerRect.left || cardRect.right > containerRect.right) {
          targetCard.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'nearest', 
            inline: 'center' 
          });
        }
      }
    }
  }, [focusedIndex]);

  // Update scroll buttons on scroll
  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    const handleScroll = () => updateScrollButtons();
    carousel.addEventListener('scroll', handleScroll);
    updateScrollButtons();

    return () => carousel.removeEventListener('scroll', handleScroll);
  }, [selectedCategory, currentSubcategories]);

  // Scroll to selected subcategory when URL changes
  useEffect(() => {
    if (selectedSubcategory && carouselRef.current) {
      const targetIndex = currentSubcategories.findIndex(item => item.slug === selectedSubcategory);
      
      if (targetIndex >= 0) {
        setTimeout(() => {
          const cards = carouselRef.current?.querySelectorAll('[data-card-index]');
          const targetCard = cards?.[targetIndex] as HTMLElement;
          if (targetCard) {
            targetCard.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'nearest', 
              inline: 'center' 
            });
          }
        }, 100);
      }
    }
  }, [selectedCategory, selectedSubcategory, currentSubcategories]);

  // Build category tabs from API data
  const categoryTabs = categories?.map(cat => ({
    id: cat.slug,
    label: cat.name,
  })) || [
    { id: "occasions", label: "Occasions" },
    { id: "cultural-religious", label: "Cultural & Religious" },
    { id: "emotions", label: "Emotions" },
    { id: "food-beverages", label: "Food & Beverages" },
  ];

  if (isLoading) {
    return (
      <section id="perfect-gift" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-eagle-green" />
            <span className="ml-3 text-gray-600">Loading categories...</span>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="perfect-gift" className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn delay={0.2} duration={0.8}>
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-eagle-green mb-4">
              Find the Perfect Gift
            </h2>
            <p className="text-xl font-light text-viridian-green max-w-2xl mx-auto">
              Discover meaningful gifts for every occasion and celebration
            </p>
          </div>
        </FadeIn>

        {/* Category Pills */}
        <div className="flex justify-center mb-12">
          <div className="bg-white border border-eagle-green/20 p-1 rounded-xl inline-flex flex-wrap shadow-sm gap-2">
            {categoryTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleCategorySelect(tab.id)}
                className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg transition-all duration-200 text-sm sm:text-base whitespace-nowrap ${
                  selectedCategory === tab.id
                    ? "bg-eagle-green text-white shadow-sm ring-2 ring-yellow/40"
                    : "text-eagle-green hover:text-white hover:bg-viridian-green"
                }`}
                aria-pressed={selectedCategory === tab.id}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Horizontal Carousel */}
        <div className="relative">
          {/* Left Arrow */}
          <button
            onClick={() => scrollCarousel('left')}
            disabled={!canScrollLeft}
            className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2 border-eagle-green bg-white shadow-lg transition-all duration-200 ${
              canScrollLeft
                ? "hover:bg-viridian-green hover:border-viridian-green hover:text-white text-eagle-green"
                : "opacity-40 cursor-not-allowed text-gray-400"
            }`}
            aria-label="Scroll subcategories left"
          >
            <ChevronLeft className="w-5 h-5 mx-auto" />
          </button>

          {/* Right Arrow */}
          <button
            onClick={() => scrollCarousel('right')}
            disabled={!canScrollRight}
            className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2 border-eagle-green bg-white shadow-lg transition-all duration-200 ${
              canScrollRight
                ? "hover:bg-viridian-green hover:border-viridian-green hover:text-white text-eagle-green"
                : "opacity-40 cursor-not-allowed text-gray-400"
            }`}
            aria-label="Scroll subcategories right"
          >
            <ChevronRight className="w-5 h-5 mx-auto" />
          </button>

          {/* Carousel Container */}
          <div
            ref={carouselRef}
            className="overflow-x-auto scrollbar-hide px-12 sm:px-14"
            style={{
              scrollSnapType: 'x mandatory',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}
          >
            <motion.div
              key={selectedCategory}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="flex gap-4 sm:gap-5 pb-2"
            >
              {currentSubcategories.map((item: SubCategoryResponse, index: number) => {
                const Icon = getIconByName(item.iconName);
                const isSelected = selectedSubcategory === item.slug;
                const imagePath = selectedCategory === 'occasions' ? getImagePath(item.slug) : (item.imageUrl || null);
                
                return (
                  <button
                    key={item.slug || index}
                    data-card-index={index}
                    onClick={() => handleSubcategoryClick(item.slug)}
                    onKeyDown={(e) => handleKeyDown(e, index, item.slug)}
                    className={`flex-shrink-0 w-60 sm:w-72 h-40 sm:h-48 group cursor-pointer transform transition-all duration-300 hover:scale-102 focus:outline-none focus:ring-2 focus:ring-yellow/40 focus:ring-offset-2 rounded-2xl ${
                      isSelected ? "scale-102 ring-2 ring-yellow/60" : ""
                    }`}
                    style={{ scrollSnapAlign: 'start' }}
                    aria-pressed={isSelected}
                    title={`Browse ${item.name} products`}
                    tabIndex={0}
                  >
                    <div className="w-full h-full bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-viridian-green/30 overflow-hidden">
                      {imagePath ? (
                        <div className="flex flex-col h-full">
                          <div className="flex-1 relative overflow-hidden">
                            <img
                              src={imagePath}
                              alt={item.name}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          </div>
                          
                          <div className="p-3 sm:p-4 bg-gradient-to-b from-june-bud/10 to-white">
                            <h3 className="font-bold text-sm sm:text-base text-eagle-green mb-1 leading-tight text-center">
                              {item.name}
                            </h3>
                            <p className="font-light text-xs sm:text-sm text-eagle-green/70 leading-tight line-clamp-2 text-center">
                              {item.description}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-full bg-gradient-to-b from-june-bud/30 to-white rounded-2xl p-4 sm:p-5">
                          <div className="flex flex-col items-center justify-center h-full text-center">
                            <div className="w-12 h-12 bg-eagle-green rounded-full flex items-center justify-center mb-3 shadow-sm">
                              <Icon className="w-6 h-6 text-white" />
                            </div>
                            
                            <h3 className="font-bold text-sm sm:text-base text-eagle-green mb-2 leading-tight">
                              {item.name}
                            </h3>
                            
                            <p className="font-light text-xs sm:text-sm text-eagle-green/70 leading-tight line-clamp-2">
                              {item.description}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </motion.div>
          </div>
        </div>
      </div>

      <style>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
}
