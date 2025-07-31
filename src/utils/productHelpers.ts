export interface ProductBadge {
  type: 'bestseller' | 'new' | 'trending' | 'discount' | null;
  label: string;
  variant: 'bestseller' | 'new' | 'trending' | 'discount';
}

/**
 * Get the primary badge for a product based on priority:
 * Bestseller > New > Trending > Discount
 */
export function getPrimaryBadge(product: any): ProductBadge | null {
  const price = parseFloat(product.price);
  const originalPrice = product.originalPrice ? parseFloat(product.originalPrice) : null;
  const discount = originalPrice ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;

  // Priority 1: Bestseller
  if (product.isBestSeller) {
    return {
      type: 'bestseller',
      label: 'Bestseller',
      variant: 'bestseller'
    };
  }

  // Priority 2: New
  if (product.isNewArrival) {
    return {
      type: 'new',
      label: 'New',
      variant: 'new'
    };
  }

  // Priority 3: Trending
  if (product.isTrending) {
    return {
      type: 'trending',
      label: 'Trending',
      variant: 'trending'
    };
  }

  // Priority 4: Discount
  if (originalPrice && discount > 0) {
    return {
      type: 'discount',
      label: `${discount}% Off`,
      variant: 'discount'
    };
  }

  return null;
}