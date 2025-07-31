// Mock data for independent client development
export const mockCategories = [
  {
    id: 1,
    name: "Occasions",
    slug: "occasions",
    description: "Gifts for special occasions",
    image: "/attached_assets/coffee_1752986974470.jpg",
    productCount: 25
  },
  {
    id: 2,
    name: "Traditional",
    slug: "traditional",
    description: "Traditional Ethiopian gifts",
    image: "/attached_assets/injera-kit_1752987009557.jpg",
    productCount: 18
  },
  {
    id: 3,
    name: "Food & Beverages",
    slug: "food-beverages",
    description: "Ethiopian food and drinks",
    image: "/attached_assets/coffee_1752986974470.jpg",
    productCount: 12
  },
  {
    id: 4,
    name: "Clothing & Accessories",
    slug: "clothing-accessories",
    description: "Traditional clothing and accessories",
    image: "/attached_assets/clothing_1752986983087.jpg",
    productCount: 15
  },
  {
    id: 5,
    name: "Home & Living",
    slug: "home-living",
    description: "Home decor and living items",
    image: "/attached_assets/holiday-basket_1752986968856.jpg",
    productCount: 20
  }
];

export const mockProducts = [
  {
    id: 1,
    name: "Ethiopian Coffee Gift Set",
    description: "Premium Ethiopian coffee beans with traditional brewing equipment",
    price: 29.99,
    originalPrice: 39.99,
    currency: "USD",
    image: "/attached_assets/coffee_1752986974470.jpg",
    images: [
      "/attached_assets/coffee_1752986974470.jpg",
      "/attached_assets/coffee_1752986974470.jpg"
    ],
    category: "Food & Beverages",
    categorySlug: "food-beverages",
    isTrending: true,
    isFeatured: true,
    rating: 4.8,
    reviewCount: 127,
    inStock: true,
    stockQuantity: 50,
    badges: ["Best Seller", "Ethiopian Made"],
    tags: ["coffee", "traditional", "gift"]
  },
  {
    id: 2,
    name: "Traditional Netela Scarf",
    description: "Handwoven Ethiopian cotton scarf with beautiful patterns",
    price: 24.99,
    originalPrice: 29.99,
    currency: "USD",
    image: "/attached_assets/netela-scarf_1752986953873.jpg",
    images: [
      "/attached_assets/netela-scarf_1752986953873.jpg"
    ],
    category: "Clothing & Accessories",
    categorySlug: "clothing-accessories",
    isTrending: true,
    isFeatured: true,
    rating: 4.6,
    reviewCount: 89,
    inStock: true,
    stockQuantity: 30,
    badges: ["Handmade", "Traditional"],
    tags: ["scarf", "traditional", "clothing"]
  },
  {
    id: 3,
    name: "Injera Making Kit",
    description: "Complete kit for making authentic Ethiopian injera at home",
    price: 34.99,
    originalPrice: 44.99,
    currency: "USD",
    image: "/attached_assets/injera-kit_1752987009557.jpg",
    images: [
      "/attached_assets/injera-kit_1752987009557.jpg"
    ],
    category: "Food & Beverages",
    categorySlug: "food-beverages",
    isTrending: true,
    isFeatured: false,
    rating: 4.7,
    reviewCount: 156,
    inStock: true,
    stockQuantity: 25,
    badges: ["Popular", "Authentic"],
    tags: ["injera", "cooking", "traditional"]
  },
  {
    id: 4,
    name: "Holiday Gift Basket",
    description: "Curated gift basket with Ethiopian treats and traditional items",
    price: 49.99,
    originalPrice: 59.99,
    currency: "USD",
    image: "/attached_assets/holiday-basket_1752986968856.jpg",
    images: [
      "/attached_assets/holiday-basket_1752986968856.jpg"
    ],
    category: "Occasions",
    categorySlug: "occasions",
    isTrending: false,
    isFeatured: true,
    rating: 4.9,
    reviewCount: 203,
    inStock: true,
    stockQuantity: 40,
    badges: ["Premium", "Gift Ready"],
    tags: ["basket", "gift", "holiday"]
  },
  {
    id: 5,
    name: "Traditional Clothing Set",
    description: "Authentic Ethiopian traditional clothing for special occasions",
    price: 79.99,
    originalPrice: 99.99,
    currency: "USD",
    image: "/attached_assets/clothing_1752986983087.jpg",
    images: [
      "/attached_assets/clothing_1752986983087.jpg"
    ],
    category: "Clothing & Accessories",
    categorySlug: "clothing-accessories",
    isTrending: true,
    isFeatured: false,
    rating: 4.5,
    reviewCount: 67,
    inStock: true,
    stockQuantity: 15,
    badges: ["Traditional", "Handmade"],
    tags: ["clothing", "traditional", "occasion"]
  },
  {
    id: 6,
    name: "Self-Care Gift Box",
    description: "Luxury self-care box with Ethiopian natural products",
    price: 39.99,
    originalPrice: 49.99,
    currency: "USD",
    image: "/attached_assets/self-care-box_1752986958376.jpg",
    images: [
      "/attached_assets/self-care-box_1752986958376.jpg"
    ],
    category: "Occasions",
    categorySlug: "occasions",
    isTrending: false,
    isFeatured: true,
    rating: 4.8,
    reviewCount: 142,
    inStock: true,
    stockQuantity: 35,
    badges: ["Luxury", "Natural"],
    tags: ["self-care", "natural", "gift"]
  },
  {
    id: 7,
    name: "Rose Chocolate Collection",
    description: "Premium Ethiopian rose-infused chocolates",
    price: 19.99,
    originalPrice: 24.99,
    currency: "USD",
    image: "/attached_assets/rose-choco_1752986936642.jpg",
    images: [
      "/attached_assets/rose-choco_1752986936642.jpg"
    ],
    category: "Food & Beverages",
    categorySlug: "food-beverages",
    isTrending: true,
    isFeatured: false,
    rating: 4.7,
    reviewCount: 98,
    inStock: true,
    stockQuantity: 60,
    badges: ["Premium", "Ethiopian Made"],
    tags: ["chocolate", "rose", "sweet"]
  },
  {
    id: 8,
    name: "Market Basket",
    description: "Handwoven traditional market basket",
    price: 29.99,
    originalPrice: 34.99,
    currency: "USD",
    image: "/attached_assets/market-basket_1752987016249.jpg",
    images: [
      "/attached_assets/market-basket_1752987016249.jpg"
    ],
    category: "Home & Living",
    categorySlug: "home-living",
    isTrending: false,
    isFeatured: true,
    rating: 4.6,
    reviewCount: 73,
    inStock: true,
    stockQuantity: 20,
    badges: ["Handmade", "Traditional"],
    tags: ["basket", "handmade", "home"]
  }
];

export const mockUser = {
  id: 1,
  name: "Demo User",
  email: "demo@example.com",
  avatar: "/attached_assets/image_1752569993059.png",
  isAuthenticated: true
};

export const mockOrders = [
  {
    id: "ORD-001",
    status: "delivered",
    total: 49.99,
    currency: "USD",
    createdAt: "2024-01-15T10:30:00Z",
    items: [mockProducts[3]]
  },
  {
    id: "ORD-002",
    status: "shipped",
    total: 79.99,
    currency: "USD",
    createdAt: "2024-01-10T14:20:00Z",
    items: [mockProducts[4]]
  }
]; 