import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
import GiftItemCard from "@/components/gift-card";
import ProductPagination from "@/components/ProductPagination";
import ZembilSignatureSets from "@/components/ZembilSignatureSets";
import { MockApiService } from "@/services/mockApiService";
import { 
  CATEGORIES, 
  getCategoryBySlug, 
  getSubcategoriesByCategory, 
  parseUrlParams, 
  buildUrlParams,
  CategoryFilters 
} from "@/shared/categories";

export default function Shop() {
  return <ShopContent />;
}

function ShopContent() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Parse URL parameters
  const urlParams = new URLSearchParams(location.search);
  const categoryFilters = parseUrlParams(urlParams);
  
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

  // Get current category and subcategories
  const currentCategory = categoryFilters.category ? getCategoryBySlug(categoryFilters.category) : undefined;
  const subcategories = currentCategory ? getSubcategoriesByCategory(currentCategory.slug) : [];

  // Update URL with new category filters
  const updateCategoryFilters = (newFilters: Partial<CategoryFilters>) => {
    const updatedFilters = { ...categoryFilters, ...newFilters };
    const params = new URLSearchParams(location.search);
    
    // Clear existing category params
    params.delete('category');
    params.delete('sub');
    
    // Add new category params
    if (updatedFilters.category) params.set('category', updatedFilters.category);
    if (updatedFilters.sub) params.set('sub', updatedFilters.sub);
    
    navigate(`/shop?${params.toString()}`, { replace: true });
  };

  // Handle main category selection
  const handleCategorySelect = (categorySlug: string) => {
    updateCategoryFilters({ category: categorySlug, sub: undefined });
  };

  // Handle subcategory selection  
  const handleSubcategorySelect = (subcategorySlug: string) => {
    if (categoryFilters.sub === subcategorySlug) {
      // Deselect if already selected
      updateCategoryFilters({ sub: undefined });
    } else {
      // Select new subcategory
      updateCategoryFilters({ sub: subcategorySlug });
    }
  };

  // Build query parameters for product fetching
  const buildQueryParams = () => {
    const params = new URLSearchParams();
    if (searchTerm) params.append('search', searchTerm);
    if (sortBy) params.append('sortBy', sortBy);
    if (categoryFilters.category) params.append('category', categoryFilters.category);
    if (categoryFilters.sub) params.append('subcategory', categoryFilters.sub);
    
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

  // Fetch products
  const queryParams = buildQueryParams();
  const { data: initialData, isLoading } = useQuery<any>({
    queryKey: ['/api/products', queryParams],
    queryFn: () => MockApiService.getProducts({
      category: categoryFilters.category,
      subcategory: categoryFilters.sub,
      search: searchTerm,
      limit: itemsPerPage
    }),
  });

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
    if (isLoadingMore || loadedProducts.length >= totalProducts) return;
    
    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const moreData = await MockApiService.getProducts({
        category: categoryFilters.category,
        subcategory: categoryFilters.sub,
        search: searchTerm,
        limit: itemsPerPage,
        page: nextPage
      });
      
      setLoadedProducts(prev => [...prev, ...(moreData.products || [])]);
        setCurrentPage(nextPage);
    } catch (error) {
      console.error('Error loading more products:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const hasNextPage = loadedProducts.length < totalProducts;
  const displayProducts = loadedProducts.length > 0 ? loadedProducts : products;

  const handleClearFilters = () => {
                  setFilters({
                    minPrice: '',
                    maxPrice: '',
                    minRating: '',
                    maxDeliveryDays: '',
                    isTrending: false,
                    isBestSeller: false,
                    isNewArrival: false
                  });
    setSearchTerm('');
    updateCategoryFilters({ category: undefined, sub: undefined });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <Skeleton className="h-10 w-80 mb-4 bg-june-bud/20" />
            <Skeleton className="h-6 w-96 mb-6 bg-june-bud/20" />
            
            {/* Category pills skeleton */}
            <div className="flex flex-wrap gap-3 mb-6">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-32 rounded-full bg-june-bud/20" />
              ))}
            </div>
          </div>

          {/* Search and filters skeleton */}
          <div className="flex flex-col lg:flex-row gap-4 mb-8">
            <Skeleton className="flex-1 h-12 bg-june-bud/20" />
            <div className="flex gap-3">
              <Skeleton className="w-48 h-12 bg-june-bud/20" />
              <Skeleton className="w-12 h-12 bg-june-bud/20" />
              <Skeleton className="w-12 h-12 bg-june-bud/20" />
            </div>
          </div>

          {/* Products grid skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="group cursor-pointer hover:shadow-lg transition-all duration-300 border-june-bud/20">
                <CardContent className="p-4">
                  <Skeleton className="h-48 w-full mb-4 rounded-lg bg-june-bud/20" />
                  <Skeleton className="h-4 w-3/4 mb-2 bg-june-bud/20" />
                  <Skeleton className="h-4 w-1/2 mb-2 bg-june-bud/20" />
                  <Skeleton className="h-6 w-1/4 bg-june-bud/20" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
        <FadeIn delay={0.1}>
          <div className="mb-8">
            <h1 className="text-3xl lg:text-4xl font-gotham-bold text-eagle-green mb-4">
              Discover Beautiful Gifts
            </h1>
            <p className="text-lg font-gotham-light text-viridian-green mb-6">
              Find the perfect handcrafted gifts from talented Ethiopian artisans
            </p>
            
                        {/* Main Category Pills - Sticky within section */}
            <div className="sticky top-0 z-10 bg-white pb-4 mb-6">
              <div className="flex flex-wrap gap-3">
                {CATEGORIES.map((category) => {
                  const Icon = category.icon;
                  const isActive = categoryFilters.category === category.slug;
                  
                  return (
                    <Button
                      key={category.id}
                      variant={isActive ? "default" : "outline"}
                      onClick={() => handleCategorySelect(category.slug)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 ${
                        isActive 
                          ? "bg-eagle-green text-white hover:bg-viridian-green border-eagle-green" 
                          : "bg-white border border-eagle-green text-eagle-green hover:bg-viridian-green hover:text-white hover:border-viridian-green"
                      }`}
                      aria-pressed={isActive}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="font-gotham-bold">{category.name}</span>
              </Button>
                  );
                })}
                </div>
              </div>

            {/* Subcategory Panel - appears when main category is active */}
            {currentCategory && subcategories.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="mb-8 p-6 bg-gradient-to-r from-june-bud/10 to-white rounded-2xl border border-june-bud/30"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-gotham-bold text-eagle-green flex items-center gap-2">
                    <currentCategory.icon className="h-5 w-5 text-viridian-green" />
                    {currentCategory.name} Categories
                  </h2>
                  {categoryFilters.sub && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateCategoryFilters({ sub: undefined })}
                      className="text-eagle-green hover:text-viridian-green hover:bg-june-bud/20 font-gotham-bold"
                    >
                      Clear subcategory ×
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {subcategories.map((subcategory) => {
                    const Icon = subcategory.icon;
                    const isSelected = categoryFilters.sub === subcategory.slug;
                    
                    return (
                      <Button
                        key={subcategory.id}
                        variant="ghost"
                        onClick={() => handleSubcategorySelect(subcategory.slug)}
                        className={`flex flex-col items-center gap-2 p-4 h-20 rounded-lg transition-all duration-200 border ${
                          isSelected
                            ? "bg-yellow/8 border-viridian-green ring-2 ring-viridian-green text-eagle-green shadow-md"
                            : "bg-white border-gray-200 text-gray-800 hover:border-viridian-green hover:shadow-sm"
                        }`}
                        aria-pressed={isSelected}
                        title={`${isSelected ? 'Remove' : 'Apply'} ${subcategory.name} filter`}
                      >
                        <Icon className={`h-6 w-6 flex-shrink-0 ${isSelected ? 'text-viridian-green' : 'text-eagle-green'}`} />
                        <span className={`text-xs font-gotham-bold text-center leading-tight ${isSelected ? 'text-eagle-green' : 'text-gray-700'}`}>
                          {subcategory.name}
                        </span>
                      </Button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Breadcrumb */}
            {(currentCategory || categoryFilters.sub) && (
              <div className="flex items-center gap-2 text-sm mb-6 overflow-x-auto">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => updateCategoryFilters({ category: undefined, sub: undefined })}
                  className="p-0 h-auto font-gotham-bold text-eagle-green hover:text-viridian-green flex-shrink-0"
                >
                  All Products
                </Button>
                {currentCategory && (
                  <>
                    <ChevronRight className="h-4 w-4 text-eagle-green/50 flex-shrink-0" />
                    <span className="font-gotham-bold text-eagle-green flex-shrink-0">{currentCategory.name}</span>
                  </>
                )}
                {categoryFilters.sub && (
                  <>
                    <ChevronRight className="h-4 w-4 text-eagle-green/50 flex-shrink-0" />
                    <span className="font-gotham-bold text-viridian-green flex-shrink-0 truncate">
                      {subcategories.find(sub => sub.slug === categoryFilters.sub)?.name}
                    </span>
                  </>
                )}
              </div>
            )}
              </div>
        </FadeIn>

                {/* Search and Filters */}
        <SlideIn direction="up" delay={0.2}>
          <div className="flex flex-col lg:flex-row gap-4 mb-8">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-eagle-green/60 h-5 w-5" />
              <Input
                placeholder="Search gifts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12 bg-white border border-eagle-green/30 focus:border-viridian-green focus:ring-2 focus:ring-viridian-green/20 font-gotham-light"
              />
            </div>

            <div className="flex gap-3 lg:justify-end">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48 h-12 bg-white border border-eagle-green/30 focus:border-viridian-green focus:ring-2 focus:ring-viridian-green/20">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-300 shadow-lg">
                  <SelectItem value="newest" className="font-gotham-light hover:bg-june-bud/10">Newest First</SelectItem>
                  <SelectItem value="popular" className="font-gotham-light hover:bg-june-bud/10">Most Popular</SelectItem>
                  <SelectItem value="price-low" className="font-gotham-light hover:bg-june-bud/10">Price: Low to High</SelectItem>
                  <SelectItem value="price-high" className="font-gotham-light hover:bg-june-bud/10">Price: High to Low</SelectItem>
                  <SelectItem value="rating" className="font-gotham-light hover:bg-june-bud/10">Highest Rated</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className={`h-12 w-12 ${viewMode === 'grid' ? 'bg-eagle-green border-eagle-green hover:bg-viridian-green' : 'border-eagle-green text-eagle-green hover:bg-eagle-green hover:text-white'}`}
                  title="Grid view"
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className={`h-12 w-12 ${viewMode === 'list' ? 'bg-eagle-green border-eagle-green hover:bg-viridian-green' : 'border-eagle-green text-eagle-green hover:bg-eagle-green hover:text-white'}`}
                  title="List view"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </SlideIn>

        {/* Active Filters */}
        {(categoryFilters.category || categoryFilters.sub || Object.values(filters).some(f => f)) && (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="text-sm font-gotham-bold text-eagle-green">Active filters:</span>
            {categoryFilters.category && (
              <Badge className="flex items-center gap-1 bg-june-bud/20 text-eagle-green border border-june-bud hover:bg-june-bud/30">
                <span className="font-gotham-bold">{getCategoryBySlug(categoryFilters.category)?.name}</span>
                <button 
                  onClick={() => updateCategoryFilters({ category: undefined, sub: undefined })}
                  className="ml-1 hover:text-viridian-green"
                >
                  ×
                </button>
              </Badge>
            )}
            {categoryFilters.sub && (
              <Badge className="flex items-center gap-1 bg-viridian-green/10 text-eagle-green border border-viridian-green/30 hover:bg-viridian-green/20">
                <span className="font-gotham-bold">{subcategories.find(sub => sub.slug === categoryFilters.sub)?.name}</span>
                <button 
                  onClick={() => updateCategoryFilters({ sub: undefined })}
                  className="ml-1 hover:text-viridian-green"
                >
                  ×
                </button>
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="text-eagle-green hover:text-viridian-green hover:bg-june-bud/10 font-gotham-bold"
            >
              Clear all
            </Button>
          </div>
        )}

        {/* Products Grid */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <p className="font-gotham-light text-eagle-green/70">
              Showing {displayProducts.length} of {totalProducts} products
            </p>
          </div>

          {displayProducts.length === 0 ? (
            <div className="text-center py-16 px-6">
              <div className="max-w-md mx-auto">
                {categoryFilters.sub ? (
                  <>
                    <h3 className="text-xl font-gotham-bold text-eagle-green mb-3">
                      No items in {subcategories.find(sub => sub.slug === categoryFilters.sub)?.name} yet
                    </h3>
                    <p className="font-gotham-light text-eagle-green/70 mb-6">
                      Try clearing filters or browsing another subcategory.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Button 
                        onClick={handleClearFilters} 
                        className="bg-eagle-green hover:bg-viridian-green text-white font-gotham-bold"
                      >
                        Clear filters
                      </Button>
                      <Button 
                        onClick={() => updateCategoryFilters({ sub: undefined })}
                        variant="outline"
                        className="border-eagle-green text-eagle-green hover:bg-eagle-green hover:text-white font-gotham-bold"
                      >
                        Browse all {currentCategory?.name}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="text-xl font-gotham-bold text-eagle-green mb-3">No products found</h3>
                    <p className="font-gotham-light text-eagle-green/70 mb-6">
                      Try adjusting your search or filters to find what you're looking for.
                    </p>
                    <Button 
                      onClick={handleClearFilters} 
                      className="bg-eagle-green hover:bg-viridian-green text-white font-gotham-bold"
                    >
                      Clear filters and show all products
                    </Button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <>
              <ProductGridStagger className={`grid gap-6 ${
                viewMode === 'grid' 
                  ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' 
                  : 'grid-cols-1'
              }`}>
                {displayProducts.map((product, index) => (
                  <ProductGridItem key={product.id} index={index}>
                    <GiftItemCard product={product} viewMode={viewMode} />
                  </ProductGridItem>
                ))}
              </ProductGridStagger>
              
              {hasNextPage && (
                <div className="text-center mt-8">
                  <Button 
                    onClick={loadMoreProducts}
                    disabled={isLoadingMore}
                    variant="outline"
                    size="lg"
                    className="px-8 border-eagle-green text-eagle-green hover:bg-eagle-green hover:text-white font-gotham-bold"
                  >
                    {isLoadingMore ? 'Loading...' : 'Load More Products'}
                  </Button>
                </div>
              )}
            </>
          )}
              </div>
              
        {/* Signature Sets */}
        <SlideIn direction="up" delay={0.4}>
      <ZembilSignatureSets />
        </SlideIn>
              </div>
    </div>
  );
}