import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { parseUrlParams } from "@shared/categories.ts";
import { useCategories, SubCategoryResponse } from "@/hooks/useCategories";
import { getIconByName } from "./iconMapping";
import SectionHeader from "@/components/landing/SectionHeader";

interface CategoryCarouselProps {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

export default function CategoryCarousel({
  activeCategory,
  onCategoryChange,
}: CategoryCarouselProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  // Fetch categories from API with fallback
  const { data: categories, isLoading } = useCategories();

  // Parse URL parameters to get initial state
  const urlParams = new URLSearchParams(location.search);
  const categoryFilters = parseUrlParams(urlParams);

  // Set initial active category from URL or default
  const [selectedCategory, setSelectedCategory] = useState(
    categoryFilters.category || activeCategory || "occasions"
  );
  const [selectedSubcategory, setSelectedSubcategory] = useState(
    categoryFilters.sub
  );

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
  }, [
    location.search,
    onCategoryChange,
    categoryFilters.category,
    categoryFilters.sub,
  ]);

  // Get current category data from API response
  const currentCategoryData = categories?.find(
    (cat) => cat.slug === selectedCategory
  );
  const currentSubcategories = React.useMemo(() => {
    if (!currentCategoryData?.subcategories) return [];

    // Sort subcategories to prioritize those with images
    return [...currentCategoryData.subcategories].sort((a, b) => {
      const aHasImage = !!a.imageUrl;
      const bHasImage = !!b.imageUrl;

      if (aHasImage && !bHasImage) return -1;
      if (!aHasImage && bHasImage) return 1;

      // Secondary sort by display order if both have or both don't have images
      return (a.displayOrder || 0) - (b.displayOrder || 0);
    });
  }, [currentCategoryData]);

  // Main category selection handler
  const handleCategorySelect = (categorySlug: string) => {
    setSelectedCategory(categorySlug);
    setSelectedSubcategory(undefined);
    onCategoryChange(categorySlug);

    // Update URL without navigation
    const params = new URLSearchParams(location.search);
    params.set("category", categorySlug);
    params.delete("sub");
    const newUrl = `${location.pathname}?${params.toString()}`;
    window.history.pushState({}, "", newUrl);
  };

  // Subcategory selection handler
  const handleSubcategoryClick = (subcategory: SubCategoryResponse) => {
    const selectedCategoryData = categories?.find(
      (cat) => cat.slug === selectedCategory
    );
    const params = new URLSearchParams();

    if (selectedCategoryData?.id) {
      params.set("categoryId", String(selectedCategoryData.id));
    }
    if (subcategory.id) {
      params.set("subCategoryId", String(subcategory.id));
    }

    navigate(`/packages${params.toString() ? `?${params.toString()}` : ""}`);
  };

  // Update scroll button states
  const updateScrollButtons = () => {
    if (!carouselRef.current) return;

    const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
  };

  // Scroll carousel
  const scrollCarousel = (direction: "left" | "right") => {
    if (!carouselRef.current) return;

    const scrollAmount = carouselRef.current.clientWidth * 0.8;
    const currentScroll = carouselRef.current.scrollLeft;
    const targetScroll =
      direction === "left"
        ? currentScroll - scrollAmount
        : currentScroll + scrollAmount;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    carouselRef.current.scrollTo({
      left: targetScroll,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  };

  // Handle keyboard navigation
  const handleKeyDown = (
    event: React.KeyboardEvent,
    index: number,
    slug: string
  ) => {
    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault();
        if (index > 0) {
          setFocusedIndex(index - 1);
        }
        break;
      case "ArrowRight":
        event.preventDefault();
        if (index < currentSubcategories.length - 1) {
          setFocusedIndex(index + 1);
        }
        break;
      case "Enter":
      case " ": {
        event.preventDefault();
        const target = currentSubcategories.find((item) => item.slug === slug);
        if (target) {
          handleSubcategoryClick(target);
        }
        break;
      }
    }
  };

  // Scroll to focused item
  useEffect(() => {
    if (focusedIndex >= 0 && carouselRef.current) {
      const cards = carouselRef.current.querySelectorAll("[data-card-index]");
      const targetCard = cards[focusedIndex] as HTMLElement;
      if (targetCard) {
        targetCard.focus();
        const cardRect = targetCard.getBoundingClientRect();
        const containerRect = carouselRef.current.getBoundingClientRect();

        if (
          cardRect.left < containerRect.left ||
          cardRect.right > containerRect.right
        ) {
          targetCard.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "center",
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
    carousel.addEventListener("scroll", handleScroll, { passive: true });
    updateScrollButtons();

    return () => carousel.removeEventListener("scroll", handleScroll);
  }, [selectedCategory, currentSubcategories]);

  // Scroll to selected subcategory when URL changes
  useEffect(() => {
    if (selectedSubcategory && carouselRef.current) {
      const targetIndex = currentSubcategories.findIndex(
        (item) => item.slug === selectedSubcategory
      );

      if (targetIndex >= 0) {
        setTimeout(() => {
          const cards =
            carouselRef.current?.querySelectorAll("[data-card-index]");
          const targetCard = cards?.[targetIndex] as HTMLElement;
          if (targetCard) {
            targetCard.scrollIntoView({
              behavior: "smooth",
              block: "nearest",
              inline: "center",
            });
          }
        }, 100);
      }
    }
  }, [selectedCategory, selectedSubcategory, currentSubcategories]);

  // Build category tabs from API data
  const categoryTabs = categories?.map((cat) => ({
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
      <section id="perfect-gift" className="py-8 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-eagle-green" />
            <span className="ml-3 text-sm text-gray-600">
              {t("common.loading")}
            </span>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="perfect-gift" className="py-8 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title={t("homepage.categories.title")}
          subtitle={t("homepage.categories.subtitle")}
          href="/gifts"
        />

        <div
          role="tablist"
          aria-label={t("homepage.categories.title")}
          className="flex gap-2 overflow-x-auto pb-1 mb-5 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap"
        >
          {categoryTabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              onClick={() => handleCategorySelect(tab.id)}
              className={`shrink-0 rounded-full px-5 py-2 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ethiopian-gold focus-visible:ring-offset-2 ${
                selectedCategory === tab.id
                  ? "bg-eagle-green text-white"
                  : "bg-white text-eagle-green/70 border border-eagle-green/15 hover:border-viridian-green/50 hover:text-eagle-green"
              }`}
              aria-selected={selectedCategory === tab.id}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Horizontal Carousel */}
        <div className="relative">
          {/* Left Arrow */}
          <button
            onClick={() => scrollCarousel("left")}
            disabled={!canScrollLeft}
            className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full border border-eagle-green/20 bg-white shadow-md transition-all duration-200 ${
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
            onClick={() => scrollCarousel("right")}
            disabled={!canScrollRight}
            className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full border border-eagle-green/20 bg-white shadow-md transition-all duration-200 ${
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
            className="overflow-x-auto scrollbar-hide px-11"
            style={{ scrollSnapType: "x mandatory" }}
          >
            <div
              key={selectedCategory}
              className="flex gap-3 sm:gap-4 pb-1"
            >
              {currentSubcategories.map(
                (item: SubCategoryResponse, index: number) => {
                  const Icon = getIconByName(item.iconName);
                  const isSelected = selectedSubcategory === item.slug;
                  const imagePath = item.imageUrl || null;

                  return (
                    <button
                      key={item.slug || index}
                      data-card-index={index}
                      onClick={() => handleSubcategoryClick(item)}
                      onKeyDown={(e) => handleKeyDown(e, index, item.slug)}
                      className="flex-shrink-0 w-24 sm:w-28 group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ethiopian-gold focus-visible:ring-offset-2 rounded-xl"
                      style={{ scrollSnapAlign: "start" }}
                      aria-pressed={isSelected}
                      title={`Browse ${item.name} products`}
                      tabIndex={0}
                    >
                      <div
                        className={`aspect-square rounded-xl overflow-hidden border transition-colors duration-200 ${
                          isSelected
                            ? "border-ethiopian-gold ring-2 ring-ethiopian-gold/40"
                            : "border-gray-100 group-hover:border-viridian-green/40"
                        }`}
                      >
                        {imagePath ? (
                          <img
                            src={imagePath}
                            alt=""
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full bg-june-bud/20 flex items-center justify-center">
                            <Icon
                              className="w-7 h-7 text-eagle-green"
                              strokeWidth={1.5}
                            />
                          </div>
                        )}
                      </div>
                      <h3 className="mt-2 font-medium text-xs sm:text-sm text-eagle-green leading-tight text-center line-clamp-2">
                        {item.name}
                      </h3>
                    </button>
                  );
                }
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
