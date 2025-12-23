import { ImageDto } from '@/services/imageService';

// Base image type with required fields for image utilities
export interface BaseImage {
  id: number;
  url: string;
  fullUrl: string;
  isPrimary: boolean;
  sortOrder: number;
}

// Type that accepts any object with the required image fields
type ImageLike = BaseImage | ImageDto | (BaseImage & Record<string, unknown>);

export function getProductImageUrl(
  images?: ImageLike[] | null,
  placeholder?: string
): string {
  if (images && images.length > 0) {
    const primaryImage = images.find(img => img.isPrimary);
    const image = primaryImage || images[0];
    return image.fullUrl;
  }
  return placeholder || '';
}

export function getAllProductImages(images?: ImageLike[] | null): string[] {
  if (images && images.length > 0) {
    return images
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(img => img.fullUrl);
  }
  return [];
}

export function getEventImageUrl(
  images?: ImageLike[] | null,
  placeholder?: string
): string {
  return getProductImageUrl(images, placeholder);
}

export function hasValidImage(images?: ImageLike[] | null): boolean {
  return images != null && images.length > 0;
}

export const getSkuImageUrl = getProductImageUrl;

// Re-export for backward compatibility
export type SimpleImage = BaseImage;
