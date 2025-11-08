import { useState } from "react";
import { 
  Palette, Camera, Heart, Star, 
  Shirt, Wrench, Music, Sparkles, Gift, Crown, Coffee
} from "lucide-react";
import { Button } from "@/components/ui/button";
import GiftItemCard from "@/components/gift-card";
import ProtectedRoute from "@/components/protected-route";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

// Customizable gift products data (simplified for listing page)
const customizableGifts = [
  {
    id: "custom-portrait",
    name: "Butterfly",
    description: "Engraved butterfly with your name",
    image: "custom-gifts/engraved_1.jpeg",
    icon: Palette,
    color: "from-purple-500 to-pink-500",
    priceRange: "2,500 ETB",
    category: "art",
    recipient: ["for-her", "for-him", "for-couples"],
    rating: 4.9,
    reviews: 127,
    featured: true,
    deliveryTime: "2-3 weeks"
  },
  {
    id: "embroidery",
    name: "Hand-stitched Embroidery",
    description: "Beautiful hand-stitched designs on clothing and accessories",
    image: "custom-gifts/engraved_2.jpeg",
    icon: Shirt,
    color: "from-blue-500 to-cyan-500",
    priceRange: "1,500 ETB",
    category: "fashion",
    recipient: ["for-her", "for-him"],
    rating: 4.8,
    reviews: 89,
    featured: false,
    deliveryTime: "1-2 weeks"
  },
  {
    id: "wood-crafts",
    name: "Wood Crafts",
    description: "Handcrafted wooden items and decorative pieces",
    image: "custom-gifts/engraved_3.jpeg",
    icon: Wrench,
    color: "from-amber-600 to-orange-600",
    priceRange: "3,000 ETB",
    category: "home",
    recipient: ["for-him", "for-couples"],
    rating: 4.7,
    reviews: 156,
    featured: true,
    deliveryTime: "2-4 weeks"
  },
  {
    id: "custom-jewelry",
    name: "Custom Jewelry",
    description: "Personalized accessories and handcrafted jewelry",
    image: "custom-gifts/engraved_4.jpeg",
    icon: Star,
    color: "from-yellow-400 to-amber-500",
    priceRange: "5,000 ETB",
    category: "fashion",
    recipient: ["for-her"],
    rating: 4.9,
    reviews: 203,
    featured: true,
    deliveryTime: "2-3 weeks"
  },
  {
    id: "painted-ceramics",
    name: "Painted Ceramics",
    description: "Artistic pottery and ceramic pieces",
    image: "custom-gifts/engraved_5.jpeg",
    icon: Palette,
    color: "from-red-500 to-rose-500",
    priceRange: "2,000 ETB",
    category: "home",
    recipient: ["for-her", "for-couples"],
    rating: 4.6,
    reviews: 94,
    featured: false,
    deliveryTime: "3-4 weeks"
  },
  {
    id: "personalized-baskets",
    name: "Personalized Gift Baskets",
    description: "Custom gift baskets tailored to your recipient",
    image: "custom-gifts/engraved_6.jpeg",
    icon: Gift,
    color: "from-green-500 to-emerald-500",
    priceRange: "3,500 ETB",
    category: "gifts",
    recipient: ["for-her", "for-him", "for-couples"],
    rating: 4.8,
    reviews: 178,
    featured: true,
    deliveryTime: "1-2 weeks"
  },
  {
    id: "custom-songs",
    name: "Custom Songs",
    description: "Personalized music compositions",
    image: "custom-gifts/engraved_7.jpeg",
    icon: Music,
    color: "from-indigo-500 to-purple-500",
    priceRange: "4,000 ETB",
    category: "entertainment",
    recipient: ["for-her", "for-him", "for-couples"],
    rating: 5.0,
    reviews: 45,
    featured: false,
    deliveryTime: "2-3 weeks"
  },
  {
    id: "photo-albums",
    name: "Photo Albums",
    description: "Memory collections and custom photo books",
    image: "custom-gifts/engraved_8.jpeg",
    icon: Camera,
    color: "from-pink-400 to-rose-400",
    priceRange: "2,000 ETB",
    category: "gifts",
    recipient: ["for-her", "for-him", "for-couples"],
    rating: 4.7,
    reviews: 112,
    featured: false,
    deliveryTime: "1-2 weeks"
  },
  {
    id: "love-letters",
    name: "Love Letters",
    description: "Handwritten personalized messages",
    image: "custom-gifts/engraved_9.jpeg",
    icon: Heart,
    color: "from-red-400 to-pink-500",
    priceRange: "1,000 ETB",
    category: "gifts",
    recipient: ["for-her", "for-him", "for-couples"],
    rating: 4.9,
    reviews: 267,
    featured: true,
    deliveryTime: "1 week"
  },
  {
    id: "leather-goods",
    name: "Leather Goods",
    description: "Handcrafted leather accessories",
    image: "custom-gifts/engraved_10.jpeg",
    icon: Sparkles,
    color: "from-brown-600 to-amber-700",
    priceRange: "4,000 ETB",
    category: "fashion",
    recipient: ["for-him"],
    rating: 4.8,
    reviews: 134,
    featured: false,
    deliveryTime: "2-3 weeks"
  },
  {
    id: "traditional-crowns",
    name: "Traditional Crowns",
    description: "Cultural headpieces and traditional accessories",
    image: "custom-gifts/mug_1.jpeg",
    icon: Crown,
    color: "from-yellow-500 to-orange-500",
    priceRange: "6,000 ETB",
    category: "cultural",
    recipient: ["for-her", "for-him"],
    rating: 4.9,
    reviews: 78,
    featured: true,
    deliveryTime: "3-4 weeks"
  },
  {
    id: "coffee-accessories",
    name: "Coffee Accessories",
    description: "Brewing essentials and coffee-related gifts",
    image: "custom-gifts/mug_2.jpeg",
    icon: Coffee,
    color: "from-amber-700 to-brown-800",
    priceRange: "2,500 ETB",
    category: "home",
    recipient: ["for-him", "for-couples"],
    rating: 4.7,
    reviews: 189,
    featured: false,
    deliveryTime: "1-2 weeks"
  },
  {
    id: "coffee-accessories-2",
    name: "Coffee Accessories",
    description: "Brewing essentials and coffee-related gifts",
    image: "custom-gifts/mug_3.jpeg",
    icon: Coffee,
    color: "from-amber-700 to-brown-800",
    priceRange: "2,500 ETB",
    category: "home",
    recipient: ["for-him", "for-couples"],
    rating: 4.7,
    reviews: 189,
    featured: false,
    deliveryTime: "1-2 weeks"
  },
];

