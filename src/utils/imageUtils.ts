import { ImageDto } from '@/services/imageService';

// Base image type with required fields for image utilities
export interface BaseImage {
  id: number;
  url: string;
  fullUrl?: string;
  isPrimary?: boolean;
  sortOrder: number;
}

// Type that accepts any object with the required image fields
// ImageDto already has all required fields, so we can use it directly
type ImageLike = BaseImage | ImageDto;

export function getProductImageUrl(
  images?: ImageLike[] | null,
  placeholder?: string
): string {
  if (images && images.length > 0) {
    const primaryImage = images.find(img => img.isPrimary);
    const image = primaryImage || images[0];
    return image.fullUrl || image.url || placeholder || '';
  }
  return placeholder || '';
}

export function getAllProductImages(images?: ImageLike[] | null): string[] {
  if (images && images.length > 0) {
    return images
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(img => img.fullUrl || img.url)
      .filter((url): url is string => !!url);
  }
  return [];
}

export function getEventImageUrl(
  images?: ImageLike[] | null,
  placeholder?: string
): string {
  return getProductImageUrl(images, placeholder);
}

export function getServiceImageUrl(
  images?: ImageLike[] | null,
  placeholder?: string
): string {
  return getProductImageUrl(images, placeholder);
}

export function hasValidImage(images?: ImageLike[] | null): boolean {
  return images != null && images.length > 0;
}

export const getSkuImageUrl = getProductImageUrl;

// Get template image URL (custom order templates)
export function getTemplateImageUrl(
  images?: ImageLike[] | null,
  placeholder?: string
): string {
  return getProductImageUrl(images, placeholder);
}

export function getAllTemplateImages(images?: ImageLike[] | null): string[] {
  return getAllProductImages(images);
}

// Re-export for backward compatibility
export type SimpleImage = BaseImage;
