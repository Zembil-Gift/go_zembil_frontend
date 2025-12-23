import {apiService} from './apiService';

export interface WishListItemDto {
  id: number;
  productId: number;
  productName: string;
  productSkuId?: number;
  skuCode?: string;
  price: number;
  currency: string;
  available: boolean;
  availabilityMessage?: string;
  snapshotPrice?: number;
  priceChanged: boolean;
  notes?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNASSIGNED';
  addedAt: string;
  imageUrl?: string;
  productImages?: Array<{
    id: number;
    url: string;
    fullUrl: string;
    isPrimary: boolean;
    sortOrder: number;
  }>;
  productSku?: {
    id: number;
    skuCode: string;
    images?: Array<{
      id: number;
      url: string;
      fullUrl: string;
      isPrimary: boolean;
      sortOrder: number;
    }>;
    attributes?: Array<{
      name: string;
      value: string;
    }>;
  };
}

export interface PagedWishListResponse {
  page: number;
  size: number;
  totalPages: number;
  totalElements: number;
  items: WishListItemDto[];
}

export interface CreateWishListItemRequest {
  productId: number;
  productSkuId?: number;
  notes?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNASSIGNED';
}

export interface UpdateWishListItemRequest {
  notes?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNASSIGNED';
}

export interface MoveToCartRequest {
  wishListItemId: number;
  quantity?: number;
}

export interface MoveToCartResponse {
  cartItemId: number;
  cart?: any;
  message?: string;
}

export interface BatchMoveToCartRequest {
  wishListItemIds: number[];
}

export interface BatchMoveToCartResponse {
  successCount: number;
  failureCount: number;
  results: Array<{
    wishListItemId: number;
    success: boolean;
    cartItemId?: number;
    error?: string;
  }>;
}

export interface BatchDeleteRequest {
  wishListItemIds: number[];
}

export interface BatchDeleteResponse {
  successCount: number;
  failureCount: number;
  results: Array<{
    wishListItemId: number;
    success: boolean;
    error?: string;
  }>;
}

export interface SaveForLaterRequest {
  cartItemId: number;
  notes?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNASSIGNED';
}

export interface SaveForLaterResponse {
  wishListItemId: number;
  updatedCart?: any;
}

// Legacy interface for backwards compatibility
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

class WishlistService {
  private baseUrl = '/api/wish-list';

  async getWishlist(options?: {
    page?: number;
    size?: number;
    sort?: string;
    q?: string;
    availableOnly?: boolean;
  }): Promise<PagedWishListResponse> {
    try {
      const params = new URLSearchParams();
      if (options?.page !== undefined) params.append('page', options.page.toString());
      if (options?.size !== undefined) params.append('size', options.size.toString());
      if (options?.sort) params.append('sort', options.sort);
      if (options?.q) params.append('q', options.q);
      if (options?.availableOnly !== undefined) params.append('availableOnly', options.availableOnly.toString());

      const queryString = params.toString();
      const url = queryString ? `${this.baseUrl}?${queryString}` : this.baseUrl;
      
      const response = await apiService.getRequest<PagedWishListResponse>(url);
      return response;
    } catch (error: any) {
      console.error('Failed to get wishlist:', error);
      // Return empty response if wishlist doesn't exist yet
      if (error.message?.includes('404') || error.status === 404) {
        return {
          page: 0,
          size: 20,
          totalPages: 0,
          totalElements: 0,
          items: []
        };
      }
      throw error;
    }
  }

  /**
   * Get a single wishlist item by ID
   */
  async getWishlistItem(itemId: number): Promise<WishListItemDto> {
    try {
      return await apiService.getRequest<WishListItemDto>(`${this.baseUrl}/items/${itemId}`);
    } catch (error: any) {
      console.error('Failed to get wishlist item:', error);
      throw new Error(
        error.response?.data?.message || 
        error.message || 
        'Failed to get wishlist item'
      );
    }
  }

  /**
   * Add item to wishlist directly
   */
  async addToWishlist(request: CreateWishListItemRequest): Promise<WishListItemDto> {
    try {
      return await apiService.postRequest<WishListItemDto>(this.baseUrl, request);
    } catch (error: any) {
      console.error('Failed to add to wishlist:', error);
      // Check for 409 conflict (item already exists)
      if (error.status === 409 || error.response?.status === 409) {
        throw { status: 409, message: 'Item already in wishlist' };
      }
      throw new Error(
        error.response?.data?.message || 
        error.message || 
        'Failed to add item to wishlist'
      );
    }
  }

