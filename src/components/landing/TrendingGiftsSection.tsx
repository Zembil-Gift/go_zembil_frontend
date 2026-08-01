import { useTranslation } from "react-i18next";
import GiftItemCard from "@/components/gift-card";
import SectionHeader from "@/components/landing/SectionHeader";

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
}: TrendingGiftsSectionProps) {
  const { t } = useTranslation();
  t('homepage.trending.allPrices');
  t('homepage.trending.under10');
  t('homepage.trending.10to25');
  t('homepage.trending.25to50');
  t('homepage.trending.50to100');
  t('homepage.trending.over100');
  return (
    <section id="gifts" className="py-10 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title={t('homepage.trending.title')}
          subtitle={t('homepage.trending.subtitle')}
          href="/shop"
        />

        {/* Two Row Grid Layout */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {trendingGifts.slice(0, 8).map((product, index) => (
            <GiftItemCard
              key={`${product.id}-${index}`}
              product={product}
            />
          ))}
        </div>
      </div>
    </section>
  );
} 