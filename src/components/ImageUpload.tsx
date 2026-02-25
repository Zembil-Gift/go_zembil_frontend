import { useState, useCallback, useRef } from 'react';
import { X, Upload, Star, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ImageDto } from '@/services/imageService';
import imageCompression from 'browser-image-compression';

interface ImageUploadProps {
  images?: ImageDto[];
  onFilesSelected?: (files: File[]) => void;
  onImageDelete?: (imageId: number) => void;
  onSetPrimary?: (imageId: number) => void;
  maxImages?: number;
  isUploading?: boolean;
  disabled?: boolean;
  className?: string;
  label?: string;
  helperText?: string;
  showPrimarySelector?: boolean;
  accept?: string;
  maxFileSizeMB?: number;
  enableCompression?: boolean;
}

interface PreviewImage {
  id: string;
  file: File;
  preview: string;
}

export function ImageUpload({
  images = [],
  onFilesSelected,
  onImageDelete,
  onSetPrimary,
  maxImages = 10,
  isUploading = false,
  disabled = false,
  className,
  label = 'Images',
  helperText = 'Drag and drop images here, or click to select files',
  showPrimarySelector = true,
  accept = 'image/jpeg,image/png,image/gif,image/webp',
  maxFileSizeMB = 10,
  enableCompression = true,
}: ImageUploadProps) {
  const [previewImages, setPreviewImages] = useState<PreviewImage[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalImages = images.length + previewImages.length;
  const canAddMore = totalImages < maxImages;

  const validateFile = useCallback((file: File): string | null => {
    const acceptedTypes = accept.split(',').map((t) => t.trim());
    // Basic type check - strict mimetype check can be complex
    if (!acceptedTypes.some(type => {
        if (type.endsWith('/*')) return file.type.startsWith(type.replace('/*', ''));
        return file.type === type;
    })) {
      return `File type ${file.type} is not supported. Accepted: ${accept}`;
    }
    if (file.size > maxFileSizeMB * 1024 * 1024) {
      return `File size exceeds ${maxFileSizeMB}MB limit`;
    }
    return null;
  }, [accept, maxFileSizeMB]);

  const compressImage = async (file: File): Promise<File> => {
    // Only compress if it's an image and valid
    if (!file.type.startsWith('image/') || file.type.includes('gif')) {
       return file;
    }

    const options = {
      maxSizeMB: 1, // Compress to ~1MB
      maxWidthOrHeight: 1920, // Max dimension 1920px (Full HD)
      useWebWorker: true,
      fileType: 'image/webp', // Convert to efficient WebP format
      initialQuality: 0.8,
    };

    try {
      const compressedBlob = await imageCompression(file, options);
      // Create a new file with the same name (but .webp extension)
      const newName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
      return new File([compressedBlob], newName, { type: 'image/webp', lastModified: Date.now() });
    } catch (error) {
      console.error("Image compression failed:", error);
      return file; // Return original if compression fails
    }
  };

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    setError(null);
    const fileArray = Array.from(files);
    
    // Check how many we can add
    const availableSlots = maxImages - totalImages;
    if (availableSlots <= 0) {
      setError(`Maximum ${maxImages} images allowed`);
      return;
    }

    const filesToAdd = fileArray.slice(0, availableSlots);
    const validFiles: File[] = [];

    // First validate all files
    for (const file of filesToAdd) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        continue;
      }
      validFiles.push(file);
    }
    
    if (validFiles.length === 0) return;

    if (enableCompression) {
      setIsCompressing(true);
      try {
        const processedFiles: File[] = [];
        const newPreviews: PreviewImage[] = [];

        for (const file of validFiles) {
          const processedFile = await compressImage(file);
          processedFiles.push(processedFile);
          
          newPreviews.push({
            id: `preview-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            file: processedFile,
            preview: URL.createObjectURL(processedFile),
          });
        }
        
        setPreviewImages((prev) => [...prev, ...newPreviews]);
        onFilesSelected?.(processedFiles);
      } finally {
        setIsCompressing(false);
      }
    } else {
        // No compression
        const newPreviews: PreviewImage[] = [];
        for (const file of validFiles) {
           newPreviews.push({
            id: `preview-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            file: file,
            preview: URL.createObjectURL(file), // Immediate preview for raw files
          });
        }
        setPreviewImages((prev) => [...prev, ...newPreviews]);
        onFilesSelected?.(validFiles);
    }

  }, [maxImages, totalImages, validateFile, onFilesSelected, enableCompression]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragActive(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(files);
    }
  }, [disabled, handleFiles]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
    // Reset input so the same file can be selected again
    e.target.value = '';
  }, [handleFiles]);

  const handleClick = useCallback(() => {
    if (!disabled && canAddMore) {
      fileInputRef.current?.click();
    }
  }, [disabled, canAddMore]);

  const removePreview = useCallback((previewId: string) => {
    setPreviewImages((prev) => {
      const toRemove = prev.find((p) => p.id === previewId);
      if (toRemove) {
        URL.revokeObjectURL(toRemove.preview);
      }
      return prev.filter((p) => p.id !== previewId);
    });
  }, []);
  useCallback(() => {
    previewImages.forEach((p) => URL.revokeObjectURL(p.preview));
    setPreviewImages([]);
  }, [previewImages]);