  /**
   * Update wishlist item (notes, priority)
   */
  async updateWishlistItem(itemId: number, request: UpdateWishListItemRequest): Promise<WishListItemDto> {
    try {
      const response = await apiService.putRequest<WishListItemDto>(`${this.baseUrl}/items/${itemId}`, request);
      return response;
    } catch (error: any) {
      console.error('Failed to update wishlist item:', error);
      throw new Error(
        error.response?.data?.message || 
        error.message || 
        'Failed to update wishlist item'
      );
    }
  }

  /**
   * Remove item from wishlist by wishlist item ID
   */
  async removeFromWishlist(itemId: number): Promise<void> {
    try {
      await apiService.deleteRequest(`${this.baseUrl}/items/${itemId}`);
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
   * This finds the wishlist item with the given productId and removes it
   */
  async removeProductFromWishlist(productId: number): Promise<void> {
    try {
      // First, get the wishlist to find the item with this product
      const wishlist = await this.getWishlist();
      const item = wishlist.items.find(i => i.productId === productId);
      
      if (!item) {
        throw new Error('Product not found in wishlist');
      }
      
      await this.removeFromWishlist(item.id);
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
   * Move wishlist item to cart
   */
  async moveToCart(request: MoveToCartRequest): Promise<MoveToCartResponse> {
    try {
      const response = await apiService.postRequest<MoveToCartResponse>(`${this.baseUrl}/move-to-cart`, request);
      return response;
    } catch (error: any) {
      console.error('Failed to move to cart:', error);
      throw new Error(
        error.response?.data?.message || 
        error.message || 
        'Failed to move item to cart'
      );
    }
  }

  /**
   * Batch move multiple wishlist items to cart
   */
  async batchMoveToCart(request: BatchMoveToCartRequest): Promise<BatchMoveToCartResponse> {
    try {
      const response = await apiService.postRequest<BatchMoveToCartResponse>(`${this.baseUrl}/batch/move-to-cart`, request);
      return response;
    } catch (error: any) {
      console.error('Failed to batch move to cart:', error);
      throw new Error(
        error.response?.data?.message || 
        error.message || 
        'Failed to move items to cart'
      );
    }
  }

  /**
   * Batch delete multiple wishlist items
   */
  async batchDelete(request: BatchDeleteRequest): Promise<BatchDeleteResponse> {
    try {
      const response = await apiService.deleteRequest<BatchDeleteResponse>(`${this.baseUrl}/batch`, request);
      return response;
    } catch (error: any) {
      console.error('Failed to batch delete:', error);
      throw new Error(
        error.response?.data?.message || 
        error.message || 
        'Failed to delete items from wishlist'
      );
    }
  }

  /**
   * Clear entire wishlist
   */
  async clearWishlist(): Promise<void> {
    try {
      await apiService.deleteRequest(`${this.baseUrl}/clear`);
    } catch (error: any) {
      console.error('Failed to clear wishlist:', error);
      throw new Error(
        error.response?.data?.message || 
        error.message || 
        'Failed to clear wishlist'
      );
    }
  }

  /**
   * Save cart item for later (move from cart to wishlist)
   * Uses the backend's dedicated save-for-later endpoint
   */
  async saveForLater(request: SaveForLaterRequest): Promise<SaveForLaterResponse> {
    try {
      const response = await apiService.postRequest<SaveForLaterResponse>(`${this.baseUrl}/save-for-later`, request);
      return response;
    } catch (error: any) {
      console.error('Failed to save for later:', error);
      throw new Error(
        error.response?.data?.message || 
        error.message || 
        'Failed to save item for later'
      );
    }
  }

  /**
   * Check if product is in wishlist
   */
  async isInWishlist(productId: number): Promise<boolean> {
    try {
      const wishlist = await this.getWishlist();
      return wishlist.items.some(item => item.productId === productId);
    } catch (error: any) {
      console.error('Failed to check wishlist:', error);
      return false;
    }
  }
}

// Export singleton instance
export const wishlistService = new WishlistService();
export default wishlistService;
