import { useState, useEffect } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { customOrderTemplateService } from "@/services/customOrderTemplateService";
import { vendorService } from "@/services/vendorService";
import { apiService } from "@/services/apiService";
import { imageService } from "@/services/imageService";
import { SubcategorySearchCombobox } from "@/components/SubcategorySearchCombobox";
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
import { Switch } from "@/components/ui/switch";
import { ImageUpload } from "@/components/ImageUpload";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Package,
  AlertCircle,
  Plus,
  Trash2,
  Camera,
  Info,
  GripVertical,
  Type,
  Hash,
  Image as ImageIcon,
  Video,
} from "lucide-react";
import type {
  CreateCustomOrderTemplateRequest,
  CustomizationFieldType,
} from "@/types/customOrders";

// Field type options
const FIELD_TYPES: {
  value: CustomizationFieldType;
  label: string;
  icon: React.ReactNode;
}[] = [
  { value: "TEXT", label: "Text", icon: <Type className="h-4 w-4" /> },
  { value: "NUMBER", label: "Number", icon: <Hash className="h-4 w-4" /> },
  { value: "IMAGE", label: "Image", icon: <ImageIcon className="h-4 w-4" /> },
  { value: "VIDEO", label: "Video", icon: <Video className="h-4 w-4" /> },
];

// Customization field schema
const customizationFieldSchema = z.object({
  fieldName: z.string().min(1, "Field name is required").max(128),
  fieldType: z.enum(["TEXT", "NUMBER", "IMAGE", "VIDEO"]),
  required: z.boolean().default(false),
  description: z.string().max(500).optional(),
  sortOrder: z.number().default(0),
});

// Template schema
const templateSchema = z.object({
  name: z.string().min(1, "Template name is required").max(255),
  description: z.string().min(1, "Description is required").max(5000),
  basePrice: z.number().min(0.01, "Base price must be greater than 0"),
  currency: z.string().min(3, "Currency is required").max(3),
  categoryId: z.number().optional(),
  negotiable: z.boolean().default(true),
  fields: z
    .array(customizationFieldSchema)
    .min(1, "At least one customization field is required"),
});

type TemplateFormData = z.infer<typeof templateSchema>;

type TemplateDraft = {
  formData: TemplateFormData;
  currentStep: number;
  updatedAt: string;
};

const TEMPLATE_DRAFT_STORAGE_KEY = "vendor:create-custom-template-draft:v1";
const TEMPLATE_TOTAL_STEPS = 3;
const TEMPLATE_STEP_TITLES = [
  "Basic Information",
  "Pricing & Category",
  "Customization Fields",
];

const DEFAULT_TEMPLATE_VALUES: TemplateFormData = {
  name: "",
  description: "",
  basePrice: 0,
  currency: "ETB",
  categoryId: 0,
  negotiable: true,
  fields: [
    {
      fieldName: "",
      fieldType: "TEXT",
      required: false,
      description: "",
      sortOrder: 0,
    },
  ],
};

const clampTemplateStep = (step: number) =>
  Math.min(TEMPLATE_TOTAL_STEPS, Math.max(1, Math.floor(step || 1)));

const hasMeaningfulTemplateDraftData = (
  formData: TemplateFormData,
  hasPendingImages: boolean
) => {
  const hasMainInfo =
    Boolean(formData.name.trim()) || Boolean(formData.description.trim());
  const hasPricing = formData.basePrice > 0 || Boolean(formData.categoryId);
  const hasFieldDetails = formData.fields.some(
    (field) =>
      Boolean(field.fieldName?.trim()) ||
      Boolean(field.description?.trim()) ||
      field.required ||
      field.fieldType !== "TEXT"
  );

  return hasMainInfo || hasPricing || hasFieldDetails || hasPendingImages;
};