function CustomOrdersContent() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRecipient, setSelectedRecipient] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("featured");

  const handleProductSelect = (productId: string) => {
    navigate(`/custom-orders/${productId}`);
  };

  // Filter and sort products
  const filteredProducts = customizableGifts.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRecipient = selectedRecipient === "all" || product.recipient.includes(selectedRecipient);
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
    return matchesSearch && matchesRecipient && matchesCategory;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === "featured") {
      return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
    }
    if (sortBy === "rating") {
      return b.rating - a.rating;
    }
    if (sortBy === "reviews") {
      return b.reviews - a.reviews;
    }
    return 0;
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-left max-w-4xl"
          >
            <h1 className="font-gotham-bold text-eagle-green text-2xl sm:text-2xl lg:text-4xl mb-6 leading-tight">
              Custom Handmade Gifts
            </h1>
            <p className="font-gotham-light text-viridian-green text-lg opacity-95 leading-relaxed">
              Browse our collection of customizable gifts. Each piece is handcrafted by talented Ethiopian artists.
            </p>
          </motion.div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Shop For Quick Filters */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <span className="font-gotham-bold text-eagle-green text-lg">Shop For:</span>
            {["all", "for-her", "for-him", "for-couples", "for-friends", "for-family"].map((recipient) => (
              <Button
                key={recipient}
                variant={selectedRecipient === recipient ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedRecipient(recipient)}
                className={
                  selectedRecipient === recipient
                    ? "bg-eagle-green text-white"
                    : "border-eagle-green/30 text-eagle-green hover:bg-eagle-green/10"
                }
              >
                {recipient === "all" ? "All Gifts" : recipient.replace("for-", "For ").replace(/\b\w/g, l => l.toUpperCase())}
              </Button>
            ))}
          </div>
        </motion.section>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
          {sortedProducts.map((product, index) => {
            // Transform custom product data to match GiftItemCard format
            const productForCard = {
              id: product.id,
              name: product.name,
              images: [`/${product.image}`],
              price: product.priceRange,
              originalPrice: null,
              discountLabel: null,
              isLiked: false,
            };

            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <GiftItemCard 
                  product={productForCard} 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleProductSelect(product.id);
                  }}
                />
              </motion.div>
            );
          })}
        </div>

        {sortedProducts.length === 0 && (
          <div className="text-center py-16">
            <p className="font-gotham-light text-eagle-green/70 text-lg mb-4">
              No gifts found matching your criteria.
            </p>
            <Button
              onClick={() => {
                setSearchQuery("");
                setSelectedRecipient("all");
                setSelectedCategory("all");
              }}
              className="bg-eagle-green hover:bg-viridian-green text-white"
            >
              Clear Filters
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

export default function CustomOrders() {
  return (
    <ProtectedRoute>
      <CustomOrdersContent />
    </ProtectedRoute>
  );
}
