import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "react-router-dom";
import { ChevronRight, Filter, Grid3X3, List, Heart, ShoppingCart, Star } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import ProtectedRoute from "@/components/protected-route";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDualCurrency } from "@/lib/currency";

interface Product {
  id: number;
  name: string;
  description?: string;
  price: string;
  images: string[];
  rating?: string;
  reviewCount?: number;
  deliveryDays?: number;
  tags?: string[];
  salesCount?: number;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  type: string;
}

function OccasionCategoryContent() {
  const [location] = useLocation();
  const categorySlug = location.split('/')[2]; // Extract slug from /occasions/{slug}
  
  const [sortBy, setSortBy] = useState('popular');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [priceFilter, setPriceFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Fetch categories to get category info
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
  });

  // Fetch products for this category
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["/api/products", categorySlug, sortBy, priceFilter, currentPage],
    queryFn: async () => {
      const category = categories.find((cat: Category) => cat.slug === categorySlug);
      if (!category) return [];
      
      const params = new URLSearchParams({
        limit: itemsPerPage.toString(),
        offset: ((currentPage - 1) * itemsPerPage).toString(),
        categoryId: category.id.toString()
      });
      
      const response = await fetch(`/api/products?${params}`);
      return response.json();
    },
    enabled: !!categorySlug && categories.length > 0,
  });

  const currentCategory = categories.find((cat: Category) => cat.slug === categorySlug);

  // Filter products by price range
  const filteredProducts = products.filter((product: Product) => {
    if (priceFilter === 'all') return true;
    const price = parseFloat(product.price.replace(/[^\d.]/g, ''));
    switch (priceFilter) {
      case 'under-1000': return price < 1000;
      case '1000-3000': return price >= 1000 && price <= 3000;
      case '3000-5000': return price >= 3000 && price <= 5000;
      case 'over-5000': return price > 5000;
      default: return true;
    }
  });

  // Sort products
  const sortedProducts = [...filteredProducts].sort((a: Product, b: Product) => {
    switch (sortBy) {
      case 'price-low':
        return parseFloat(a.price.replace(/[^\d.]/g, '')) - parseFloat(b.price.replace(/[^\d.]/g, ''));
      case 'price-high':
        return parseFloat(b.price.replace(/[^\d.]/g, '')) - parseFloat(a.price.replace(/[^\d.]/g, ''));
      case 'newest':
        return b.id - a.id; // Assuming higher ID means newer
      case 'rating':
        return parseFloat(b.rating || '0') - parseFloat(a.rating || '0');
      default: // popular
        return (b.salesCount || 0) - (a.salesCount || 0);
    }
  });

  if (!currentCategory && !isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-charcoal mb-4">Category Not Found</h1>
            <p className="text-gray-600 mb-8">The occasion category you're looking for doesn't exist.</p>
            <Link href="/occasions">
              <Button className="bg-ethiopian-gold hover:bg-amber">
                Browse All Occasions
              </Button>
            </Link>
          </div>
        </main>
        
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      

      {/* Breadcrumb Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-2 text-sm">
            <Link href="/" className="text-gray-500 hover:text-ethiopian-gold transition-colors">
              Home
            </Link>
            <ChevronRight size={16} className="text-gray-400" />
            <Link href="/occasions" className="text-gray-500 hover:text-ethiopian-gold transition-colors">
              Occasions
            </Link>
            <ChevronRight size={16} className="text-gray-400" />
            <span className="text-charcoal font-medium">
              {currentCategory?.name || categorySlug}
            </span>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-deep-forest to-ethiopian-gold text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-display text-4xl sm:text-5xl font-bold mb-4">
            {currentCategory?.name || "Occasion Gifts"}
          </h1>
          <p className="text-xl opacity-90 max-w-2xl mx-auto">
            {currentCategory?.description || `Perfect gifts for ${currentCategory?.name || 'special occasions'}`}
          </p>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Filters and Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 space-y-4 lg:space-y-0">
          <div className="flex items-center space-x-4">
            <Filter size={20} className="text-gray-600" />
            <Select value={priceFilter} onValueChange={setPriceFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by price" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Prices</SelectItem>
                <SelectItem value="under-1000">Under 1,000 ETB</SelectItem>
                <SelectItem value="1000-3000">1,000 - 3,000 ETB</SelectItem>
                <SelectItem value="3000-5000">3,000 - 5,000 ETB</SelectItem>
                <SelectItem value="over-5000">Over 5,000 ETB</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popular">Most Popular</SelectItem>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className={viewMode === 'grid' ? 'bg-ethiopian-gold hover:bg-amber' : ''}
            >
              <Grid3X3 size={16} />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? 'bg-ethiopian-gold hover:bg-amber' : ''}
            >
              <List size={16} />
            </Button>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-gray-600">
            {isLoading ? "Loading..." : `${sortedProducts.length} gifts found`}
            {priceFilter !== 'all' && (
              <Badge variant="secondary" className="ml-2 bg-ethiopian-gold/10 text-ethiopian-gold">
                {priceFilter === 'under-1000' && 'Under 1,000 ETB'}
                {priceFilter === '1000-3000' && '1,000 - 3,000 ETB'}
                {priceFilter === '3000-5000' && '3,000 - 5,000 ETB'}
                {priceFilter === 'over-5000' && 'Over 5,000 ETB'}
              </Badge>
            )}
          </p>
        </div>

        {/* Products Grid/List */}
        {isLoading ? (
          <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
            {Array.from({ length: 8 }).map((_, index) => (
              <Card key={index} className="overflow-hidden">
                <div className="w-full h-48 bg-gray-200 animate-pulse"></div>
                <CardContent className="p-4">
                  <div className="h-6 bg-gray-200 rounded mb-2 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded mb-3 animate-pulse"></div>
                  <div className="flex items-center justify-between">
                    <div className="h-6 w-20 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-8 w-20 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : sortedProducts.length > 0 ? (
          <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
            {sortedProducts.map((product: Product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart size={32} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">No gifts found</h3>
            <p className="text-gray-500 mb-6">
              Try adjusting your filters or check back soon for new arrivals
            </p>
            <Button 
              onClick={() => {
                setPriceFilter('all');
                setSortBy('popular');
              }}
              className="bg-ethiopian-gold hover:bg-amber"
            >
              Clear Filters
            </Button>
          </div>
        )}

        {/* Pagination */}
        {sortedProducts.length === itemsPerPage && (
          <div className="flex justify-center mt-12">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="px-4 py-2 text-sm text-gray-600">
                Page {currentPage}
              </span>
              <Button
                variant="outline"
                onClick={() => setCurrentPage(currentPage + 1)}
                className="border-ethiopian-gold text-ethiopian-gold hover:bg-ethiopian-gold hover:text-white"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </main>

      
    </div>
  );
}

export default function OccasionCategory() {
  return (
    <ProtectedRoute>
      <OccasionCategoryContent />
    </ProtectedRoute>
  );
}