import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import GiftItemCard from "@/components/gift-card";

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  currency: string;
  image: string;
  images: string[];
  category: string;
  categorySlug: string;
  isTrending: boolean;
  isFeatured: boolean;
  rating: number;
  reviewCount: number;
  inStock: boolean;
  stockQuantity: number;
  badges: string[];
  tags: string[];
}

interface TrendingGiftsSectionProps {
  trendingGifts: Product[];
  selectedBudget: string;
  onBudgetChange: (budget: string) => void;
}

export default function TrendingGiftsSection({ 
  trendingGifts, 
  selectedBudget, 
  onBudgetChange 
}: TrendingGiftsSectionProps) {
  const { t } = useTranslation();

  const budgetRanges = [
    { id: "all", label: t('homepage.trending.allPrices'), min: 0, max: Infinity },
    { id: "under-10", label: t('homepage.trending.under10'), min: 0, max: 10 },
    { id: "10-25", label: t('homepage.trending.10to25'), min: 10, max: 25 },
    { id: "25-50", label: t('homepage.trending.25to50'), min: 25, max: 50 },
    { id: "50-100", label: t('homepage.trending.50to100'), min: 50, max: 100 },
    { id: "over-100", label: t('homepage.trending.over100'), min: 100, max: Infinity }
  ];

  return (
    <section id="gifts" className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="font-gotham-extra-bold text-3xl sm:text-4xl text-charcoal mb-4">
              {t('homepage.trending.title')}
            </h2>
            <p className="font-gotham-light text-xl text-gray-600">
              {t('homepage.trending.subtitle')}
            </p>
          </div>
        </div>

    

        {/* Two Row Grid Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {trendingGifts.slice(0, 8).map((product, index) => (
            <div key={`${product.id}-${index}`} className="flex justify-center">
              <GiftItemCard 
                product={product}
                className="w-full max-w-[280px]"
              />
            </div>
          ))}
        </div>

        {/* More Products Button */}
        <div className="text-center">
          <Button asChild className="bg-viridian-green hover:bg-viridian-green/90 text-white font-gotham-medium px-8 py-3 text-lg">
            <Link to="/shop">More Products</Link>
          </Button>
        </div>
      </div>
    </section>
  );
} 