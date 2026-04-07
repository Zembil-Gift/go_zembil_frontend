import { apiService } from "./apiService";
import { productService } from "./productService";
import type { DiscountInfo } from "@/types/discount";

// Types for cart matching backend schema
export interface CartItem {
  id: number;
  cartId: number;
  productId: number;
  productSkuId?: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  isPackageItem?: boolean;
  packageId?: number;
  packageName?: string;
  packageGroupId?: string;
  requiredQuantity?: number;
  selectedAttributes?: Array<{
    id?: number;
    name: string;
    value: string;
  }>;
  // Product info that may come directly on the cart item
  productName?: string;
  productImage?: string;
  // Optional nested product details
  product?: {
    id: number;
    name: string;
    price:
      | {
          amount?: number;
          currencyCode?: string;
        }
      | string;
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
    stockQuantity?: number;
    activeDiscount?: DiscountInfo;
    giftWrappable?: boolean;
    giftWrapPrice?: number;
    giftWrapCustomerPrice?: number;
    giftWrapCurrencyCode?: string;
  };
  // Optional nested SKU details
  productSku?: {
    id: number;
    skuCode?: string; // Internal code for vendor management
    skuName: string; // Display name shown to customers
    stockQuantity?: number;
    price?: {
      amount?: number;
      currencyCode?: string;
    };
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

export interface CartPackageGroupItem {
  id: number;
  productId: number;
  productSkuId?: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  isPackageItem?: boolean;
}

export interface CartPackageGroup {
  packageId: number;
  packageName: string;
  packageGroupId: string;
  totalPrice: number;
  items: CartPackageGroupItem[];
}

export interface Cart {
  id: number;
  userId: number;
  sessionId?: string;
  currencyCode?: string;
  currency?: string;
  currencySymbol?: string;
  status: "ACTIVE" | "EXPIRED" | "CONVERTED_TO_ORDER" | "ABANDONED";
  expiresAt?: string;
  totalPrice: number;
  items: CartItem[];
  packageGroups?: CartPackageGroup[];
  totalValue: number;
  createdAt: string;
  updatedAt: string;
}

export interface AddToCartRequest {
  productId: number;
  productSkuId?: number;
  quantity: number;
  selectedAttributes?: Array<{
    id?: number;
    name: string;
    value: string;
  }>;
  attributes?: Array<{
    id?: number;
    name: string;
    value: string;
  }>;
}

export interface AddPackageToCartRequest {
  packageId: number;
  skuSelections: {
    packageItemId: number;
    productSkuId: number;
  }[];
}

export interface CartSummary {
  items: CartItem[];
  packageGroups: CartPackageGroup[];
  currency: string;
  totalPrice: number;
}

class CartService {
  /**
   * Get current user's cart with enriched product data
   * Returns both items and cart metadata including currency
   */
  async getCart(): Promise<CartSummary> {
    try {
      const response = await apiService.getRequest<Cart>(`/api/cart`);

      const items = response.items || [];
      const getProductPriceCurrencyCode = (
        item?: CartItem
      ): string | undefined => {
        const productPrice = item?.product?.price;
        if (productPrice && typeof productPrice !== "string") {
          return productPrice.currencyCode;
        }
        return undefined;
      };
      const itemCurrency =
        items.find((i) => i?.productSku?.price?.currencyCode)?.productSku?.price
          ?.currencyCode ||
        getProductPriceCurrencyCode(
          items.find((i) => !!getProductPriceCurrencyCode(i))
        );
      const cartCurrency =
        response.currencyCode || itemCurrency || response.currency || "ETB";
      const totalPrice = response.totalPrice || 0;

      // Enrich cart items with product details if not already present
      const enrichedItems = await Promise.all(
        items.map(async (item) => {
          // If product details already exist, return as is
          if (
            item.product?.name &&
            (item.product?.cover || item.product?.images?.length)
          ) {
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
                price: String(
                  product.price || product.productSku?.[0]?.price || 0
                ),
              },
            };
          } catch (error) {
            console.warn(`Failed to fetch product ${item.productId}:`, error);
            return item;
          }
        })
      );

      return {
        items: enrichedItems,
        packageGroups: response.packageGroups || [],
        currency: cartCurrency,
        totalPrice,
      };
    } catch (error: any) {
      // Return empty array if cart doesn't exist yet
      if (error.message?.includes("404")) {
        console.log("Cart not found (404), returning empty array");
        return { items: [], packageGroups: [], currency: "ETB", totalPrice: 0 };
      }
      throw error;
    }
  }

  /**
   * Add item to cart
   */
  async addToCart(data: AddToCartRequest): Promise<Cart> {
    try {
      return await apiService.postRequest<Cart>("/api/cart/items", data);
    } catch (error: any) {
      console.error("Failed to add to cart:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to add item to cart"
      );
    }
  }

  async addPackageToCart(data: AddPackageToCartRequest): Promise<Cart> {
    try {
      return await apiService.postRequest<Cart>("/api/cart/packages", data);
    } catch (error: any) {
      console.error("Failed to add package to cart:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to add package to cart"
      );
    }
  }

  /**
   * Update cart item quantity
   */
  async updateCartItem(itemId: number, quantity: number): Promise<Cart> {
    try {
      return await apiService.putRequest<Cart>(
        `/api/cart/items/${itemId}?qty=${quantity}`
      );
    } catch (error: any) {
      console.error("Failed to update cart item:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to update cart item"
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
      console.error("Failed to remove from cart:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to remove item from cart"
      );
    }
  }

  /**
   * Clear entire cart
   */
  async clearCart(): Promise<void> {
    try {
      await apiService.deleteRequest("/api/cart/clear");
    } catch (error: any) {
      console.error("Failed to clear cart:", error);
      throw new Error(
        error.response?.data?.message || error.message || "Failed to clear cart"
      );
    }
  }

  /**
   * Check if product has valid pricing
   */
  async checkPricing(productId: number): Promise<boolean> {
    try {
      return await apiService.getRequest<boolean>(
        `/api/cart/pricing/check/${productId}`
      );
    } catch (error: any) {
      console.error("Failed to check pricing:", error);
      return false;
    }
  }
}

// Export singleton instance
export const cartService = new CartService();
export default cartService;
