import { useState, useEffect, useCallback, memo } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  serviceService,
  CreateServiceRequest,
} from "@/services/serviceService";
import { vendorService, VendorProfile } from "@/services/vendorService";
import { imageService } from "@/services/imageService";
import { apiService } from "@/services/apiService";
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
import { ImageUpload } from "@/components/ImageUpload";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  Briefcase,
  AlertCircle,
  Plus,
  Trash2,
  Camera,
  Info,
  Package,
  Calendar,
  GripVertical,
  MapPin,
  Clock,
} from "lucide-react";

// Memoized attribute input component to prevent re-renders
interface AttributeInputProps {
  name: string;
  value: string;
  onNameChange: (value: string) => void;
  onValueChange: (value: string) => void;
  onRemove: () => void;
}

const AttributeInput = memo(function AttributeInput({
  name,
  value,
  onNameChange,
  onValueChange,
  onRemove,
}: AttributeInputProps) {
  const [localName, setLocalName] = useState(name);
  const [localValue, setLocalValue] = useState(value);

  // Sync local state with props when they change externally
  useEffect(() => {
    setLocalName(name);
  }, [name]);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleNameBlur = useCallback(() => {
    if (localName !== name) {
      onNameChange(localName);
    }
  }, [localName, name, onNameChange]);

  const handleValueBlur = useCallback(() => {
    if (localValue !== value) {
      onValueChange(localValue);
    }
  }, [localValue, value, onValueChange]);

  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder="Name (optional)"
        value={localName}
        onChange={(e) => setLocalName(e.target.value)}
        onBlur={handleNameBlur}
        className="w-1/3"
      />
      <Input
        placeholder="Value (required)"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleValueBlur}
        className="flex-1"
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onRemove}
        className="text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
});

const isEthiopianVendor = (
  vendorProfile: VendorProfile | undefined
): boolean => {
  if (!vendorProfile) return false;
  return vendorProfile.countryCode === "ET";
};

interface Currency {
  id: number;
  code: string;
  name: string;
  symbol: string;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

// Package attribute schema
const packageAttributeSchema = z.object({
  name: z.string().optional(),
  value: z.string().min(1, "Value is required"),
  sortOrder: z.number().default(0),
});

// Package schema - availability is now required per package
const packageSchema = z
  .object({
    packageCode: z.string().max(64).optional(),
    name: z.string().min(1, "Package name is required").max(255),
    description: z.string().max(5000).optional(),
    durationMinutes: z.number().min(1).optional(),
    basePrice: z.number().min(0.01, "Price must be greater than 0"),
    currency: z.string().default("ETB"),
    isDefault: z.boolean().default(false),
    maxBookingsPerDay: z.number().min(0).default(0),
    sortOrder: z.number().default(0),
    // Availability settings - required for each package
    availabilityType: z
      .enum(["TIME_SLOTS", "WORKING_HOURS"])
      .default("TIME_SLOTS"),
    workingDays: z.array(z.number()).default([1, 2, 3, 4, 5, 6]),
    timeSlots: z.array(z.string()).default([]),
    workingHoursStart: z.string().default("09:00"),
    workingHoursEnd: z.string().default("18:00"),
    advanceBookingDays: z.number().min(1).default(30),
    attributes: z.array(packageAttributeSchema).default([]),
    images: z.array(z.any()).default([]),
  })
  .superRefine((pkg, ctx) => {
    if (!pkg.workingDays || pkg.workingDays.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one working day is required",
        path: ["workingDays"],
      });
    }

    if (pkg.availabilityType === "TIME_SLOTS") {
      if (!pkg.timeSlots || pkg.timeSlots.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "At least one time slot is required",
          path: ["timeSlots"],
        });
      }
    }

    if (pkg.availabilityType === "WORKING_HOURS") {
      if (!pkg.workingHoursStart) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Start time is required",
          path: ["workingHoursStart"],
        });
      }
      if (!pkg.workingHoursEnd) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "End time is required",
          path: ["workingHoursEnd"],
        });
      }
      if (
        pkg.workingHoursStart &&
        pkg.workingHoursEnd &&
        pkg.workingHoursStart >= pkg.workingHoursEnd
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Start time must be before end time",
          path: ["workingHoursEnd"],
        });
      }
    }
  });

const serviceSchema = z.object({
  title: z.string().min(1, "Service title is required").max(255),
  description: z.string().min(1, "Description is required").max(5000),
  location: z.string().min(1, "Location is required").max(500),
  city: z.string().min(1, "City is required").max(100),
  categoryId: z.string().optional(),
  packages: z.array(packageSchema).min(1, "At least one package is required"),
});

type PackageFormData = z.infer<typeof packageSchema>;
type ServiceFormData = z.infer<typeof serviceSchema>;

type ServiceDraft = {
  formData: ServiceFormData;
  currentStep: number;
  updatedAt: string;
};

const SERVICE_DRAFT_STORAGE_KEY = "vendor:create-service-draft:v1";
const SERVICE_TOTAL_STEPS = 4;
const SERVICE_STEP_TITLES = [
  "Basic Information",
  "Images & Location",
  "Packages",
  "Policies",
];

