import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft,
  Package,
  FileText,
  Hash,
  Image as ImageIcon,
  Video,
  Upload,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  Store,
  ChevronLeft,
  ChevronRight,
  Tag,
  CheckCircle2,
  XCircle
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/protected-route';
import { DiscountBadge } from '@/components/DiscountBadge';
import { PriceWithDiscount } from '@/components/PriceWithDiscount';

import { customOrderTemplateService } from '@/services/customOrderTemplateService';
import { customOrderService } from '@/services/customOrderService';
import { imageService } from '@/services/imageService';
import { discountService, type DiscountValidationResult } from '@/services/discountService';
import { formatPrice, getDiscountAmountForDisplay } from '@/lib/currency';
import type { CustomOrderTemplateField, CreateCustomOrderRequest } from '@/types/customOrders';
import { getAllTemplateImages } from '@/utils/imageUtils';
import imageCompression from 'browser-image-compression';

// Field type icon mapping
const getFieldTypeIcon = (fieldType: string) => {
  switch (fieldType) {
    case 'TEXT':
      return FileText;
    case 'NUMBER':
      return Hash;
    case 'IMAGE':
      return ImageIcon;
    case 'VIDEO':
      return Video;
    default:
      return FileText;
  }
};

interface FieldValue {
  fieldId: number;
  textValue?: string;
  numberValue?: number;
  fileUrl?: string;
  originalFilename?: string;
  previewUrl?: string; // Local preview URL before upload
}

function CreateCustomOrderContent() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated, user, isInitialized } = useAuth();
  const queryClient = useQueryClient();
  
  const templateIdNum = templateId ? parseInt(templateId) : 0;
  
  // Get user's preferred currency
  const fallbackCurrency = isAuthenticated ? 'ETB' : 'USD';
  const preferredCurrency = user?.preferredCurrencyCode || fallbackCurrency;
  
  const [fieldValues, setFieldValues] = useState<{ [fieldId: number]: FieldValue }>({});
  const [additionalDescription, setAdditionalDescription] = useState('');
  const [uploadingFields, setUploadingFields] = useState<{ [fieldId: number]: boolean }>({});
  const [errors, setErrors] = useState<{ [fieldId: number]: string }>({});
  const [discountCode, setDiscountCode] = useState('');
  const [discountResult, setDiscountResult] = useState<DiscountValidationResult | null>(null);
  const [isValidatingDiscount, setIsValidatingDiscount] = useState(false);
  const [discountError, setDiscountError] = useState<string | null>(null);
  
  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Fetch template details (wait for auth so currency is correct)
  const { data: template, isLoading } = useQuery({
    queryKey: ['custom-order-template', templateIdNum, user?.preferredCurrencyCode ?? 'default'],
    queryFn: () => customOrderTemplateService.getById(templateIdNum),
    enabled: templateIdNum > 0 && isInitialized,
  });

  const templateImages = useMemo(() => 
    template ? getAllTemplateImages(template.images) : [], 
    [template]
  );

  const nextImage = () => {
    if (templateImages.length === 0) return;
    setSelectedImageIndex((prev) => (prev + 1) % templateImages.length);
  };

  const prevImage = () => {
    if (templateImages.length === 0) return;
    setSelectedImageIndex((prev) => (prev - 1 + templateImages.length) % templateImages.length);
  };

  const openLightbox = (index: number) => {
    setSelectedImageIndex(index);
    setLightboxOpen(true);
  };

  const sortedFields = useMemo(() => 
    template?.fields ? customOrderTemplateService.sortFieldsBySortOrder(template.fields) : [],
    [template?.fields]
  );

  // Calculate the manually-validated discount amount in display (major) units
  const manualDiscountAmountDisplay = useMemo(() => {
    const targetCurrency = template?.price?.currencyCode || template?.currencyCode || preferredCurrency;
    return getDiscountAmountForDisplay(discountResult, targetCurrency);
  }, [discountResult, template?.price?.currencyCode, template?.currencyCode, preferredCurrency]);

  const handleApplyDiscount = useCallback(async () => {
    const code = discountCode.trim();
    if (!code) {
      setDiscountError("Please enter a discount code");
      return;
    }
    if (!template?.basePriceMinor) {
      setDiscountError("Template price not available");
      return;
    }

    setIsValidatingDiscount(true);
    setDiscountError(null);
    setDiscountResult(null);

    try {
      const result = await discountService.validateDiscountCode({
        discountCode: code,
        orderTotalMinor: template.basePriceMinor,
        customOrderTemplateIds: [templateIdNum],
      });

      if (result.applicable) {
        setDiscountResult(result);
        setDiscountError(null);
        toast({
          title: "Discount Applied",
          description: `Discount code "${code}" applied successfully!`,
        });
      } else {
        setDiscountResult(null);
        setDiscountError(result.reason || "Discount code is not valid for this order");
      }
    } catch (error: any) {
      setDiscountResult(null);
      setDiscountError(error?.message || "Failed to validate discount code");
    } finally {
      setIsValidatingDiscount(false);
    }
  }, [discountCode, template, templateIdNum, toast]);

  const handleRemoveDiscount = useCallback(() => {
    setDiscountResult(null);
    setDiscountError(null);
    setDiscountCode("");
  }, []);

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: (data: CreateCustomOrderRequest) => customOrderService.create(data),
    onSuccess: (order) => {
      // Invalidate relevant queries so lists refresh immediately
      queryClient.invalidateQueries({ queryKey: ['my-custom-orders'] });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'custom-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'custom-orders'] });
      
      const isNonNegotiable = template?.negotiable === false;
      
      if (isNonNegotiable) {
        toast({
          title: 'Order Created!',
          description: `Your order #${order.orderNumber} is ready for payment.`,
        });
        // For non-negotiable orders, redirect to order detail which will show payment options
        navigate(`/my-custom-orders/${order.id}?action=pay`);
      } else {
        toast({
          title: 'Order Submitted!',
          description: `Your custom order #${order.orderNumber} has been submitted successfully.`,
        });
        navigate(`/my-custom-orders/${order.id}`);
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Submission Failed',
        description: error.message || 'Failed to submit order. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Handle text/number field change
  const handleFieldChange = (field: CustomOrderTemplateField, value: string) => {
    const fieldValue: FieldValue = { fieldId: field.id };
    
    if (field.fieldType === 'NUMBER') {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        fieldValue.numberValue = numValue;
      }
    } else {
      fieldValue.textValue = value;
    }
    
    setFieldValues(prev => ({
      ...prev,
      [field.id]: fieldValue
    }));
    
    // Clear error
    if (errors[field.id]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field.id];
        return newErrors;
      });
    }
  };

  // Compress image before upload
  const compressImage = async (file: File): Promise<File> => {
    // Only compress if it's an image and not a GIF (GIFs lose animation)
    if (!file.type.startsWith('image/') || file.type.includes('gif')) {
      return file;
    }

    const options = {
      maxSizeMB: 1, // Compress to ~1MB
      maxWidthOrHeight: 1920, // Max dimension 1920px (Full HD)
      useWebWorker: true,
      fileType: 'image/webp' as const, // Convert to efficient WebP format
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

  // Handle file upload
  const handleFileUpload = async (field: CustomOrderTemplateField, file: File) => {
    // Validate file size BEFORE compression
    const maxSize = file.type.startsWith('video/') ? 50 * 1024 * 1024 : 10 * 1024 * 1024; // 50MB for video, 10MB for images
    if (file.size > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024);
      toast({
        title: 'File Too Large',
        description: `File size exceeds ${maxSizeMB}MB limit. Please choose a smaller file.`,
        variant: 'destructive',
      });
      return;
    }

    // Validate file type
    const isImage = field.fieldType === 'IMAGE';
    const isVideo = field.fieldType === 'VIDEO';
    
    if (isImage && !file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File Type',
        description: 'Please upload an image file (jpg, png, gif, or webp).',
        variant: 'destructive',
      });
      return;
    }
    
    if (isVideo && !file.type.startsWith('video/')) {
      toast({
        title: 'Invalid File Type',
        description: 'Please upload a video file (mp4, mov, avi, mkv, or webm).',
        variant: 'destructive',
      });
      return;
    }

    setUploadingFields(prev => ({ ...prev, [field.id]: true }));
    
    try {
      // Compress image if applicable
      let fileToUpload = file;
      if (isImage) {
        fileToUpload = await compressImage(file);
      }

      // Upload file to server using imageService
      const response = await imageService.uploadCustomOrderFile(fileToUpload);
      
      // The backend returns a path like "custom-orders/{userId}/{filename}"
      // We need to construct the proper backend proxy URL: /api/images/custom-orders/files/{userId}/{filename}
      // Parse the path to extract userId and filename
      const pathMatch = response.fileUrl.match(/custom-orders\/(\d+)\/(.+)$/);
      if (!pathMatch) {
        throw new Error('Invalid file path returned from server');
      }
      const userId = pathMatch[1];
      const filename = pathMatch[2];
      
      // Construct full URL using the API base URL
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
      const previewUrl = `${apiBaseUrl}/api/images/custom-orders/files/${userId}/${filename}`;
      
      setFieldValues(prev => ({
        ...prev,
        [field.id]: {
          fieldId: field.id,
          fileUrl: response.fileUrl, // Store relative path for backend
          originalFilename: response.originalFilename || fileToUpload.name,
          previewUrl: previewUrl // Use full backend proxy URL for preview
        }
      }));
      
      // Clear error
      if (errors[field.id]) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[field.id];
          return newErrors;
        });
      }

      toast({
        title: 'Upload Successful',
        description: `${file.name} uploaded successfully.`,
      });
    } catch (error: any) {
      const errorMessage = error?.message || error?.response?.data?.message || 'Failed to upload file. Please try again.';
      toast({
        title: 'Upload Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setUploadingFields(prev => ({ ...prev, [field.id]: false }));
    }
  };

  // Remove uploaded file
  const handleRemoveFile = (fieldId: number) => {
    setFieldValues(prev => {
      const newValues = { ...prev };
      delete newValues[fieldId];
      return newValues;
    });
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: { [fieldId: number]: string } = {};
    
    sortedFields.forEach(field => {
      if (field.required) {
        const value = fieldValues[field.id];
        
        if (!value) {
          newErrors[field.id] = `${field.fieldName} is required`;
        } else if (field.fieldType === 'TEXT' && !value.textValue?.trim()) {
          newErrors[field.id] = `${field.fieldName} is required`;
        } else if (field.fieldType === 'NUMBER' && value.numberValue === undefined) {
          newErrors[field.id] = `${field.fieldName} is required`;
        } else if ((field.fieldType === 'IMAGE' || field.fieldType === 'VIDEO') && !value.fileUrl) {
          newErrors[field.id] = `${field.fieldName} is required`;
        }
      }
      
      // Type validation for NUMBER fields
      if (field.fieldType === 'NUMBER' && fieldValues[field.id]?.textValue) {
        const numValue = parseFloat(fieldValues[field.id].textValue!);
        if (isNaN(numValue)) {
          newErrors[field.id] = `${field.fieldName} must be a valid number`;
        }
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateDescription = () => {
    if (!additionalDescription.trim()) {
      setErrors(prev => ({...prev, [-1]: "Description is required"}));
      return false;
    }
    return true;
  }

  // Handle form submission
  const handleSubmit = () => {
    const isFormValid = validateForm();
    const isDescriptionValid = validateDescription();
    
    if (!isFormValid || !isDescriptionValid) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields correctly.',
        variant: 'destructive',
      });
      return;
    }
    
    const values = Object.values(fieldValues).filter(v => 
      v.textValue || v.numberValue !== undefined || v.fileUrl
    );
    
    // Always send discount code when available (both negotiable and non-negotiable templates)
    // For non-negotiable: discount sets the final payment price
    // For negotiable: discount sets the initial discounted price as a starting point
    const appliedDiscountCode = discountCode.trim() || template?.activeDiscount?.code;

    const request: CreateCustomOrderRequest = {
      templateId: templateIdNum,
      discountCode: appliedDiscountCode || undefined,
      additionalDescription: additionalDescription.trim() || undefined,
      values
    };
    
    createOrderMutation.mutate(request);
  };

  // Render field input based on type
  const renderFieldInput = (field: CustomOrderTemplateField) => {
    const IconComponent = getFieldTypeIcon(field.fieldType);
    const value = fieldValues[field.id];
    const error = errors[field.id];
    const isUploading = uploadingFields[field.id];

    return (
      <div key={field.id} className="space-y-2">
        <Label className="flex items-center gap-2 text-eagle-green font-medium">
          <IconComponent className="h-4 w-4 text-viridian-green" />
          {field.fieldName}
          {field.required && <span className="text-red-500">*</span>}
        </Label>
        
        {field.description && (
          <p className="text-sm text-eagle-green/60">{field.description}</p>
        )}
        
        {field.fieldType === 'TEXT' && (
          <Textarea
            value={value?.textValue || ''}
            onChange={(e) => handleFieldChange(field, e.target.value)}
            placeholder={`Enter ${field.fieldName.toLowerCase()}`}
            className={`min-h-[100px] ${error ? 'border-red-500' : ''}`}
          />
        )}
        
        {field.fieldType === 'NUMBER' && (
          <Input
            type="number"
            value={value?.numberValue ?? ''}
            onChange={(e) => handleFieldChange(field, e.target.value)}
            placeholder={`Enter ${field.fieldName.toLowerCase()}`}
            className={error ? 'border-red-500' : ''}
          />
        )}
        
        {(field.fieldType === 'IMAGE' || field.fieldType === 'VIDEO') && (
          <div>
            {value?.fileUrl ? (
              <div className="relative inline-block">
                {field.fieldType === 'IMAGE' ? (
                  <img 
                    src={value.previewUrl || value.fileUrl} 
                    alt={field.fieldName}
                    className="w-32 h-32 object-cover rounded-lg border"
                    onError={(e) => {
                      // Fallback if preview fails
                      const target = e.target as HTMLImageElement;
                      if (value.previewUrl && target.src === value.previewUrl) {
                        target.src = value.fileUrl || '';
                      }
                    }}
                  />
                ) : (
                  <div className="w-32 h-32 bg-gray-100 rounded-lg border flex items-center justify-center">
                    <Video className="h-8 w-8 text-eagle-green/50" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveFile(field.id)}
                  className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
                <p className="text-xs text-eagle-green/60 mt-1 truncate max-w-[128px]">
                  {value.originalFilename}
                </p>
              </div>
            ) : (
              <label className={`
                flex flex-col items-center justify-center w-full h-32 
                border-2 border-dashed rounded-lg cursor-pointer
                hover:bg-june-bud/5 transition-colors
                ${error ? 'border-red-500' : 'border-eagle-green/30'}
                ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
              `}>
                <input
                  type="file"
                  accept={field.fieldType === 'IMAGE' ? 'image/*' : 'video/*'}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(field, file);
                  }}
                  className="hidden"
                  disabled={isUploading}
                />
                {isUploading ? (
                  <div className="flex flex-col items-center">
                    <Loader2 className="h-8 w-8 text-eagle-green/50 animate-spin mb-2" />
                    <span className="text-xs text-eagle-green/60">
                      {field.fieldType === 'IMAGE' ? 'Optimizing & uploading...' : 'Uploading...'}
                    </span>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-eagle-green/50 mb-2" />
                    <span className="text-sm text-eagle-green/60">
                      Click to upload {field.fieldType.toLowerCase()}
                    </span>
                    <span className="text-xs text-eagle-green/40 mt-1">
                      {field.fieldType === 'VIDEO' ? 'Max 50MB' : 'Max 10MB • Auto-optimized'}
                    </span>
                  </>
                )}
              </label>
            )}
          </div>
        )}
        
        {error && (
          <p className="text-sm text-red-500 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {error}
          </p>
        )}
      </div>
    );
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-eagle-green mb-2">Sign In Required</h2>
          <p className="font-light text-eagle-green/70 mb-4">Please sign in to create a custom order.</p>
          <Button onClick={() => navigate('/signin')} className="bg-eagle-green hover:bg-viridian-green text-white">
            Sign In
          </Button>
        </div>
      </div>
    );
  }
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-light-cream to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-10 w-32 mb-8 bg-june-bud/20" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <Skeleton className="aspect-square w-full mb-4 bg-june-bud/20 rounded-lg" />
            </div>
            <div>
              <Card>
                <CardContent className="p-6">
                  <Skeleton className="h-8 w-3/4 mb-4 bg-june-bud/20" />
                  <Skeleton className="h-4 w-full mb-6 bg-june-bud/20" />
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="mb-6">
                      <Skeleton className="h-5 w-1/4 mb-2 bg-june-bud/20" />
                      <Skeleton className="h-24 w-full bg-june-bud/20" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Package className="h-16 w-16 text-eagle-green/30 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-eagle-green mb-2">Template Not Found</h2>
          <p className="font-light text-eagle-green/70 mb-4">The template you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/custom-orders')} className="bg-eagle-green hover:bg-viridian-green text-white">
            Browse Templates
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-light-cream to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6 text-eagle-green hover:text-viridian-green hover:bg-june-bud/10"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Images */}
          {templateImages.length > 0 && (
            <div className="lg:sticky lg:top-8 h-fit">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="overflow-hidden">
                  <CardContent className="p-0">
                    {/* Main Image */}
                    <div className="relative aspect-square bg-gray-100">
                      <img
                        src={templateImages[selectedImageIndex]}
                        alt={`${template.name} ${selectedImageIndex + 1}`}
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => openLightbox(selectedImageIndex)}
                      />
                      
                      {/* Navigation Arrows */}
                      {templateImages.length > 1 && (
                        <>
                          <button
                            onClick={prevImage}
                            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/90 hover:bg-white rounded-full shadow-lg transition-all"
                          >
                            <ChevronLeft className="h-5 w-5 text-eagle-green" />
                          </button>
                          <button
                            onClick={nextImage}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/90 hover:bg-white rounded-full shadow-lg transition-all"
                          >
                            <ChevronRight className="h-5 w-5 text-eagle-green" />
                          </button>
                        </>
                      )}
                      
                      {/* Image Counter */}
                      <div className="absolute bottom-4 right-4 px-3 py-1 bg-black/60 text-white text-sm rounded-full">
                        {selectedImageIndex + 1} / {templateImages.length}
                      </div>
                    </div>
                    
                    {/* Thumbnail Strip */}
                    {templateImages.length > 1 && (
                      <div className="p-4 bg-white">
                        <div className="flex gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-eagle-green/20 scrollbar-track-transparent">
                          {templateImages.map((imageUrl, index) => (
                            <button
                              key={index}
                              onClick={() => setSelectedImageIndex(index)}
                              className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                                selectedImageIndex === index
                                  ? 'border-eagle-green shadow-md'
                                  : 'border-transparent hover:border-eagle-green/50'
                              }`}
                            >
                              <img
                                src={imageUrl}
                                alt={`Thumbnail ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                {/* Template Info Card Below Images */}
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="text-eagle-green text-lg">Order Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Store className="h-4 w-4 text-viridian-green" />
                      <span className="text-eagle-green/70">Vendor:</span>
                      <span className="text-eagle-green font-medium">{template.vendorName}</span>
                    </div>
                    
                    {/* Active Discount Badge */}
                    {template.activeDiscount && (
                      <div className="border-t border-gray-200 pt-4">
                        <DiscountBadge 
                          discount={template.activeDiscount} 
                          variant="full" 
                          targetCurrency={template.price?.currencyCode || template.currencyCode || preferredCurrency}
                        />
                      </div>
                    )}
                    
                    <div className="bg-june-bud/10 rounded-lg p-4">
                      <p className="text-sm text-eagle-green/70 mb-1">
                        {template.negotiable === false ? 'Price' : 'Base Price'}
                      </p>
                      {template.activeDiscount ? (
                        <div className="space-y-2">
                          <PriceWithDiscount
                            originalPrice={template.price?.amount || 0}
                            currency={template.price?.currencyCode || template.currencyCode || preferredCurrency}
                            discount={template.activeDiscount}
                            size="large"
                          />
                          {template.negotiable === false ? (
                            <p className="text-xs text-viridian-green mt-1 font-medium">
                              ✓ Fixed price with discount - pay directly
                            </p>
                          ) : (
                            <p className="text-xs text-eagle-green/60 mt-1">
                              Final price may vary based on customizations
                            </p>
                          )}
                        </div>
                      ) : (
                        <>
                          <p className="text-2xl font-bold text-eagle-green">
                            {customOrderTemplateService.formatTemplatePrice(template)}
                          </p>
                          {template.negotiable === false ? (
                            <p className="text-xs text-viridian-green mt-1 font-medium">
                              ✓ Fixed price - pay directly without negotiation
                            </p>
                          ) : (
                            <p className="text-xs text-eagle-green/60 mt-1">
                              Final price may vary based on customizations
                            </p>
                          )}
                        </>
                      )}
                    </div>

                    {template.negotiable === false && (
                      <div className="space-y-2">
                        <Label className="text-eagle-green font-medium flex items-center gap-1">
                          <Tag className="h-4 w-4" />
                          Discount Code
                        </Label>
                        {discountResult?.applicable ? (
                          <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                              <div>
                                <p className="text-sm font-medium text-green-800">
                                  Code "{discountCode}" applied
                                </p>
                                <p className="text-xs text-green-600">
                                  You save {formatPrice(manualDiscountAmountDisplay, template?.price?.currencyCode || preferredCurrency)}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleRemoveDiscount}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <div className="flex gap-2">
                              <Input
                                placeholder="Enter discount code"
                                value={discountCode}
                                onChange={(e) => {
                                  setDiscountCode(e.target.value);
                                  setDiscountError(null);
                                }}
                                onKeyDown={(e) => e.key === 'Enter' && handleApplyDiscount()}
                                className={discountError ? 'border-red-300' : ''}
                                disabled={isValidatingDiscount}
                              />
                              <Button
                                type="button"
                                onClick={handleApplyDiscount}
                                disabled={isValidatingDiscount || !discountCode.trim()}
                                className="bg-eagle-green hover:bg-eagle-green/90 text-white font-medium min-w-[90px] transition-all"
                              >
                                {isValidatingDiscount ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  'Apply Code'
                                )}
                              </Button>
                            </div>
                            {discountError && (
                              <p className="text-xs text-red-500 flex items-center gap-1">
                                <XCircle className="h-3 w-3" />
                                {discountError}
                              </p>
                            )}
                            {!discountError && !discountCode.trim() && template.activeDiscount && (
                              <p className="text-xs text-eagle-green/60">
                                A template discount will be applied automatically.
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          )}

          {/* Right Column - Form */}
          <div className={templateImages.length > 0 ? '' : 'lg:col-span-2'}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-eagle-green text-2xl">{template.name}</CardTitle>
                  {template.description && (
                    <CardDescription>{template.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Customization Fields */}
                  {sortedFields.map(field => renderFieldInput(field))}

                  {/* Additional Description */}
                  <div className="space-y-2 pt-4 border-t">
                    <Label htmlFor="additionalDescription" className="text-eagle-green font-medium">
                      Description <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="additionalDescription"
                      value={additionalDescription}
                      onChange={(e) => {
                        setAdditionalDescription(e.target.value);
                        if (e.target.value.trim() && errors[-1]) {
                             setErrors(prev => {
                                const newErrors = { ...prev };
                                delete newErrors[-1];
                                return newErrors;
                              });
                        }
                      }}
                      placeholder="Please provide a detailed description of your request..."
                      className={`min-h-[100px] ${errors[-1] ? 'border-red-500' : ''}`}
                    />
                     {errors[-1] && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          {errors[-1]}
                        </p>
                      )}
                  </div>
                  
                  {/* Submit Button */}
                  <div className="pt-4">
                    <Button
                      onClick={handleSubmit}
                      disabled={createOrderMutation.isPending}
                      className="w-full bg-eagle-green hover:bg-viridian-green text-white h-12"
                    >
                      {createOrderMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          {template.negotiable === false ? 'Place Order & Pay' : 'Submit Order'}
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-eagle-green/60 text-center mt-2">
                      {template.negotiable === false 
                        ? 'You will be redirected to payment after submission'
                        : 'The vendor will review your order and propose a final price'
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
      
      {/* Image Lightbox */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxOpen(false)}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          >
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="h-6 w-6 text-white" />
            </button>
            
            {templateImages.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); prevImage(); }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                >
                  <ChevronLeft className="h-8 w-8 text-white" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); nextImage(); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                >
                  <ChevronRight className="h-8 w-8 text-white" />
                </button>
              </>
            )}
            
            <div className="relative max-w-7xl max-h-full" onClick={(e) => e.stopPropagation()}>
              <img
                src={templateImages[selectedImageIndex]}
                alt={`${template?.name} ${selectedImageIndex + 1}`}
                className="max-w-full max-h-[90vh] object-contain"
              />
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/60 text-white text-sm rounded-full">
                {selectedImageIndex + 1} / {templateImages.length}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CreateCustomOrder() {
  return (
    <ProtectedRoute>
      <CreateCustomOrderContent />
    </ProtectedRoute>
  );
}
