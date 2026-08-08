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
      <div className="page-shell">
        <SectionHeader
          title={t('homepage.trending.title')}
          subtitle={t('homepage.trending.subtitle')}
          href="/shop"
        />

        {/* Two rows at every breakpoint, so the count tracks the column count. */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2.5 sm:gap-3">
          {trendingGifts.slice(0, 16).map((product, index) => (
            <GiftItemCard
              key={`${product.id}-${index}`}
              product={product}
              // First row is above the fold now that this section opens the page.
              priority={index < 8}
            />
          ))}
        </div>
      </div>
    </section>
  );
} 