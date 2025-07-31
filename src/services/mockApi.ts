// Mock API service for client-side development
import { products, categories, users } from "@shared/schema";

// Mock data
const mockProducts = [
  {
    id: 1,
    name: "Ethiopian Coffee Gift Set",
    description: "Premium Ethiopian coffee beans with traditional brewing equipment",
    price: 29.99,
    image: "/attached_assets/coffee_1752986974470.jpg",
    categoryId: 1,
    isTrending: true,
    isBestSeller: true,
    isNewArrival: false,
    rating: 4.8,
    stock: 50
  },
  {
    id: 2,
    name: "Traditional Ethiopian Scarf",
    description: "Handwoven cotton scarf with traditional Ethiopian patterns",
    price: 24.99,
    image: "/attached_assets/netela-scarf_1752986953873.jpg",
    categoryId: 2,
    isTrending: false,
    isBestSeller: true,
    isNewArrival: true,
    rating: 4.6,
    stock: 30
  },
  {
    id: 3,
    name: "Holiday Gift Basket",
    description: "Curated basket with Ethiopian spices, coffee, and traditional items",
    price: 49.99,
    image: "/attached_assets/holiday-basket_1752986968856.jpg",
    categoryId: 3,
    isTrending: true,
    isBestSeller: false,
    isNewArrival: true,
    rating: 4.9,
    stock: 20
  },
  {
    id: 4,
    name: "Self-Care Wellness Box",
    description: "Relaxation kit with Ethiopian herbs and natural products",
    price: 39.99,
    image: "/attached_assets/self-care-box_1752986958376.jpg",
    categoryId: 4,
    isTrending: false,
    isBestSeller: true,
    isNewArrival: false,
    rating: 4.7,
    stock: 25
  }
];

const mockCategories = [
  { id: 1, name: "Coffee & Beverages", slug: "coffee-beverages", parentId: null },
  { id: 2, name: "Clothing & Accessories", slug: "clothing-accessories", parentId: null },
  { id: 3, name: "Gift Baskets", slug: "gift-baskets", parentId: null },
  { id: 4, name: "Wellness & Self-Care", slug: "wellness-self-care", parentId: null }
];

// Mock API functions
export const mockApi = {
  // Products
  getProducts: async (params?: any) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    let filteredProducts = [...mockProducts];
    
    // Apply filters
    if (params?.search) {
      filteredProducts = filteredProducts.filter(product =>
        product.name.toLowerCase().includes(params.search.toLowerCase()) ||
        product.description.toLowerCase().includes(params.search.toLowerCase())
      );
    }
    
    if (params?.category) {
      filteredProducts = filteredProducts.filter(product =>
        product.categoryId === parseInt(params.category)
      );
    }
    
    if (params?.isTrending === 'true') {
      filteredProducts = filteredProducts.filter(product => product.isTrending);
    }
    
    if (params?.isBestSeller === 'true') {
      filteredProducts = filteredProducts.filter(product => product.isBestSeller);
    }
    
    if (params?.isNewArrival === 'true') {
      filteredProducts = filteredProducts.filter(product => product.isNewArrival);
    }
    
    // Apply sorting
    if (params?.sortBy === 'price-low') {
      filteredProducts.sort((a, b) => a.price - b.price);
    } else if (params?.sortBy === 'price-high') {
      filteredProducts.sort((a, b) => b.price - a.price);
    } else if (params?.sortBy === 'popular') {
      filteredProducts.sort((a, b) => b.rating - a.rating);
    }
    
    return {
      data: filteredProducts,
      total: filteredProducts.length,
      page: parseInt(params?.page) || 1,
      limit: parseInt(params?.limit) || 20
    };
  },
  
  getProduct: async (id: number) => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const product = mockProducts.find(p => p.id === id);
    if (!product) throw new Error('Product not found');
    return product;
  },
  
  // Categories
  getCategories: async () => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockCategories;
  },
  
  // Cart (localStorage based)
  getCart: async () => {
    const cart = localStorage.getItem('cart');
    return cart ? JSON.parse(cart) : [];
  },
  
  addToCart: async (productId: number, quantity: number = 1) => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existingItem = cart.find((item: any) => item.productId === productId);
    
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      const product = mockProducts.find(p => p.id === productId);
      if (product) {
        cart.push({
          productId,
          quantity,
          product: {
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image
          }
        });
      }
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    return cart;
  },
  
  // Wishlist (localStorage based)
  getWishlist: async () => {
    const wishlist = localStorage.getItem('wishlist');
    return wishlist ? JSON.parse(wishlist) : [];
  },
  
  addToWishlist: async (productId: number) => {
    const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
    if (!wishlist.includes(productId)) {
      wishlist.push(productId);
      localStorage.setItem('wishlist', JSON.stringify(wishlist));
    }
    return wishlist;
  },
  
  removeFromWishlist: async (productId: number) => {
    const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
    const updatedWishlist = wishlist.filter((id: number) => id !== productId);
    localStorage.setItem('wishlist', JSON.stringify(updatedWishlist));
    return updatedWishlist;
  }
}; 