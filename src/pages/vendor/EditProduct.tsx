import {useEffect, useState} from "react";
import {Controller, useFieldArray, useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {z} from "zod";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {Link, useNavigate, useParams} from "react-router-dom";
import {useAuth} from "@/hooks/useAuth";
import {useToast} from "@/hooks/use-toast";
import {CategoryChangeRequest, Product, VendorProfile, vendorService} from "@/services/vendorService";
import {apiService} from "@/services/apiService";
import {ImageDto, imageService} from "@/services/imageService";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {Label} from "@/components/ui/label";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {ImageUpload} from "@/components/ImageUpload";
import {TagInput} from "@/components/TagInput";
import {SubcategorySearchCombobox} from "@/components/SubcategorySearchCombobox";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Clock,
  DollarSign,
  FolderTree,
  Gift,
  ImageIcon,
  Info,
  Layers,
  Package,
  Plus,
  RefreshCw,
  Trash2
} from "lucide-react";
import {Alert, AlertDescription, AlertTitle,} from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const isEthiopianVendor = (vendorProfile: VendorProfile | undefined): boolean => {
  if (!vendorProfile) return false;
  return vendorProfile.countryCode === 'ET';
};

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface SubCategory {
  id: number;
  name: string;
  slug: string;
}

interface Currency {
  id: number;
  code: string;
  name: string;
  symbol: string;
}

const attributeSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "Attribute name is required"),
  value: z.string().min(1, "Attribute value is required"),
});

const skuSchema = z.object({
  id: z.number().optional(),
  skuCode: z.string().optional(),
  skuName: z.string().min(1, "Variant name is required"),
  stockQuantity: z.number().min(0, "Stock cannot be negative"),
  // Price fields are read-only in edit mode
  currencyCode: z.string().optional(),
  currentPrice: z.number().optional(),
  attributes: z.array(attributeSchema).optional(),
});

const productEditSchema = z.object({
  name: z.string().min(1, "Product name is required").max(255),
  description: z.string().max(1000).optional(),
  summary: z.string().max(500).optional(),
  subCategoryId: z.string().min(1, "Category is required"),
  isCustomizable: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  occasion: z.string().optional(),
  giftWrappable: z.boolean().optional(),
  giftWrapPrice: z.number().min(0, "Gift wrap price must be positive").optional(),
  giftWrapCurrencyCode: z.string().optional(),
  productSku: z.array(skuSchema).min(1, "At least one product SKU is required"),
}).refine((data) => {
  // Check for duplicate variant names
  const variantNames = data.productSku.map(sku => sku.skuName.trim().toLowerCase());
  const uniqueNames = new Set(variantNames);
  return uniqueNames.size === variantNames.length;
}, {
  message: "Each variant must have a unique name",
  path: ["productSku"],
});

type ProductEditFormData = z.infer<typeof productEditSchema>;

