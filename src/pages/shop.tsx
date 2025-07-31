import { useState, useEffect } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import FadeIn from "@/components/animations/FadeIn";
import SlideIn from "@/components/animations/SlideIn";
import { ProductGridStagger, ProductGridItem, StaggerContainer, StaggerItem } from "@/components/animations/StaggerAnimations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Filter, Grid, List, SortAsc, Heart, ShoppingCart, Star, ChevronRight, ArrowLeft } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import ProductPagination from "@/components/ProductPagination";
import ZembilSignatureSets from "@/components/ZembilSignatureSets";
import ProtectedRoute from "@/components/protected-route";
import { MockApiService } from "@/services/mockApiService";

export default function Shop() {
  return <ShopContent />;
}

function ShopContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { categorySlug } = useParams();
  
  // Get URL search params
  const urlParams = new URLSearchParams(location.search);
  const subcategory = urlParams.get('subcategory');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('newest');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [loadedProducts, setLoadedProducts] = useState<any[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [filters, setFilters] = useState({
    minPrice: '',
    maxPrice: '',
    minRating: '',
    maxDeliveryDays: '',
    isTrending: false,
    isBestSeller: false,
    isNewArrival: false
  });

  // Fetch categories for filtering using mock data
  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ['/api/categories'],
    queryFn: () => MockApiService.getCategories(),
  });

  // Find the active category
  const activeCategory = categories.find((cat: any) => cat.slug === categorySlug);
  
  // Helper function to preserve filters when navigating
  const buildNavigationUrl = (slug: string) => {
    const params = new URLSearchParams(location.search);
    // Remove old category parameter and keep other filters
    params.delete('category');
    const queryString = params.toString();
    return queryString ? `/shop/${slug}?${queryString}` : `/shop/${slug}`;
  };

  // Build query parameters for filtering
  const buildQueryParams = () => {
    const params = new URLSearchParams();
    if (searchTerm) params.append('search', searchTerm);
    if (sortBy) params.append('sortBy', sortBy);
    
    // Use category slug from route parameter
    if (categorySlug) {
      params.append('category', categorySlug);
    }
    
    if (filters.minPrice) params.append('minPrice', filters.minPrice);
    if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);
    if (filters.minRating) params.append('minRating', filters.minRating);
    if (filters.maxDeliveryDays) params.append('maxDeliveryDays', filters.maxDeliveryDays);
    if (filters.isTrending) params.append('isTrending', 'true');
    if (filters.isBestSeller) params.append('isBestSeller', 'true');
    if (filters.isNewArrival) params.append('isNewArrival', 'true');
    params.append('page', '1');
    params.append('limit', itemsPerPage.toString());
    return params.toString();
  };

  // Use mock API service for products
  const queryParams = buildQueryParams();
  const { data: initialData, isLoading } = useQuery<any>({
    queryKey: ['/api/products', queryParams],
    queryFn: () => MockApiService.getProducts({
      category: categorySlug,
      search: searchTerm,
      limit: itemsPerPage
    }),
  });

  // Use the new API response format
  const products = initialData?.products || [];
  const totalProducts = initialData?.total || 0;

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
      const nextPageParams = new URLSearchParams();
      if (searchTerm) nextPageParams.append('search', searchTerm);
      if (sortBy) nextPageParams.append('sortBy', sortBy);
      if (categorySlug) nextPageParams.append('category', categorySlug);
      if (filters.minPrice) nextPageParams.append('minPrice', filters.minPrice);
      if (filters.maxPrice) nextPageParams.append('maxPrice', filters.maxPrice);
      if (filters.minRating) nextPageParams.append('minRating', filters.minRating);
      if (filters.maxDeliveryDays) nextPageParams.append('maxDeliveryDays', filters.maxDeliveryDays);
      if (filters.isTrending) nextPageParams.append('isTrending', 'true');
      if (filters.isBestSeller) nextPageParams.append('isBestSeller', 'true');
      if (filters.isNewArrival) nextPageParams.append('isNewArrival', 'true');
      // Use current category from route parameter
      if (categorySlug) nextPageParams.append('category', categorySlug);
      nextPageParams.append('page', nextPage.toString());
      nextPageParams.append('limit', itemsPerPage.toString());

      const nextPageUrl = `/api/products?${nextPageParams.toString()}`;
      const response = await fetch(nextPageUrl);
      const data = await response.json();
      
      const nextProducts = data?.products || [];
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

  // Filter main and subcategories
  const mainCategories = categories.filter((cat: any) => !cat.parentId);
  const activeMainCategory = activeCategory?.parentId 
    ? categories.find((cat: any) => cat.id === activeCategory.parentId)
    : activeCategory;

  const subcategories = activeMainCategory 
    ? categories.filter((cat: any) => cat.parentId === activeMainCategory.id)
    : [];

  return (
    <div className="min-h-screen bg-cream">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Page Header */}
        <FadeIn duration={0.6} className="mb-8">
          <div className="text-center mb-6">
            <h1 className="font-display text-4xl font-bold text-charcoal mb-4">
              {activeCategory ? activeCategory.name : "Discover Beautiful Gifts"}
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {activeCategory 
                ? activeCategory.description 
                : "Explore our curated collection of meaningful Ethiopian gifts, handcrafted with love and delivered with care."
              }
            </p>
          </div>

          {/* Breadcrumb Navigation with Back Button */}
          {(activeMainCategory || activeCategory) && (
            <div className="flex items-center justify-between mb-6">
              <Button
                variant="ghost"
                onClick={() => {
                  const params = new URLSearchParams(location.search);
                  params.delete('category');
                  const queryString = params.toString();
                  navigate(queryString ? `/shop?${queryString}` : '/shop');
                }}
                className="text-gray-600 hover:text-ethiopian-gold"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to All Categories
              </Button>
              
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span>Shop</span>
                {activeMainCategory && (
                  <>
                    <ChevronRight className="h-3 w-3" />
                    <span className="text-ethiopian-gold font-medium">
                      {activeMainCategory.name}
                    </span>
                  </>
                )}
                {activeCategory && activeCategory.parentId && (
                  <>
                    <ChevronRight className="h-3 w-3" />
                    <span className="text-charcoal font-medium">
                      {activeCategory.name}
                    </span>
                  </>
                )}
              </div>
              
              <div className="w-32"></div> {/* Spacer for centering */}
            </div>
          )}
        </FadeIn>

        {/* Category Navigation */}
        {mainCategories.length > 0 && (
          <FadeIn delay={0.1} duration={0.6} className="mb-8">
            <div className="flex flex-wrap gap-3 justify-center">
              <Button
                variant={!categorySlug ? "default" : "outline"}
                onClick={() => {
                  const params = new URLSearchParams(location.search);
                  params.delete('category');
                  const queryString = params.toString();
                  navigate(queryString ? `/shop?${queryString}` : '/shop');
                }}
                className="bg-ethiopian-gold hover:bg-ethiopian-gold/90 text-white"
              >
                All Categories
              </Button>
              {mainCategories.map((category) => (
                <Button
                  key={category.id}
                  variant={activeMainCategory?.id === category.id ? "default" : "outline"}
                  onClick={() => navigate(buildNavigationUrl(category.slug))}
                  className={activeMainCategory?.id === category.id 
                    ? "bg-ethiopian-gold hover:bg-ethiopian-gold/90 text-white"
                    : "hover:bg-ethiopian-gold/10 hover:text-ethiopian-gold border-ethiopian-gold/20"
                  }
                >
                  {category.name}
                </Button>
              ))}
            </div>
          </FadeIn>
        )}

        {/* Subcategory Navigation */}
        {subcategories.length > 0 && (
          <FadeIn delay={0.2} duration={0.6} className="mb-8">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-charcoal mb-4">
                {activeMainCategory?.name} Categories
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {subcategories.map((subcategory) => (
                  <Button
                    key={subcategory.id}
                    variant={activeCategory?.id === subcategory.id ? "default" : "ghost"}
                    onClick={() => navigate(buildNavigationUrl(subcategory.slug))}
                    className={`text-left h-auto p-3 ${
                      activeCategory?.id === subcategory.id
                        ? "bg-ethiopian-gold hover:bg-ethiopian-gold/90 text-white"
                        : "hover:bg-gray-50 text-charcoal justify-start"
                    }`}
                  >
                    <div>
                      <div className="font-medium">{subcategory.name}</div>
                      <div className="text-xs opacity-75 mt-1">
                        {subcategory.description}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          </FadeIn>
        )}

        {/* Enhanced Search and Filters */}
        <FadeIn delay={0.3} duration={0.6} className="mb-8">
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            {/* Search Input */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="text"
                    placeholder="Search gifts, occasions, or items..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-12 text-base border-gray-200 focus:border-ethiopian-gold focus:ring-ethiopian-gold"
                  />
                </div>
              </div>
              <Button
                onClick={() => {
                  setSearchTerm('');
                  setFilters({
                    minPrice: '',
                    maxPrice: '',
                    minRating: '',
                    maxDeliveryDays: '',
                    isTrending: false,
                    isBestSeller: false,
                    isNewArrival: false
                  });
                  setSortBy('newest');
                }}
                variant="outline"
                className="h-12 px-6"
              >
                Clear Filters
              </Button>
            </div>

            {/* Advanced Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {/* Price Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Price Range (ETB)</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={filters.minPrice}
                    onChange={(e) => setFilters({...filters, minPrice: e.target.value})}
                    className="text-sm"
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={filters.maxPrice}
                    onChange={(e) => setFilters({...filters, maxPrice: e.target.value})}
                    className="text-sm"
                  />
                </div>
              </div>

              {/* Rating Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Rating</label>
                <Select value={filters.minRating || "any"} onValueChange={(value) => setFilters({...filters, minRating: value === "any" ? "" : value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any rating" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any rating</SelectItem>
                    <SelectItem value="4.5">4.5+ Stars</SelectItem>
                    <SelectItem value="4.0">4.0+ Stars</SelectItem>
                    <SelectItem value="3.5">3.5+ Stars</SelectItem>
                    <SelectItem value="3.0">3.0+ Stars</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Delivery Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max Delivery (Days)</label>
                <Select value={filters.maxDeliveryDays || "any"} onValueChange={(value) => setFilters({...filters, maxDeliveryDays: value === "any" ? "" : value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any time</SelectItem>
                    <SelectItem value="1">Same day</SelectItem>
                    <SelectItem value="2">Within 2 days</SelectItem>
                    <SelectItem value="3">Within 3 days</SelectItem>
                    <SelectItem value="7">Within 1 week</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort Options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="popular">Most Popular</SelectItem>
                    <SelectItem value="price-low">Price: Low to High</SelectItem>
                    <SelectItem value="price-high">Price: High to Low</SelectItem>
                    <SelectItem value="rating">Highest Rated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Collection Filters and View Mode */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.isTrending}
                    onChange={(e) => setFilters({...filters, isTrending: e.target.checked})}
                    className="rounded border-gray-300 text-ethiopian-gold focus:ring-ethiopian-gold"
                  />
                  <span className="text-sm text-gray-700 flex items-center gap-1">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                    Trending Now
                  </span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.isBestSeller}
                    onChange={(e) => setFilters({...filters, isBestSeller: e.target.checked})}
                    className="rounded border-gray-300 text-ethiopian-gold focus:ring-ethiopian-gold"
                  />
                  <span className="text-sm text-gray-700 flex items-center gap-1">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    Best Sellers
                  </span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.isNewArrival}
                    onChange={(e) => setFilters({...filters, isNewArrival: e.target.checked})}
                    className="rounded border-gray-300 text-ethiopian-gold focus:ring-ethiopian-gold"
                  />
                  <span className="text-sm text-gray-700 flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    New Arrivals
                  </span>
                </label>
              </div>

              {/* View Mode */}
              <div className="flex border rounded-lg overflow-hidden">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className={viewMode === 'grid' ? 'bg-ethiopian-gold text-white' : ''}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className={viewMode === 'list' ? 'bg-ethiopian-gold text-white' : ''}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Products Grid */}
        <FadeIn delay={0.4} duration={0.6}>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i} className="overflow-hidden rounded-2xl">
                  <Skeleton className="aspect-square w-full" />
                  <CardContent className="p-4 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-6 w-1/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : displayProducts.length > 0 ? (
            <>
              <ProductGridStagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {displayProducts.map((product: any, index: number) => (
                  <ProductGridItem key={product.id}>
                    <ProductCard product={product} />
                  </ProductGridItem>
                ))}
              </ProductGridStagger>
              
              {/* Pagination Component */}
              <ProductPagination
                currentPage={currentPage}
                totalItems={totalProducts}
                itemsPerPage={itemsPerPage}
                hasNextPage={hasNextPage}
                onLoadMore={loadMoreProducts}
                isLoading={isLoadingMore}
                className="mt-12"
              />
            </>
          ) : (
            <div className="text-center py-20">
              <div className="mx-auto w-32 h-32 bg-gradient-to-br from-gray-50 to-gray-100 rounded-full flex items-center justify-center mb-8 shadow-inner">
                <Search className="w-16 h-16 text-gray-300" />
              </div>
              <h3 className="text-2xl font-semibold text-charcoal mb-4">
                {searchTerm ? "No matching products found" : "No products available"}
              </h3>
              <div className="max-w-md mx-auto mb-8">
                <p className="text-gray-600 leading-relaxed">
                  {searchTerm 
                    ? `We couldn't find any products matching "${searchTerm}"${activeCategory ? ` in ${activeCategory.name}` : ''}. Try adjusting your search terms or filters.`
                    : activeCategory 
                      ? `The ${activeCategory.name} category is currently being updated with new products. Check back soon for exciting new additions!`
                      : "Try adjusting your search criteria or browse our featured collections below."
                  }
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  onClick={() => {
                    setSearchTerm('');
                    setFilters({
                      minPrice: '',
                      maxPrice: '',
                      minRating: '',
                      maxDeliveryDays: '',
                      isTrending: false,
                      isBestSeller: false,
                      isNewArrival: false
                    });
                  }}
                  variant="outline"
                  className="border-ethiopian-gold text-ethiopian-gold hover:bg-ethiopian-gold hover:text-white"
                >
                  Clear All Filters
                </Button>
                <Button 
                  onClick={() => navigate('/shop')}
                  className="bg-ethiopian-gold hover:bg-ethiopian-gold/90 text-white px-6"
                >
                  Browse All Categories
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
            </div>
          )}
        </FadeIn>

      </main>
      
      {/* Zembil Signature Sets Section - moved outside main for proper rendering */}
      <ZembilSignatureSets />
    </div>
  );
}

