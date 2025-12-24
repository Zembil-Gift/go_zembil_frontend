import { apiService } from './apiService';
import { productService } from './productService';

// Types for cart matching backend schema
export interface CartItem {
  id: number;
  cartId: number;
  productId: number;
  productSkuId?: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  // Product info that may come directly on the cart item
  productName?: string;
  productImage?: string;
  // Optional nested product details
  product?: {
    id: number;
    name: string;
    price: string;
    images?: Array<{
      id: number;
      url: string;
      fullUrl?: string;
      isPrimary: boolean;
      sortOrder: number;
    }>;
    cover?: string;
    imageUrl?: string;
    deliveryDays?: number;
  };
  // Optional nested SKU details
  productSku?: {
    id: number;
    skuCode: string;
    images?: Array<{
      id: number;
      url: string;
      fullUrl?: string;
      isPrimary: boolean;
      sortOrder: number;
    }>;
    attributes?: Array<{
      name: string;
      value: string;
    }>;
  };
}

export interface Cart {
  id: number;
  userId: number;
  sessionId?: string;
  currency: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CONVERTED_TO_ORDER' | 'ABANDONED';
  expiresAt?: string;
  totalPrice: number;
  items: CartItem[];
  totalValue: number;
  createdAt: string;
  updatedAt: string;
}

export interface AddToCartRequest {
  productId: number;
  productSkuId?: number;
  quantity: number;
}

class CartService {
  /**
   * Get current user's cart with enriched product data
   * Returns both items and cart metadata including currency
   */
  async getCart(currency: string = 'USD'): Promise<{ items: CartItem[]; currency: string; totalPrice: number }> {
    try {
      const response = await apiService.getRequest<Cart>(`/api/cart?currency=${currency}`);
      
      const items = response.items || [];
      const cartCurrency = response.currency || currency;
      const totalPrice = response.totalPrice || 0;
      
      // Enrich cart items with product details if not already present
      const enrichedItems = await Promise.all(
        items.map(async (item) => {
          // If product details already exist, return as is
          if (item.product?.name && (item.product?.cover || item.product?.images?.length)) {
            return item;
          }
          
          // Fetch product details
          try {
            const product = await productService.getProductById(item.productId);
            return {
              ...item,
              productName: product.name,
              productImage: product.cover || product.images?.[0]?.fullUrl,
              product: {
                id: product.id,
                name: product.name,
                cover: product.cover || product.images?.[0]?.fullUrl,
                images: product.images,
                price: String(product.price || product.productSku?.[0]?.price || 0),
              }
            };
          } catch (error) {
            console.warn(`Failed to fetch product ${item.productId}:`, error);
            return item;
          }
        })
      );
      
      return { items: enrichedItems, currency: cartCurrency, totalPrice };
    } catch (error: any) {
      // Return empty array if cart doesn't exist yet
      if (error.message?.includes('404')) {
        console.log('Cart not found (404), returning empty array');
        return { items: [], currency: currency, totalPrice: 0 };
      }
      throw error;
    }
  }

  /**
   * Add item to cart
   */
  async addToCart(data: AddToCartRequest): Promise<Cart> {
    try {
      const response = await apiService.postRequest<Cart>('/api/cart/items', data);
      return response;
    } catch (error: any) {
      console.error('Failed to add to cart:', error);
      throw new Error(
        error.response?.data?.message || 
        error.message || 
        'Failed to add item to cart'
      );
    }
  }

  /**
   * Update cart item quantity
   */
  async updateCartItem(itemId: number, quantity: number): Promise<Cart> {
    try {
      const response = await apiService.putRequest<Cart>(`/api/cart/items/${itemId}?qty=${quantity}`);
      return response;
    } catch (error: any) {
      console.error('Failed to update cart item:', error);
      throw new Error(
        error.response?.data?.message || 
        error.message || 
        'Failed to update cart item'
      );
    }
  }

  /**
   * Remove item from cart
   */
  async removeFromCart(itemId: number): Promise<void> {
    try {
      await apiService.deleteRequest(`/api/cart/items/${itemId}`);
    } catch (error: any) {
      console.error('Failed to remove from cart:', error);
      throw new Error(
        error.response?.data?.message || 
        error.message || 
        'Failed to remove item from cart'
      );
    }
  }

  /**
   * Clear entire cart
   */
  async clearCart(): Promise<void> {
    try {
      await apiService.deleteRequest('/api/cart/clear');
    } catch (error: any) {
      console.error('Failed to clear cart:', error);
      throw new Error(
        error.response?.data?.message || 
        error.message || 
        'Failed to clear cart'
      );
    }
  }

  /**
   * Check if product has valid pricing
   */
  async checkPricing(productId: number, currency: string = 'USD'): Promise<boolean> {
    try {
      const response = await apiService.getRequest<boolean>(`/api/cart/pricing/check/${productId}?currency=${currency}`);
      return response;
    } catch (error: any) {
      console.error('Failed to check pricing:', error);
      return false;
    }
  }
}

// Export singleton instance
export const cartService = new CartService();
export default cartService;
