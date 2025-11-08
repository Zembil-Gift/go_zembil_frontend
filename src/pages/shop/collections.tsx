import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  Heart, 
  Sparkles, 
  Users, 
  Calendar,
  ChevronRight,
  Gift,
  Star,
  Package,
  ArrowRight
} from "lucide-react";
import { formatDualCurrency } from "@/lib/currency";
import type { Product } from "@shared/schema";

interface Collection {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  route: string;
  color: string;
  bgColor: string;
  products?: Product[];
}

export default function Collections() {
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);

  // Fetch trending products
  const { data: trendingProducts = [] } = useQuery({
    queryKey: ['/api/products', { isTrending: true, limit: 8 }],
    queryFn: async () => {
      const response = await fetch('/api/products?isTrending=true&limit=8');
      if (!response.ok) throw new Error('Failed to fetch trending products');
      return response.json();
    }
  });

  // Fetch best sellers
  const { data: bestSellerProducts = [] } = useQuery({
    queryKey: ['/api/products', { isBestSeller: true, limit: 8 }],
    queryFn: async () => {
      const response = await fetch('/api/products?isBestSeller=true&limit=8');
      if (!response.ok) throw new Error('Failed to fetch best sellers');
      return response.json();
    }
  });

  // Fetch cultural favorites (Ethiopian category products)
  const { data: culturalProducts = [] } = useQuery({
    queryKey: ['/api/categories', 'cultural-religious', 'products'],
    queryFn: async () => {
      const categoriesResponse = await fetch('/api/categories?type=cultural');
      if (!categoriesResponse.ok) throw new Error('Failed to fetch cultural categories');
      const categories = await categoriesResponse.json();
      
      if (categories.length > 0) {
        const productsResponse = await fetch(`/api/categories/${categories[0].id}/products?limit=8`);
        if (!productsResponse.ok) throw new Error('Failed to fetch cultural products');
        return productsResponse.json();
      }
      return [];
    }
  });

  // Fetch occasion products
  const { data: occasionProducts = [] } = useQuery({
    queryKey: ['/api/categories', 'occasions', 'products'],
    queryFn: async () => {
      const categoriesResponse = await fetch('/api/categories?type=occasion');
      if (!categoriesResponse.ok) throw new Error('Failed to fetch occasion categories');
      const categories = await categoriesResponse.json();
      
      if (categories.length > 0) {
        const productsResponse = await fetch(`/api/categories/${categories[0].id}/products?limit=8`);
        if (!productsResponse.ok) throw new Error('Failed to fetch occasion products');
        return productsResponse.json();
      }
      return [];
    }
  });

  // Fetch new arrivals (recent products)
  const { data: newArrivals = [] } = useQuery({
    queryKey: ['/api/products', { sortBy: 'newest', limit: 8 }],
    queryFn: async () => {
      const response = await fetch('/api/products?sortBy=newest&limit=8');
      if (!response.ok) throw new Error('Failed to fetch new arrivals');
      return response.json();
    }
  });

  const collections: Collection[] = [
    {
      id: 'trending',
      title: 'Trending Gifts',
      description: 'Most popular gifts loved by our community this month',
      icon: TrendingUp,
      route: '/shop?isTrending=true',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      products: trendingProducts
    },
    {
      id: 'most-loved',
      title: 'Most Loved',
      description: 'Top-rated gifts with outstanding customer reviews',
      icon: Heart,
      route: '/shop?isBestSeller=true',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      products: bestSellerProducts
    },
    {
      id: 'cultural',
      title: 'Cultural Favorites',
      description: 'Authentic Ethiopian treasures connecting hearts to heritage',
      icon: Sparkles,
      route: '/shop?category=cultural-religious',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      products: culturalProducts
    },
    {
      id: 'diaspora',
      title: "Diaspora's Picks",
      description: 'Specially curated for families connecting across distances',
      icon: Users,
      route: '/shop?tags=diaspora',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      products: newArrivals // Using new arrivals as diaspora picks
    },
    {
      id: 'occasions',
      title: 'Special Occasions',
      description: 'Perfect gifts for birthdays, graduations, and celebrations',
      icon: Calendar,
      route: '/shop?category=occasions',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      products: occasionProducts
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-ethiopian-gold/10 via-warm-gold/10 to-deep-forest/10 py-16 lg:py-20">
        <div className="container mx-auto px-4 lg:px-6 text-center">
          <div className="flex items-center justify-center mb-6">
            <Gift className="h-12 w-12 text-ethiopian-gold mr-4" />
            <h1 className="text-4xl lg:text-5xl font-bold text-charcoal">
              Gift Collections
            </h1>
          </div>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto">
            Discover curated collections of meaningful gifts that connect hearts across distances. 
            From trending favorites to cultural treasures, find the perfect gift for every occasion.
          </p>
        </div>
      </div>

      {/* Collections Grid */}
      <div className="container mx-auto px-4 lg:px-6 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {collections.map((collection) => (
            <Card 
              key={collection.id} 
              className="group hover:shadow-xl transition-all duration-300 cursor-pointer"
              onClick={() => setSelectedCollection(selectedCollection === collection.id ? null : collection.id)}
            >
              <CardHeader className="pb-4">
                <div className={`w-16 h-16 ${collection.bgColor} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <collection.icon className={`h-8 w-8 ${collection.color}`} />
                </div>
                <CardTitle className="text-xl font-bold text-charcoal group-hover:text-ethiopian-gold transition-colors">
                  {collection.title}
                </CardTitle>
                <CardDescription className="text-gray-600">
                  {collection.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                {/* Product Preview */}
                {collection.products && collection.products.length > 0 && (
                  <div className="mb-6">
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {collection.products.slice(0, 4).map((product) => (
                        <div key={product.id} className="relative group/item">
                          <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                            {product.images && product.images.length > 0 ? (
                              <img 
                                src={product.images[0]} 
                                alt={product.name}
                                className="w-full h-full object-cover group-hover/item:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                <Package className="h-8 w-8 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="absolute inset-0 bg-black/0 group-hover/item:bg-black/10 transition-colors duration-300 rounded-lg" />
                        </div>
                      ))}
                    </div>
                    
                    {/* Sample Product Info */}
                    {collection.products.length > 0 && (
                      <div className="text-sm text-gray-600 mb-4">
                        <div className="font-medium truncate">{collection.products[0].name}</div>
                        <div className="flex items-center justify-between">
                          <span className="text-ethiopian-gold font-semibold">
                            {formatDualCurrency(collection.products[0].price).etb}
                          </span>
                          <div className="flex items-center">
                            <Star className="h-3 w-3 text-yellow-500 fill-current mr-1" />
                            <span>{collection.products[0].rating}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <Badge variant="secondary" className="text-xs">
                      {collection.products.length}+ items
                    </Badge>
                  </div>
                )}

                {/* Action Button */}
                <Link to={collection.route}>
                  <Button 
                    className="w-full bg-charcoal hover:bg-ethiopian-gold text-white group-hover:shadow-lg transition-all duration-300"
                  >
                    Explore Collection
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Call to Action */}
      <div className="bg-gradient-to-r from-deep-forest to-charcoal py-16">
        <div className="container mx-auto px-4 lg:px-6 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
            Can't Find What You're Looking For?
          </h2>
          <p className="text-xl text-gray-200 mb-8 max-w-2xl mx-auto">
            Create a custom gift order and let our artisans craft something special just for your loved one.
          </p>
          <Link to="/custom-orders">
            <Button size="lg" className="bg-ethiopian-gold hover:bg-warm-gold text-white font-semibold">
              Create Custom Order
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}