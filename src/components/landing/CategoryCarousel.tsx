import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
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

  const categoryTabs = [
    { key: "occasions", label: t('homepage.categories.occasions') },
    { key: "cultural", label: t('homepage.categories.cultural') },
    { key: "emotions", label: t('homepage.categories.emotions') },
    { key: "custom", label: t('homepage.categories.custom') },
  ];

  return (
    <section id="occasions" className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn delay={0.2} duration={0.8}>
          <div className="text-center mb-12">
            <h2 className="font-gotham-extra-bold text-3xl sm:text-4xl text-charcoal mb-4">
              {t('homepage.categories.title')}
            </h2>
            <p className="font-gotham-light text-xl text-gray-600 max-w-2xl mx-auto">
              {t('homepage.categories.subtitle')}
            </p>
          </div>
        </FadeIn>

        {/* Category Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-light-cream border border-yellow-400/20 p-1 rounded-xl inline-flex flex-wrap shadow-sm">
            {categoryTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => onCategoryChange(tab.key)}
                className={`px-4 md:px-6 py-3 rounded-lg font-medium transition-all duration-200 text-xs md:text-sm ${
                  activeCategory === tab.key
                    ? "bg-yellow-400 text-green-800 hover:bg-yellow-400 shadow-md"
                    : "text-gray-600 hover:bg-white hover:text-yellow-600"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category Content - Horizontal carousel */}
        <div className="relative">
          <div className="overflow-hidden">
            <div 
              className="flex gap-4 md:gap-6 animate-scroll-horizontal"
              style={{
                width: `${getCategoryContent(activeCategory).length * 320}px`,
                animation: `scroll-horizontal ${Math.max(20, getCategoryContent(activeCategory).length * 2)}s linear infinite`
              }}
            >
              {[...getCategoryContent(activeCategory), ...getCategoryContent(activeCategory)].map((category, index) => {
                const IconComponent = category.icon;
                return (
                  <Link 
                    key={`${category.name}-${index}`} 
                    to={`/gifts/${category.name.toLowerCase().replace(/\s+/g, '-')}`}
                    className="flex-shrink-0"
                  >
                    <div className="group cursor-pointer w-72">
                      <div className={`bg-gradient-to-br ${category.gradient} rounded-2xl p-6 text-white transform group-hover:scale-105 transition-all duration-300 shadow-lg h-40 flex flex-col justify-center`}>
                        <div className="text-center">
                          <IconComponent size={32} className="mx-auto mb-4" />
                          <h3 className="font-semibold text-lg mb-2">{category.name}</h3>
                          <p className="text-sm opacity-90">{category.description}</p>
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