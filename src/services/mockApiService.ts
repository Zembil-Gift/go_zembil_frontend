import { mockCategories, mockProducts, mockUser, mockOrders } from './mockData';

// Simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class MockApiService {
  // Categories
  static async getCategories() {
    await delay(300);
    return mockCategories;
  }

  static async getCategory(slug: string) {
    await delay(200);
    return mockCategories.find(cat => cat.slug === slug) || null;
  }

  // Products
  static async getProducts(params?: any) {
    await delay(400);
    let filteredProducts = [...mockProducts];

    if (params?.isTrending) {
      filteredProducts = filteredProducts.filter(p => p.isTrending);
    }

    if (params?.isFeatured) {
      filteredProducts = filteredProducts.filter(p => p.isFeatured);
    }

    if (params?.search) {
      filteredProducts = filteredProducts.filter(p => 
        p.name.toLowerCase().includes(params.search.toLowerCase()) ||
        p.description.toLowerCase().includes(params.search.toLowerCase())
      );
    }

    if (params?.category) {
      filteredProducts = filteredProducts.filter(p => p.categorySlug === params.category);
    }

    if (params?.recipient) {
      filteredProducts = filteredProducts.filter(p => 
        p.recipient && 
        Array.isArray(p.recipient) && 
        p.recipient.includes(params.recipient)
      );
    }

    if (params?.limit) {
      filteredProducts = filteredProducts.slice(0, params.limit);
    }

    return {
      products: filteredProducts,
      total: filteredProducts.length,
      page: 1,
      limit: params?.limit || filteredProducts.length
    };
  }

  static async getProduct(id: string | number) {
    await delay(200);
    const product = mockProducts.find(p => p.id === Number(id));
    return product || null;
  }

  static async getFeaturedProducts(limit: number = 4) {
    await delay(300);
    return mockProducts.filter(p => p.isFeatured).slice(0, limit);
  }

  static async getTrendingProducts(limit: number = 12) {
    await delay(300);
    return mockProducts.filter(p => p.isTrending).slice(0, limit);
  }

  static async getProductById(productId: number) {
    await delay(200);
    const product = mockProducts.find(p => p.id === productId);
    if (!product) {
      throw new Error('Product not found');
    }
    return product;
  }

  static async getProductReviews(productId: number) {
    await delay(200);
    // Mock reviews
    return [
      {
        id: 1,
        rating: 5,
        title: "Excellent quality",
        content: "This product exceeded my expectations. Highly recommended!",
        createdAt: "2024-01-15T10:30:00Z"
      },
      {
        id: 2,
        rating: 4,
        title: "Great gift",
        content: "Perfect for gifting. The recipient loved it!",
        createdAt: "2024-01-10T14:20:00Z"
      }
    ];
  }

  // Auth
  static async getCurrentUser() {
    await delay(200);
    return mockUser;
  }

  static async login() {
    await delay(500);
    return { success: true, user: mockUser };
  }

  static async logout() {
    await delay(200);
    return { success: true };
  }

  // Orders
  static async getOrders() {
    await delay(300);
    return mockOrders;
  }

  static async getOrder(id: string) {
    await delay(200);
    return mockOrders.find(order => order.id === id) || null;
  }

  static async createOrder(orderData: any) {
    await delay(500);
    return { 
      success: true, 
      orderId: 'ORD-' + Date.now(),
      message: 'Order created successfully' 
    };
  }

  static async getOrderById(orderId: string) {
    await delay(200);
    const order = mockOrders.find(o => o.id === orderId);
    if (!order) {
      throw new Error('Order not found');
    }
    return order;
  }

  // Search
  static async searchProducts(query: string) {
    await delay(300);
    const filteredProducts = mockProducts.filter(p => 
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.description.toLowerCase().includes(query.toLowerCase())
    );
    return {
      products: filteredProducts,
      total: filteredProducts.length,
      query
    };
  }

  static async postCustomOrder(orderData: any) {
    await delay(500);
    return { 
      success: true, 
      orderId: 'CUSTOM-' + Date.now(),
      message: 'Custom order submitted successfully' 
    };
  }

  // Cart (mock implementation)
  static async getCart() {
    await delay(200);
    return [];
  }

  static async addToCart(productId: number, quantity: number = 1) {
    await delay(300);
    return { success: true, message: 'Product added to cart' };
  }

  static async removeFromCart(productId: number) {
    await delay(200);
    return { success: true, message: 'Product removed from cart' };
  }

  // Wishlist (mock implementation)
  static async getWishlist() {
    await delay(200);
    return mockProducts.slice(0, 3); // Return first 3 products as wishlist
  }

  static async addToWishlist(productId: number) {
    await delay(300);
    return { success: true, message: 'Product added to wishlist' };
  }

  static async removeFromWishlist(productId: number) {
    await delay(200);
    return { success: true, message: 'Product removed from wishlist' };
  }
} 