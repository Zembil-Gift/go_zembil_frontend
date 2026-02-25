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
}: TrendingGiftsSectionProps) {
  const { t } = useTranslation();
  t('homepage.trending.allPrices');
  t('homepage.trending.under10');
  t('homepage.trending.10to25');
  t('homepage.trending.25to50');
  t('homepage.trending.50to100');
  t('homepage.trending.over100');
  return (
    <section id="gifts" className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center mb-12">
          <h2 className="text-4xl font-extrabold text-charcoal mb-4 text-center">
            {t('homepage.trending.title')}
          </h2>
          <div className="w-16 h-1 bg-ethiopian-gold rounded-full mb-4"></div>
          <p className="font-light text-xl text-gray-600 text-center max-w-2xl">
            {t('homepage.trending.subtitle')}
          </p>
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
          <Button asChild className="bg-viridian-green hover:bg-viridian-green/90 text-white font-medium px-8 py-3 text-lg">
            <Link to="/shop">More Products</Link>
          </Button>
        </div>
      </div>
    </section>
  );
} 