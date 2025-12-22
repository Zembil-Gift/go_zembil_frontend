import { ImageDto } from '@/services/imageService';

export function getProductImageUrl(
  images?: ImageDto[] | null,
  placeholder?: string
): string {
  if (images && images.length > 0) {
    const primaryImage = images.find(img => img.isPrimary);
    return getFullImageUrl(primaryImage?.url || images[0].url);
  }
  return placeholder || '';
}

export function getAllProductImages(images?: ImageDto[] | null): string[] {
  if (!images || images.length === 0) return [];
  return images
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(img => getFullImageUrl(img.url));
}

export function getEventImageUrl(
  images?: ImageDto[] | null,
  placeholder?: string
): string {
  return getProductImageUrl(images, placeholder);
}

export function getFullImageUrl(url: string): string {
  if (!url) return '';
  
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
  
  if (url.startsWith('http://') || url.startsWith('https://')) {
    const uploadsMatch = url.match(/\/uploads\/(products|skus|events)\/(\d+)\/([^\/]+)$/);
    if (uploadsMatch) {
      const [, category, entityId, filename] = uploadsMatch;
      return `${baseUrl}/api/images/${category}/files/${entityId}/${filename}`;
    }
    return url;
  }
  
  let fullPath = url;
  if (!url.startsWith('/')) {
    const parts = url.split('/');
    if (parts.length >= 3) {
      const [category, entityId] = parts;
      const filename = parts[parts.length - 1];
      fullPath = `/api/images/${category}/files/${entityId}/${filename}`;
    } else if (parts.length === 2) {
      const [category, filename] = parts;
      fullPath = `/api/images/${category}/files/${filename}`;
    } else {
      fullPath = `/api/images/products/files/${url}`;
    }
  } else {
    const uploadsMatch = url.match(/^\/uploads\/(products|skus|events)\/(\d+)\/([^\/]+)$/);
    if (uploadsMatch) {
      const [, category, entityId, filename] = uploadsMatch;
      fullPath = `/api/images/${category}/files/${entityId}/${filename}`;
    }
  }
  
  return `${baseUrl}${fullPath}`;
}

export function hasValidImage(images?: ImageDto[] | null): boolean {
  return images != null && images.length > 0;
}

export const getSkuImageUrl = getProductImageUrl;