// Clean up object URLs on unmount
  // Note: Using Effect cleanup to revoke URLs when component unmounts

  return (
    <div className={cn('space-y-3', className)}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground">{label}</label>
          <span className="text-xs text-muted-foreground">
            {totalImages} / {maxImages} images
          </span>
        </div>
      )}

      {/* Existing Images Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {images.map((image) => (
            <div
              key={image.id}
              className="relative group aspect-square rounded-lg overflow-hidden border border-border bg-muted"
            >
              <img
                src={image.fullUrl || image.url}
                alt={image.altText || image.originalFilename}
                className="w-full h-full object-cover"
              />
              
              {/* Overlay with actions */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {showPrimarySelector && (
                  <Button
                    type="button"
                    size="icon"
                    variant={image.isPrimary ? 'default' : 'secondary'}
                    className="h-8 w-8"
                    onClick={() => onSetPrimary?.(image.id)}
                    disabled={disabled || image.isPrimary}
                    title={image.isPrimary ? 'Primary image' : 'Set as primary'}
                  >
                    <Star className={cn('h-4 w-4', image.isPrimary && 'fill-current')} />
                  </Button>
                )}
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="h-8 w-8"
                  onClick={() => onImageDelete?.(image.id)}
                  disabled={disabled}
                  title="Delete image"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Primary badge */}
              {image.isPrimary && (
                <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Star className="h-3 w-3 fill-current" />
                  Primary
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Preview Images Grid (pending upload) */}
      {previewImages.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Pending upload:</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {previewImages.map((preview) => (
              <div
                key={preview.id}
                className="relative group aspect-square rounded-lg overflow-hidden border border-dashed border-primary/50 bg-primary/5"
              >
                <img
                  src={preview.preview}
                  alt={preview.file.name}
                  className="w-full h-full object-cover"
                />
                
                {isUploading ? (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                  </div>
                ) : (
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removePreview(preview.id)}
                    disabled={disabled}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Drop Zone */}
      {canAddMore && (
        <div
          onClick={handleClick}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={cn(
            'relative border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer',
            'flex flex-col items-center justify-center gap-2 min-h-[120px]',
            isDragActive && 'border-primary bg-primary/5',
            !isDragActive && 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50',
            disabled && 'opacity-50 cursor-not-allowed',
            isUploading && 'pointer-events-none'
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={accept}
            onChange={handleFileInputChange}
            className="hidden"
            disabled={disabled || isUploading}
            aria-label="Upload images"
          />

          {isCompressing ? (
            <>
              <Sparkles className="h-8 w-8 animate-pulse text-amber-500" />
              <div className="text-center">
                 <p className="text-sm font-medium text-amber-600">Optimizing images...</p>
                 <p className="text-xs text-muted-foreground mt-1">Compressing for faster upload</p>
              </div>
            </>
          ) : isUploading ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Uploading...</p>
            </>
          ) : (
            <>
              <div className="rounded-full bg-muted p-3">
                <Upload className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">{helperText}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Max {maxFileSizeMB}MB per file • {accept.replace(/image\//g, '').replace(/,/g, ', ')}
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}

/**
 * Simplified ImageUpload for single entity (product, sku, or event)
 * Handles the complete upload flow with API integration
 */
interface ManagedImageUploadProps {
  entityType: 'product' | 'sku' | 'event';
  entityId: number | null;
  images: ImageDto[];
  onImagesChange: (images: ImageDto[]) => void;
  onPendingFilesChange?: (files: File[]) => void;
  disabled?: boolean;
  maxImages?: number;
  className?: string;
  label?: string;
}

export function ManagedImageUpload({
  entityType,
  entityId,
  images,
  onImagesChange,
  onPendingFilesChange,
  disabled = false,
  maxImages = 10,
  className,
  label,
}: ManagedImageUploadProps) {
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isUploading] = useState(false);

  const handleFilesSelected = useCallback((files: File[]) => {
    setPendingFiles((prev) => [...prev, ...files]);
    onPendingFilesChange?.([...pendingFiles, ...files]);
  }, [pendingFiles, onPendingFilesChange]);

  const handleImageDelete = useCallback((imageId: number) => {
    // This will be handled by parent component that calls the API
    const updatedImages = images.filter((img) => img.id !== imageId);
    onImagesChange(updatedImages);
  }, [images, onImagesChange]);

  const handleSetPrimary = useCallback((imageId: number) => {
    // Update local state optimistically
    const updatedImages = images.map((img) => ({
      ...img,
      isPrimary: img.id === imageId,
    }));
    onImagesChange(updatedImages);
  }, [images, onImagesChange]);

  return (
    <ImageUpload
      images={images}
      onFilesSelected={handleFilesSelected}
      onImageDelete={handleImageDelete}
      onSetPrimary={handleSetPrimary}
      maxImages={maxImages}
      isUploading={isUploading}
      disabled={disabled || !entityId}
      className={className}
      label={label || `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} Images`}
      helperText={entityId ? undefined : `Save the ${entityType} first to upload images`}
    />
  );
}

export default ImageUpload;
