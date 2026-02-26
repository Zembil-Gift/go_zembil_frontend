import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useActiveCurrency } from "@/hooks/useActiveCurrency";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import FadeIn from "@/components/animations/FadeIn";
import SlideIn from "@/components/animations/SlideIn";
import { ProductGridStagger, ProductGridItem } from "@/components/animations/StaggerAnimations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ChevronRight, Package, Sparkles, Gift, X, Filter, ChevronDown, ChevronUp } from "lucide-react";
import GiftItemCard from "@/components/gift-card";
import { productService, Product, PagedProductResponse } from "@/services/productService";
import { categoryService } from "@/services/categoryService";
import { getAllProductImages } from "@/utils/imageUtils";
import { getIconByName } from "@/components/admin/IconPicker";
import GeramiSignatureSets from "@/components/ZembilSignatureSets.tsx";
import PageNavigator from "@/components/PageNavigator";

export default function Shop() {
  return <ShopContent />;
}

function ShopContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isInitialized } = useAuth();
  const activeCurrency = useActiveCurrency();

  // Parse URL parameters
  const urlParams = new URLSearchParams(location.search);
  const categoryIdParam = urlParams.get('categoryId');
  const subCategoryIdParam = urlParams.get('subCategoryId');
  const searchParam = urlParams.get('search') || '';

  const [viewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('newest');
  const [searchTerm, setSearchTerm] = useState(searchParam);
  const [debouncedSearch, setDebouncedSearch] = useState(searchParam);
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage] = useState(12);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>(
    categoryIdParam ? parseInt(categoryIdParam) : undefined
  );
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState<number | undefined>(
    subCategoryIdParam ? parseInt(subCategoryIdParam) : undefined
  );
  const [showAllSubCategories, setShowAllSubCategories] = useState(false);

  // Reset showAllSubCategories when category changes
  useEffect(() => {
    setShowAllSubCategories(false);
  }, [selectedCategoryId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch categories from backend
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getCategories(),
    staleTime: 5 * 60 * 1000,
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

  // Fetch products with filters (wait for auth so currency is correct)
  const { data: productsData, isLoading: productsLoading, isFetching } = useQuery<PagedProductResponse>({
    queryKey: ['products', 'filtered', {
      page: currentPage,
      size: itemsPerPage,
      search: debouncedSearch,
      categoryId: selectedCategoryId,
      subCategoryId: selectedSubCategoryId,
      sortBy,
      currency: activeCurrency,
    }],
    queryFn: () => productService.getFilteredProducts({
      page: currentPage,
      size: itemsPerPage,
      search: debouncedSearch || undefined,
      categoryId: selectedCategoryId,
      subCategoryId: selectedSubCategoryId,
    }),
    enabled: isInitialized,
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

  // Loading state
  if (isLoading && !isFetching) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-light-cream to-white">
        {/* Hero skeleton */}
        <div className="relative bg-gradient-to-br from-eagle-green via-eagle-green to-viridian-green">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <Skeleton className="h-12 w-96 mb-4 bg-white/20" />
            <Skeleton className="h-6 w-80 bg-white/20" />
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Category pills skeleton */}
          <div className="flex flex-wrap gap-3 mb-8">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-36 rounded-full bg-june-bud/20" />
            ))}
          </div>

          {/* Search skeleton */}
          <div className="flex flex-col lg:flex-row gap-4 mb-8">
            <Skeleton className="flex-1 h-14 rounded-2xl bg-june-bud/20" />
            <div className="flex gap-3">
              <Skeleton className="w-48 h-14 rounded-xl bg-june-bud/20" />
              <Skeleton className="w-28 h-14 rounded-xl bg-june-bud/20" />
            </div>
          </div>

          {/* Products grid skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="group overflow-hidden border-0 shadow-md bg-white rounded-2xl">
                <CardContent className="p-0">
                  <Skeleton className="h-56 w-full bg-june-bud/10" />
                  <div className="p-4">
                    <Skeleton className="h-5 w-3/4 mb-2 bg-june-bud/20" />
                    <Skeleton className="h-4 w-1/2 mb-3 bg-june-bud/20" />
                    <Skeleton className="h-6 w-1/3 bg-june-bud/20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-light-cream to-white">
      {/* Simplified Hero Section */}
      <section className="bg-gradient-to-r from-eagle-green to-viridian-green">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <FadeIn delay={0.1}>
            <div className="flex items-center gap-2 mb-2">
              <Gift className="h-5 w-5 text-june-bud" />
              <h1 className="text-2xl lg:text-3xl font-bold text-white">
                Shop Gifts
              </h1>
            </div>
            <p className="text-sm lg:text-base font-light text-white/80 max-w-2xl">
              Handcrafted gifts from talented Ethiopian artisans
            </p>
          </FadeIn>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Category Pills */}
        <FadeIn delay={0.2}>
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="font-bold text-xl text-eagle-green">Browse by Category</span>
            </div>
            <div className="flex overflow-x-auto scrollbar-hide gap-3 py-2 -mx-4 px-4 sm:mx-0 sm:px-2 sm:flex-wrap">
              {categories.map((category, index) => {
                const Icon = getIconByName(category.iconName);
                const isActive = selectedCategoryId === category.id;

                return (
                  <motion.div
                    key={category.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Button
                      variant={isActive ? "default" : "outline"}
                      onClick={() => handleCategorySelect(category.id)}
                      className={`
                        flex items-center gap-2 px-5 py-3 h-12 rounded-full transition-all duration-300
                        ${isActive
                          ? "bg-gradient-to-r from-eagle-green to-viridian-green text-white border-0 shadow-lg shadow-eagle-green/25 scale-105"
                          : "bg-white border-2 border-eagle-green/20 text-eagle-green hover:border-viridian-green hover:bg-viridian-green/5 hover:text-viridian-green hover:scale-105"
                        }
                      `}
                      aria-pressed={isActive}
                    >
                      <Icon className={`h-5 w-5 transition-transform duration-300 ${isActive ? 'text-june-bud' : ''}`} />
                      <span className="font-bold">{category.name}</span>
                    </Button>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </FadeIn>

        {/* Subcategory Panel */}
        {currentCategory && subCategories.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="mb-8 p-6 bg-white/80 backdrop-blur-xl rounded-3xl border border-june-bud/20 shadow-xl shadow-eagle-green/5"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-eagle-green flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-june-bud/20 to-viridian-green/10 rounded-xl">
                  {(() => {
                    const CategoryIcon = getIconByName(currentCategory.iconName);
                    return <CategoryIcon className="h-5 w-5 text-viridian-green" />;
                  })()}
                </div>
                <span>{currentCategory.name} Categories</span>
              </h2>
              {selectedSubCategoryId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedSubCategoryId(undefined)}
                  className="text-eagle-green/70 hover:text-viridian-green hover:bg-viridian-green/10 font-medium rounded-full px-4"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>

            {subCategoriesLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-2xl bg-june-bud/10" />
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 py-2 px-2">
                  {(showAllSubCategories ? subCategories : subCategories.slice(0, 5)).map((subcategory, index) => {
                    const Icon = getIconByName(subcategory.iconName);
                    const isSelected = selectedSubCategoryId === subcategory.id;

                    return (
                      <motion.div
                        key={subcategory.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <Button
                          variant="ghost"
                          onClick={() => handleSubCategorySelect(subcategory.id)}
                          className={`
                            flex flex-col items-center gap-2 p-4 h-24 w-full rounded-2xl transition-all duration-300 border-2
                            ${isSelected
                              ? "bg-gradient-to-br from-viridian-green/10 to-june-bud/10 border-viridian-green text-eagle-green shadow-lg scale-105"
                              : "bg-white/50 border-transparent text-eagle-green/70 hover:border-june-bud/30 hover:bg-june-bud/5 hover:scale-102"
                            }
                          `}
                          aria-pressed={isSelected}
                        >
                          <div className={`p-2 rounded-xl transition-all duration-300 ${isSelected ? 'bg-viridian-green/20' : 'bg-eagle-green/5'}`}>
                            <Icon className={`h-6 w-6 ${isSelected ? 'text-viridian-green' : 'text-eagle-green/60'}`} />
                          </div>
                          <span className={`text-xs font-bold text-center leading-tight ${isSelected ? 'text-eagle-green' : 'text-eagle-green/70'}`}>
                            {subcategory.name}
                          </span>
                        </Button>
                      </motion.div>
                    );
                  })}
                  
                  {!showAllSubCategories && subCategories.length > 5 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <Button
                        variant="ghost"
                        onClick={() => setShowAllSubCategories(true)}
                        className="flex flex-col items-center justify-center gap-2 p-4 h-24 w-full rounded-2xl transition-all duration-300 border-2 border-dashed border-viridian-green/30 bg-viridian-green/5 text-viridian-green hover:bg-viridian-green/10 hover:border-viridian-green"
                      >
                        <div className="p-2 rounded-xl bg-viridian-green/20">
                          <ChevronDown className="h-6 w-6" />
                        </div>
                        <span className="text-xs font-bold text-center leading-tight">
                          Show {subCategories.length - 5} More
                        </span>
                      </Button>
                    </motion.div>
                  )}
                </div>

                {showAllSubCategories && (
                  <div className="flex justify-center pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAllSubCategories(false)}
                      className="text-eagle-green/60 hover:text-viridian-green hover:bg-viridian-green/5 font-medium rounded-full px-6 flex items-center gap-2"
                    >
                      <ChevronUp className="h-4 w-4" />
                      Show Less
                    </Button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Search and Filters */}
        <SlideIn direction="up" delay={0.3}>
          <div className="flex items-center gap-3 mb-8">
            {/* Search Bar */}
            <div className="flex-1 relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-eagle-green/20 to-viridian-green/20 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"></div>
              <div className="relative bg-white rounded-2xl shadow-lg shadow-eagle-green/5 border border-eagle-green/10 overflow-hidden">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-eagle-green/40 h-5 w-5" />
                <Input
                  placeholder="Search for gifts, occasions, artisans..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 pr-4 h-14 bg-transparent border-0 focus:ring-0 focus-visible:ring-0 font-light text-eagle-green placeholder:text-eagle-green/40 w-full"
                />
              </div>
            </div>

            {/* Sort Dropdown - Icon Only */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-14 w-14 rounded-2xl bg-white border-eagle-green/10 shadow-lg shadow-eagle-green/5 hover:border-viridian-green hover:bg-viridian-green/5 transition-all duration-300 p-0 shrink-0"
                >
                  <Filter className="h-5 w-5 text-viridian-green" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white border border-eagle-green/10 shadow-xl rounded-xl p-1">
                <div className="px-2 py-1.5 text-xs font-bold text-eagle-green/40 uppercase tracking-wider">Sort by</div>
                <DropdownMenuItem onClick={() => setSortBy('newest')} className={`rounded-lg cursor-pointer ${sortBy === 'newest' ? 'bg-june-bud/20 text-eagle-green font-medium' : 'text-eagle-green/70 hover:bg-june-bud/10'}`}>
                  Newest First
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('popular')} className={`rounded-lg cursor-pointer ${sortBy === 'popular' ? 'bg-june-bud/20 text-eagle-green font-medium' : 'text-eagle-green/70 hover:bg-june-bud/10'}`}>
                  Most Popular
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('price-low')} className={`rounded-lg cursor-pointer ${sortBy === 'price-low' ? 'bg-june-bud/20 text-eagle-green font-medium' : 'text-eagle-green/70 hover:bg-june-bud/10'}`}>
                  Price: Low to High
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('price-high')} className={`rounded-lg cursor-pointer ${sortBy === 'price-high' ? 'bg-june-bud/20 text-eagle-green font-medium' : 'text-eagle-green/70 hover:bg-june-bud/10'}`}>
                  Price: High to Low
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('rating')} className={`rounded-lg cursor-pointer ${sortBy === 'rating' ? 'bg-june-bud/20 text-eagle-green font-medium' : 'text-eagle-green/70 hover:bg-june-bud/10'}`}>
                  Highest Rated
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </SlideIn>

        {/* Active Filters & Breadcrumb */}
        {hasFilters && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap items-center gap-3 mb-8 p-4 bg-gradient-to-r from-june-bud/10 to-viridian-green/5 rounded-2xl border border-june-bud/20"
          >
            <span className="text-sm font-bold text-eagle-green flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Active filters:
            </span>

            {/* Breadcrumb trail */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="px-3 h-8 text-xs font-medium text-eagle-green/70 hover:text-viridian-green hover:bg-transparent"
              >
                All Products
              </Button>

              {currentCategory && (
                <>
                  <ChevronRight className="h-3 w-3 text-eagle-green/30" />
                  <Badge className="flex items-center gap-1.5 bg-gradient-to-r from-eagle-green to-viridian-green text-white border-0 px-3 py-1 rounded-full font-medium">
                    {currentCategory.name}
                    <button
                      onClick={() => {
                        setSelectedCategoryId(undefined);
                        setSelectedSubCategoryId(undefined);
                      }}
                      className="ml-1 hover:bg-white/20 rounded-full p-0.5 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                </>
              )}

              {currentSubCategory && (
                <>
                  <ChevronRight className="h-3 w-3 text-eagle-green/30" />
                  <Badge className="flex items-center gap-1.5 bg-viridian-green/20 text-viridian-green border border-viridian-green/30 px-3 py-1 rounded-full font-medium">
                    {currentSubCategory.name}
                    <button
                      onClick={() => setSelectedSubCategoryId(undefined)}
                      className="ml-1 hover:bg-viridian-green/20 rounded-full p-0.5 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                </>
              )}

              {debouncedSearch && (
                <>
                  <ChevronRight className="h-3 w-3 text-eagle-green/30" />
                  <Badge className="flex items-center gap-1.5 bg-june-bud/20 text-eagle-green border border-june-bud/30 px-3 py-1 rounded-full font-medium">
                    "{debouncedSearch}"
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setDebouncedSearch('');
                      }}
                      className="ml-1 hover:bg-june-bud/30 rounded-full p-0.5 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                </>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="ml-auto text-eagle-green/70 hover:text-viridian-green hover:bg-viridian-green/10 font-medium rounded-full px-4"
            >
              Clear all
            </Button>
          </motion.div>
        )}

        {/* Products Section */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <p className="font-light text-eagle-green/70">
              {isFetching ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-viridian-green/30 border-t-viridian-green rounded-full animate-spin"></span>
                  Loading...
                </span>
              ) : (
                <>Showing <span className="font-bold text-eagle-green">{displayProducts.length}</span> of <span className="font-bold text-eagle-green">{totalProducts}</span> products</>
              )}
            </p>
          </div>

          {displayProducts.length === 0 && !isFetching ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20 px-6"
            >
              <div className="max-w-md mx-auto">
                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-june-bud/20 to-viridian-green/10 rounded-3xl flex items-center justify-center">
                  <Package className="h-12 w-12 text-eagle-green/40" />
                </div>
                <h3 className="text-2xl font-bold text-eagle-green mb-3">No products found</h3>
                <p className="font-light text-eagle-green/60 mb-8 leading-relaxed">
                  {hasFilters
                    ? "We couldn't find any gifts matching your criteria. Try adjusting your search or filters."
                    : "No products are available at the moment. Please check back soon for new arrivals!"}
                </p>
                {hasFilters && (
                  <Button
                    onClick={handleClearFilters}
                    className="bg-gradient-to-r from-eagle-green to-viridian-green hover:from-viridian-green hover:to-eagle-green text-white font-bold px-8 py-3 rounded-full shadow-lg shadow-eagle-green/25 transition-all duration-300 hover:scale-105"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Show all products
                  </Button>
                )}
              </div>
            </motion.div>
          ) : (
            <>
              <ProductGridStagger className={`grid gap-6 ${viewMode === 'grid'
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
              <div className="mt-12">
                <PageNavigator
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  isLoading={isFetching}
                  totalItems={totalProducts}
                  itemsPerPage={itemsPerPage}
                />
              </div>
            </>
          )}
        </div>

        {/* Signature Sets */}
        <SlideIn direction="up" delay={0.4}>
          <GeramiSignatureSets />
        </SlideIn>
      </div>
    </div>
  );
}