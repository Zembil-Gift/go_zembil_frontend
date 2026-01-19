import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
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
  ChevronRight
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

import { customOrderTemplateService } from '@/services/customOrderTemplateService';
import { customOrderService } from '@/services/customOrderService';
import { imageService } from '@/services/imageService';
import type { CustomOrderTemplateField, CreateCustomOrderRequest } from '@/types/customOrders';
import { getAllTemplateImages } from '@/utils/imageUtils';

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
}

function CreateCustomOrderContent() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated, user } = useAuth();
  
  const templateIdNum = templateId ? parseInt(templateId) : 0;
  
  // Get user's preferred currency (fallback to USD)
  const preferredCurrency = user?.preferredCurrencyCode || 'USD';
  
  const [fieldValues, setFieldValues] = useState<{ [fieldId: number]: FieldValue }>({});
  const [additionalDescription, setAdditionalDescription] = useState('');
  const [uploadingFields, setUploadingFields] = useState<{ [fieldId: number]: boolean }>({});
  const [errors, setErrors] = useState<{ [fieldId: number]: string }>({});
  
  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Fetch template details with user's preferred currency
  const { data: template, isLoading } = useQuery({
    queryKey: ['custom-order-template', templateIdNum, preferredCurrency],
    queryFn: () => customOrderTemplateService.getById(templateIdNum, preferredCurrency),
    enabled: templateIdNum > 0,
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

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: (data: CreateCustomOrderRequest) => customOrderService.create(data),
    onSuccess: (order) => {
      toast({
        title: 'Order Submitted!',
        description: `Your custom order #${order.orderNumber} has been submitted successfully.`,
      });
      navigate(`/my-custom-orders/${order.id}`);
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

  // Handle file upload
  const handleFileUpload = async (field: CustomOrderTemplateField, file: File) => {
    // Validate file size
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
      // Upload file to server using imageService
      const response = await imageService.uploadCustomOrderFile(file);
      
      setFieldValues(prev => ({
        ...prev,
        [field.id]: {
          fieldId: field.id,
          fileUrl: response.fileUrl,
          originalFilename: response.originalFilename || file.name
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

  // Handle form submission
  const handleSubmit = () => {
    if (!validateForm()) {
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
    
    const request: CreateCustomOrderRequest = {
      templateId: templateIdNum,
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
                    src={value.fileUrl} 
                    alt={field.fieldName}
                    className="w-32 h-32 object-cover rounded-lg border"
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
                  <Loader2 className="h-8 w-8 text-eagle-green/50 animate-spin" />
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-eagle-green/50 mb-2" />
                    <span className="text-sm text-eagle-green/60">
                      Click to upload {field.fieldType.toLowerCase()}
                    </span>
                    <span className="text-xs text-eagle-green/40 mt-1">
                      {field.fieldType === 'VIDEO' ? 'Max 50MB' : 'Max 10MB'}
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
                    
                    <div className="bg-june-bud/10 rounded-lg p-4">
                      <p className="text-sm text-eagle-green/70 mb-1">Base Price</p>
                      <p className="text-2xl font-bold text-eagle-green">
                        {customOrderTemplateService.formatTemplatePrice(template)}
                      </p>
                      <p className="text-xs text-eagle-green/60 mt-1">
                        Final price may vary based on customizations
                      </p>
                    </div>
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
                    <Label className="text-eagle-green font-medium">
                      Additional Notes (Optional)
                    </Label>
                    <Textarea
                      value={additionalDescription}
                      onChange={(e) => setAdditionalDescription(e.target.value)}
                      placeholder="Any special requests or additional information for the vendor..."
                      className="min-h-[100px]"
                    />
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
                          Submit Order
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-eagle-green/60 text-center mt-2">
                      The vendor will review your order and propose a final price
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