const getStoredTemplateDraft = (): TemplateDraft | null => {
  if (typeof window === "undefined") return null;

  try {
    const rawDraft = localStorage.getItem(TEMPLATE_DRAFT_STORAGE_KEY);
    if (!rawDraft) return null;

    const parsed = JSON.parse(rawDraft) as Partial<TemplateDraft>;
    if (!parsed?.formData) return null;

    return {
      formData: {
        ...DEFAULT_TEMPLATE_VALUES,
        ...parsed.formData,
        fields:
          Array.isArray(parsed.formData.fields) &&
          parsed.formData.fields.length > 0
            ? parsed.formData.fields
            : DEFAULT_TEMPLATE_VALUES.fields,
      },
      currentStep: clampTemplateStep(parsed.currentStep ?? 1),
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch {
    return null;
  }
};

const saveTemplateDraft = (
  formData: TemplateFormData,
  currentStep: number,
  hasPendingImages: boolean
) => {
  if (typeof window === "undefined") return;

  try {
    if (!hasMeaningfulTemplateDraftData(formData, hasPendingImages)) {
      localStorage.removeItem(TEMPLATE_DRAFT_STORAGE_KEY);
      return;
    }

    const draft: TemplateDraft = {
      formData,
      currentStep: clampTemplateStep(currentStep),
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(TEMPLATE_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Ignore storage errors
  }
};

interface Currency {
  id: number;
  code: string;
  name: string;
  symbol: string;
}
// Helper function to check if vendor is Ethiopian
const isEthiopianVendor = (vendorProfile: any): boolean => {
  if (!vendorProfile) return false;
  return vendorProfile.countryCode === "ET";
};

export default function CreateCustomTemplate() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isDraftInitialized, setIsDraftInitialized] = useState(false);
  const [showDraftDecision, setShowDraftDecision] = useState(false);
  const [storedDraft, setStoredDraft] = useState<TemplateDraft | null>(null);

  const isVendor = user?.role?.toUpperCase() === "VENDOR";

  // Fetch currencies
  const { data: currencies = [] } = useQuery({
    queryKey: ["currencies"],
    queryFn: () => apiService.getRequest<Currency[]>("/api/currencies"),
  });

  // Fetch vendor profile
  const { data: vendorProfile } = useQuery({
    queryKey: ["vendor", "profile"],
    queryFn: () => vendorService.getMyProfile(),
    enabled: isAuthenticated && isVendor,
  });

  const availableCurrencies = isEthiopianVendor(vendorProfile)
    ? currencies.filter((c) => c.code === "ETB")
    : currencies;

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: DEFAULT_TEMPLATE_VALUES,
  });

  // Update currency when vendorProfile and currencies load
  useEffect(() => {
    if (vendorProfile && currencies.length > 0) {
      const currentCurrency = form.getValues("currency");
      if (isEthiopianVendor(vendorProfile) && currentCurrency !== "ETB") {
        form.setValue("currency", "ETB");
      }
      if (
        !isEthiopianVendor(vendorProfile) &&
        (!currentCurrency ||
          !currencies.some((currency) => currency.code === currentCurrency))
      ) {
        form.setValue("currency", currencies[0]?.code || "ETB");
      }
    }
  }, [vendorProfile, currencies, form]);

  useEffect(() => {
    const draft = getStoredTemplateDraft();
    if (draft) {
      setStoredDraft(draft);
      setShowDraftDecision(true);
      setIsDraftInitialized(false);
      return;
    }

    setIsDraftInitialized(true);
  }, []);

  useEffect(() => {
    if (!isDraftInitialized || showDraftDecision) return;

    const subscription = form.watch(() => {
      saveTemplateDraft(
        form.getValues(),
        currentStep,
        pendingImages.length > 0
      );
    });

    return () => subscription.unsubscribe();
  }, [form, currentStep, isDraftInitialized, showDraftDecision, pendingImages]);

  useEffect(() => {
    if (!isDraftInitialized || showDraftDecision) return;
    saveTemplateDraft(form.getValues(), currentStep, pendingImages.length > 0);
  }, [currentStep, form, isDraftInitialized, showDraftDecision, pendingImages]);

  const handleStartNewDraft = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(TEMPLATE_DRAFT_STORAGE_KEY);
    }

    setPendingImages([]);
    setCurrentStep(1);
    form.reset(DEFAULT_TEMPLATE_VALUES);
    setStoredDraft(null);
    setShowDraftDecision(false);
    setIsDraftInitialized(true);
  };

  const handleContinueDraft = () => {
    if (!storedDraft) {
      setShowDraftDecision(false);
      setIsDraftInitialized(true);
      return;
    }

    form.reset({ ...DEFAULT_TEMPLATE_VALUES, ...storedDraft.formData });
    setCurrentStep(clampTemplateStep(storedDraft.currentStep));
    setShowDraftDecision(false);
    setIsDraftInitialized(true);
    toast({
      title: "Draft Restored",
      description:
        "Your saved template draft has been loaded. Images need re-upload.",
    });
  };

  const handleNextStep = async () => {
    const fieldsByStep: Record<number, Array<keyof TemplateFormData>> = {
      1: ["name", "description"],
      2: ["basePrice", "currency"],
      3: ["fields"],
    };

    const fieldsToValidate = fieldsByStep[currentStep] || [];
    const isValid =
      fieldsToValidate.length === 0
        ? true
        : await form.trigger(fieldsToValidate as any);

    if (!isValid) {
      toast({
        title: "Validation Error",
        description: "Please complete required fields before continuing.",
        variant: "destructive",
      });
      return;
    }

    setCurrentStep((prev) => clampTemplateStep(prev + 1));
  };

  const {
    fields: fieldArray,
    append: appendField,
    remove: removeField,
  } = useFieldArray({
    control: form.control,
    name: "fields",
  });

  const fields = form.watch("fields");

  // Add new customization field
  const addField = () => {
    const newField = {
      fieldName: "",
      fieldType: "TEXT" as CustomizationFieldType,
      required: false,
      description: "",
      sortOrder: fieldArray.length,
    };
    appendField(newField);
  };

  const createTemplateMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      const request: CreateCustomOrderTemplateRequest = {
        name: data.name,
        description: data.description,
        basePrice: data.basePrice, // Send major units directly - backend handles conversion
        currency: data.currency,
        categoryId: data.categoryId || undefined,
        negotiable: data.negotiable, // Whether price negotiation is required
        fields: data.fields.map((field, index) => ({
          fieldName: field.fieldName,
          fieldType: field.fieldType,
          required: field.required,
          description: field.description,
          sortOrder: index,
        })),
      };

      const createdTemplate = await customOrderTemplateService.create(request);

      // Upload images if any
      if (pendingImages.length > 0 && createdTemplate?.id) {
        setIsUploadingImages(true);
        try {
          await imageService.uploadTemplateImages(
            createdTemplate.id,
            pendingImages
          );
        } catch (imageError: any) {
          console.error("Failed to upload template images:", imageError);
          toast({
            title: "Warning",
            description: "Template created but some images failed to upload.",
            variant: "destructive",
          });
        } finally {
          setIsUploadingImages(false);
        }
      }

      return createdTemplate;
    },
    onSuccess: () => {
      if (typeof window !== "undefined") {
        localStorage.removeItem(TEMPLATE_DRAFT_STORAGE_KEY);
      }

      // Invalidate relevant queries so lists refresh immediately
      queryClient.invalidateQueries({
        queryKey: ["vendor", "custom-templates"],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "pending-templates"],
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "all-templates"] });

      toast({
        title: "Template Created",
        description:
          "Your custom order template has been submitted for admin approval.",
      });
      navigate("/vendor/custom-templates");
    },
    onError: (error: any) => {
      setIsUploadingImages(false);
      toast({
        title: "Error",
        description: error.message || "Failed to create template",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TemplateFormData) => {
    // Validation
    if (data.fields.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add at least one customization field.",
        variant: "destructive",
      });
      return;
    }

    // Check for empty field names
    const emptyFields = data.fields.filter((field) => !field.fieldName.trim());
    if (emptyFields.length > 0) {
      toast({
        title: "Validation Error",
        description: "All customization fields must have a name.",
        variant: "destructive",
      });
      return;
    }

    createTemplateMutation.mutate(data);
  };

  const onFormError = (errors: any) => {
    if (errors.name || errors.description) {
      setCurrentStep(1);
    } else if (
      errors.basePrice ||
      errors.currency ||
      errors.categoryId ||
      errors.negotiable
    ) {
      setCurrentStep(2);
    } else if (errors.fields) {
      setCurrentStep(3);
    }

    toast({
      title: "Validation Error",
      description:
        "Please fill all required fields and fix highlighted inputs.",
      variant: "destructive",
    });
  };

  if (!isAuthenticated || !isVendor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <AlertCircle className="h-16 w-16 text-amber-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-600 mb-4">
          You need to be a vendor to create templates.
        </p>
        <Button asChild>
          <Link to="/vendor-signup">Become a Vendor</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/vendor/custom-templates">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Create Custom Order Template</h1>
            <p className="text-muted-foreground">
              Create a customizable product/service template (requires admin
              approval)
            </p>
          </div>
        </div>

        {showDraftDecision && storedDraft ? (
          <Card>
            <CardHeader>
              <CardTitle>Saved Draft Found</CardTitle>
              <CardDescription>
                You have a saved template draft from{" "}
                {new Date(storedDraft.updatedAt).toLocaleString()}. Continue
                where you stopped or start a new template.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-3 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleStartNewDraft}
              >
                Create New Template
              </Button>
              <Button type="button" onClick={handleContinueDraft}>
                Continue Draft
              </Button>
            </CardContent>
          </Card>
        ) : (
          <form
            onSubmit={form.handleSubmit(onSubmit, onFormError)}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {TEMPLATE_STEP_TITLES.map((stepTitle, index) => {
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
                    <Label htmlFor="name">Template Name *</Label>
                    <Input
                      id="name"
                      placeholder="Enter template name"
                      {...form.register("name")}
                    />
                    {form.formState.errors.name && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.name.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe your customizable product/service..."
                      className="min-h-[100px]"
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
            {currentStep === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Pricing & Category
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* VAT Notice */}
                  <Alert className="border-blue-200 bg-blue-50">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertTitle className="text-blue-800">
                      Pricing Information
                    </AlertTitle>
                    <AlertDescription className="text-blue-700">
                      Enter your base price (what you'll receive).
                      {vendorProfile?.vatStatus === "VAT_REGISTERED" && (
                        <span className="block mt-1 font-medium">
                          As a VAT-registered vendor, VAT will be included in
                          the customer price.
                        </span>
                      )}
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>
                        {isEthiopianVendor(vendorProfile)
                          ? "Base Price (ETB) *"
                          : "Base Price *"}
                      </Label>
                      <Controller
                        name="basePrice"
                        control={form.control}
                        render={({ field }) => (
                          <Input
                            type="number"
                            step="0.01"
                            min="0.01"
                            placeholder="0.00"
                            value={field.value || ""}
                            onChange={(e) =>
                              field.onChange(parseFloat(e.target.value) || 0)
                            }
                          />
                        )}
                      />
                      {form.formState.errors.basePrice && (
                        <p className="text-sm text-red-600 mt-1">
                          {form.formState.errors.basePrice.message}
                        </p>
                      )}
                    </div>

                    {!isEthiopianVendor(vendorProfile) && (
                      <div>
                        <Label>Currency *</Label>
                        <Controller
                          name="currency"
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
                        {form.formState.errors.currency && (
                          <p className="text-sm text-red-600 mt-1">
                            {form.formState.errors.currency.message}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Hidden currency field for Ethiopian vendors */}
                    {isEthiopianVendor(vendorProfile) && (
                      <Controller
                        name="currency"
                        control={form.control}
                        render={({ field }) => (
                          <input
                            type="hidden"
                            value="ETB"
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                        )}
                      />
                    )}
                  </div>

                  <div>
                    <Label>Category</Label>
                    <Controller
                      name="categoryId"
                      control={form.control}
                      render={({ field }) => (
                        <SubcategorySearchCombobox
                          value={field.value}
                          onValueChange={(val) =>
                            field.onChange(val ? parseInt(val) : undefined)
                          }
                          placeholder="Search and select a category"
                          required
                        />
                      )}
                    />
                  </div>

                  {/* Pricing Type Toggle */}
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label
                          htmlFor="negotiable"
                          className="text-base font-medium"
                        >
                          Negotiable Pricing
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {form.watch("negotiable")
                            ? "Customers must negotiate and agree on the final price before payment"
                            : "Customers pay the base price directly without negotiation"}
                        </p>
                      </div>
                      <Controller
                        name="negotiable"
                        control={form.control}
                        render={({ field }) => (
                          <Switch
                            id="negotiable"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        )}
                      />
                    </div>

                    {!form.watch("negotiable") && (
                      <Alert className="mt-3 border-blue-200 bg-blue-50">
                        <Info className="h-4 w-4 text-blue-600" />
                        <AlertDescription className="text-blue-700">
                          <strong>Fixed Price Mode:</strong> Customers will pay
                          the base price directly. You can start working on the
                          order immediately after payment without negotiation.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>

                {/* Template Images */}
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    Template Images
                  </CardTitle>
                  <CardDescription>
                    Upload images that showcase your template. First image will
                    be the cover.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ImageUpload
                    images={[]}
                    onFilesSelected={(files) =>
                      setPendingImages((prev) => [...prev, ...files])
                    }
                    maxImages={10}
                    isUploading={isUploadingImages}
                    disabled={createTemplateMutation.isPending}
                    label=""
                    helperText=""
                  />
                  {pendingImages.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm text-muted-foreground">
                        {pendingImages.length} image(s) will be uploaded
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {pendingImages.map((file, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={URL.createObjectURL(file)}
                              alt={file.name}
                              className="w-16 h-16 object-cover rounded-md border"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setPendingImages((prev) =>
                                  prev.filter((_, i) => i !== index)
                                )
                              }
                              className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            {/* Customization Fields */}
            {currentStep === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GripVertical className="h-5 w-5" />
                    Customization Fields *
                  </CardTitle>
                  <CardDescription>
                    Define the fields customers can customize. At least one
                    field is required.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* <Alert className="border-blue-200 bg-blue-50">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-800">Field Types</AlertTitle> */}
                  {/* <AlertDescription className="text-blue-700">
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>
                      <strong>Text:</strong> Single or multi-line text input
                    </li>
                    <li>
                      <strong>Number:</strong> Numeric input with validation
                    </li>
                    <li>
                      <strong>Image:</strong> File upload for images
                    </li>
                    <li>
                      <strong>Video:</strong> File upload for videos
                    </li>
                  </ul>
                </AlertDescription> */}
                  {/* </Alert> */}

                  <div className="space-y-4">
                    {fieldArray.map((field, index) => (
                      <Card
                        key={field.id}
                        className="border-2 border-dashed border-gray-200"
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                              <CardTitle className="text-lg">
                                Field {index + 1}
                              </CardTitle>
                              {fields[index]?.required && (
                                <Badge variant="secondary">Required</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {fieldArray.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeField(index)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label>Field Name *</Label>
                              <Input
                                placeholder="e.g., Custom Text, Size, Color"
                                {...form.register(`fields.${index}.fieldName`)}
                              />
                              {form.formState.errors.fields?.[index]
                                ?.fieldName && (
                                <p className="text-sm text-red-600 mt-1">
                                  {
                                    form.formState.errors.fields[index]
                                      ?.fieldName?.message
                                  }
                                </p>
                              )}
                            </div>

                            <div>
                              <Label>Field Type *</Label>
                              <Controller
                                name={`fields.${index}.fieldType`}
                                control={form.control}
                                render={({ field }) => (
                                  <Select
                                    value={field.value}
                                    onValueChange={field.onChange}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select field type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {FIELD_TYPES.map((type) => (
                                        <SelectItem
                                          key={type.value}
                                          value={type.value}
                                        >
                                          <div className="flex items-center gap-2">
                                            {type.icon}
                                            {type.label}
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                            </div>
                          </div>

                          <div>
                            <Label>Description (optional)</Label>
                            <Textarea
                              placeholder="Provide instructions or details for this field..."
                              className="min-h-[60px]"
                              {...form.register(`fields.${index}.description`)}
                            />
                          </div>

                          <div className="flex items-center space-x-2">
                            <Controller
                              name={`fields.${index}.required`}
                              control={form.control}
                              render={({ field }) => (
                                <input
                                  type="checkbox"
                                  id={`required-${index}`}
                                  checked={field.value}
                                  onChange={field.onChange}
                                  className="rounded border-gray-300"
                                />
                              )}
                            />
                            <Label
                              htmlFor={`required-${index}`}
                              className="text-sm"
                            >
                              This field is required
                            </Label>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    <Button
                      type="button"
                      variant="outline"
                      onClick={addField}
                      className="w-full border-dashed"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Another Field
                    </Button>
                  </div>

                  {form.formState.errors.fields && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.fields.message}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Policies
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Template Policies
              </CardTitle>
              <CardDescription>
                Important information about your custom order template
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-amber-200 bg-amber-50">
                <Info className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800">
                  Admin Approval Required
                </AlertTitle>
                <AlertDescription className="text-amber-700">
                  Your template will be reviewed by our admin team before it
                  becomes visible to customers. You'll be notified once it's
                  approved or if any changes are needed.
                </AlertDescription>
              </Alert>

              <Alert className="border-blue-200 bg-blue-50">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-800">
                  Pricing Options
                </AlertTitle>
                <AlertDescription className="text-blue-700">
                  <p className="mb-2">
                    <strong>Negotiable (Default):</strong>
                  </p>
                  <ul className="list-disc list-inside text-sm space-y-1 mb-3">
                    <li>
                      Customers see the base price as "starting from" price
                    </li>
                    <li>
                      You can adjust the final price based on their requirements
                    </li>
                    <li>Price negotiation happens through the order chat</li>
                    <li>Payment is only processed after both parties agree</li>
                  </ul>
                  <p className="mb-2">
                    <strong>Fixed Price (Non-Negotiable):</strong>
                  </p>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>Customers pay the base price directly</li>
                    <li>No negotiation step required</li>
                    <li>You can start working immediately after payment</li>
                    <li>Faster checkout for customers</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <Alert className="border-green-200 bg-green-50">
                <Info className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">
                  Order Process
                </AlertTitle>
                <AlertDescription className="text-green-700">
                  <p className="mb-2">Once approved, customers can:</p>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>Browse your template in the custom orders section</li>
                    <li>Fill out the customization fields you've defined</li>
                    <li>Submit their order with their requirements</li>
                    <li>
                      Communicate with you through the built-in chat system
                    </li>
                  </ul>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card> */}

            {/* Submit */}
            <div className="flex justify-between items-center py-4 border-t bg-white sticky bottom-0">
              <div className="text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  {fieldArray.length} customization field
                  {fieldArray.length !== 1 ? "s" : ""} configured
                </span>
              </div>
              <div className="flex gap-4">
                <Button type="button" variant="outline" asChild>
                  <Link to="/vendor/custom-templates">Cancel</Link>
                </Button>
                {currentStep > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setCurrentStep((prev) => clampTemplateStep(prev - 1))
                    }
                  >
                    Back
                  </Button>
                )}
                {currentStep < TEMPLATE_TOTAL_STEPS ? (
                  <Button type="button" onClick={handleNextStep}>
                    Next
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={
                      createTemplateMutation.isPending || isUploadingImages
                    }
                  >
                    {isUploadingImages
                      ? "Uploading Images..."
                      : createTemplateMutation.isPending
                      ? "Creating..."
                      : "Create Template"}
                  </Button>
                )}
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
