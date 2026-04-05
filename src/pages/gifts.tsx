import { useState, useEffect, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useActiveCurrency } from "@/hooks/useActiveCurrency";
import { motion } from "framer-motion";

import GiftItemCard from "@/components/gift-card";
import ProductPagination from "@/components/ProductPagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, SlidersHorizontal } from "lucide-react";
import { Product, productService, extractPriceAmount } from "@/services/productService";
import { categoryService } from "@/services/categoryService";
import GeramiSignatureSets from "@/components/ZembilSignatureSets.tsx";

export default function Gifts() {
  const [searchParams, setSearchParams] = useSearchParams();
  const {isInitialized } = useAuth();
  const activeCurrency = useActiveCurrency();
  
  // Get path parameters
  const params = useParams<{ categorySlug?: string }>();

  // Use URL params directly as the source of truth
  const searchParam = searchParams.get('search') || '';
  const sortParam = searchParams.get('sort') || 'popularity';
  const priceParam = searchParams.get('price') || 'all';
  const recipientParam = searchParams.get('recipient') || '';
  
  // Check if the path parameter is a recipient type
  const knownRecipients = [
    'mom', 'dad', 'friends', 'kids', 'couples', 'colleagues',
    'anniversary', 'birthday', 'wedding', 'graduation', 'housewarming',
    'christmas', 'holiday', 'valentine'
  ];
  
  const categorySlug = params.categorySlug && !knownRecipients.includes(params.categorySlug)
    ? params.categorySlug
    : searchParams.get('category');
    
  const pathRecipient = params.categorySlug && knownRecipients.includes(params.categorySlug) ? params.categorySlug : null;
  const finalRecipientParam = recipientParam || pathRecipient;

  // Local state for interactive elements that haven't been committed to URL yet (like typing in search)
  const [localSearchTerm, setLocalSearchTerm] = useState(searchParam);
  
  // Update local search term when URL search param changes (e.g. browser back)
  useEffect(() => {
    setLocalSearchTerm(searchParam);
  }, [searchParam]);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [loadedProducts, setLoadedProducts] = useState<Product[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const { data: categoriesWithSubcategories = [] } = useQuery({
    queryKey: ['categories', 'with-subcategories'],
    queryFn: () => categoryService.getCategoriesWithSubcategories(),
  });

  const currentSubCategory = useMemo(() => {
    if (!categorySlug) return null;
    for (const category of categoriesWithSubcategories) {
      const sub = category.subcategories?.find((item) => item.slug === categorySlug);
      if (sub) return sub;
    }
    return null;
  }, [categorySlug, categoriesWithSubcategories]);

  const currentCategory = useMemo(() => {
    if (!categorySlug) return null;
    if (currentSubCategory) {
      return categoriesWithSubcategories.find((cat) => cat.id === currentSubCategory.categoryId) || null;
    }
    return categoriesWithSubcategories.find((cat) => cat.slug === categorySlug) || null;
  }, [categorySlug, categoriesWithSubcategories, currentSubCategory]);

  const baseFilterParams = useMemo(() => ({
    page: 0,
    size: itemsPerPage,
    search: searchParam || undefined,
    subCategoryId: currentSubCategory?.id,
    categoryId: currentSubCategory ? undefined : currentCategory?.id,
  }), [itemsPerPage, searchParam, currentSubCategory, currentCategory]);

  // Fetch products from backend filter endpoint (wait for auth so currency is correct)
  const { data: initialData, isLoading, isFetching } = useQuery({
    queryKey: ['gifts', 'products', baseFilterParams, finalRecipientParam, sortParam, priceParam, activeCurrency],
    queryFn: () => productService.getFilteredProducts(baseFilterParams),
    enabled: isInitialized && ((!categorySlug || !!currentCategory || !!currentSubCategory) && !!categoriesWithSubcategories.length),
  });

  const products = initialData?.content || [];

  const getProductPrice = (product: Product) => {
    if (product.productSku && product.productSku.length > 0) {
      const prices = product.productSku
        .map((sku) => extractPriceAmount(sku.price))
        .filter((price) => price > 0);
      if (prices.length > 0) return Math.min(...prices);
    }
    return extractPriceAmount(product.price);
  };

  // Filter products by recipient if specified
  const filteredProducts = useMemo(() => {
    return products
      .filter((product) => {
        if (!finalRecipientParam) return true;
        const recipients = (product as any).recipient;
        return Array.isArray(recipients) && recipients.includes(finalRecipientParam);
      })
      .filter((product) => {
        if (priceParam === 'all') return true;
        const price = getProductPrice(product);
        switch (priceParam) {
          case '0-500':
            return price < 500;
          case '500-1000':
            return price >= 500 && price <= 1000;
          case '1000-2000':
            return price >= 1000 && price <= 2000;
          case '2000-5000':
            return price >= 2000 && price <= 5000;
          case '5000+':
            return price > 5000;
          default:
            return true;
        }
      })
      .sort((a, b) => {
        if (sortParam === 'price-low') return getProductPrice(a) - getProductPrice(b);
        if (sortParam === 'price-high') return getProductPrice(b) - getProductPrice(a);
        if (sortParam === 'newest') {
          return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
        }
        if (sortParam === 'rating') {
          return (b.averageRating || 0) - (a.averageRating || 0);
        }
        return 0;
      });
  }, [products, finalRecipientParam, priceParam, sortParam]);

  const totalProducts = initialData?.totalElements || filteredProducts.length;

  // Reset loaded products when filters change (queryKey changes)
  useEffect(() => {
    setLoadedProducts(filteredProducts);
    setCurrentPage(1);
  }, [filteredProducts]);

  const displayProducts = loadedProducts.length > 0 ? loadedProducts : filteredProducts;
  const hasNextPage = totalProducts > loadedProducts.length;

  const loadMoreProducts = async () => {
    if (isLoadingMore || !hasNextPage) return;

    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const data = await productService.getFilteredProducts({
        ...baseFilterParams,
        page: nextPage - 1,
      });

      const nextProducts = data?.content || [];
      if (nextProducts.length > 0) {
        const merged = [...loadedProducts, ...nextProducts];

        // Keep client-side recipient/price/sort behavior consistent for appended data
        const filteredMerged = merged
          .filter((product) => {
            if (!finalRecipientParam) return true;
            const recipients = (product as any).recipient;
            return Array.isArray(recipients) && recipients.includes(finalRecipientParam);
          })
          .filter((product) => {
            if (priceParam === 'all') return true;
            const price = getProductPrice(product);
            switch (priceParam) {
              case '0-500':
                return price < 500;
              case '500-1000':
                return price >= 500 && price <= 1000;
              case '1000-2000':
                return price >= 1000 && price <= 2000;
              case '2000-5000':
                return price >= 2000 && price <= 5000;
              case '5000+':
                return price > 5000;
              default:
                return true;
            }
          })
          .sort((a, b) => {
            if (sortParam === 'price-low') return getProductPrice(a) - getProductPrice(b);
            if (sortParam === 'price-high') return getProductPrice(b) - getProductPrice(a);
            if (sortParam === 'newest') {
              return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
            }
            if (sortParam === 'rating') {
              return (b.averageRating || 0) - (a.averageRating || 0);
            }
            return 0;
          });

        setLoadedProducts(filteredMerged);
        setCurrentPage(nextPage);
      }
    } catch (error) {
      console.error('Error loading more products:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const getRecipientDisplayName = (recipient: string) => {
    const recipientNames: { [key: string]: string } = {
      'mom': 'For Mom',
      'dad': 'For Dad',
      'friends': 'For Friends',
      'kids': 'For Kids',
      'couples': 'For Couples',
      'colleagues': 'For Colleagues',
      'anniversary': 'Anniversary Gifts',
      'birthday': 'Birthday Gifts',
      'wedding': 'Wedding Gifts',
      'graduation': 'Graduation Gifts',
      'housewarming': 'Housewarming Gifts',
      'christmas': 'Christmas Gifts',
      'holiday': 'Holiday Gifts',
      'valentine': 'Valentine Gifts'
    };
    return recipientNames[recipient] || recipient;
  };

  const handleSearchCommit = (value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set('search', value);
    } else {
      newParams.delete('search');
    }
    newParams.delete('category'); // Clear category when searching
    setSearchParams(newParams);
  };

  const handleSortChange = (value: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('sort', value);
    setSearchParams(newParams);
  };

  const handlePriceChange = (value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value === 'all') {
      newParams.delete('price');
    } else {
      newParams.set('price', value);
    }
    setSearchParams(newParams);
  };

  const handleClearFilters = () => {
    setSearchParams({});
    setLocalSearchTerm('');
  };


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
            {currentSubCategory && (
              <>
                <span>›</span>
                <span className="text-ethiopian-gold">{currentSubCategory.name}</span>
              </>
            )}
            {finalRecipientParam && (
              <>
                <span>›</span>
                <span className="text-ethiopian-gold">{getRecipientDisplayName(finalRecipientParam)}</span>
              </>
            )}
          </div>
          
          <h1 className="text-3xl sm:text-4xl font-bold text-charcoal mb-4">
            {finalRecipientParam 
              ? `${getRecipientDisplayName(finalRecipientParam)}` 
              : currentSubCategory
                ? currentSubCategory.name
                : currentCategory 
                ? currentCategory.name 
                : 'All Gifts'
            }
          </h1>
          
          {finalRecipientParam && (
            <p className="text-gray-600 text-lg max-w-3xl">
              Perfect gifts curated specifically for {finalRecipientParam === 'mom' ? 'your mother' : 
                finalRecipientParam === 'dad' ? 'your father' : 
                finalRecipientParam === 'friends' ? 'your friends' :
                finalRecipientParam === 'kids' ? 'children' :
                finalRecipientParam === 'couples' ? 'couples' :
                finalRecipientParam === 'colleagues' ? 'your colleagues' :
                finalRecipientParam === 'anniversary' ? 'celebrating love and commitment' :
                finalRecipientParam === 'birthday' ? 'birthday celebrations' :
                finalRecipientParam === 'wedding' ? 'wedding celebrations' :
                finalRecipientParam === 'graduation' ? 'academic achievements' :
                finalRecipientParam === 'housewarming' ? 'new home celebrations' :
                finalRecipientParam === 'christmas' ? 'Christmas celebrations' :
                finalRecipientParam === 'holiday' ? 'holiday celebrations' :
                finalRecipientParam === 'valentine' ? 'Valentine\'s Day' : finalRecipientParam}
            </p>
          )}
          
          {(currentSubCategory?.description || currentCategory?.description) && !finalRecipientParam && (
            <p className="text-gray-600 text-lg max-w-3xl">
              {currentSubCategory?.description || currentCategory?.description}
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
                value={localSearchTerm}
                onChange={(e) => setLocalSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearchCommit(localSearchTerm);
                  }
                }}
                onBlur={() => handleSearchCommit(localSearchTerm)}
                className="pl-10"
              />
            </div>

            {/* Sort */}
            <Select value={sortParam} onValueChange={handleSortChange}>
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
            <Select value={priceParam} onValueChange={handlePriceChange}>
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
            {/* <Button variant="outline" className="border-ethiopian-gold text-ethiopian-gold hover:bg-ethiopian-gold hover:text-white">
              <SlidersHorizontal size={18} className="mr-2" />
              Filters
            </Button> */}
          </div>

          {/* Active Filters */}
          {(searchParam || priceParam !== 'all' || currentCategory || currentSubCategory || finalRecipientParam) && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
              <span className="text-sm text-gray-600">Active filters:</span>
              {searchParam && (
                <Badge variant="secondary" className="bg-ethiopian-gold/10 text-ethiopian-gold">
                  Search: {searchParam}
                  <button 
                    onClick={() => {
                      setLocalSearchTerm('');
                      handleSearchCommit('');
                    }}
                    className="ml-2 hover:text-warm-red"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {(currentSubCategory || currentCategory) && (
                <Badge variant="secondary" className="bg-ethiopian-gold/10 text-ethiopian-gold">
                  {currentSubCategory ? 'Subcategory' : 'Category'}: {currentSubCategory?.name || currentCategory?.name}
                  <button 
                    onClick={() => {
                      const newParams = new URLSearchParams(searchParams);
                      newParams.delete('category');
                      setSearchParams(newParams);
                    }}
                    className="ml-2 hover:text-warm-red"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {finalRecipientParam && (
                <Badge variant="secondary" className="bg-ethiopian-gold/10 text-ethiopian-gold">
                  Recipient: {getRecipientDisplayName(finalRecipientParam)}
                  <button 
                    onClick={() => {
                      const newParams = new URLSearchParams(searchParams);
                      newParams.delete('recipient');
                      // If we're on a path-based recipient URL, redirect to /gifts
                      if (pathRecipient) {
                        setSearchParams({});
                      } else {
                        setSearchParams(newParams);
                      }
                    }}
                    className="ml-2 hover:text-warm-red"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {priceParam !== 'all' && (
                <Badge variant="secondary" className="bg-ethiopian-gold/10 text-ethiopian-gold">
                  Price: {priceParam === '0-500' ? 'Under 500 ETB' : 
                          priceParam === '500-1000' ? '500-1,000 ETB' :
                          priceParam === '1000-2000' ? '1,000-2,000 ETB' :
                          priceParam === '2000-5000' ? '2,000-5,000 ETB' : 
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
        {(isLoading || (isFetching && !initialData)) ? (
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
                <GiftItemCard key={product.id} product={product} />
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
            
            {/* GeramiSignatureSets Component - show after sufficient products */}
            {totalProducts >= 20 && <GeramiSignatureSets />}
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
                {searchParam 
                  ? `We couldn't find any gifts matching "${searchParam}". Try adjusting your search terms or filters.`
                  : currentCategory 
                    ? `The ${currentCategory.name} category is currently being updated with new products. Check back soon for exciting new additions!`
                    : "Try adjusting your search criteria or browse our featured collections below."
                }
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                onClick={handleClearFilters}
                variant="outline"
                className="border-ethiopian-gold text-ethiopian-gold hover:bg-ethiopian-gold hover:text-white"
              >
                Clear All Filters
              </Button>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}