import { apiService } from './apiService';

export interface WishlistItem {
  id: number;
  productId: number;
  product?: {
    id: number;
    name: string;
    description: string;
    price: number;
    priceUSD: number;
    imageUrl: string;
    stockQuantity: number;
    isActive: boolean;
  };
  createdAt: string;
}

export interface Wishlist {
  id: number;
  userId: number;
  items: WishlistItem[];
  totalItems: number;
  createdAt: string;
  updatedAt: string;
}

class WishlistService {
  /**
   * Get current user's wishlist
   */
  async getWishlist(): Promise<WishlistItem[]> {
    try {
      const response = await apiService.getRequest<Wishlist>('/api/wishlist');
      return response.items || [];
    } catch (error: any) {
      console.error('Failed to get wishlist:', error);
      // Return empty array if wishlist doesn't exist yet
      if (error.message?.includes('404')) {
        return [];
      }
      throw error;
    }
  }

  /**
   * Add item to wishlist
   */
  async addToWishlist(productId: number): Promise<WishlistItem> {
    try {
      const response = await apiService.postRequest<WishlistItem>('/api/wishlist/items', { productId });
      return response;
    } catch (error: any) {
      console.error('Failed to add to wishlist:', error);
      throw new Error(
        error.response?.data?.message || 
        error.message || 
        'Failed to add item to wishlist'
      );
    }
  }

  /**
   * Remove item from wishlist
   */
  async removeFromWishlist(itemId: number): Promise<void> {
    try {
      await apiService.deleteRequest(`/api/wishlist/items/${itemId}`);
    } catch (error: any) {
      console.error('Failed to remove from wishlist:', error);
      throw new Error(
        error.response?.data?.message || 
        error.message || 
        'Failed to remove item from wishlist'
      );
    }
  }

  /**
   * Remove product from wishlist by product ID
   */
  async removeProductFromWishlist(productId: number): Promise<void> {
    try {
      await apiService.deleteRequest(`/api/wishlist/products/${productId}`);
    } catch (error: any) {
      console.error('Failed to remove product from wishlist:', error);
      throw new Error(
        error.response?.data?.message || 
        error.message || 
        'Failed to remove product from wishlist'
      );
    }
  }

  /**
   * Check if product is in wishlist
   */
  async isInWishlist(productId: number): Promise<boolean> {
    try {
      const response = await apiService.getRequest<{ inWishlist: boolean }>(`/api/wishlist/check/${productId}`);
      return response.inWishlist;
    } catch (error: any) {
      console.error('Failed to check wishlist:', error);
      return false;
    }
  }

  /**
   * Clear entire wishlist
   */
  async clearWishlist(): Promise<void> {
    try {
      await apiService.deleteRequest('/api/wishlist');
    } catch (error: any) {
      console.error('Failed to clear wishlist:', error);
      throw new Error(
        error.response?.data?.message || 
        error.message || 
        'Failed to clear wishlist'
      );
    }
  }
}

// Export singleton instance
export const wishlistService = new WishlistService();
export default wishlistService;
