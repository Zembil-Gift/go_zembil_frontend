import { useState, useEffect } from "react";
import { useForm, Controller, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { vendorService, VendorProfile } from "@/services/vendorService";
import { apiService } from "@/services/apiService";
import { imageService } from "@/services/imageService";

const isEthiopianVendor = (
  vendorProfile: VendorProfile | undefined
): boolean => {
  if (!vendorProfile) return false;
  return vendorProfile.countryCode === "ET";
};
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUpload } from "@/components/ImageUpload";
import { TagInput } from "@/components/TagInput";
import { SubcategorySearchCombobox } from "@/components/SubcategorySearchCombobox";
import {
  ArrowLeft,
  Package,
  AlertCircle,
  Plus,
  Trash2,
  Info,
  Gift,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";

interface Currency {
  id: number;
  code: string;
  name: string;
  symbol: string;
}

const attributeSchema = z.object({
  name: z.string().min(1, "Attribute name is required"),
  value: z.string().min(1, "Attribute value is required"),
});

const skuSchema = z.object({
  skuCode: z.string().min(1, "SKU code is required"),
  skuName: z.string().min(1, "Variant name is required"),
  stockQuantity: z.number().min(0, "Stock cannot be negative"),
  amount: z.number().min(0, "Price must be a valid number"),
  attributes: z.array(attributeSchema).optional(),
});

const productSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(5, "Product name must be at least 5 characters")
      .max(255),
    description: z
      .string()
      .trim()
      .min(50, "Description must be at least 50 characters")
      .max(1000),
    summary: z
      .string()
      .trim()
      .min(20, "Short summary must be at least 20 characters")
      .max(500),
    cover: z.string().url("Must be a valid URL").optional().or(z.literal("")),
    subCategoryId: z.string().min(1, "Sub-Category is required"),
    tags: z.array(z.string()).optional(),
    occasion: z.string().optional(),
    currencyCode: z.string().min(1, "Currency is required"),
    giftWrappable: z.boolean().optional(),
    giftWrapPrice: z
      .number()
      .min(0, "Gift wrap price must be positive")
      .optional(),
    productSku: z
      .array(skuSchema)
      .min(1, "At least one product SKU is required"),
  })
  .refine(
    (data) => {
      // Check for duplicate variant names
      const variantNames = data.productSku.map((sku) =>
        sku.skuName.trim().toLowerCase()
      );
      const uniqueNames = new Set(variantNames);
      return uniqueNames.size === variantNames.length;
    },
    {
      message: "Each variant must have a unique name",
      path: ["productSku"],
    }
  );

type ProductFormData = z.infer<typeof productSchema>;

type ProductDraft = {
  formData: ProductFormData;
  currentStep: number;
  updatedAt: string;
};

const PRODUCT_DRAFT_STORAGE_KEY = "vendor:create-product-draft:v1";
const TOTAL_STEPS = 4;
const STEP_TITLES = [
  "Basic Information",
  "Category",
  "Pricing",
  "Gift Wrapping",
];

const DEFAULT_PRODUCT_VALUES: ProductFormData = {
  name: "",
  description: "",
  summary: "",
  cover: "",
  subCategoryId: "",
  tags: [],
  occasion: "",
  currencyCode: "ETB",
  giftWrappable: false,
  giftWrapPrice: 0,
  productSku: [
    {
      skuCode: "",
      skuName: "",
      stockQuantity: 0,
      amount: 0,
      attributes: [],
    },
  ],
};

const clampStep = (step: number) =>
  Math.min(TOTAL_STEPS, Math.max(1, Math.floor(step || 1)));

