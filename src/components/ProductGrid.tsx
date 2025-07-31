import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronUp } from "lucide-react";
import ProductCard from "./ProductCard";
import ProductPagination from "./ProductPagination";
import { cn } from "@/lib/utils";
import { Product } from "@shared/schema";

interface ProductGridProps {
  products: Product[];
  className?: string;
  itemsPerPage?: number;
  onLoadMore?: () => Promise<void>;
  hasNextPage?: boolean;
  isLoading?: boolean;
  totalItems?: number;
}

export function ProductGrid({ 
  products, 
  className,
  itemsPerPage = 20,
  onLoadMore,
  hasNextPage = false,
  isLoading = false,
  totalItems
}: ProductGridProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [loadedProducts, setLoadedProducts] = useState<Product[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Update loaded products when initial products change
  useEffect(() => {
    if (products.length > 0) {
      setLoadedProducts(products);
      setCurrentPage(1);
    }
  }, [products]);

  const displayProducts = loadedProducts.length > 0 ? loadedProducts : products;
  const displayTotalItems = totalItems || products.length;

  const handleLoadMoreProducts = async () => {
    if (isLoadingMore || !onLoadMore) return;
    
    setIsLoadingMore(true);
    try {
      await onLoadMore();
    } catch (error) {
      console.error('Error loading more products:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const actualHasNextPage = hasNextPage || (displayProducts.length < displayTotalItems);

  return (
    <div className={cn("space-y-8", className)}>
      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {displayProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            className="h-full"
          />
        ))}
      </div>

      {/* Enhanced Pagination Component */}
      {displayTotalItems > itemsPerPage && (
        <ProductPagination
          currentPage={currentPage}
          totalItems={displayTotalItems}
          itemsPerPage={itemsPerPage}
          hasNextPage={actualHasNextPage}
          onLoadMore={handleLoadMoreProducts}
          isLoading={isLoadingMore || isLoading}
          className="py-8"
        />
      )}

      {/* Promotional Section - Zembil Signature Sets */}
      <div className="mt-16 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 rounded-3xl overflow-hidden">
        <div className="px-8 py-12 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            GIFTING WITH HEART – ZEMBIL SIGNATURE SETS
          </h2>
          
          {/* Lifestyle Images */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 mb-8">
            {/* Coffee Ceremony Set */}
            <div className="relative group">
              <div className="aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-amber-100 to-orange-100">
                <img
                  src="/api/placeholder/400/400"
                  alt="Ethiopian Coffee Ceremony Set"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
              <div className="mt-4">
                <h3 className="font-semibold text-lg text-gray-900">Traditional Coffee Ceremony</h3>
                <p className="text-sm text-gray-600 mt-1">Share the sacred Ethiopian coffee ritual</p>
              </div>
            </div>

            {/* Handwoven Textiles */}
            <div className="relative group">
              <div className="aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-rose-100 to-pink-100">
                <img
                  src="/api/placeholder/400/400"
                  alt="Handwoven Ethiopian Textiles"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
              <div className="mt-4">
                <h3 className="font-semibold text-lg text-gray-900">Heritage Textiles</h3>
                <p className="text-sm text-gray-600 mt-1">Celebrate Ethiopian craftsmanship</p>
              </div>
            </div>

            {/* Cultural Art & Jewelry */}
            <div className="relative group">
              <div className="aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-yellow-100 to-amber-100">
                <img
                  src="/api/placeholder/400/400"
                  alt="Ethiopian Cultural Art and Jewelry"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
              <div className="mt-4">
                <h3 className="font-semibold text-lg text-gray-900">Cultural Treasures</h3>
                <p className="text-sm text-gray-600 mt-1">Connect hearts across continents</p>
              </div>
            </div>
          </div>

          {/* Narrative Text */}
          <div className="max-w-4xl mx-auto">
            <p className="text-gray-700 leading-relaxed text-lg">
              <span className="font-semibold text-amber-700">Illuminate Your Style</span> with goZembil Signature Sets. 
              <span className="font-semibold text-orange-700"> Dazzling Ethiopian Collections</span>, designed to celebrate the beauty and individuality of every diaspora family. 
              Each piece showcases vibrant, ethically sourced traditions that speak to the spirit. 
              Discover unique designs that reflect your personal style and let your inner sparkle shine. 
              Visit us today to explore the magic of our signature collection and find your next treasure.
            </p>
          </div>

          {/* Call to Action */}
          <div className="mt-8">
            <Button
              onClick={scrollToTop}
              className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white px-12 py-3 rounded-full text-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Explore Signature Sets
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductGrid;