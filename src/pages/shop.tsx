import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import FadeIn from "@/components/animations/FadeIn";
import SlideIn from "@/components/animations/SlideIn";
import { ProductGridStagger, ProductGridItem } from "@/components/animations/StaggerAnimations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Grid, List, ChevronRight, Package } from "lucide-react";
import GiftItemCard from "@/components/gift-card";
import ZembilSignatureSets from "@/components/ZembilSignatureSets";
import { productService, Product, PagedProductResponse } from "@/services/productService";
import { categoryService } from "@/services/categoryService";
import { getAllProductImages } from "@/utils/imageUtils";
import { getIconByName } from "@/components/admin/IconPicker";

export default function Shop() {
  return <ShopContent />;
}

function ShopContent() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Parse URL parameters
  const urlParams = new URLSearchParams(location.search);
  const categoryIdParam = urlParams.get('categoryId');
  const subCategoryIdParam = urlParams.get('subCategoryId');
  const searchParam = urlParams.get('search') || '';
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('newest');
  const [searchTerm, setSearchTerm] = useState(searchParam);
  const [debouncedSearch, setDebouncedSearch] = useState(searchParam);
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage] = useState(20);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>(
    categoryIdParam ? parseInt(categoryIdParam) : undefined
  );
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState<number | undefined>(
    subCategoryIdParam ? parseInt(subCategoryIdParam) : undefined
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(0); // Reset to first page on search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch categories from backend
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getCategories(),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Fetch subcategories when a category is selected
  const { data: subCategories = [], isLoading: subCategoriesLoading } = useQuery({
    queryKey: ['subCategories', selectedCategoryId],
    queryFn: () => selectedCategoryId ? categoryService.getSubCategories(selectedCategoryId) : Promise.resolve([]),
    enabled: !!selectedCategoryId,
    staleTime: 5 * 60 * 1000,
  });

  // Get current category and subcategory objects
  const currentCategory = useMemo(() => 
    categories.find(c => c.id === selectedCategoryId),
    [categories, selectedCategoryId]
  );
  
  const currentSubCategory = useMemo(() => 
    subCategories.find(s => s.id === selectedSubCategoryId),
    [subCategories, selectedSubCategoryId]
  );

  // Fetch products with filters
  const { data: productsData, isLoading: productsLoading, isFetching } = useQuery<PagedProductResponse>({
    queryKey: ['products', 'filtered', {
      page: currentPage,
      size: itemsPerPage,
      search: debouncedSearch,
      categoryId: selectedCategoryId,
      subCategoryId: selectedSubCategoryId,
      sortBy
    }],
    queryFn: () => productService.getFilteredProducts({
      page: currentPage,
      size: itemsPerPage,
      search: debouncedSearch || undefined,
      categoryId: selectedCategoryId,
      subCategoryId: selectedSubCategoryId,
    }),
  });

  const products = productsData?.content || [];
  const totalProducts = productsData?.totalElements || 0;
  const totalPages = productsData?.totalPages || 0;

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedCategoryId) params.set('categoryId', selectedCategoryId.toString());
    if (selectedSubCategoryId) params.set('subCategoryId', selectedSubCategoryId.toString());
    if (debouncedSearch) params.set('search', debouncedSearch);
    
    const newSearch = params.toString();
    const currentSearch = location.search.replace('?', '');
    
    if (newSearch !== currentSearch) {
      navigate(`/shop${newSearch ? `?${newSearch}` : ''}`, { replace: true });
    }
  }, [selectedCategoryId, selectedSubCategoryId, debouncedSearch, navigate, location.search]);

  // Handle category selection
  const handleCategorySelect = (categoryId: number) => {
    if (selectedCategoryId === categoryId) {
      // Deselect if already selected
      setSelectedCategoryId(undefined);
      setSelectedSubCategoryId(undefined);
    } else {
      setSelectedCategoryId(categoryId);
      setSelectedSubCategoryId(undefined);
    }
    setCurrentPage(0);
  };

  // Handle subcategory selection
  const handleSubCategorySelect = (subCategoryId: number) => {
    if (selectedSubCategoryId === subCategoryId) {
      setSelectedSubCategoryId(undefined);
    } else {
      setSelectedSubCategoryId(subCategoryId);
    }
    setCurrentPage(0);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setSelectedCategoryId(undefined);
    setSelectedSubCategoryId(undefined);
    setCurrentPage(0);
  };

  const displayProducts = products.map((product: Product) => ({
    ...product,
    images: getAllProductImages(product.images),
    price: product.price || (product.productSku?.[0]?.price) || 0,
  }));

  const isLoading = productsLoading || categoriesLoading;
  const hasFilters = selectedCategoryId || selectedSubCategoryId || debouncedSearch;

  if (isLoading && !isFetching) {
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
            
            {/* Main Category Pills */}
            <div className="sticky top-0 z-10 bg-white pb-4 mb-6">
              <div className="flex flex-wrap gap-3">
                {categories.map((category) => {
                  const Icon = getIconByName(category.iconName);
                  const isActive = selectedCategoryId === category.id;
                  
                  return (
                    <Button
                      key={category.id}
                      variant={isActive ? "default" : "outline"}
                      onClick={() => handleCategorySelect(category.id)}
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

            {/* Subcategory Panel */}
            {currentCategory && subCategories.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="mb-8 p-6 bg-gradient-to-r from-june-bud/10 to-white rounded-2xl border border-june-bud/30"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-gotham-bold text-eagle-green flex items-center gap-2">
                    {(() => {
                      const CategoryIcon = getIconByName(currentCategory.iconName);
                      return <CategoryIcon className="h-5 w-5 text-viridian-green" />;
                    })()}
                    {currentCategory.name} Categories
                  </h2>
                  {selectedSubCategoryId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedSubCategoryId(undefined)}
                      className="text-eagle-green hover:text-viridian-green hover:bg-june-bud/20 hover:text-white font-gotham-bold"
                    >
                      Clear subcategory ×
                    </Button>
                  )}
                </div>
                
                {subCategoriesLoading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {[...Array(6)].map((_, i) => (
                      <Skeleton key={i} className="h-20 rounded-lg bg-june-bud/20" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {subCategories.map((subcategory) => {
                      const Icon = getIconByName(subcategory.iconName);
                      const isSelected = selectedSubCategoryId === subcategory.id;
                      
                      return (
                        <Button
                          key={subcategory.id}
                          variant="ghost"
                          onClick={() => handleSubCategorySelect(subcategory.id)}
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
                )}
              </motion.div>
            )}

            {/* Breadcrumb */}
            {hasFilters && (
              <div className="flex items-center gap-2 text-sm mb-6 overflow-x-auto">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleClearFilters}
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
                {currentSubCategory && (
                  <>
                    <ChevronRight className="h-4 w-4 text-eagle-green/50 flex-shrink-0" />
                    <span className="font-gotham-bold text-viridian-green flex-shrink-0 truncate">
                      {currentSubCategory.name}
                    </span>
                  </>
                )}
                {debouncedSearch && (
                  <>
                    <ChevronRight className="h-4 w-4 text-eagle-green/50 flex-shrink-0" />
                    <span className="font-gotham-bold text-viridian-green flex-shrink-0 truncate">
                      Search: "{debouncedSearch}"
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
                  className={`h-12 w-12 ${viewMode === 'grid' ? 'bg-eagle-green text-white border-eagle-green hover:bg-viridian-green' : 'border-eagle-green text-eagle-green hover:bg-eagle-green hover:text-white'}`}
                  title="Grid view"
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className={`h-12 w-12 ${viewMode === 'list' ? 'bg-eagle-green text-white border-eagle-green hover:bg-viridian-green' : 'border-eagle-green text-eagle-green hover:bg-eagle-green hover:text-white'}`}
                  title="List view"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </SlideIn>

        {/* Active Filters */}
        {hasFilters && (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="text-sm font-gotham-bold text-eagle-green">Active filters:</span>
            {currentCategory && (
              <Badge className="flex items-center gap-1 bg-june-bud/20 text-eagle-green border border-june-bud hover:bg-june-bud/30">
                <span className="font-gotham-bold">{currentCategory.name}</span>
                <button 
                  onClick={() => {
                    setSelectedCategoryId(undefined);
                    setSelectedSubCategoryId(undefined);
                  }}
                  className="ml-1 hover:text-viridian-green"
                >
                  ×
                </button>
              </Badge>
            )}
            {currentSubCategory && (
              <Badge className="flex items-center gap-1 bg-viridian-green/10 text-eagle-green border border-viridian-green/30 hover:bg-viridian-green/20">
                <span className="font-gotham-bold">{currentSubCategory.name}</span>
                <button 
                  onClick={() => setSelectedSubCategoryId(undefined)}
                  className="ml-1 hover:text-viridian-green"
                >
                  ×
                </button>
              </Badge>
            )}
            {debouncedSearch && (
              <Badge className="flex items-center gap-1 bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200">
                <span className="font-gotham-bold">"{debouncedSearch}"</span>
                <button 
                  onClick={() => {
                    setSearchTerm('');
                    setDebouncedSearch('');
                  }}
                  className="ml-1 hover:text-blue-600"
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
              {isFetching ? 'Loading...' : `Showing ${displayProducts.length} of ${totalProducts} products`}
            </p>
          </div>

          {displayProducts.length === 0 && !isFetching ? (
            <div className="text-center py-16 px-6">
              <div className="max-w-md mx-auto">
                <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-gotham-bold text-eagle-green mb-3">No products found</h3>
                <p className="font-gotham-light text-eagle-green/70 mb-6">
                  {hasFilters 
                    ? "Try adjusting your search or filters to find what you're looking for."
                    : "No products are available at the moment. Please check back later."}
                </p>
                {hasFilters && (
                  <Button 
                    onClick={handleClearFilters} 
                    className="bg-eagle-green hover:bg-viridian-green text-white font-gotham-bold"
                  >
                    Clear filters and show all products
                  </Button>
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
                {displayProducts.map((product) => (
                  <ProductGridItem key={product.id}>
                    <GiftItemCard product={product} />
                  </ProductGridItem>
                ))}
              </ProductGridStagger>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-8">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                    disabled={currentPage === 0 || isFetching}
                    className="border-eagle-green text-eagle-green hover:bg-eagle-green hover:text-white"
                  >
                    Previous
                  </Button>
                  <span className="px-4 py-2 text-sm font-gotham-bold text-eagle-green">
                    Page {currentPage + 1} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={currentPage >= totalPages - 1 || isFetching}
                    className="border-eagle-green text-eagle-green hover:bg-eagle-green hover:text-white"
                  >
                    Next
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