const DEFAULT_SERVICE_VALUES: ServiceFormData = {
  title: "",
  description: "",
  location: "",
  city: "",
  categoryId: "",
  packages: [
    {
      packageCode: "",
      name: "",
      description: "",
      durationMinutes: 0,
      basePrice: 0,
      currency: "ETB",
      isDefault: true,
      maxBookingsPerDay: 0,
      sortOrder: 0,
      availabilityType: "TIME_SLOTS",
      workingDays: [1, 2, 3, 4, 5, 6],
      timeSlots: [],
      workingHoursStart: "09:00",
      workingHoursEnd: "18:00",
      advanceBookingDays: 30,
      attributes: [],
      images: [],
    },
  ],
};

const clampServiceStep = (step: number) =>
  Math.min(SERVICE_TOTAL_STEPS, Math.max(1, Math.floor(step || 1)));

const hasMeaningfulServiceDraftData = (
  formData: ServiceFormData,
  hasPendingImages: boolean,
  hasPendingPackageImages: boolean
) => {
  const hasMainDetails =
    Boolean(formData.title.trim()) ||
    Boolean(formData.description.trim()) ||
    Boolean(formData.location.trim()) ||
    Boolean(formData.city.trim()) ||
    Boolean(formData.categoryId);

  const hasPackageDetails = formData.packages.some((pkg) => {
    const hasAttributes = (pkg.attributes || []).some(
      (attr) => Boolean(attr.name?.trim()) || Boolean(attr.value?.trim())
    );

    return (
      Boolean(pkg.packageCode?.trim()) ||
      Boolean(pkg.name?.trim()) ||
      Boolean(pkg.description?.trim()) ||
      pkg.basePrice > 0 ||
      (pkg.timeSlots || []).length > 0 ||
      hasAttributes
    );
  });

  return (
    hasMainDetails ||
    hasPackageDetails ||
    hasPendingImages ||
    hasPendingPackageImages
  );
};