const normalizeDraftFormData = (formData?: Partial<ProductFormData>) => {
  const normalizedSkus =
    Array.isArray(formData?.productSku) && formData.productSku.length > 0
      ? formData.productSku.map((sku) => ({
          skuCode: sku?.skuCode || "",
          skuName: sku?.skuName || "",
          stockQuantity: sku?.stockQuantity ?? 0,
          amount: sku?.amount ?? 0,
          attributes: Array.isArray(sku?.attributes) ? sku.attributes : [],
        }))
      : DEFAULT_PRODUCT_VALUES.productSku;

  return {
    ...DEFAULT_PRODUCT_VALUES,
    ...formData,
    productSku: normalizedSkus,
  };
};

const getStoredDraft = (): ProductDraft | null => {
  if (typeof window === "undefined") return null;

  try {
    const rawDraft = localStorage.getItem(PRODUCT_DRAFT_STORAGE_KEY);
    if (!rawDraft) return null;

    const parsed = JSON.parse(rawDraft) as Partial<ProductDraft>;
    if (!parsed?.formData) return null;

    return {
      formData: normalizeDraftFormData(parsed.formData),
      currentStep: clampStep(parsed.currentStep ?? 1),
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch {
    return null;
  }
};

const hasMeaningfulDraftData = (
  formData: ProductFormData,
  hasPendingImages: boolean
) => {
  const hasBasicDetails =
    Boolean(formData.name.trim()) ||
    Boolean(formData.summary.trim()) ||
    Boolean(formData.description.trim());

  const hasCategoryDetails =
    Boolean(formData.subCategoryId) ||
    Boolean(formData.occasion) ||
    (formData.tags?.length || 0) > 0;

  const hasGiftWrapDetails =
    Boolean(formData.giftWrappable) || (formData.giftWrapPrice || 0) > 0;

  const hasSkuDetails = formData.productSku.some((sku) => {
    const hasAttributes = (sku.attributes || []).some(
      (attr) => Boolean(attr.name?.trim()) || Boolean(attr.value?.trim())
    );

    return (
      Boolean(sku.skuName?.trim()) ||
      sku.stockQuantity > 0 ||
      sku.amount > 0 ||
      hasAttributes
    );
  });

  return (
    hasBasicDetails ||
    hasCategoryDetails ||
    hasGiftWrapDetails ||
    hasSkuDetails ||
    hasPendingImages
  );
};

const saveDraft = (
  formData: ProductFormData,
  currentStep: number,
  hasPendingImages: boolean
) => {
  if (typeof window === "undefined") return;

  try {
    if (!hasMeaningfulDraftData(formData, hasPendingImages)) {
      localStorage.removeItem(PRODUCT_DRAFT_STORAGE_KEY);
      return;
    }

    const draft: ProductDraft = {
      formData,
      currentStep: clampStep(currentStep),
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(PRODUCT_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Ignore storage errors so user can still complete product creation.
  }
};

const normalizeSkuSegment = (value: string, fallback: string) => {
  const clean = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return clean.slice(0, 3).padEnd(3, fallback);
};

const createDateBasedRandomDigits = () => {
  const timestampPart = Date.now().toString().slice(-4);
  const randomPart = Math.floor(Math.random() * 100)
    .toString()
    .padStart(2, "0");
  return `${timestampPart}${randomPart}`;
};

const extractSkuSuffix = (skuCode?: string) => {
  if (!skuCode) return null;
  const match = skuCode.match(/-(\d{6})$/);
  return match ? match[1] : null;
};

const generateSkuCode = (
  productName: string,
  variantName: string,
  existingSkuCode?: string
) => {
  const productSegment = normalizeSkuSegment(productName || "", "X");
  const variantSegment = normalizeSkuSegment(variantName || "", "X");
  const randomDigits =
    extractSkuSuffix(existingSkuCode) || createDateBasedRandomDigits();
  return `SKU-${productSegment}-${variantSegment}-${randomDigits}`;
};

export default function CreateProduct() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isVendor = user?.role?.toUpperCase() === "VENDOR";

  const [pendingSkuImages, setPendingSkuImages] = useState<
    Record<number, File[]>
  >({});
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isDraftInitialized, setIsDraftInitialized] = useState(false);
  const [showDraftDecision, setShowDraftDecision] = useState(false);
  const [storedDraft, setStoredDraft] = useState<ProductDraft | null>(null);

  const { data: currencies = [] } = useQuery({
    queryKey: ["currencies"],
    queryFn: () => apiService.getRequest<Currency[]>("/api/currencies"),
  });

  const { data: vendorProfile } = useQuery({
    queryKey: ["vendor", "profile"],
    queryFn: () => vendorService.getMyProfile(),
    enabled: isAuthenticated && isVendor,
  });

  const availableCurrencies = isEthiopianVendor(vendorProfile)
    ? currencies.filter((c) => c.code === "ETB")
    : currencies;

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: DEFAULT_PRODUCT_VALUES,
  });

  const {
    fields: skuFields,
    append: appendSku,
    remove: removeSku,
  } = useFieldArray({
    control: form.control,
    name: "productSku",
  });

  const watchedProductName = useWatch({
    control: form.control,
    name: "name",
    defaultValue: "",
  });
  const watchedSkus = useWatch({
    control: form.control,
    name: "productSku",
    defaultValue: [],
  });

  useEffect(() => {
    const draft = getStoredDraft();

    if (draft) {
      setStoredDraft(draft);
      setShowDraftDecision(true);
      setIsDraftInitialized(false);
      return;
    }

    setIsDraftInitialized(true);
  }, []);

  // Update currencyCode when vendorProfile and currencies load
  useEffect(() => {
    if (vendorProfile && currencies.length > 0) {
      const currentCurrency = form.getValues("currencyCode");

      if (isEthiopianVendor(vendorProfile) && currentCurrency !== "ETB") {
        form.setValue("currencyCode", "ETB");
      }

      if (
        !isEthiopianVendor(vendorProfile) &&
        (!currentCurrency ||
          !currencies.some((currency) => currency.code === currentCurrency))
      ) {
        form.setValue("currencyCode", currencies[0]?.code || "ETB");
      }
    }
  }, [vendorProfile, currencies, form]);

  useEffect(() => {
    if (!isDraftInitialized || showDraftDecision) return;

    const hasPendingImages = Object.values(pendingSkuImages).some(
      (images) => images.length > 0
    );

    const subscription = form.watch(() => {
      saveDraft(form.getValues(), currentStep, hasPendingImages);
    });

    return () => subscription.unsubscribe();
  }, [
    form,
    currentStep,
    isDraftInitialized,
    showDraftDecision,
    pendingSkuImages,
  ]);

  useEffect(() => {
    if (!isDraftInitialized || showDraftDecision) return;

    const hasPendingImages = Object.values(pendingSkuImages).some(
      (images) => images.length > 0
    );

    saveDraft(form.getValues(), currentStep, hasPendingImages);
  }, [
    currentStep,
    form,
    isDraftInitialized,
    showDraftDecision,
    pendingSkuImages,
  ]);

  useEffect(() => {
    if (!Array.isArray(watchedSkus) || watchedSkus.length === 0) return;

    watchedSkus.forEach((sku, skuIndex) => {
      const currentSkuCode = sku?.skuCode || "";
      const currentVariantName = sku?.skuName || "";
      const hasProductAndVariantNames =
        Boolean(watchedProductName?.trim()) &&
        Boolean(currentVariantName?.trim());

      if (!hasProductAndVariantNames) {
        if (currentSkuCode) {
          form.setValue(`productSku.${skuIndex}.skuCode`, "", {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true,
          });
        }
        return;
      }

      const generatedSkuCode = generateSkuCode(
        watchedProductName || "",
        currentVariantName || "",
        currentSkuCode
      );

      if (currentSkuCode !== generatedSkuCode) {
        form.setValue(`productSku.${skuIndex}.skuCode`, generatedSkuCode, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        });
      }
    });
  }, [form, watchedProductName, watchedSkus]);

  const handleStartNewDraft = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(PRODUCT_DRAFT_STORAGE_KEY);
    }

    setPendingSkuImages({});
    setCurrentStep(1);
    form.reset(DEFAULT_PRODUCT_VALUES);
    setStoredDraft(null);
    setShowDraftDecision(false);
    setIsDraftInitialized(true);

    toast({
      title: "New Draft Started",
      description: "A fresh product draft is ready.",
    });
  };

  const handleContinueDraft = () => {
    if (!storedDraft) {
      setShowDraftDecision(false);
      setIsDraftInitialized(true);
      return;
    }

    form.reset(normalizeDraftFormData(storedDraft.formData));
    const restoredStep = clampStep(storedDraft.currentStep);
    setCurrentStep(restoredStep);
    setShowDraftDecision(false);
    setIsDraftInitialized(true);

    toast({
      title: "Draft Restored",
      description:
        "Your previous product draft has been loaded. SKU images need to be re-uploaded.",
    });
  };

  const addSku = () => {
    appendSku({
      skuCode: "",
      skuName: "",
      stockQuantity: 0,
      amount: 0,
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

  const createProductMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      console.log("=== Creating Product - Mutation Started ===");
      console.log("Form data:", data);

      const productPayload: any = {
        name: data.name,
        description: data.description || undefined,
        summary: data.summary || undefined,
        subCategoryId: parseInt(data.subCategoryId),
        tags: data.tags && data.tags.length > 0 ? data.tags : undefined,
        occasion: data.occasion || undefined,
        giftWrappable: data.giftWrappable || false,
        giftWrapPrice:
          data.giftWrappable && data.giftWrapPrice
            ? data.giftWrapPrice
            : undefined,
        giftWrapCurrencyCode:
          data.giftWrappable && data.giftWrapPrice
            ? data.currencyCode
            : undefined,
      };

      // SKUs are required - first one is default
      if (data.productSku && data.productSku.length > 0) {
        console.log("Adding SKUs to payload");
        productPayload.productSku = data.productSku.map((sku, index) => ({
          skuCode: sku.skuCode,
          skuName: sku.skuName, // Add skuName to payload
          stockQuantity: sku.stockQuantity,
          isDefault: index === 0,
          price: {
            currencyCode: data.currencyCode,
            amount: sku.amount,
          },
          attributes:
            sku.attributes?.filter((attr) => attr.name && attr.value) || [],
        }));
      }

      console.log("Final payload:", JSON.stringify(productPayload, null, 2));

      const maxFileSize = 10 * 1024 * 1024; // 10MB in bytes
      const validateFileSize = (files: File[], label: string) => {
        for (const file of files) {
          if (file.size > maxFileSize) {
            throw new Error(
              `${label}: "${file.name}" exceeds the 10MB file size limit (${(
                file.size /
                1024 /
                1024
              ).toFixed(2)}MB)`
            );
          }
        }
      };

      for (const [skuIndex, images] of Object.entries(pendingSkuImages)) {
        if (images.length > 0) {
          validateFileSize(images, `Variant #${parseInt(skuIndex) + 1} image`);
        }
      }

      const createdProduct = await vendorService.createProduct(productPayload);

      if (
        createdProduct?.productSku &&
        Object.keys(pendingSkuImages).length > 0
      ) {
        setIsUploadingImages(true);
        try {
          for (const [skuIndexStr, images] of Object.entries(
            pendingSkuImages
          )) {
            const skuIndex = parseInt(skuIndexStr, 10);
            const sku = createdProduct.productSku[skuIndex];

            if (images.length > 0 && sku?.id) {
              console.log(
                `Uploading ${images.length} images for SKU ${sku.id}...`
              );
              try {
                await imageService.uploadSkuImages(sku.id, images);
                console.log(`SKU ${sku.id} images uploaded successfully`);
              } catch (skuImageError: any) {
                console.error(
                  `Failed to upload images for SKU ${sku.id}:`,
                  skuImageError
                );
                // Rollback: Delete the created product
                try {
                  if (createdProduct?.id) {
                    await vendorService.deleteProduct(createdProduct.id);
                    console.log(
                      `Product ${createdProduct.id} rolled back due to image upload failure`
                    );
                  }
                } catch (deleteError) {
                  console.error("Failed to rollback product:", deleteError);
                }

                if (
                  skuImageError?.response?.status === 413 ||
                  skuImageError?.response?.data?.error === "FILE_SIZE_EXCEEDED"
                ) {
                  throw new Error(
                    skuImageError?.response?.data?.message ||
                      "File size exceeds the maximum allowed limit"
                  );
                }
                throw new Error(
                  "Image upload failed. Product creation has been rolled back. Please try again."
                );
              }
            }
          }
        } catch (error: any) {
          setIsUploadingImages(false);
          throw error; // Re-throw to trigger onError
        } finally {
          setIsUploadingImages(false);
        }
      }

      return createdProduct;
    },
    onSuccess: () => {
      if (typeof window !== "undefined") {
        localStorage.removeItem(PRODUCT_DRAFT_STORAGE_KEY);
      }

      // Invalidate relevant queries so lists refresh immediately
      queryClient.invalidateQueries({ queryKey: ["vendor", "my-products"] });
      queryClient.invalidateQueries({ queryKey: ["vendor", "products"] });
      queryClient.invalidateQueries({
        queryKey: ["vendor", "pending-rejected-products"],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "pending-products"],
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "all-products"] });

      toast({
        title: "Product Created",
        description: "Your product has been submitted for admin approval.",
      });
      navigate("/vendor");
    },
    onError: (error: any) => {
      setIsUploadingImages(false);
      toast({
        title: "Error",
        description: error.message || "Failed to create product",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProductFormData) => {
    console.log("Form submitted with data:", data);
    console.log("Product SKUs:", data.productSku);

    if (!data.productSku || data.productSku.length === 0) {
      toast({
        title: "Validation Error",
        description:
          "At least one product SKU is required. Stock is managed at the SKU level.",
        variant: "destructive",
      });
      return;
    }

    for (let i = 0; i < data.productSku.length; i++) {
      const sku = data.productSku[i];

      const skuImages = pendingSkuImages[i] || [];
      if (skuImages.length === 0) {
        toast({
          title: "Image Required",
          description: `Please upload at least one image for ${
            data.productSku.length === 1
              ? "your product"
              : `variant #${i + 1} (${sku.skuCode || "unnamed"})`
          }.`,
          variant: "destructive",
        });
        return;
      }
    }

    createProductMutation.mutate(data);
  };

  const onError = (errors: any) => {
    console.log("Form validation errors:", errors);

    if (errors.name || errors.summary || errors.description) {
      setCurrentStep(1);
    } else if (errors.subCategoryId) {
      setCurrentStep(2);
    } else if (errors.currencyCode || errors.productSku) {
      setCurrentStep(3);
    } else if (errors.giftWrapPrice || errors.giftWrappable) {
      setCurrentStep(4);
    }

    const errorMessages: string[] = [];
    if (errors.name)
      errorMessages.push(errors.name.message || "Product name is invalid");
    if (errors.summary)
      errorMessages.push(errors.summary.message || "Short summary is invalid");
    if (errors.description)
      errorMessages.push(
        errors.description.message || "Description is invalid"
      );
    if (errors.subCategoryId) errorMessages.push("Sub-Category is required");
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
              errorMessages.push(
                `${variantLabel}: ${skuError.skuName.message}`
              );
              foundSpecificSkuError = true;
            }
            if (skuError.skuCode) {
              errorMessages.push(
                `${variantLabel}: ${skuError.skuCode.message}`
              );
              foundSpecificSkuError = true;
            }
            if (skuError.amount) {
              errorMessages.push(`${variantLabel}: ${skuError.amount.message}`);
              foundSpecificSkuError = true;
            }
            if (skuError.stockQuantity) {
              errorMessages.push(
                `${variantLabel}: ${skuError.stockQuantity.message}`
              );
              foundSpecificSkuError = true;
            }
          }
        });
      }
      // Only show generic message if there are SKU errors but we didn't find specific field errors
      if (!foundSpecificSkuError) {
        errorMessages.push(
          "Please check variant details - ensure all required fields are filled"
        );
      }
    }

    toast({
      title: "Validation Error",
      description:
        errorMessages.length > 0
          ? errorMessages.join(". ")
          : "Please fill in all required fields correctly.",
      variant: "destructive",
    });
  };

  const handleNextStep = async () => {
    const fieldsByStep: Record<number, Array<keyof ProductFormData>> = {
      1: ["name", "summary", "description"],
      2: ["subCategoryId"],
      3: ["currencyCode", "productSku"],
      4: [],
    };

    const fieldsToValidate = fieldsByStep[currentStep] || [];
    const isStepValid =
      fieldsToValidate.length === 0
        ? true
        : await form.trigger(fieldsToValidate as any);

    if (!isStepValid) {
      toast({
        title: "Validation Error",
        description:
          "Please complete required fields before going to the next step.",
        variant: "destructive",
      });
      return;
    }

    setCurrentStep((prev) => clampStep(prev + 1));
  };

  if (!isAuthenticated || !isVendor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <AlertCircle className="h-16 w-16 text-amber-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-600 mb-4">
          You need to be a vendor to create products.
        </p>
        <Button asChild>
          <Link to="/vendor-signup">Become a Vendor</Link>
        </Button>
      </div>
    );
  }

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
          <div>
            <h1 className="text-2xl font-bold">Create Product</h1>
            <p className="text-muted-foreground">
              Add a new product to your catalog (requires admin approval)
            </p>
          </div>
        </div>

        {showDraftDecision && storedDraft ? (
          <Card>
            <CardHeader>
              <CardTitle>Saved Draft Found</CardTitle>
              <CardDescription>
                You have a saved product draft from{" "}
                {new Date(storedDraft.updatedAt).toLocaleString()}. You can
                continue where you stopped or start a brand-new product.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-3 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleStartNewDraft}
              >
                Create New Product
              </Button>
              <Button type="button" onClick={handleContinueDraft}>
                Continue Draft
              </Button>
            </CardContent>
          </Card>
        ) : (
          <form
            onSubmit={form.handleSubmit(onSubmit, onError)}
            className="space-y-6"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {STEP_TITLES.map((stepTitle, index) => {
                const stepNumber = index + 1;
                const isActive = stepNumber === currentStep;
                const isCompleted = stepNumber < currentStep;

                return (
                  <div
                    key={stepTitle}
                    className={`rounded-lg border p-3 text-center text-sm ${
                      isActive
                        ? "border-eagle-green bg-white font-semibold"
                        : isCompleted
                        ? "border-green-200 bg-green-50"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <p className="text-xs text-muted-foreground">
                      Step {stepNumber}
                    </p>
                    <p>{stepTitle}</p>
                  </div>
                );
              })}
            </div>

            {/* Basic Information */}
            {currentStep === 1 && (
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
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.name.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="summary">Short Summary *</Label>
                    <Input
                      id="summary"
                      placeholder="Brief product summary"
                      {...form.register("summary")}
                    />
                    {form.formState.errors.summary && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.summary.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      placeholder="Detailed product description"
                      className="min-h-[120px]"
                      {...form.register("description")}
                    />
                    {form.formState.errors.description && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.description.message}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Category */}
            {currentStep === 2 && (
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
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.subCategoryId.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="occasion">Occasion (Optional)</Label>
                    <Controller
                      name="occasion"
                      control={form.control}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
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
            )}

            {/* Pricing */}
            {currentStep === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle>Pricing *</CardTitle>
                  <CardDescription>
                    Set the currency and prices for your product variants.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* VAT Notice */}
                  <Alert className="border-blue-200 bg-blue-50">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertTitle className="text-blue-800">
                      Pricing Information
                    </AlertTitle>
                    <AlertDescription className="text-blue-700">
                      Enter your price (what you'll receive).
                      {vendorProfile?.vatStatus === "VAT_REGISTERED" && (
                        <span className="block mt-1 font-medium">
                          As a VAT-registered vendor, VAT will be included in
                          the customer price.
                        </span>
                      )}
                    </AlertDescription>
                  </Alert>

                  {/* Currency Selection */}
                  {!isEthiopianVendor(vendorProfile) ? (
                    <div>
                      <Label>Currency *</Label>
                      <Controller
                        name="currencyCode"
                        control={form.control}
                        render={({ field }) => (
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select currency" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableCurrencies.map((currency) => (
                                <SelectItem
                                  key={currency.id}
                                  value={currency.code}
                                >
                                  {currency.code} - {currency.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {form.formState.errors.currencyCode && (
                        <p className="text-sm text-red-600 mt-1">
                          {form.formState.errors.currencyCode.message}
                        </p>
                      )}
                    </div>
                  ) : null}

                  {/* Product SKUs Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base">
                          Product Variants (SKUs)
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Manage stock and pricing for your product. Add
                          multiple variants if you have different sizes, colors,
                          etc.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addSku}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Variant
                      </Button>
                    </div>

                    {skuFields.map((field, skuIndex) => {
                      const attributes =
                        form.watch(`productSku.${skuIndex}.attributes`) || [];

                      return (
                        <Card key={field.id} className="border-2">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base">
                                {skuFields.length === 1
                                  ? "Product SKU"
                                  : `Variant #${skuIndex + 1}`}
                              </CardTitle>
                              {/* Only show delete button if more than one SKU exists */}
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
                                placeholder={
                                  skuFields.length === 1
                                    ? "e.g., Default"
                                    : "e.g., Red Medium"
                                }
                                {...form.register(
                                  `productSku.${skuIndex}.skuName`
                                )}
                              />
                              {form.formState.errors.productSku?.[skuIndex]
                                ?.skuName && (
                                <p className="text-sm text-red-600 mt-1">
                                  {
                                    form.formState.errors.productSku[skuIndex]
                                      ?.skuName?.message
                                  }
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">
                                A friendly name for this variant (e.g., "Red
                                Large T-Shirt")
                              </p>
                            </div>

                            {/* SKU Code and Stock */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label>SKU Code *</Label>
                                <Controller
                                  name={`productSku.${skuIndex}.skuCode`}
                                  control={form.control}
                                  render={({ field }) => (
                                    <Input
                                      value={field.value || ""}
                                      readOnly
                                      disabled
                                      className="bg-muted"
                                    />
                                  )}
                                />
                                {form.formState.errors.productSku?.[skuIndex]
                                  ?.skuCode && (
                                  <p className="text-sm text-red-600 mt-1">
                                    {
                                      form.formState.errors.productSku[skuIndex]
                                        ?.skuCode?.message
                                    }
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground mt-1">
                                  Auto-generated from product and variant names
                                </p>
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
                                      value={field.value || ""}
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        if (value === "") {
                                          field.onChange(0);
                                        } else {
                                          field.onChange(parseInt(value, 10));
                                        }
                                      }}
                                      onBlur={field.onBlur}
                                    />
                                  )}
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                  Available units in stock
                                </p>
                              </div>
                            </div>

                            {/* SKU Price */}
                            <div>
                              <Label>
                                {isEthiopianVendor(vendorProfile)
                                  ? "Price (ETB) *"
                                  : `Price (${
                                      form.watch("currencyCode") || "Currency"
                                    }) *`}
                              </Label>
                              <Controller
                                name={`productSku.${skuIndex}.amount`}
                                control={form.control}
                                render={({ field }) => (
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="0.00"
                                    value={field.value || ""}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      if (value === "") {
                                        field.onChange(0);
                                      } else {
                                        // Use Math.round to avoid floating point precision issues
                                        const numValue = parseFloat(value);
                                        if (!isNaN(numValue)) {
                                          // Round to 2 decimal places using Math.round to avoid floating point errors
                                          field.onChange(
                                            Math.round(numValue * 100) / 100
                                          );
                                        }
                                      }
                                    }}
                                    onBlur={field.onBlur}
                                  />
                                )}
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                This is what you'll receive. Platform fee will
                                be added for customers.
                              </p>
                            </div>

                            {/* Attributes */}
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <Label className="text-sm">
                                  Attributes (Size, Color, etc.)
                                </Label>
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
                                  No attributes added. Click "Add Attribute" to
                                  add size, color, etc.
                                </p>
                              )}

                              {attributes.map((_, attrIndex) => (
                                <div
                                  key={attrIndex}
                                  className="flex items-center gap-2"
                                >
                                  <Input
                                    placeholder="Name (e.g., Size)"
                                    {...form.register(
                                      `productSku.${skuIndex}.attributes.${attrIndex}.name`
                                    )}
                                    className="flex-1"
                                  />
                                  <Input
                                    placeholder="Value (e.g., Large)"
                                    {...form.register(
                                      `productSku.${skuIndex}.attributes.${attrIndex}.value`
                                    )}
                                    className="flex-1"
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      removeAttribute(skuIndex, attrIndex)
                                    }
                                    className="text-destructive hover:text-destructive shrink-0"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>

                            {/* SKU Images */}
                            <div className="space-y-3">
                              <Label className="text-sm">Images *</Label>
                              <p className="text-xs text-muted-foreground">
                                Upload images for this{" "}
                                {skuFields.length === 1 ? "product" : "variant"}
                                . The first image will be the cover.
                              </p>
                              <ImageUpload
                                images={[]}
                                onFilesSelected={(files) => {
                                  setPendingSkuImages((prev) => ({
                                    ...prev,
                                    [skuIndex]: [
                                      ...(prev[skuIndex] || []),
                                      ...files,
                                    ],
                                  }));
                                }}
                                maxImages={10}
                                isUploading={isUploadingImages}
                                disabled={createProductMutation.isPending}
                                label=""
                                helperText={`Upload images for this ${
                                  skuFields.length === 1 ? "product" : "variant"
                                }. First image will be the cover.`}
                              />
                              {pendingSkuImages[skuIndex] &&
                                pendingSkuImages[skuIndex].length > 0 && (
                                  <p className="text-sm text-muted-foreground">
                                    {pendingSkuImages[skuIndex].length} image(s)
                                    will be uploaded
                                  </p>
                                )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Gift Wrapping Options */}
            {currentStep === 4 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gift className="h-5 w-5" />
                    Gift Wrapping
                  </CardTitle>
                  <CardDescription>
                    Allow customers to add gift wrapping for an additional fee.
                  </CardDescription>
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
                              form.setValue("giftWrapPrice", 0);
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
                        Gift Wrapping Fee (
                        {form.watch("currencyCode") || "Currency"})
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
                            value={field.value || ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === "") {
                                field.onChange(0);
                              } else {
                                const numValue = parseFloat(value);
                                if (!isNaN(numValue)) {
                                  field.onChange(
                                    Math.round(numValue * 100) / 100
                                  );
                                }
                              }
                            }}
                            onBlur={field.onBlur}
                          />
                        )}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Additional charge per item for gift wrapping. Set to 0
                        for free gift wrapping.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Step Actions */}
            <div className="flex flex-wrap justify-end gap-4">
              <Button type="button" variant="outline" asChild>
                <Link to="/vendor">Cancel</Link>
              </Button>

              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep((prev) => clampStep(prev - 1))}
                >
                  Back
                </Button>
              )}

              {currentStep < TOTAL_STEPS ? (
                <Button type="button" onClick={handleNextStep}>
                  Next
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={createProductMutation.isPending}
                >
                  {createProductMutation.isPending
                    ? "Creating..."
                    : "Create Product"}
                </Button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
