import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import FadeIn from "../animations/FadeIn";
import { CATEGORIES, getCategoryById, parseUrlParams, buildUrlParams } from "../../shared/categories";
import { 
  occasionCategories, 
  culturalCategories, 
  emotionCategories, 
  foodCategories,
  CategoryItem 
} from "./categoryData";

interface CategoryCarouselProps {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

export default function CategoryCarousel({ 
  activeCategory, 
  onCategoryChange
}: CategoryCarouselProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  
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

  // Get current category data
  const currentCategoryData = getCategoryById(selectedCategory);
  const subcategories = currentCategoryData?.subcategories || [];

  // Main category selection handler
  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSelectedSubcategory(undefined);
    onCategoryChange(categoryId);
    
    // Update URL without navigation
    const params = new URLSearchParams(location.search);
    params.set('category', categoryId);
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
    
    const scrollAmount = carouselRef.current.clientWidth * 0.8; // Scroll by ~80% of visible width
    const currentScroll = carouselRef.current.scrollLeft;
    const targetScroll = direction === 'left' 
      ? currentScroll - scrollAmount 
      : currentScroll + scrollAmount;
    
    // Check for reduced motion preference
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
        const currentItems = getCurrentCategoryItems();
        if (index < currentItems.length - 1) {
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
        // Scroll card into view if needed
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
    
    // Initial update
    updateScrollButtons();

    return () => carousel.removeEventListener('scroll', handleScroll);
  }, [selectedCategory]); // Re-run when category changes

  // Scroll to selected subcategory when URL changes or category changes
  useEffect(() => {
    if (selectedSubcategory && carouselRef.current) {
      const currentItems = getCurrentCategoryItems();
      const targetIndex = currentItems.findIndex(item => item.slug === selectedSubcategory);
      
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
        }, 100); // Small delay to ensure DOM is updated
      }
    }
  }, [selectedCategory, selectedSubcategory]);

  // Get current category items using the original data structure
  const getCurrentCategoryItems = (): CategoryItem[] => {
    switch (selectedCategory) {
      case "occasions": return occasionCategories;
      case "cultural-religious": return culturalCategories;
      case "emotions": return emotionCategories;
      case "food-beverages": return foodCategories;
      default: return occasionCategories;
    }
  };

  const categoryTabs = [
    { id: "occasions", label: "Occasions" },
    { id: "cultural-religious", label: "Cultural & Religious" },
    { id: "emotions", label: "Emotions" },
    { id: "food-beverages", label: "Food & Beverages" },
  ];

  const currentItems = getCurrentCategoryItems();

  return (
    <section id="perfect-gift" className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn delay={0.2} duration={0.8}>
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-gotham-bold text-eagle-green mb-4">
              Find the Perfect Gift
            </h2>
            <p className="text-xl font-gotham-light text-viridian-green max-w-2xl mx-auto">
              Discover meaningful gifts for every occasion and celebration
            </p>
          </div>
        </FadeIn>

        {/* Category Pills */}
        <div className="flex justify-center mb-12">
          <div className="bg-white border border-eagle-green/20 p-1 rounded-xl inline-flex flex-wrap shadow-sm">
            {categoryTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleCategorySelect(tab.id)}
                className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-gotham-bold transition-all duration-200 text-sm sm:text-base whitespace-nowrap ${
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
              {currentItems.map((item, index) => {
                const Icon = item.icon;
                const isSelected = selectedSubcategory === item.slug;
                
                // Generate image filename from slug
                const getImagePath = (slug: string) => {
                  // Map slug to image filename (for occasions category)
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
                
                const imagePath = selectedCategory === 'occasions' ? getImagePath(item.slug!) : null;
                
                return (
                  <button
                    key={item.slug || index}
                    data-card-index={index}
                    onClick={() => handleSubcategoryClick(item.slug!)}
                    onKeyDown={(e) => handleKeyDown(e, index, item.slug!)}
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
                        // Image-based card for Occasions
                        <div className="flex flex-col h-full">
                          {/* Image Container */}
                          <div className="flex-1 relative overflow-hidden">
                            <img
                              src={imagePath}
                              alt={item.name}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                              loading="lazy"
                            />
                            {/* Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          </div>
                          
                          {/* Content */}
                          <div className="p-3 sm:p-4 bg-gradient-to-b from-june-bud/10 to-white">
                            <h3 className="font-gotham-bold text-sm sm:text-base text-eagle-green mb-1 leading-tight text-center">
                              {item.name}
                            </h3>
                            <p className="font-gotham-light text-xs sm:text-sm text-eagle-green/70 leading-tight line-clamp-2 text-center">
                              {item.description}
                            </p>
                          </div>
                        </div>
                      ) : (
                        // Icon-based card for other categories
                        <div className="w-full h-full bg-gradient-to-b from-june-bud/30 to-white rounded-2xl p-4 sm:p-5">
                          <div className="flex flex-col items-center justify-center h-full text-center">
                            {/* Icon Chip */}
                            <div className="w-12 h-12 bg-eagle-green rounded-full flex items-center justify-center mb-3 shadow-sm">
                              <Icon className="w-6 h-6 text-white" />
                            </div>
                            
                            {/* Title */}
                            <h3 className="font-gotham-bold text-sm sm:text-base text-eagle-green mb-2 leading-tight">
                              {item.name}
                            </h3>
                            
                            {/* Description */}
                            <p className="font-gotham-light text-xs sm:text-sm text-eagle-green/70 leading-tight line-clamp-2">
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

      {/* Hide scrollbar styles */}
      <style jsx>{`
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