import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import MultilingualSearch from '@/components/search/MultilingualSearch';
import GiftItemCard from '@/components/gift-card';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { ArrowLeft, Search as SearchIcon, Mic, Languages } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  description: string;
  price: string;
  images: string[];
  category: {
    name: string;
    slug: string;
  };
  vendor: {
    name: string;
    verified: boolean;
  };
  rating?: number;
  reviewCount?: number;
}

export default function Search() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [translatedQuery, setTranslatedQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  // Get search query from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q') || urlParams.get('search');
    if (query) {
      setSearchQuery(query);
      setHasSearched(true);
    }
  }, []);

  // Search products
  const { data: searchResults, isLoading, error } = useQuery({
    queryKey: ['/api/products/search', searchQuery],
    queryFn: async () => {
      if (!searchQuery) return [];
      
      const params = new URLSearchParams({
        q: searchQuery,
        ...(translatedQuery && { translated: translatedQuery })
      });
      
      return await apiRequest(`/api/products/search?${params}`);
    },
    enabled: !!searchQuery && hasSearched,
  });

  // Handle new search
  const handleSearch = (query: string, translated?: string) => {
    setSearchQuery(query);
    setTranslatedQuery(translated || '');
    setHasSearched(true);
    
    // Update URL
    const params = new URLSearchParams({ q: query });
    if (translated) params.set('translated', translated);
    navigate(`/search?${params}`);
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
    setTranslatedQuery('');
    setHasSearched(false);
    navigate('/search');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/shop')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Shop
            </Button>
            <div className="h-6 w-px bg-gray-300" />
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <SearchIcon className="h-6 w-6" />
              Multilingual Search
            </h1>
          </div>

          {/* Search Interface */}
          <MultilingualSearch
            onSearch={handleSearch}
            placeholder="Search for Ethiopian gifts in any language..."
            autoFocus={!searchQuery}
          />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!hasSearched ? (
          /* Welcome State */
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <div className="mb-8">
                <Mic className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Multilingual Voice Search
                </h2>
                <p className="text-gray-600">
                  Search for Ethiopian gifts using voice commands in English, Amharic, Oromiffa, Tigrinya, and more.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <Mic className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">Voice Search</h3>
                    </div>
                    <p className="text-sm text-gray-600">
                      Click the microphone icon and speak your search in any supported language.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <Languages className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">Auto Translation</h3>
                    </div>
                    <p className="text-sm text-gray-600">
                      Search queries are automatically translated to find the best results.
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-4">Supported Languages</h3>
                <div className="flex flex-wrap gap-2 justify-center">
                  {[
                    { code: 'en', name: 'English', flag: '🇺🇸' },
                    { code: 'am', name: 'አማርኛ', flag: '🇪🇹' },
                    { code: 'or', name: 'Oromiffa', flag: '🇪🇹' },
                    { code: 'ti', name: 'ትግርኛ', flag: '🇪🇹' },
                    { code: 'ar', name: 'العربية', flag: '🇸🇦' },
                    { code: 'es', name: 'Español', flag: '🇪🇸' },
                    { code: 'fr', name: 'Français', flag: '🇫🇷' },
                  ].map((lang) => (
                    <Badge key={lang.code} variant="secondary" className="px-3 py-1">
                      <span className="mr-1">{lang.flag}</span>
                      {lang.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Search Results */
          <div>
            {/* Search Info */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Search Results
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-gray-600">Query:</span>
                    <Badge variant="outline">{searchQuery}</Badge>
                    {translatedQuery && translatedQuery !== searchQuery && (
                      <>
                        <span className="text-gray-400">→</span>
                        <Badge variant="secondary">{translatedQuery}</Badge>
                      </>
                    )}
                  </div>
                </div>
                <Button variant="outline" onClick={clearSearch}>
                  New Search
                </Button>
              </div>
            </div>

            {/* Results */}
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-gray-200 aspect-square rounded-lg mb-4"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <SearchIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Search Error
                  </h3>
                  <p className="text-gray-600">
                    Something went wrong with your search. Please try again.
                  </p>
                </CardContent>
              </Card>
            ) : searchResults?.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <SearchIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No Results Found
                  </h3>
                  <p className="text-gray-600 mb-4">
                    We couldn't find any products matching "{searchQuery}".
                  </p>
                  <Button variant="outline" onClick={clearSearch}>
                    Try a Different Search
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {searchResults?.map((product: Product) => (
                    <GiftItemCard key={product.id} product={product} />
                  ))}
                </div>
                
                {/* Add pagination for search results if needed */}
                {searchResults?.length > 20 && (
                  <ProductPagination
                    currentPage={1}
                    totalItems={searchResults.length}
                    itemsPerPage={20}
                    hasNextPage={false}
                    onLoadMore={() => Promise.resolve()}
                    isLoading={false}
                    className="mt-12"
                  />
                )}
                
                <div className="mt-8 text-center">
                  <p className="text-gray-600">
                    Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}