export default function EditProduct() {
  const { id } = useParams<{ id: string }>();
  const productId = id ? parseInt(id, 10) : null;
  
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const isVendor = user?.role?.toUpperCase() === 'VENDOR';

  // State for SKU images management
  const [pendingSkuImages, setPendingSkuImages] = useState<Record<number, File[]>>({});
  const [currentSkuImages, setCurrentSkuImages] = useState<Record<number, ImageDto[]>>({});
  const [isUploadingImages, setIsUploadingImages] = useState(false);

  // State for category change request
  const [categoryChangeDialogOpen, setCategoryChangeDialogOpen] = useState(false);
  const [categoryChangeReason, setCategoryChangeReason] = useState("");
  const [pendingFormData, setPendingFormData] = useState<ProductEditFormData | null>(null);

  // Fetch product data
  const { data: product, isLoading: productLoading, error: productError } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      return await apiService.getRequest<Product>(`/api/v1/products/${productId}`);
    },
    enabled: !!productId && isAuthenticated && isVendor,
  });

  // Fetch vendor profile
  const { data: vendorProfile } = useQuery({
    queryKey: ['vendor', 'profile'],
    queryFn: () => vendorService.getMyProfile(),
    enabled: isAuthenticated && isVendor,
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiService.getRequest<Category[]>('/api/categories'),
  });

  // Fetch all subcategories
  const { data: allSubCategories = [] } = useQuery({
    queryKey: ['all-subcategories', categories],
    queryFn: async () => {
      const subCategoriesPromises = categories.map((category) =>
        apiService.getRequest<SubCategory[]>(`/api/categories/${category.id}/sub-categories`)
      );
      const results = await Promise.all(subCategoriesPromises);
      return results.flat();
    },
    enabled: categories.length > 0,
  });

  // Fetch currencies
  const { data: currencies = [] } = useQuery({
    queryKey: ['currencies'],
    queryFn: () => apiService.getRequest<Currency[]>('/api/currencies'),
  });

  // Fetch pending category change request for this product
  const { data: pendingCategoryChangeRequest } = useQuery<CategoryChangeRequest | null>({
    queryKey: ['pending-category-change', productId],
    queryFn: async () => {
      try {
        return await vendorService.getPendingCategoryChangeRequestForProduct(productId!);
      } catch {
        return null;
      }
    },
    enabled: !!productId && isAuthenticated && isVendor && product?.status === 'ACTIVE',
  });

  const availableCurrencies = isEthiopianVendor(vendorProfile)
    ? currencies.filter(c => c.code === 'ETB')
    : currencies;

  const form = useForm<ProductEditFormData>({
    resolver: zodResolver(productEditSchema),
    defaultValues: {
      name: "",
      description: "",
      summary: "",
      subCategoryId: "",
      isCustomizable: false,
      tags: [],
      occasion: "",
      giftWrappable: false,
      giftWrapPrice: 0,
      giftWrapCurrencyCode: "",
      productSku: [],
    },
  });

  const { fields: skuFields, append: appendSku, remove: removeSku } = useFieldArray({
    control: form.control,
    name: "productSku",
  });

  useEffect(() => {
    if (product && allSubCategories.length > 0) {
      const skuData = (product.productSku && product.productSku.length > 0)
        ? product.productSku.map(sku => {
            const currencyCode = sku.price?.currencyCode || sku.price?.prices?.[0]?.currencyCode || "";
            const currentPrice = sku.price?.vendorAmount || sku.price?.amount || sku.price?.prices?.[0]?.amount || 0;
            return {
              id: sku.id,
              skuCode: sku.skuCode || "",
              skuName: sku.skuName || "",
              stockQuantity: sku.stockQuantity || 0,
              currencyCode,
              currentPrice,
              attributes: sku.attributes?.map(attr => ({
                id: attr.id,
                name: attr.name,
                value: attr.value,
              })) || [],
            };
          })
        : [{
            skuCode: "",
            skuName: "",
            stockQuantity: 0,
            currencyCode: isEthiopianVendor(vendorProfile) ? "ETB" : currencies[0]?.code || "",
            currentPrice: product.price?.vendorAmount || product.price?.prices?.[0]?.amount || 0,
            attributes: [],
          }];

      // Load SKU images - use fullUrl from backend
      const skuImagesMap: Record<number, ImageDto[]> = {};
      if (product.productSku && product.productSku.length > 0) {
        product.productSku.forEach((sku, index) => {
          // First try SKU-level images
          if (sku.images && sku.images.length > 0) {
            skuImagesMap[index] = sku.images.map((img, imgIndex) => ({
              id: img.id || imgIndex + 1,
              url: img.url,
              fullUrl: img.fullUrl,
              originalFilename: img.originalFilename || `image-${imgIndex + 1}`,
              altText: img.altText || sku.skuCode || product.name,
              sortOrder: img.sortOrder ?? imgIndex,
              isPrimary: img.isPrimary ?? (imgIndex === 0),
              fileSize: img.fileSize || 0,
              contentType: img.contentType || 'image/jpeg',
              createdAt: img.createdAt || new Date().toISOString(),
            }));
          } else if (index === 0 && product.images && product.images.length > 0) {
            // Fallback to product-level images for the first/default SKU
            skuImagesMap[index] = product.images.map((img, imgIndex) => ({
              id: img.id || imgIndex + 1,
              url: img.url,
              fullUrl: img.fullUrl,
              originalFilename: img.originalFilename || `image-${imgIndex + 1}`,
              altText: img.altText || product.name,
              sortOrder: img.sortOrder ?? imgIndex,
              isPrimary: img.isPrimary ?? (imgIndex === 0),
              fileSize: img.fileSize || 0,
              contentType: img.contentType || 'image/jpeg',
              createdAt: img.createdAt || new Date().toISOString(),
            }));
          } else {
            skuImagesMap[index] = [];
          }
        });
      } else if (product.images && product.images.length > 0) {
        // If no SKUs but product has images, use them for the default SKU
        skuImagesMap[0] = product.images.map((img, imgIndex) => ({
          id: img.id || imgIndex + 1,
          url: img.url,
          fullUrl: img.fullUrl,
          originalFilename: img.originalFilename || `image-${imgIndex + 1}`,
          altText: img.altText || product.name,
          sortOrder: img.sortOrder ?? imgIndex,
          isPrimary: img.isPrimary ?? (imgIndex === 0),
          fileSize: img.fileSize || 0,
          contentType: img.contentType || 'image/jpeg',
          createdAt: img.createdAt || new Date().toISOString(),
        }));
      }
      setCurrentSkuImages(skuImagesMap);

      form.reset({
        name: product.name || "",
        description: product.description || "",
        summary: product.summary || "",
        subCategoryId: product.subCategoryId?.toString() || "",
        isCustomizable: product.isCustomizable || false,
        tags: product.tags || [],
        occasion: product.occasion || "",
        giftWrappable: product.giftWrappable || false,
        giftWrapPrice: product.giftWrapPrice || 0,
        giftWrapCurrencyCode: product.giftWrapCurrencyCode || "",
        productSku: skuData,
      });
    }
  }, [product, vendorProfile, currencies, form, allSubCategories]);

  // Check if vendor owns this product (compare with userId, not vendor id)
  const isProductOwner = product && vendorProfile && product.vendorId === vendorProfile.userId;

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: async (data: ProductEditFormData) => {
      if (!productId) throw new Error("Product ID is required");

      // Use the appropriate endpoint based on product status
      const isPendingOrRejected = product?.status === 'PENDING' || product?.status === 'REJECTED';
      
      // For ACTIVE products, exclude subCategoryId from the payload (category changes require approval)
      const productPayload: Partial<Product> = {
        name: data.name,
        description: data.description || undefined,
        summary: data.summary || undefined,
        // Only include subCategoryId for PENDING/REJECTED products (can change directly)
        ...(isPendingOrRejected && { subCategoryId: data.subCategoryId ? parseInt(data.subCategoryId) : undefined }),
        isCustomizable: data.isCustomizable,
        tags: data.tags && data.tags.length > 0 ? data.tags : undefined,
        occasion: data.occasion || undefined,
        giftWrappable: data.giftWrappable || false,
        giftWrapPrice: data.giftWrappable && data.giftWrapPrice ? data.giftWrapPrice : undefined,
        giftWrapCurrencyCode: data.giftWrappable && data.giftWrapPrice
          ? (data.giftWrapCurrencyCode || product?.giftWrapCurrencyCode || (product?.productSku?.[0] as any)?.price?.currencyCode || 'ETB')
          : undefined,
        // Include SKU updates (excluding price changes)
        productSku: data.productSku.map((sku, index) => ({
          id: sku.id,
          skuCode: sku.skuCode || "", // Provide default empty string for required field
          skuName: sku.skuName, // Add skuName to payload
          stockQuantity: sku.stockQuantity,
          isDefault: index === 0,
          attributes: sku.attributes?.filter(attr => attr.name && attr.value) || [],
          // Note: We don't include price here as it requires a separate request
        })),
      };

      if (isPendingOrRejected) {
        return vendorService.editPendingProduct(productId, productPayload as Product);
      } else {
        // Use updateProductForVendor for ACTIVE products (preserves prices)
        return vendorService.updateProductForVendor(productId, productPayload as Product);
      }
    },
    onSuccess: async () => {
      // Upload any pending SKU images
      const hasAnyPendingImages = Object.values(pendingSkuImages).some(images => images.length > 0);
      
      if (hasAnyPendingImages && product?.productSku) {
        setIsUploadingImages(true);
        try {
          for (const [skuIndexStr, images] of Object.entries(pendingSkuImages)) {
            const skuIndex = parseInt(skuIndexStr, 10);
            const sku = product.productSku[skuIndex];
            
            if (images.length > 0 && sku?.id) {
              await imageService.uploadSkuImages(sku.id, images);
            }
          }
        } catch (imageError) {
          console.error("Failed to upload SKU images:", imageError);
          toast({
            title: "Warning",
            description: "Product updated but some images failed to upload.",
            variant: "destructive",
          });
        } finally {
          setIsUploadingImages(false);
        }
      }

      toast({
        title: "Product Updated",
        description: product?.status === 'PENDING' || product?.status === 'REJECTED'
          ? "Your product has been updated and resubmitted for review."
          : "Your product has been updated successfully.",
      });
      
      queryClient.invalidateQueries({ queryKey: ['vendor', 'products'] });
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'pending-rejected-products'] });
      
      navigate("/vendor");
    },
    onError: (error: any) => {
      setIsUploadingImages(false);
      toast({
        title: "Error",
        description: error.response?.data?.message || error.message || "Failed to update product",
        variant: "destructive",
      });
    },
  });

  // Category change request mutation
  const categoryChangeMutation = useMutation({
    mutationFn: async ({ newSubCategoryId, reason }: { newSubCategoryId: number; reason: string }) => {
      if (!productId) throw new Error("Product ID is required");
      return vendorService.createCategoryChangeRequest(productId, { newSubCategoryId, reason });
    },
    onSuccess: () => {
      toast({
        title: "Category Change Requested",
        description: "Your category change request has been submitted for admin approval.",
      });
      queryClient.invalidateQueries({ queryKey: ['pending-category-change', productId] });
      setCategoryChangeDialogOpen(false);
      setCategoryChangeReason("");
      
      // Now proceed with the rest of the product update if there's pending data
      if (pendingFormData) {
        updateProductMutation.mutate(pendingFormData);
        setPendingFormData(null);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || error.message || "Failed to submit category change request",
        variant: "destructive",
      });
    },
  });

  const addSku = () => {
    const defaultCurrency = isEthiopianVendor(vendorProfile)
      ? "ETB"
      : (availableCurrencies[0]?.code || currencies[0]?.code || "");

    appendSku({
      skuCode: "",
      skuName: "", // Add default empty skuName (required field)
      stockQuantity: 0,
      currencyCode: defaultCurrency,
      currentPrice: 0,
      attributes: [],
    });
  };

  const addAttribute = (skuIndex: number) => {
    const currentSku = form.getValues(`productSku.${skuIndex}`);
    const currentAttributes = currentSku.attributes || [];
    form.setValue(`productSku.${skuIndex}.attributes`, [
      ...currentAttributes,
      { name: "", value: "" },
    ]);
  };

  const removeAttribute = (skuIndex: number, attrIndex: number) => {
    const currentSku = form.getValues(`productSku.${skuIndex}`);
    const currentAttributes = currentSku.attributes || [];
    form.setValue(
      `productSku.${skuIndex}.attributes`,
      currentAttributes.filter((_, i) => i !== attrIndex)
    );
  };

  const onSubmit = (data: ProductEditFormData) => {
    // Validate that each SKU has at least one image
    for (let i = 0; i < data.productSku.length; i++) {
      const existingImages = currentSkuImages[i] || [];
      const pendingImages = pendingSkuImages[i] || [];
      const totalImages = existingImages.length + pendingImages.length;
      
      if (totalImages === 0) {
        toast({
          title: "Image Required",
          description: `Please upload at least one image for ${data.productSku.length === 1 ? 'your product' : `variant #${i + 1} (${data.productSku[i].skuCode || 'unnamed'})`}.`,
          variant: "destructive",
        });
        return;
      }
    }

    // Check if category changed for ACTIVE products
    const isActiveProduct = product?.status === 'ACTIVE';
    const originalSubCategoryId = product?.subCategoryId?.toString();
    const newSubCategoryId = data.subCategoryId;
    const categoryChanged = originalSubCategoryId !== newSubCategoryId;

    if (isActiveProduct && categoryChanged && !pendingCategoryChangeRequest) {
      // Category change needs approval - show dialog
      setPendingFormData(data);
      setCategoryChangeDialogOpen(true);
      return;
    }

    // If there's already a pending category change request, warn the user
    if (isActiveProduct && categoryChanged && pendingCategoryChangeRequest) {
      toast({
        title: "Pending Category Change",
        description: "You already have a pending category change request for this product. Please wait for admin approval or cancel the existing request.",
        variant: "destructive",
      });
      // Reset the category dropdown to current value
      form.setValue('subCategoryId', originalSubCategoryId || '');
      return;
    }

    updateProductMutation.mutate(data);
  };

  const handleCategoryChangeSubmit = () => {
    if (!pendingFormData || !productId) return;
    
    const newSubCategoryId = parseInt(pendingFormData.subCategoryId);
    categoryChangeMutation.mutate({
      newSubCategoryId,
      reason: categoryChangeReason,
    });
  };

  const onError = (errors: any) => {
    console.log("Form validation errors:", errors);
    
    const errorMessages: string[] = [];
    if (errors.name) errorMessages.push("Product name is required");
    if (errors.subCategoryId) errorMessages.push("Category is required");
    if (errors.productSku) {
      let foundSpecificSkuError = false;
      // Check for refine validation error (duplicate names) - it's in the root property
      if (errors.productSku.root?.message) {
        errorMessages.push(errors.productSku.root.message);
        foundSpecificSkuError = true;
      } else if (errors.productSku.message) {
        errorMessages.push(errors.productSku.message);
        foundSpecificSkuError = true;
      } else if (Array.isArray(errors.productSku)) {
        // Individual SKU field errors
        errors.productSku.forEach((skuError: any, index: number) => {
          if (skuError) {
            const variantLabel = `Variant ${index + 1}`;
            if (skuError.skuName) {
              errorMessages.push(`${variantLabel}: ${skuError.skuName.message}`);
              foundSpecificSkuError = true;
            }
            if (skuError.stockQuantity) {
              errorMessages.push(`${variantLabel}: ${skuError.stockQuantity.message}`);
              foundSpecificSkuError = true;
            }
          }
        });
      }
      // Only show generic message if there are SKU errors but we didn't find specific field errors
      if (!foundSpecificSkuError) {
        errorMessages.push("Please check variant details - ensure all required fields are filled");
      }
    }
    
    toast({
      title: "Validation Error",
      description: errorMessages.length > 0 
        ? errorMessages.join(". ") 
        : "Please fill in all required fields correctly.",
      variant: "destructive",
    });
  };

  if (!isAuthenticated || !isVendor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <AlertCircle className="h-16 w-16 text-amber-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-600 mb-4">You need to be a vendor to edit products.</p>
        <Button asChild>
          <Link to="/vendor-signup">Become a Vendor</Link>
        </Button>
      </div>
    );
  }

  if (productLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin text-eagle-green mx-auto mb-4" />
          <p className="text-gray-600">Loading product...</p>
        </div>
      </div>
    );
  }

  if (productError || !product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Product Not Found</h1>
        <p className="text-gray-600 mb-4">The product you're looking for doesn't exist or couldn't be loaded.</p>
        <Button asChild>
          <Link to="/vendor">Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  if (!isProductOwner) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <AlertCircle className="h-16 w-16 text-amber-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Unauthorized</h1>
        <p className="text-gray-600 mb-4">You can only edit your own products.</p>
        <Button asChild>
          <Link to="/vendor">Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
      case 'APPROVED':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'PENDING':
        return <Badge className="bg-amber-100 text-amber-800">Pending Review</Badge>;
      case 'REJECTED':
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/vendor">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Edit Product</h1>
              {getStatusBadge(product.status || '')}
            </div>
            <p className="text-muted-foreground">Update your product details (prices require a separate request)</p>
          </div>
        </div>

        {/* Status Alerts */}
        {product.status === 'REJECTED' && product.rejectionReason && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Product Rejected</AlertTitle>
            <AlertDescription>
              <strong>Reason:</strong> {product.rejectionReason}
              <br />
              Please address this issue and save to resubmit for review.
            </AlertDescription>
          </Alert>
        )}

        {product.status === 'PENDING' && (
          <Alert className="mb-6 border-amber-200 bg-amber-50">
            <Info className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800">Pending Review</AlertTitle>
            <AlertDescription className="text-amber-700">
              This product is currently under review. Any changes will require re-approval.
            </AlertDescription>
          </Alert>
        )}

        {/* Price Update Notice */}
        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <DollarSign className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800">Price Updates</AlertTitle>
          <AlertDescription className="text-blue-700">
            Price changes require admin approval and cannot be made directly here.{' '}
            <Link to={`/vendor/products/${productId}/price`} className="font-medium underline">
              Request a price update
            </Link>{' '}
            or go to the Requests tab in your dashboard.
          </AlertDescription>
        </Alert>

        {/* Pending Category Change Request Alert */}
        {pendingCategoryChangeRequest && (
          <Alert className="mb-6 border-amber-200 bg-amber-50">
            <Clock className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800">Pending Category Change Request</AlertTitle>
            <AlertDescription className="text-amber-700">
              You have a pending category change request for this product.
              <br />
              <span className="font-medium">Requested Category:</span>{" "}
              {pendingCategoryChangeRequest.newSubCategoryName}
              <br />
              <span className="font-medium">Reason:</span> {pendingCategoryChangeRequest.reason}
              <br />
              <Link to="/vendor?tab=requests" className="font-medium underline">
                View in Requests
              </Link>
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter product name"
                  {...form.register("name")}
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="summary">Short Summary</Label>
                <Input
                  id="summary"
                  placeholder="Brief product summary"
                  {...form.register("summary")}
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Detailed product description"
                  className="min-h-[120px]"
                  {...form.register("description")}
                />
              </div>
            </CardContent>
          </Card>

          {/* Category */}
          <Card>
            <CardHeader>
              <CardTitle>Category</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Sub-Category *</Label>
                <Controller
                  name="subCategoryId"
                  control={form.control}
                  render={({ field }) => (
                    <SubcategorySearchCombobox
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Search and select a sub-category"
                    />
                  )}
                />
                {form.formState.errors.subCategoryId && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.subCategoryId.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="occasion">Occasion (Optional)</Label>
                <Controller
                  name="occasion"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="occasion">
                        <SelectValue placeholder="Select occasion" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NEW_YEAR">New Year</SelectItem>
                        <SelectItem value="BIRTHDAY">Birthday</SelectItem>
                        <SelectItem value="TIMKET">Timket</SelectItem>
                        <SelectItem value="EASTER">Easter</SelectItem>
                        <SelectItem value="CHRISTMAS">Christmas</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div>
                <Label htmlFor="tags">Tags</Label>
                <Controller
                  name="tags"
                  control={form.control}
                  render={({ field }) => (
                    <TagInput
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Enter tag"
                      maxTags={10}
                    />
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Product SKUs */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="h-5 w-5" />
                    Product Variants (SKUs)
                  </CardTitle>
                  <CardDescription>
                    Update stock and attributes for your product variants. Price changes require a separate request.
                  </CardDescription>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addSku}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Variant
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {skuFields.map((field, skuIndex) => {
                const attributes = form.watch(`productSku.${skuIndex}.attributes`) || [];
                const currentPrice = form.watch(`productSku.${skuIndex}.currentPrice`);
                const currencyCode = form.watch(`productSku.${skuIndex}.currencyCode`);
                const skuId = form.watch(`productSku.${skuIndex}.id`);

                return (
                  <Card key={field.id} className="border-2">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">
                          {skuFields.length === 1 ? "Product SKU" : `Variant #${skuIndex + 1}`}
                        </CardTitle>
                        {skuFields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSku(skuIndex)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* SKU Name */}
                      <div>
                        <Label>Variant Name *</Label>
                        <Input
                          placeholder={skuFields.length === 1 ? "e.g., Default" : "e.g., Red Medium"}
                          {...form.register(`productSku.${skuIndex}.skuName`)}
                        />
                        {form.formState.errors.productSku?.[skuIndex]?.skuName && (
                          <p className="text-sm text-red-600 mt-1">
                            {form.formState.errors.productSku[skuIndex]?.skuName?.message}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">A unique friendly name for this variant</p>
                      </div>

                      {/* SKU Code and Stock */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>SKU Code (optional)</Label>
                          <Input
                            placeholder={skuFields.length === 1 ? "e.g., PROD-001" : "e.g., SHIRT-RED-M"}
                            {...form.register(`productSku.${skuIndex}.skuCode`)}
                          />
                          {form.formState.errors.productSku?.[skuIndex]?.skuCode && (
                            <p className="text-sm text-red-600 mt-1">
                              {form.formState.errors.productSku[skuIndex]?.skuCode?.message}
                            </p>
                          )}
                        </div>
                        <div>
                          <Label>Stock Quantity *</Label>
                          <Controller
                            name={`productSku.${skuIndex}.stockQuantity`}
                            control={form.control}
                            render={({ field }) => (
                              <Input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={field.value || ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value === '') {
                                    field.onChange(0);
                                  } else {
                                    field.onChange(parseInt(value, 10));
                                  }
                                }}
                                onBlur={field.onBlur}
                              />
                            )}
                          />
                        </div>
                      </div>

                      {/* Current Price (Read-only) */}
                      {skuId && currentPrice !== undefined && (
                        <div className="p-3 bg-gray-50 rounded-lg border">
                          <div className="flex items-center justify-between">
                            <div>
                              <Label className="text-sm text-muted-foreground">Current Price</Label>
                              <p className="text-lg font-semibold">
                                {currencyCode} {currentPrice?.toFixed(2)}
                              </p>
                            </div>
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm"
                              asChild
                            >
                              <Link to={`/vendor/products/${productId}/price`}>
                                <DollarSign className="h-4 w-4 mr-1" />
                                Request Price Change
                              </Link>
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Attributes */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Attributes (Size, Color, etc.)</Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => addAttribute(skuIndex)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Attribute
                          </Button>
                        </div>

                        {attributes.length === 0 && (
                          <p className="text-sm text-muted-foreground italic">
                            No attributes added. Click "Add Attribute" to add size, color, etc.
                          </p>
                        )}

                        {attributes.map((_, attrIndex) => (
                          <div key={attrIndex} className="flex items-center gap-2">
                            <Input
                              placeholder="Name (e.g., Size)"
                              {...form.register(`productSku.${skuIndex}.attributes.${attrIndex}.name`)}
                              className="flex-1"
                            />
                            <Input
                              placeholder="Value (e.g., Large)"
                              {...form.register(`productSku.${skuIndex}.attributes.${attrIndex}.value`)}
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeAttribute(skuIndex, attrIndex)}
                              className="text-destructive hover:text-destructive shrink-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>

                      {/* SKU Images */}
                      <div className="space-y-3 border-t pt-4">
                        <div className="flex items-center gap-2">
                          <ImageIcon className="h-4 w-4" />
                          <Label className="text-sm font-medium">Images *</Label>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Upload images for this {skuFields.length === 1 ? 'product' : 'variant'}. First image will be the cover.
                        </p>
                        <ImageUpload
                          images={currentSkuImages[skuIndex] || []}
                          onFilesSelected={(files) => {
                            setPendingSkuImages((prev) => ({
                              ...prev,
                              [skuIndex]: [...(prev[skuIndex] || []), ...files],
                            }));
                          }}
                          maxImages={10}
                          isUploading={isUploadingImages}
                          disabled={updateProductMutation.isPending}
                          label=""
                          helperText={`Upload images for this ${skuFields.length === 1 ? 'product' : 'variant'}.`}
                        />
                        {pendingSkuImages[skuIndex] && pendingSkuImages[skuIndex].length > 0 && (
                          <p className="text-sm text-muted-foreground">
                            {pendingSkuImages[skuIndex].length} new image(s) will be uploaded
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </CardContent>
          </Card>

          {/* Gift Wrapping Options */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
                Gift Wrapping
              </CardTitle>
              <CardDescription>Allow customers to add gift wrapping for an additional fee.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Controller
                  name="giftWrappable"
                  control={form.control}
                  render={({ field }) => (
                    <Checkbox
                      id="giftWrappable"
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked === true);
                        if (!checked) {
                          form.setValue('giftWrapPrice', 0);
                        }
                      }}
                    />
                  )}
                />
                <Label htmlFor="giftWrappable" className="cursor-pointer">
                  This product supports gift wrapping
                </Label>
              </div>

              {form.watch("giftWrappable") && (
                <div>
                  <Label>
                    Gift Wrapping Fee ({product?.giftWrapCurrencyCode || (product?.productSku?.[0] as any)?.price?.currencyCode || 'ETB'})
                  </Label>
                  <Controller
                    name="giftWrapPrice"
                    control={form.control}
                    render={({ field }) => (
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={field.value || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '') {
                            field.onChange(0);
                          } else {
                            const numValue = parseFloat(value);
                            if (!isNaN(numValue)) {
                              field.onChange(Math.round(numValue * 100) / 100);
                            }
                          }
                        }}
                        onBlur={field.onBlur}
                      />
                    )}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Additional charge per item for gift wrapping. Set to 0 for free gift wrapping.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

    

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" asChild>
              <Link to="/vendor">Cancel</Link>
            </Button>
            <Button 
              type="submit" 
              disabled={updateProductMutation.isPending || isUploadingImages || categoryChangeMutation.isPending}
            >
              {updateProductMutation.isPending || isUploadingImages || categoryChangeMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  {isUploadingImages ? "Uploading Images..." : categoryChangeMutation.isPending ? "Submitting Category Change..." : "Saving..."}
                </>
              ) : (
                product.status === 'PENDING' || product.status === 'REJECTED' 
                  ? "Save & Resubmit" 
                  : "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Category Change Request Dialog */}
      <Dialog open={categoryChangeDialogOpen} onOpenChange={setCategoryChangeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderTree className="h-5 w-5" />
              Category Change Request
            </DialogTitle>
            <DialogDescription>
              Since your product is already active, changing its category requires admin approval.
              Please provide a reason for the category change.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="categoryChangeReason">Reason for Category Change</Label>
              <Textarea
                id="categoryChangeReason"
                placeholder="e.g., The product fits better in the new category because..."
                value={categoryChangeReason}
                onChange={(e) => setCategoryChangeReason(e.target.value)}
                rows={4}
              />
            </div>
            {pendingFormData && (
              <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                <p>
                  <span className="font-medium">Current Category:</span>{" "}
                  {allSubCategories.find((sc: SubCategory) => sc.id === product?.subCategoryId)?.name || "Unknown"}
                </p>
                <p>
                  <span className="font-medium">New Category:</span>{" "}
                  {allSubCategories.find((sc: SubCategory) => sc.id.toString() === pendingFormData.subCategoryId)?.name || "Unknown"}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCategoryChangeDialogOpen(false);
                setCategoryChangeReason("");
                setPendingFormData(null);
                // Reset category to original
                form.setValue('subCategoryId', product?.subCategoryId?.toString() || '');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCategoryChangeSubmit}
              disabled={categoryChangeMutation.isPending || !categoryChangeReason.trim()}
            >
              {categoryChangeMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Request"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
