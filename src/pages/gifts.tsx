import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";

import ProductCard from "@/components/ProductCard";
import ProductPagination from "@/components/ProductPagination";
import ZembilSignatureSets from "@/components/ZembilSignatureSets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Filter, SlidersHorizontal, ChevronUp, Star } from "lucide-react";
import { Product, Category } from "@shared/schema";

export default function Gifts() {
  // Get URL search params
  const urlParams = new URLSearchParams(window.location.search);
  const categorySlug = urlParams.get('category');
  const searchParam = urlParams.get('search') || '';
  const sortParam = urlParams.get('sort') || 'popularity';
  const priceParam = urlParams.get('price') || 'all';

  const [searchTerm, setSearchTerm] = useState(searchParam);
  const [sortBy, setSortBy] = useState(sortParam);
  const [priceRange, setPriceRange] = useState(priceParam);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [loadedProducts, setLoadedProducts] = useState<Product[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Build query parameters
  const buildQueryParams = () => {
    const params = new URLSearchParams();
    if (searchTerm) params.append('search', searchTerm);
    if (sortBy !== 'popularity') params.append('sort', sortBy);
    if (priceRange !== 'all') params.append('price', priceRange);
    if (categorySlug) params.append('category', categorySlug);
    return params.toString();
  };

  // Fetch products with pagination
  const queryParams = buildQueryParams();
  const apiUrl = `/api/products?${queryParams}&page=1&limit=${itemsPerPage}`;

  const { data: initialData, isLoading } = useQuery<{products: Product[], total: number} | Product[]>({
    queryKey: ['/api/products', queryParams],
    queryFn: () => fetch(apiUrl).then(res => res.json()),
  });

  // Handle both old and new API response formats
  const isNewFormat = initialData && 'products' in initialData;
  const products = isNewFormat ? initialData.products : (initialData as Product[] || []);
  const totalProducts = isNewFormat ? initialData.total : (products?.length || 0);

  // Update loaded products when initial data changes
  useEffect(() => {
    if (products.length > 0) {
      setLoadedProducts(products);
      setCurrentPage(1);
    }
  }, [products]);

  // Load more products function
  const loadMoreProducts = async () => {
    if (isLoadingMore) return;
    
    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const nextPageUrl = `/api/products?${queryParams}&page=${nextPage}&limit=${itemsPerPage}`;

      const response = await fetch(nextPageUrl);
      const data = await response.json();
      
      const nextProducts = data?.products || data || [];
      if (nextProducts.length > 0) {
        setLoadedProducts(prev => [...prev, ...nextProducts]);
        setCurrentPage(nextPage);
      }
    } catch (error) {
      console.error('Error loading more products:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const hasNextPage = totalProducts > loadedProducts.length;
  const displayProducts = loadedProducts.length > 0 ? loadedProducts : products;

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    // Update URL without page reload
    const newParams = new URLSearchParams(window.location.search);
    if (value) {
      newParams.set('search', value);
    } else {
      newParams.delete('search');
    }
    window.history.replaceState(null, '', `${window.location.pathname}?${newParams.toString()}`);
  };

  const handleSortChange = (value: string) => {
    setSortBy(value);
    const newParams = new URLSearchParams(window.location.search);
    newParams.set('sort', value);
    window.history.replaceState(null, '', `${window.location.pathname}?${newParams.toString()}`);
  };

  const handlePriceChange = (value: string) => {
    setPriceRange(value);
    const newParams = new URLSearchParams(window.location.search);
    if (value === 'all') {
      newParams.delete('price');
    } else {
      newParams.set('price', value);
    }
    window.history.replaceState(null, '', `${window.location.pathname}?${newParams.toString()}`);
  };

  const currentCategory = categorySlug ? 
    categories.find((cat: any) => cat.slug === categorySlug) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <span>Home</span>
            <span>›</span>
            <span>Gifts</span>
            {currentCategory && (
              <>
                <span>›</span>
                <span className="text-ethiopian-gold">{currentCategory.name}</span>
              </>
            )}
          </div>
          
          <h1 className="text-3xl sm:text-4xl font-bold text-charcoal mb-4">
            {currentCategory ? currentCategory.name : 'All Gifts'}
          </h1>
          
          {currentCategory?.description && (
            <p className="text-gray-600 text-lg max-w-3xl">
              {currentCategory.description}
            </p>
          )}
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search gifts..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Sort */}
            <Select value={sortBy} onValueChange={handleSortChange}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popularity">Most Popular</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
              </SelectContent>
            </Select>

            {/* Price Range */}
            <Select value={priceRange} onValueChange={handlePriceChange}>
              <SelectTrigger>
                <SelectValue placeholder="Price range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Prices</SelectItem>
                <SelectItem value="0-500">Under 500 ETB</SelectItem>
                <SelectItem value="500-1000">500 - 1,000 ETB</SelectItem>
                <SelectItem value="1000-2000">1,000 - 2,000 ETB</SelectItem>
                <SelectItem value="2000-5000">2,000 - 5,000 ETB</SelectItem>
                <SelectItem value="5000+">Over 5,000 ETB</SelectItem>
              </SelectContent>
            </Select>

            {/* Advanced Filters Button */}
            <Button variant="outline" className="border-ethiopian-gold text-ethiopian-gold hover:bg-ethiopian-gold hover:text-white">
              <SlidersHorizontal size={18} className="mr-2" />
              Filters
            </Button>
          </div>

          {/* Active Filters */}
          {(searchTerm || priceRange !== 'all' || currentCategory) && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
              <span className="text-sm text-gray-600">Active filters:</span>
              {searchTerm && (
                <Badge variant="secondary" className="bg-ethiopian-gold/10 text-ethiopian-gold">
                  Search: {searchTerm}
                  <button 
                    onClick={() => handleSearch('')}
                    className="ml-2 hover:text-warm-red"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {currentCategory && (
                <Badge variant="secondary" className="bg-ethiopian-gold/10 text-ethiopian-gold">
                  Category: {currentCategory.name}
                </Badge>
              )}
              {priceRange !== 'all' && (
                <Badge variant="secondary" className="bg-ethiopian-gold/10 text-ethiopian-gold">
                  Price: {priceRange === '0-500' ? 'Under 500 ETB' : 
                          priceRange === '500-1000' ? '500-1,000 ETB' :
                          priceRange === '1000-2000' ? '1,000-2,000 ETB' :
                          priceRange === '2000-5000' ? '2,000-5,000 ETB' : 
                          'Over 5,000 ETB'}
                  <button 
                    onClick={() => handlePriceChange('all')}
                    className="ml-2 hover:text-warm-red"
                  >
                    ×
                  </button>
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 animate-pulse">
                <div className="aspect-square bg-gray-200 rounded-xl mb-4"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3 mb-3"></div>
                <div className="h-5 bg-gray-200 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        ) : displayProducts.length > 0 ? (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex items-center justify-between mb-6"
            >
              <p className="text-gray-600">
                Showing {displayProducts.length} of {totalProducts} gift{totalProducts !== 1 ? 's' : ''}
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {displayProducts.map((product: Product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </motion.div>
            
            {/* Enhanced Pagination Component */}
            <ProductPagination
              currentPage={currentPage}
              totalItems={totalProducts}
              itemsPerPage={itemsPerPage}
              hasNextPage={hasNextPage}
              onLoadMore={loadMoreProducts}
              isLoading={isLoadingMore}
              className="mt-12"
            />
            
            {/* ZembilSignatureSets Component - show after sufficient products */}
            {totalProducts >= 20 && <ZembilSignatureSets />}
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center py-20"
          >
            <div className="mx-auto w-32 h-32 bg-gradient-to-br from-gray-50 to-gray-100 rounded-full flex items-center justify-center mb-8 shadow-inner">
              <Search className="w-16 h-16 text-gray-300" />
            </div>
            <h3 className="text-2xl font-semibold text-charcoal mb-4">No gifts found</h3>
            <div className="max-w-md mx-auto mb-8">
              <p className="text-gray-600 leading-relaxed">
                {searchTerm 
                  ? `We couldn't find any gifts matching "${searchTerm}". Try adjusting your search terms or filters.`
                  : currentCategory 
                    ? `The ${currentCategory.name} category is currently being updated with new products. Check back soon for exciting new additions!`
                    : "Try adjusting your search criteria or browse our featured collections below."
                }
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                onClick={() => {
                  setSearchTerm('');
                  setPriceRange('all');
                  setSortBy('popularity');
                }}
                variant="outline"
                className="border-ethiopian-gold text-ethiopian-gold hover:bg-ethiopian-gold hover:text-white"
              >
                Clear All Filters
              </Button>
            </div>
            
            {/* Suggested Actions */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                </div>
                <h4 className="font-medium text-charcoal mb-1">Trending Now</h4>
                <p className="text-sm text-gray-500">Popular Ethiopian gifts</p>
              </div>
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-yellow-50 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                </div>
                <h4 className="font-medium text-charcoal mb-1">Best Sellers</h4>
                <p className="text-sm text-gray-500">Most loved products</p>
              </div>
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                </div>
                <h4 className="font-medium text-charcoal mb-1">New Arrivals</h4>
                <p className="text-sm text-gray-500">Latest additions</p>
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}