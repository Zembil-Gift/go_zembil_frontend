import { useEffect, useState } from 'react';
import api from '@/services/api';
import { Loader2 } from 'lucide-react';

interface AuthenticatedImageProps {
  src: string;
  alt: string;
  className?: string;
  onClick?: () => void;
}

/**
 * Convert any delivery image URL format to backend API endpoint
 * Handles:
 * - Full R2 URLs: https://product-image...r2.cloudflarestorage.com/deliveries/5/file.png
 * - Relative paths: /deliveries/5/file.png or deliveries/5/file.png
 * - API paths: /api/images/deliveries/files/5/file.png (pass through)
 */
function transformDeliveryImageUrl(src: string): string {
  if (!src) return src;
  
  // Already an API path - return as-is
  if (src.startsWith('/api/images/')) {
    return src;
  }
  
  // Full R2 URL - extract the path and convert to API endpoint
  if (src.includes('r2.cloudflarestorage.com') || src.includes('r2.dev')) {
    try {
      const url = new URL(src);
      const pathname = url.pathname; // e.g., /deliveries/5/file.png
      
      // Extract parts: deliveries/{assignmentId}/{filename} or deliveries/{assignmentId}/pickup/{filename}
      const match = pathname.match(/\/deliveries\/(\d+)\/(?:pickup\/)?([^/]+)$/);
      if (match) {
        const assignmentId = match[1];
        const filename = match[2];
        return `/api/images/deliveries/files/${assignmentId}/${filename}`;
      }
    } catch (e) {
      console.warn('Failed to parse R2 URL:', src);
    }
  }
  
  // Relative path starting with /deliveries/
  if (src.startsWith('/deliveries/')) {
    const match = src.match(/\/deliveries\/(\d+)\/(?:pickup\/)?([^/]+)$/);
    if (match) {
      const assignmentId = match[1];
      const filename = match[2];
      return `/api/images/deliveries/files/${assignmentId}/${filename}`;
    }
  }
  
  // Relative path without leading slash: deliveries/5/file.png
  if (src.startsWith('deliveries/')) {
    const match = src.match(/deliveries\/(\d+)\/(?:pickup\/)?([^/]+)$/);
    if (match) {
      const assignmentId = match[1];
      const filename = match[2];
      return `/api/images/deliveries/files/${assignmentId}/${filename}`;
    }
  }
  
  // Unknown format - return as-is and hope for the best
  console.warn('Unknown delivery image URL format:', src);
  return src;
}

/**
 * Component that displays images from authenticated endpoints
 * Fetches the image with auth headers and displays as blob URL
 */
export function AuthenticatedImage({ src, alt, className, onClick }: AuthenticatedImageProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;

    const fetchImage = async () => {
      try {
        setLoading(true);
        setError(false);

        // Transform URL to backend API endpoint
        const imageUrl = transformDeliveryImageUrl(src);

        // Fetch image with authentication
        const response = await api.get(imageUrl, {
          responseType: 'blob',
        });

        // Create blob URL
        objectUrl = URL.createObjectURL(response.data);
        setBlobUrl(objectUrl);
      } catch (err) {
        console.error('Failed to load authenticated image:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    if (src) {
      fetchImage();
    }

    // Cleanup blob URL on unmount
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [src]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !blobUrl) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
        <p className="text-sm text-gray-400">Failed to load image</p>
      </div>
    );
  }

  return (
    <img
      src={blobUrl}
      alt={alt}
      className={className}
      onClick={onClick}
    />
  );
}

/**
 * Hook to fetch and open authenticated images in a new window
 */
export function useAuthenticatedImageViewer() {
  const openImage = async (imageUrl: string) => {
    try {
      // Transform URL to backend API endpoint
      const transformedUrl = transformDeliveryImageUrl(imageUrl);

      // Fetch image with authentication
      const response = await api.get(transformedUrl, {
        responseType: 'blob',
      });

      // Create blob URL and open in new window
      const blobUrl = URL.createObjectURL(response.data);
      const newWindow = window.open();
      
      if (newWindow) {
        newWindow.document.write(
          `<html><head><title>Image Viewer</title></head><body style="margin:0;display:flex;align-items:center;justify-content:center;background:#000;"><img src="${blobUrl}" style="max-width:100%;max-height:100vh;object-fit:contain;" /></body></html>`
        );
        newWindow.document.close();
        
        // Clean up blob URL after window loads
        newWindow.addEventListener('load', () => {
          setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
        });
      }
    } catch (error) {
      console.error('Failed to open authenticated image:', error);
      alert('Failed to load image. Please try again.');
    }
  };

  return { openImage };
}