const getStoredServiceDraft = (): ServiceDraft | null => {
  if (typeof window === "undefined") return null;

  try {
    const rawDraft = localStorage.getItem(SERVICE_DRAFT_STORAGE_KEY);
    if (!rawDraft) return null;

    const parsed = JSON.parse(rawDraft) as Partial<ServiceDraft>;
    if (!parsed?.formData) return null;

    return {
      formData: {
        ...DEFAULT_SERVICE_VALUES,
        ...parsed.formData,
        packages:
          Array.isArray(parsed.formData.packages) &&
          parsed.formData.packages.length > 0
            ? parsed.formData.packages
            : DEFAULT_SERVICE_VALUES.packages,
      },
      currentStep: clampServiceStep(parsed.currentStep ?? 1),
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch {
    return null;
  }
};

const saveServiceDraft = (
  formData: ServiceFormData,
  currentStep: number,
  hasPendingImages: boolean,
  hasPendingPackageImages: boolean
) => {
  if (typeof window === "undefined") return;

  try {
    if (
      !hasMeaningfulServiceDraftData(
        formData,
        hasPendingImages,
        hasPendingPackageImages
      )
    ) {
      localStorage.removeItem(SERVICE_DRAFT_STORAGE_KEY);
      return;
    }

    const draft: ServiceDraft = {
      formData,
      currentStep: clampServiceStep(currentStep),
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(SERVICE_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Ignore storage errors
  }
};

export default function CreateService() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [pendingPackageImages, setPendingPackageImages] = useState<
    Record<number, File[]>
  >({});
  const [currentStep, setCurrentStep] = useState(1);
  const [isDraftInitialized, setIsDraftInitialized] = useState(false);
  const [showDraftDecision, setShowDraftDecision] = useState(false);
  const [storedDraft, setStoredDraft] = useState<ServiceDraft | null>(null);
  const [hasReviewedPolicies, setHasReviewedPolicies] = useState(false);

  const isVendor = user?.role?.toUpperCase() === "VENDOR";

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

  const form = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: DEFAULT_SERVICE_VALUES,
  });

  // Update package currency when vendorProfile and currencies load
  useEffect(() => {
    if (vendorProfile && currencies.length > 0) {
      const currency = isEthiopianVendor(vendorProfile)
        ? "ETB"
        : currencies[0]?.code || "ETB";
      const currentPackages = form.getValues("packages");
      if (
        currentPackages.length > 0 &&
        currentPackages[0].currency !== currency
      ) {
        // Update all packages with the correct currency
        currentPackages.forEach((_pkg, index) => {
          form.setValue(`packages.${index}.currency`, currency);
        });
      }
    }
  }, [vendorProfile, currencies, form]);

  useEffect(() => {
    const draft = getStoredServiceDraft();
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

    const hasPendingPackageImages = Object.values(pendingPackageImages).some(
      (images) => images.length > 0
    );

    const subscription = form.watch(() => {
      saveServiceDraft(
        form.getValues(),
        currentStep,
        pendingImages.length > 0,
        hasPendingPackageImages
      );
    });

    return () => subscription.unsubscribe();
  }, [
    form,
    currentStep,
    isDraftInitialized,
    showDraftDecision,
    pendingImages,
    pendingPackageImages,
  ]);

  useEffect(() => {
    if (!isDraftInitialized || showDraftDecision) return;

    const hasPendingPackageImages = Object.values(pendingPackageImages).some(
      (images) => images.length > 0
    );

    saveServiceDraft(
      form.getValues(),
      currentStep,
      pendingImages.length > 0,
      hasPendingPackageImages
    );
  }, [
    currentStep,
    form,
    isDraftInitialized,
    showDraftDecision,
    pendingImages,
    pendingPackageImages,
  ]);

  const handleStartNewDraft = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(SERVICE_DRAFT_STORAGE_KEY);
    }

    setPendingImages([]);
    setPendingPackageImages({});
    setCurrentStep(1);
    form.reset(DEFAULT_SERVICE_VALUES);
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

    form.reset({ ...DEFAULT_SERVICE_VALUES, ...storedDraft.formData });
    setCurrentStep(clampServiceStep(storedDraft.currentStep));
    setShowDraftDecision(false);
    setIsDraftInitialized(true);

    toast({
      title: "Draft Restored",
      description:
        "Your saved service draft has been loaded. Images need re-upload.",
    });
  };

  useEffect(() => {
    if (currentStep !== SERVICE_TOTAL_STEPS) {
      setHasReviewedPolicies(false);
    }
  }, [currentStep]);

  const handleNextStep = async () => {
    const fieldsByStep: Record<number, Array<keyof ServiceFormData>> = {
      1: ["title", "description"],
      2: ["location", "city"],
      3: ["packages"],
      4: [],
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

    setCurrentStep((prev) => clampServiceStep(prev + 1));
  };

  const {
    fields: packageFields,
    append: appendPackage,
    remove: removePackage,
    update: updatePackage,
  } = useFieldArray({
    control: form.control,
    name: "packages",
  });

  // Currency is now handled at the package level - Ethiopian vendors are locked to ETB

  const packages = form.watch("packages");

  // Package-level availability functions
  const togglePackageWorkingDay = (packageIndex: number, day: number) => {
    const pkg = packages[packageIndex];
    const current = pkg.workingDays || [];
    const newDays = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day].sort();
    updatePackage(packageIndex, { ...pkg, workingDays: newDays });
  };

  const addPackageTimeSlot = (packageIndex: number, slot: string) => {
    const pkg = packages[packageIndex];
    const current = pkg.timeSlots || [];
    if (slot && !current.includes(slot)) {
      updatePackage(packageIndex, {
        ...pkg,
        timeSlots: [...current, slot].sort(),
      });
    }
  };

  const removePackageTimeSlot = (packageIndex: number, slot: string) => {
    const pkg = packages[packageIndex];
    const current = pkg.timeSlots || [];
    updatePackage(packageIndex, {
      ...pkg,
      timeSlots: current.filter((s) => s !== slot),
    });
  };

  // Package image functions
  const addPackageImages = (packageIndex: number, files: File[]) => {
    setPendingPackageImages((prev) => ({
      ...prev,
      [packageIndex]: [...(prev[packageIndex] || []), ...files],
    }));
  };

  const removePackageImage = (packageIndex: number, fileIndex: number) => {
    setPendingPackageImages((prev) => ({
      ...prev,
      [packageIndex]: (prev[packageIndex] || []).filter(
        (_, i) => i !== fileIndex
      ),
    }));
  };

  const addPackage = () => {
    // Use ETB for Ethiopian vendors, otherwise use first available currency
    const currency = isEthiopianVendor(vendorProfile)
      ? "ETB"
      : availableCurrencies[0]?.code || "ETB";
    const newPackage: PackageFormData = {
      packageCode: ``,
      name: "",
      description: "",
      durationMinutes: 60,
      basePrice: 0,
      currency: currency,
      isDefault: packageFields.length === 0,
      maxBookingsPerDay: 0,
      sortOrder: packageFields.length,
      availabilityType: "TIME_SLOTS",
      workingDays: [1, 2, 3, 4, 5, 6],
      timeSlots: ["09:00", "14:00", "18:00"],
      workingHoursStart: "09:00",
      workingHoursEnd: "18:00",
      advanceBookingDays: 30,
      attributes: [],
      images: [],
    };
    appendPackage(newPackage);
  };

  const setDefaultPackage = (index: number) => {
    packageFields.forEach((_, i) => {
      updatePackage(i, { ...packages[i], isDefault: i === index });
    });
  };

  const addPackageAttribute = (packageIndex: number) => {
    const pkg = packages[packageIndex];
    const newAttributes = [
      ...(pkg.attributes || []),
      { name: "", value: "", sortOrder: pkg.attributes?.length || 0 },
    ];
    updatePackage(packageIndex, { ...pkg, attributes: newAttributes });
  };

  const removePackageAttribute = (packageIndex: number, attrIndex: number) => {
    const pkg = packages[packageIndex];
    const newAttributes =
      pkg.attributes?.filter((_, i) => i !== attrIndex) || [];
    updatePackage(packageIndex, { ...pkg, attributes: newAttributes });
  };

  const updatePackageAttribute = (
    packageIndex: number,
    attrIndex: number,
    field: "name" | "value",
    value: string
  ) => {
    const pkg = packages[packageIndex];
    const newAttributes = [...(pkg.attributes || [])];
    newAttributes[attrIndex] = { ...newAttributes[attrIndex], [field]: value };
    updatePackage(packageIndex, { ...pkg, attributes: newAttributes });
  };

  const createServiceMutation = useMutation({
    mutationFn: async (data: ServiceFormData) => {
      // Get the default package price and currency as the base for the service
      const defaultPackage =
        data.packages.find((p) => p.isDefault) || data.packages[0];
      const basePrice = defaultPackage?.basePrice || 0;
      const currency = defaultPackage?.currency || "ETB";
      const availabilityType = defaultPackage?.availabilityType || "TIME_SLOTS";
      const availabilityConfig = {
        workingDays: defaultPackage?.workingDays || [1, 2, 3, 4, 5, 6],
        blackoutDates: [],
        advanceBookingDays: defaultPackage?.advanceBookingDays || 30,
        maxBookingsPerDay: defaultPackage?.maxBookingsPerDay || 0,
        ...(availabilityType === "TIME_SLOTS"
          ? { timeSlots: defaultPackage?.timeSlots || [] }
          : {
              workingHoursStart: defaultPackage?.workingHoursStart || "09:00",
              workingHoursEnd: defaultPackage?.workingHoursEnd || "18:00",
            }),
      };

      // Service request - availability is now at package level
      const request: CreateServiceRequest = {
        title: data.title,
        description: data.description,
        location: data.location,
        city: data.city,
        categoryId: data.categoryId ? parseInt(data.categoryId) : undefined,
        basePrice: basePrice,
        currency: currency,
        availabilityType,
        availabilityConfig,
        policiesConfig: { depositRequired: false, depositPercentage: 0 },
      };

      const maxFileSize = 10 * 1024 * 1024;
      for (const file of pendingImages) {
        if (file.size > maxFileSize) {
          throw new Error(
            `Image "${file.name}" exceeds the 10MB file size limit`
          );
        }
      }

      const createdService = await serviceService.createService(request);
      console.log("Service creation response:", createdService);

      if (!createdService) {
        throw new Error("Service creation returned empty response");
      }
      if (!createdService.id) {
        console.error("Service created but no ID returned:", createdService);
        throw new Error("Service created but no ID returned");
      }

      console.log("Service created successfully with ID:", createdService.id);

      // Upload service-level images (legacy support)
      if (pendingImages.length > 0 && createdService?.id) {
        setIsUploadingImages(true);
        try {
          await imageService.uploadServiceImages(
            createdService.id,
            pendingImages
          );
        } catch (imageError: any) {
          toast({
            title: "Warning",
            description: "Service created but some images failed to upload.",
            variant: "destructive",
          });
        } finally {
          setIsUploadingImages(false);
        }
      }

      // Create packages with their own availability settings
      console.log("Package creation check - packages array:", data.packages);
      console.log("Package creation check - length:", data.packages?.length);

      if (!data.packages || data.packages.length === 0) {
        throw new Error(
          "At least one package is required. Please add a package before submitting."
        );
      }

      console.log(
        `Creating ${data.packages.length} packages for service ${createdService.id}`
      );
      const packageErrors: string[] = [];

      for (let pkgIndex = 0; pkgIndex < data.packages.length; pkgIndex++) {
        const pkg = data.packages[pkgIndex];
        try {
          const packageRequest = {
            packageCode: pkg.packageCode || undefined,
            name: pkg.name,
            description: pkg.description,
            durationMinutes: pkg.durationMinutes || undefined,
            basePrice: pkg.basePrice,
            currency: pkg.currency,
            isDefault: pkg.isDefault,
            sortOrder: pkg.sortOrder,
            // Availability is now required per package
            availabilityType: pkg.availabilityType,
            availabilityConfig: {
              workingDays: pkg.workingDays,
              blackoutDates: [],
              advanceBookingDays: pkg.advanceBookingDays,
              maxBookingsPerDay: pkg.maxBookingsPerDay,
              ...(pkg.availabilityType === "TIME_SLOTS"
                ? { timeSlots: pkg.timeSlots }
                : {
                    workingHoursStart: pkg.workingHoursStart,
                    workingHoursEnd: pkg.workingHoursEnd,
                  }),
            },
            attributes: pkg.attributes
              ?.filter((a) => a.value)
              .map((a, i) => ({
                name: a.name || undefined,
                value: a.value,
                sortOrder: i,
              })),
          };
          console.log(
            `[Package ${pkgIndex + 1}/${
              data.packages.length
            }] Creating package "${pkg.name}"`
          );
          console.log(
            `[Package ${pkgIndex + 1}] Request body:`,
            JSON.stringify(packageRequest, null, 2)
          );
          console.log(
            `[Package ${pkgIndex + 1}] Endpoint: /api/vendor/services/${
              createdService.id
            }/packages`
          );

          const packageImages = pendingPackageImages[pkgIndex] || [];
          const pkgResult = await serviceService.createPackage(
            createdService.id,
            packageRequest as any,
            packageImages.length > 0 ? packageImages : undefined
          );
          console.log(
            `[Package ${pkgIndex + 1}] Created successfully:`,
            pkgResult
          );
        } catch (pkgError: any) {
          console.error(
            `[Package ${pkgIndex + 1}] Failed to create package "${pkg.name}":`,
            pkgError
          );
          console.error(
            `[Package ${pkgIndex + 1}] Error message:`,
            pkgError.message
          );
          packageErrors.push(
            `Package "${pkg.name}": ${pkgError.message || "Unknown error"}`
          );
        }
      }

      // If all packages failed to create, throw an error
      if (packageErrors.length === data.packages.length) {
        throw new Error(
          `Failed to create packages: ${packageErrors.join("; ")}`
        );
      } else if (packageErrors.length > 0) {
        // Some packages failed - show warning but continue
        toast({
          title: "Warning",
          description: `Some packages failed to create: ${packageErrors.join(
            "; "
          )}`,
          variant: "destructive",
        });
      }

      return createdService;
    },
    onSuccess: () => {
      if (typeof window !== "undefined") {
        localStorage.removeItem(SERVICE_DRAFT_STORAGE_KEY);
      }

      // Invalidate relevant queries so lists refresh immediately
      queryClient.invalidateQueries({ queryKey: ["vendor", "services"] });
      queryClient.invalidateQueries({
        queryKey: ["vendor", "pending-rejected-services"],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "pending-services"],
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "all-services"] });

      toast({
        title: "Service Created",
        description:
          packages.length > 0
            ? "Your service and packages have been submitted for admin approval."
            : "Your service has been submitted for admin approval.",
      });
      navigate("/vendor");
    },
    onError: (error: any) => {
      setIsUploadingImages(false);
      toast({
        title: "Error",
        description: error.message || "Failed to create service",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ServiceFormData) => {
    console.log("Form submitted with data:", data);

    if (currentStep < SERVICE_TOTAL_STEPS) {
      toast({
        title: "Review Policies",
        description:
          "Please continue to the Policies step and submit from there.",
      });
      setCurrentStep(SERVICE_TOTAL_STEPS);
      return;
    }

    if (!hasReviewedPolicies) {
      toast({
        title: "Policy Confirmation Required",
        description:
          "Please confirm you have read the policies before submitting.",
        variant: "destructive",
      });
      return;
    }

    if (data.packages.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add at least one package.",
        variant: "destructive",
      });
      return;
    }
    const hasDefault = data.packages.some((p) => p.isDefault);
    if (!hasDefault) {
      toast({
        title: "Validation Error",
        description: "Please set one package as default.",
        variant: "destructive",
      });
      return;
    }

    console.log("All validations passed, calling createServiceMutation.mutate");
    createServiceMutation.mutate(data);
  };

  const onFormError = (errors: any) => {
    console.log("Form validation errors:", errors);

    if (errors.title || errors.description || errors.categoryId) {
      setCurrentStep(1);
    } else if (errors.location || errors.city) {
      setCurrentStep(2);
    } else if (errors.packages) {
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
          You need to be a vendor to create services.
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
            <Link to="/vendor">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Create Service</h1>
            <p className="text-muted-foreground">
              Add a new service with packages (requires admin approval)
            </p>
          </div>
        </div>

        {showDraftDecision && storedDraft ? (
          <Card>
            <CardHeader>
              <CardTitle>Saved Draft Found</CardTitle>
              <CardDescription>
                You have a saved service draft from{" "}
                {new Date(storedDraft.updatedAt).toLocaleString()}. Continue
                where you stopped or start a new service.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-3 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleStartNewDraft}
              >
                Create New Service
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {SERVICE_STEP_TITLES.map((stepTitle, index) => {
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
                    <Briefcase className="h-5 w-5" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="title">Service Title *</Label>
                    <Input
                      id="title"
                      placeholder="Enter service name"
                      {...form.register("title")}
                    />
                    {form.formState.errors.title && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.title.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe your service in detail..."
                      className="min-h-[100px]"
                      {...form.register("description")}
                    />
                    {form.formState.errors.description && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.description.message}
                      </p>
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
                          onValueChange={field.onChange}
                          placeholder="Search and select a category"
                        />
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Service Images */}
            {currentStep === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    Service Images
                  </CardTitle>
                  <CardDescription>
                    Upload images that showcase your service. First image will
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
                    disabled={createServiceMutation.isPending}
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

                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Location
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="location">Address *</Label>
                    <Input
                      id="location"
                      placeholder="e.g., Bole Road, Near Edna Mall"
                      {...form.register("location")}
                    />
                    {form.formState.errors.location && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.location.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      placeholder="e.g., Addis Ababa"
                      {...form.register("city")}
                    />
                    {form.formState.errors.city && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.city.message}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Service Packages */}
            {currentStep === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Service Packages *
                  </CardTitle>
                  <CardDescription>
                    Create packages for your service with pricing, durations,
                    and features. At least one package is required. Each package
                    requires admin approval.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert className="border-blue-200 bg-blue-50">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertTitle className="text-blue-800">
                      Pricing Information
                    </AlertTitle>
                    <AlertDescription className="text-blue-700">
                      Enter your price (what you'll receive). Platform fee will
                      be added for customers. The default package price will be
                      shown on service listings.
                      {vendorProfile?.vatStatus === "VAT_REGISTERED" && (
                        <span className="block mt-1 font-medium">
                          As a VAT-registered vendor, VAT will be included.
                        </span>
                      )}
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-4">
                    {packageFields.map((field, index) => (
                      <Card
                        key={field.id}
                        className={
                          packages[index]?.isDefault
                            ? "border-primary border-2"
                            : ""
                        }
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                              <CardTitle className="text-lg">
                                {packages[index]?.name ||
                                  `Package ${index + 1}`}
                              </CardTitle>
                              {packages[index]?.isDefault && (
                                <Badge variant="default">Default</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {!packages[index]?.isDefault && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setDefaultPackage(index)}
                                >
                                  Set as Default
                                </Button>
                              )}
                              {packageFields.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removePackage(index)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Package Code (reference code)</Label>
                              <Input
                                {...form.register(
                                  `packages.${index}.packageCode`
                                )}
                                placeholder="e.g., BASIC, PREMIUM"
                              />
                            </div>
                            <div>
                              <Label>Package Name *</Label>
                              <Input
                                {...form.register(`packages.${index}.name`)}
                                placeholder="e.g., Basic Package"
                              />
                              {form.formState.errors.packages?.[index]
                                ?.name && (
                                <p className="text-sm text-red-600 mt-1">
                                  {
                                    form.formState.errors.packages[index]?.name
                                      ?.message
                                  }
                                </p>
                              )}
                            </div>
                          </div>
                          <div>
                            <Label>Description</Label>
                            <Textarea
                              {...form.register(
                                `packages.${index}.description`
                              )}
                              placeholder="Describe what's included..."
                              className="min-h-[60px]"
                            />
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div>
                              <Label>
                                {isEthiopianVendor(vendorProfile)
                                  ? "Price (ETB) *"
                                  : `Price (${
                                      packages[index]?.currency || "Currency"
                                    }) *`}
                              </Label>
                              <Controller
                                name={`packages.${index}.basePrice`}
                                control={form.control}
                                render={({ field }) => (
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={field.value || ""}
                                    onChange={(e) =>
                                      field.onChange(
                                        parseFloat(e.target.value) || 0
                                      )
                                    }
                                  />
                                )}
                              />
                              {form.formState.errors.packages?.[index]
                                ?.basePrice && (
                                <p className="text-sm text-red-600 mt-1">
                                  {
                                    form.formState.errors.packages[index]
                                      ?.basePrice?.message
                                  }
                                </p>
                              )}
                            </div>
                            {!isEthiopianVendor(vendorProfile) && (
                              <div>
                                <Label>Currency *</Label>
                                <Controller
                                  name={`packages.${index}.currency`}
                                  control={form.control}
                                  render={({ field }) => (
                                    <Select
                                      value={field.value}
                                      onValueChange={field.onChange}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Currency" />
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
                              </div>
                            )}
                            <div>
                              <Label>Duration (min)</Label>
                              <Controller
                                name={`packages.${index}.durationMinutes`}
                                control={form.control}
                                render={({ field }) => (
                                  <Input
                                    type="number"
                                    min="1"
                                    value={field.value || ""}
                                    onChange={(e) =>
                                      field.onChange(
                                        parseInt(e.target.value) || 60
                                      )
                                    }
                                  />
                                )}
                              />
                            </div>
                            <div>
                              <Label>Max Bookings/Day</Label>
                              <Controller
                                name={`packages.${index}.maxBookingsPerDay`}
                                control={form.control}
                                render={({ field }) => (
                                  <Input
                                    type="number"
                                    min="0"
                                    placeholder="0 = unlimited"
                                    value={field.value || ""}
                                    onChange={(e) =>
                                      field.onChange(
                                        parseInt(e.target.value) || 0
                                      )
                                    }
                                  />
                                )}
                              />
                            </div>
                          </div>

                          {/* Package Availability */}
                          <div className="border-t pt-4 mt-4">
                            <div className="flex items-center gap-2 mb-3">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <Label className="font-medium">
                                Package Availability
                              </Label>
                            </div>

                            <div className="space-y-4">
                              <div>
                                <Label className="mb-2 block text-sm">
                                  Availability Type *
                                </Label>
                                <Controller
                                  name={`packages.${index}.availabilityType`}
                                  control={form.control}
                                  render={({ field }) => (
                                    <div className="flex gap-4">
                                      <label className="flex items-center cursor-pointer text-sm">
                                        <input
                                          type="radio"
                                          value="TIME_SLOTS"
                                          checked={field.value === "TIME_SLOTS"}
                                          onChange={() =>
                                            field.onChange("TIME_SLOTS")
                                          }
                                          className="mr-2"
                                        />
                                        <span>Time Slots</span>
                                      </label>
                                      <label className="flex items-center cursor-pointer text-sm">
                                        <input
                                          type="radio"
                                          value="WORKING_HOURS"
                                          checked={
                                            field.value === "WORKING_HOURS"
                                          }
                                          onChange={() =>
                                            field.onChange("WORKING_HOURS")
                                          }
                                          className="mr-2"
                                        />
                                        <span>Working Hours</span>
                                      </label>
                                    </div>
                                  )}
                                />
                              </div>

                              <div>
                                <Label className="mb-2 block text-sm">
                                  Working Days *
                                </Label>
                                <div className="flex flex-wrap gap-1">
                                  {DAYS_OF_WEEK.map((day) => (
                                    <Button
                                      key={day.value}
                                      type="button"
                                      variant={
                                        (
                                          packages[index]?.workingDays || []
                                        ).includes(day.value)
                                          ? "default"
                                          : "outline"
                                      }
                                      size="sm"
                                      className="h-7 px-2 text-xs"
                                      onClick={() =>
                                        togglePackageWorkingDay(
                                          index,
                                          day.value
                                        )
                                      }
                                    >
                                      {day.label.slice(0, 3)}
                                    </Button>
                                  ))}
                                </div>
                                {form.formState.errors.packages?.[index]
                                  ?.workingDays && (
                                  <p className="text-sm text-red-600 mt-1">
                                    {
                                      form.formState.errors.packages[index]
                                        ?.workingDays?.message as string
                                    }
                                  </p>
                                )}
                              </div>

                              {packages[index]?.availabilityType ===
                              "TIME_SLOTS" ? (
                                <div>
                                  <Label className="mb-2 block text-sm">
                                    Time Slots *
                                  </Label>
                                  <div className="flex flex-wrap gap-1 mb-2">
                                    {(packages[index]?.timeSlots || []).map(
                                      (slot) => (
                                        <div
                                          key={slot}
                                          className="flex items-center gap-1 bg-gray-100 rounded-md px-2 py-1 text-sm"
                                        >
                                          <span>{slot}</span>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-4 w-4 p-0"
                                            onClick={() =>
                                              removePackageTimeSlot(index, slot)
                                            }
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      )
                                    )}
                                  </div>
                                  <div className="flex gap-2">
                                    <Input
                                      type="time"
                                      className="w-28 h-8"
                                      onBlur={(e) => {
                                        if (e.target.value) {
                                          addPackageTimeSlot(
                                            index,
                                            e.target.value
                                          );
                                          e.target.value = "";
                                        }
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          e.preventDefault();
                                          const target =
                                            e.target as HTMLInputElement;
                                          if (target.value) {
                                            addPackageTimeSlot(
                                              index,
                                              target.value
                                            );
                                            target.value = "";
                                          }
                                        }
                                      }}
                                    />
                                    <span className="text-xs text-muted-foreground self-center">
                                      Press Enter or blur to add
                                    </span>
                                  </div>
                                  {form.formState.errors.packages?.[index]
                                    ?.timeSlots && (
                                    <p className="text-sm text-red-600 mt-1">
                                      {
                                        form.formState.errors.packages[index]
                                          ?.timeSlots?.message as string
                                      }
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <Label className="text-sm">
                                      Start Time *
                                    </Label>
                                    <Controller
                                      name={`packages.${index}.workingHoursStart`}
                                      control={form.control}
                                      render={({ field }) => (
                                        <Input
                                          type="time"
                                          className="h-8"
                                          value={field.value || ""}
                                          onChange={field.onChange}
                                        />
                                      )}
                                    />
                                    {form.formState.errors.packages?.[index]
                                      ?.workingHoursStart && (
                                      <p className="text-sm text-red-600 mt-1">
                                        {
                                          form.formState.errors.packages[index]
                                            ?.workingHoursStart
                                            ?.message as string
                                        }
                                      </p>
                                    )}
                                  </div>
                                  <div>
                                    <Label className="text-sm">
                                      End Time *
                                    </Label>
                                    <Controller
                                      name={`packages.${index}.workingHoursEnd`}
                                      control={form.control}
                                      render={({ field }) => (
                                        <Input
                                          type="time"
                                          className="h-8"
                                          value={field.value || ""}
                                          onChange={field.onChange}
                                        />
                                      )}
                                    />
                                    {form.formState.errors.packages?.[index]
                                      ?.workingHoursEnd && (
                                      <p className="text-sm text-red-600 mt-1">
                                        {
                                          form.formState.errors.packages[index]
                                            ?.workingHoursEnd?.message as string
                                        }
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}

                              <div>
                                <Label className="text-sm">
                                  Advance Booking (days)
                                </Label>
                                <Controller
                                  name={`packages.${index}.advanceBookingDays`}
                                  control={form.control}
                                  render={({ field }) => (
                                    <Input
                                      type="number"
                                      min="1"
                                      className="h-8 w-24"
                                      value={field.value || ""}
                                      onChange={(e) =>
                                        field.onChange(
                                          parseInt(e.target.value) || 30
                                        )
                                      }
                                    />
                                  )}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Package Attributes */}
                          <div className="border-t pt-4 mt-4">
                            <div className="flex items-center justify-between mb-2">
                              <Label>Package Features/Attributes</Label>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => addPackageAttribute(index)}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Add Feature
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">
                              Add features for this package. Name is optional
                              (e.g., "Duration: 2 hours" or just "Includes
                              editing").
                            </p>
                            {packages[index]?.attributes &&
                            packages[index].attributes.length > 0 ? (
                              <div className="space-y-2">
                                {packages[index].attributes.map(
                                  (attr, attrIndex) => (
                                    <AttributeInput
                                      key={`${index}-${attrIndex}`}
                                      name={attr.name || ""}
                                      value={attr.value}
                                      onNameChange={(value) =>
                                        updatePackageAttribute(
                                          index,
                                          attrIndex,
                                          "name",
                                          value
                                        )
                                      }
                                      onValueChange={(value) =>
                                        updatePackageAttribute(
                                          index,
                                          attrIndex,
                                          "value",
                                          value
                                        )
                                      }
                                      onRemove={() =>
                                        removePackageAttribute(index, attrIndex)
                                      }
                                    />
                                  )
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground italic">
                                No features added yet.
                              </p>
                            )}
                          </div>

                          {/* Package Images */}
                          <div className="border-t pt-4 mt-4">
                            <div className="flex items-center gap-2 mb-3">
                              <Camera className="h-4 w-4 text-muted-foreground" />
                              <Label className="font-medium">
                                Package Images
                              </Label>
                              {packages[index]?.isDefault && (
                                <Badge variant="secondary" className="text-xs">
                                  Shown on listings
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mb-3">
                              Add images for this package.{" "}
                              {packages[index]?.isDefault
                                ? "These images will be displayed on service listings and the home page."
                                : "First image becomes the primary image."}
                            </p>

                            {/* Pending Images Preview */}
                            {(pendingPackageImages[index]?.length || 0) > 0 && (
                              <div className="grid grid-cols-4 gap-2 mb-3">
                                {pendingPackageImages[index]?.map(
                                  (file, fileIndex) => (
                                    <div
                                      key={fileIndex}
                                      className="relative group aspect-square"
                                    >
                                      <img
                                        src={URL.createObjectURL(file)}
                                        alt={`Preview ${fileIndex + 1}`}
                                        className="w-full h-full object-cover rounded-md border"
                                      />
                                      <Button
                                        type="button"
                                        variant="destructive"
                                        size="sm"
                                        className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() =>
                                          removePackageImage(index, fileIndex)
                                        }
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                      {fileIndex === 0 && (
                                        <Badge className="absolute bottom-1 left-1 text-xs">
                                          Primary
                                        </Badge>
                                      )}
                                    </div>
                                  )
                                )}
                              </div>
                            )}

                            {/* Image Upload Input */}
                            <div className="flex items-center gap-2">
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                id={`package-images-${index}`}
                                onChange={(e) => {
                                  if (e.target.files) {
                                    addPackageImages(
                                      index,
                                      Array.from(e.target.files)
                                    );
                                    e.target.value = "";
                                  }
                                }}
                              />
                              <label htmlFor={`package-images-${index}`}>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  asChild
                                  className="cursor-pointer"
                                >
                                  <span>
                                    <Plus className="h-3 w-3 mr-1" />
                                    Add Images
                                  </span>
                                </Button>
                              </label>
                              <span className="text-xs text-muted-foreground">
                                {pendingPackageImages[index]?.length || 0}{" "}
                                image(s) selected
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addPackage}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Another Package
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Policies */}
            {currentStep === 4 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Policies
                  </CardTitle>
                  <CardDescription>
                    Payment and cancellation policies for your service
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert className="border-green-200 bg-green-50">
                    <Info className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-800">
                      Payment Policy
                    </AlertTitle>
                    <AlertDescription className="text-green-700">
                      Full payment is required at the time of booking. No
                      deposits.
                    </AlertDescription>
                  </Alert>

                  <Alert className="border-blue-200 bg-blue-50">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertTitle className="text-blue-800">
                      Cancellation & Reschedule Policy
                    </AlertTitle>
                    <AlertDescription className="text-blue-700">
                      <p className="mb-2">
                        All services follow the platform's standard policy:
                      </p>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        <li>
                          Free cancellation up to 48 hours before service (100%
                          refund minus platform fee)
                        </li>
                        <li>
                          50% refund for cancellations 24-48 hours before
                          service
                        </li>
                        <li>
                          No refund for cancellations less than 24 hours before
                          service
                        </li>
                        <li>
                          Free reschedule allowed up to 48 hours before service
                          (one time only)
                        </li>
                      </ul>
                    </AlertDescription>
                  </Alert>

                  <Alert className="border-amber-200 bg-amber-50">
                    <Info className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-800">
                      Order Confirmation
                    </AlertTitle>
                    <AlertDescription className="text-amber-700">
                      After a customer books and pays, you will need to confirm
                      the booking before it becomes active.
                    </AlertDescription>
                  </Alert>

                  <div className="flex items-center space-x-2 pt-2 border-t">
                    <Checkbox
                      id="service-policy-confirmation"
                      checked={hasReviewedPolicies}
                      onCheckedChange={(checked) =>
                        setHasReviewedPolicies(checked === true)
                      }
                    />
                    <Label
                      htmlFor="service-policy-confirmation"
                      className="cursor-pointer"
                    >
                      I have read and understood these policies.
                    </Label>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Submit */}
            <div className="flex justify-between items-center py-4 border-t bg-white sticky bottom-0 -mx-4 px-4 sm:-mx-0 sm:px-0">
              <div className="text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  {packages.length} package(s) configured
                </span>
              </div>
              <div className="flex gap-4">
                <Button type="button" variant="outline" asChild>
                  <Link to="/vendor">Cancel</Link>
                </Button>
                {currentStep > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setCurrentStep((prev) => clampServiceStep(prev - 1))
                    }
                  >
                    Back
                  </Button>
                )}
                {currentStep < SERVICE_TOTAL_STEPS ? (
                  <Button type="button" onClick={handleNextStep}>
                    Next
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={
                      createServiceMutation.isPending ||
                      isUploadingImages ||
                      !hasReviewedPolicies
                    }
                  >
                    {isUploadingImages
                      ? "Uploading Images..."
                      : createServiceMutation.isPending
                      ? "Creating..."
                      : "Create Service"}
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
