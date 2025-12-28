import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface SkeletonImageProps {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  skeletonClassName?: string;
  fallbackSrc?: string;
  onLoad?: () => void;
  onError?: () => void;
}


export function SkeletonImage({
  src,
  alt,
  className,
  containerClassName,
  skeletonClassName,
  fallbackSrc = '/placeholder-product.jpg',
  onLoad,
  onError,
}: SkeletonImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoaded(true); // Show fallback immediately
    onError?.();
  }, [onError]);

  return (
    <div className={cn('relative overflow-hidden', containerClassName)}>
      {/* Skeleton loader - shown while image is loading */}
      {!isLoaded && (
        <div
          className={cn(
            'absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer',
            skeletonClassName
          )}
          style={{
            backgroundSize: '200% 100%',
          }}
        />
      )}
      
      {/* Actual image - hidden until loaded */}
      <img
        src={hasError ? fallbackSrc : src}
        alt={alt}
        className={cn(
          'transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0',
          className
        )}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
      />
    </div>
  );
}

/**
 * Product card image with skeleton loading
 * Optimized for product grid displays
 */
export function ProductCardImage({
  src,
  alt,
  className,
  aspectRatio = 'square',
}: {
  src: string;
  alt: string;
  className?: string;
  aspectRatio?: 'square' | 'video' | 'portrait';
}) {
  const aspectClasses = {
    square: 'aspect-square',
    video: 'aspect-video',
    portrait: 'aspect-[3/4]',
  };

  return (
    <SkeletonImage
      src={src}
      alt={alt}
      containerClassName={cn('w-full', aspectClasses[aspectRatio])}
      className={cn('w-full h-full object-cover', className)}
      skeletonClassName="rounded-t-lg"
    />
  );
}

export default SkeletonImage;
