import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, Link, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { 
  serviceService, 
  UpdateServiceRequest, 
  ServicePackageResponse,
  CreateServicePackageRequest,
  UpdateServicePackageRequest,
  AvailabilityType 
} from "@/services/serviceService";
import { vendorService, VendorProfile, PriceDto } from "@/services/vendorService";
import { imageService } from "@/services/imageService";
import { apiService } from "@/services/apiService";
import { SubcategorySearchCombobox } from "@/components/SubcategorySearchCombobox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ImageUpload } from "@/components/ImageUpload";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, Briefcase, AlertCircle, Plus, Trash2, Loader2, Camera, Info, 
  DollarSign, Package, Clock, Calendar, MapPin, Star, Edit2
} from "lucide-react";

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

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const ETHIOPIAN_CITIES = [
  "Addis Ababa", "Dire Dawa", "Mekelle", "Gondar", "Bahir Dar",
  "Hawassa", "Adama", "Jimma", "Dessie", "Harar"
];

// Schema for editing service metadata (not packages)
const serviceMetadataSchema = z.object({
  title: z.string().min(1, "Service title is required").max(255),
  description: z.string().max(5000).optional(),
  location: z.string().min(1, "Location is required").max(500),
  city: z.string().min(1, "City is required").max(100),
  categoryId: z.string().optional(),
});

type ServiceMetadataFormData = z.infer<typeof serviceMetadataSchema>;

// Schema for package form
const packageFormSchema = z.object({
  name: z.string().min(1, "Package name is required").max(255),
  description: z.string().max(5000).optional(),
  durationMinutes: z.number().min(1, "Duration must be at least 1 minute").optional(),
  basePrice: z.number().min(0.01, "Price must be greater than 0"),
  currency: z.string().default("ETB"),
  maxBookingsPerDay: z.number().min(0).default(0),
  availabilityType: z.enum(["TIME_SLOTS", "WORKING_HOURS"]).default("TIME_SLOTS"),
  workingDays: z.array(z.number()).default([1, 2, 3, 4, 5, 6]),
  timeSlots: z.array(z.string()).default([]),
  workingHoursStart: z.string().default("09:00"),
  workingHoursEnd: z.string().default("18:00"),
  advanceBookingDays: z.number().min(1).default(30),
  attributes: z.array(z.object({
    name: z.string().optional(),
    value: z.string().min(1, "Value is required"),
  })).default([]),
});

type PackageFormData = z.infer<typeof packageFormSchema>;

export default function EditService() {
  const { id } = useParams<{ id: string }>();
  useNavigate(); // Keep hook to avoid conditional hook warning
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Dialog states
  const [showCategoryChangeDialog, setShowCategoryChangeDialog] = useState(false);
  const [pendingCategoryId, setPendingCategoryId] = useState<string | null>(null);
  const [categoryChangeReason, setCategoryChangeReason] = useState("");
  
  const [showPackagePriceDialog, setShowPackagePriceDialog] = useState(false);
  const [selectedPackageForPriceChange, setSelectedPackageForPriceChange] = useState<ServicePackageResponse | null>(null);
  const [pendingPackagePrice, setPendingPackagePrice] = useState<number | null>(null);
  const [packagePriceChangeReason, setPackagePriceChangeReason] = useState("");
  
  const [showAddPackageDialog, setShowAddPackageDialog] = useState(false);
  const [showEditPackageDialog, setShowEditPackageDialog] = useState(false);
  const [editingPackage, setEditingPackage] = useState<ServicePackageResponse | null>(null);
  
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [packageNewTimeSlot, setPackageNewTimeSlot] = useState("");

  const isVendor = user?.role?.toUpperCase() === 'VENDOR';
  const serviceId = id ? parseInt(id) : 0;

  // Queries
  const { data: service, isLoading: serviceLoading, refetch: refetchService } = useQuery({
    queryKey: ['vendor', 'service', serviceId],
    queryFn: () => serviceService.getMyService(serviceId),
    enabled: isAuthenticated && isVendor && serviceId > 0,
  });

  const { data: packages = [], isLoading: packagesLoading, refetch: refetchPackages } = useQuery({
    queryKey: ['vendor', 'service-packages', serviceId],
    queryFn: () => serviceService.getVendorServicePackages(serviceId),
    enabled: isAuthenticated && isVendor && serviceId > 0,
  });

  const { data: currencies = [] } = useQuery({
    queryKey: ['currencies'],
    queryFn: () => apiService.getRequest<Currency[]>('/api/currencies'),
  });

  const { data: vendorProfile } = useQuery({
    queryKey: ['vendor', 'profile'],
    queryFn: () => vendorService.getMyProfile(),
    enabled: isAuthenticated && isVendor,
  });

  const { data: serviceImages = [], refetch: refetchImages } = useQuery({
    queryKey: ['service-images', serviceId],
    queryFn: () => imageService.getServiceImages(serviceId),
    enabled: serviceId > 0,
  });

  const availableCurrencies = isEthiopianVendor(vendorProfile)
    ? currencies.filter(c => c.code === 'ETB')
    : currencies;

  // Service metadata form
  const metadataForm = useForm<ServiceMetadataFormData>({
    resolver: zodResolver(serviceMetadataSchema),
    defaultValues: {
      title: "",
      description: "",
      location: "",
      city: "",
      categoryId: "",
    },
  });

  // Package form for add/edit dialogs
  const packageForm = useForm<PackageFormData>({
    resolver: zodResolver(packageFormSchema),
    defaultValues: {
      name: "",
      description: "",
      durationMinutes: 60,
      basePrice: 0,
      currency: "ETB",
      maxBookingsPerDay: 0,
      availabilityType: "TIME_SLOTS",
      workingDays: [1, 2, 3, 4, 5, 6],
      timeSlots: ["09:00", "14:00", "18:00"],
      workingHoursStart: "09:00",
      workingHoursEnd: "18:00",
      advanceBookingDays: 30,
      attributes: [],
    },
  });

  // Populate form when service data loads
  useEffect(() => {
    if (service) {
      metadataForm.reset({
        title: service.title || "",
        description: service.description || "",
        location: service.location || "",
        city: service.city || "",
        categoryId: service.categoryId?.toString() || "",
      });
    }
  }, [service, metadataForm]);

  // Reset package form when dialog opens with editing package
  useEffect(() => {
    if (editingPackage && showEditPackageDialog) {
      const availConfig = editingPackage.availabilityConfig || {};
      packageForm.reset({
        name: editingPackage.name || "",
        description: editingPackage.description || "",
        durationMinutes: editingPackage.durationMinutes || 60,
        basePrice: (editingPackage.vendorPriceMinor || editingPackage.basePriceMinor) / 100,
        currency: editingPackage.currency || "ETB",
        maxBookingsPerDay: editingPackage.maxBookingsPerDay || 0,
        availabilityType: editingPackage.availabilityType || "TIME_SLOTS",
        workingDays: availConfig.workingDays || [1, 2, 3, 4, 5, 6],
        timeSlots: availConfig.timeSlots || [],
        workingHoursStart: availConfig.workingHoursStart || "09:00",
        workingHoursEnd: availConfig.workingHoursEnd || "18:00",
        advanceBookingDays: availConfig.advanceBookingDays || 30,
        attributes: editingPackage.attributes?.map(a => ({ name: a.name, value: a.value })) || [],
      });
    }
  }, [editingPackage, showEditPackageDialog, packageForm]);

  // Reset package form when add dialog opens
  useEffect(() => {
    if (showAddPackageDialog && !editingPackage) {
      const currency = isEthiopianVendor(vendorProfile) ? "ETB" : (availableCurrencies[0]?.code || "ETB");
      packageForm.reset({
        name: "",
        description: "",
        durationMinutes: 60,
        basePrice: 0,
        currency,
        maxBookingsPerDay: 0,
        availabilityType: "TIME_SLOTS",
        workingDays: [1, 2, 3, 4, 5, 6],
        timeSlots: ["09:00", "14:00", "18:00"],
        workingHoursStart: "09:00",
        workingHoursEnd: "18:00",
        advanceBookingDays: 30,
        attributes: [],
      });
    }
  }, [showAddPackageDialog, vendorProfile, availableCurrencies, packageForm, editingPackage]);

  // Mutations
  const uploadImagesMutation = useMutation({
    mutationFn: async (files: File[]) => {
      setIsUploadingImages(true);
      return await imageService.uploadServiceImages(serviceId, files);
    },
    onSuccess: () => {
      toast({ title: "Images Uploaded", description: "Your images have been uploaded successfully." });
      refetchImages();
    },
    onError: (error: any) => {
      toast({ title: "Upload Failed", description: error.message || "Failed to upload images", variant: "destructive" });
    },
    onSettled: () => setIsUploadingImages(false),
  });

  const deleteImageMutation = useMutation({
    mutationFn: (imageId: number) => imageService.deleteServiceImage(serviceId, imageId),
    onSuccess: () => {
      toast({ title: "Image Deleted", description: "The image has been removed." });
      refetchImages();
    },
    onError: (error: any) => {
      toast({ title: "Delete Failed", description: error.message || "Failed to delete image", variant: "destructive" });
    },
  });

  const setPrimaryImageMutation = useMutation({
    mutationFn: (imageId: number) => imageService.setServicePrimaryImage(serviceId, imageId),
    onSuccess: () => {
      toast({ title: "Primary Image Set", description: "The primary image has been updated." });
      refetchImages();
    },
    onError: (error: any) => {
      toast({ title: "Update Failed", description: error.message || "Failed to set primary image", variant: "destructive" });
    },
  });

  const updateServiceMutation = useMutation({
    mutationFn: async (data: ServiceMetadataFormData) => {
      const request: UpdateServiceRequest = {
        title: data.title,
        description: data.description,
        location: data.location,
        city: data.city,
        categoryId: data.categoryId ? parseInt(data.categoryId) : undefined,
      };
      return await serviceService.updateService(serviceId, request);
    },
    onSuccess: () => {
      toast({ title: "Service Updated", description: "Your service has been updated successfully." });
      refetchService();
      queryClient.invalidateQueries({ queryKey: ['vendor', 'services'] });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'pending-rejected-services'] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update service", variant: "destructive" });
    },
  });

  const categoryChangeMutation = useMutation({
    mutationFn: async ({ categoryId, reason }: { categoryId: number; reason: string }) => {
      return await vendorService.createServiceCategoryChangeRequest(serviceId, {
        newSubCategoryId: categoryId,
        reason,
      });
    },
    onSuccess: () => {
      toast({ title: "Category Change Request Submitted", description: "Your category change request has been submitted for admin approval." });
      setShowCategoryChangeDialog(false);
      setPendingCategoryId(null);
      setCategoryChangeReason("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to submit category change request", variant: "destructive" });
    },
  });

  const packagePriceChangeMutation = useMutation({
    mutationFn: async ({ packageId, price, currency, reason }: { packageId: number; price: number; currency: string; reason: string }) => {
      const priceDto: PriceDto = {
        currencyCode: currency,
        amount: price,
      };
      return await vendorService.createServicePackagePriceUpdateRequest(serviceId, packageId, {
        newPrice: priceDto,
        reason,
      });
    },
    onSuccess: () => {
      toast({ title: "Price Update Request Submitted", description: "Your price update request has been submitted for admin approval." });
      setShowPackagePriceDialog(false);
      setSelectedPackageForPriceChange(null);
      setPendingPackagePrice(null);
      setPackagePriceChangeReason("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to submit price update request", variant: "destructive" });
    },
  });

  const createPackageMutation = useMutation({
    mutationFn: async (data: PackageFormData) => {
      const request: CreateServicePackageRequest = {
        name: data.name,
        description: data.description,
        durationMinutes: data.durationMinutes,
        basePrice: data.basePrice,
        currency: data.currency,
        isDefault: packages.length === 0,
        maxBookingsPerDay: data.maxBookingsPerDay,
        sortOrder: packages.length,
        availabilityType: data.availabilityType as AvailabilityType,
        availabilityConfig: {
          workingDays: data.workingDays,
          advanceBookingDays: data.advanceBookingDays,
          ...(data.availabilityType === "TIME_SLOTS"
            ? { timeSlots: data.timeSlots }
            : { workingHoursStart: data.workingHoursStart, workingHoursEnd: data.workingHoursEnd }),
        },
        attributes: data.attributes.map((a, i) => ({ name: a.name, value: a.value, sortOrder: i })),
      };
      return await serviceService.createPackage(serviceId, request);
    },
    onSuccess: () => {
      toast({ title: "Package Created", description: "Your service package has been created and submitted for approval." });
      setShowAddPackageDialog(false);
      refetchPackages();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create package", variant: "destructive" });
    },
  });

  const updatePackageMutation = useMutation({
    mutationFn: async ({ packageId, data }: { packageId: number; data: PackageFormData }) => {
      // For approved packages, price changes need to go through change request
      const pkg = packages.find(p => p.id === packageId);
      const currentPrice = pkg ? (pkg.vendorPriceMinor || pkg.basePriceMinor) / 100 : 0;
      const priceChanged = pkg?.status === 'APPROVED' && data.basePrice !== currentPrice;
      
      if (priceChanged) {
        // Open price change dialog instead
        setSelectedPackageForPriceChange(pkg!);
        setPendingPackagePrice(data.basePrice);
        setShowPackagePriceDialog(true);
        setShowEditPackageDialog(false);
        throw new Error("PRICE_CHANGE_NEEDED");
      }

      const request: UpdateServicePackageRequest = {
        name: data.name,
        description: data.description,
        durationMinutes: data.durationMinutes,
        // Only include price for non-approved packages
        ...(pkg?.status !== 'APPROVED' && { basePrice: data.basePrice, currency: data.currency }),
        maxBookingsPerDay: data.maxBookingsPerDay,
        availabilityType: data.availabilityType as AvailabilityType,
        availabilityConfig: {
          workingDays: data.workingDays,
          advanceBookingDays: data.advanceBookingDays,
          ...(data.availabilityType === "TIME_SLOTS"
            ? { timeSlots: data.timeSlots }
            : { workingHoursStart: data.workingHoursStart, workingHoursEnd: data.workingHoursEnd }),
        },
        attributes: data.attributes.map((a, i) => ({ name: a.name, value: a.value, sortOrder: i })),
      };
      return await serviceService.updatePackage(packageId, request);
    },
    onSuccess: () => {
      toast({ title: "Package Updated", description: "Your service package has been updated." });
      setShowEditPackageDialog(false);
      setEditingPackage(null);
      refetchPackages();
    },
    onError: (error: any) => {
      if (error.message === "PRICE_CHANGE_NEEDED") return; // Handled separately
      toast({ title: "Error", description: error.message || "Failed to update package", variant: "destructive" });
    },
  });

  const archivePackageMutation = useMutation({
    mutationFn: (packageId: number) => serviceService.archivePackage(packageId),
    onSuccess: () => {
      toast({ title: "Package Archived", description: "The package has been archived." });
      refetchPackages();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to archive package", variant: "destructive" });
    },
  });

  const setDefaultPackageMutation = useMutation({
    mutationFn: (packageId: number) => serviceService.setDefaultPackage(serviceId, packageId),
    onSuccess: () => {
      toast({ title: "Default Package Set", description: "The default package has been updated." });
      refetchPackages();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to set default package", variant: "destructive" });
    },
  });

  // Form handlers
  const onMetadataSubmit = (data: ServiceMetadataFormData) => {
    // Check if category changed for approved service
    if (service?.status === 'APPROVED' && data.categoryId && service.categoryId?.toString() !== data.categoryId) {
      setPendingCategoryId(data.categoryId);
      setShowCategoryChangeDialog(true);
      return;
    }
    updateServiceMutation.mutate(data);
  };

  const handleCategoryChangeSubmit = () => {
    if (!pendingCategoryId) return;
    categoryChangeMutation.mutate({
      categoryId: parseInt(pendingCategoryId),
      reason: categoryChangeReason,
    });
  };

  const handlePackagePriceChangeSubmit = () => {
    if (!selectedPackageForPriceChange || !pendingPackagePrice) return;
    packagePriceChangeMutation.mutate({
      packageId: selectedPackageForPriceChange.id,
      price: pendingPackagePrice,
      currency: selectedPackageForPriceChange.currency || "ETB",
      reason: packagePriceChangeReason,
    });
  };

  const onPackageSubmit = (data: PackageFormData) => {
    if (data.availabilityType === "TIME_SLOTS" && data.timeSlots.length === 0) {
      toast({ title: "Validation Error", description: "Please add at least one time slot.", variant: "destructive" });
      return;
    }
    if (data.workingDays.length === 0) {
      toast({ title: "Validation Error", description: "Please select at least one working day.", variant: "destructive" });
      return;
    }
    
    if (editingPackage) {
      updatePackageMutation.mutate({ packageId: editingPackage.id, data });
    } else {
      createPackageMutation.mutate(data);
    }
  };

  // Package form helpers
  const toggleWorkingDay = (day: number) => {
    const current = packageForm.getValues("workingDays");
    if (current.includes(day)) {
      packageForm.setValue("workingDays", current.filter(d => d !== day));
    } else {
      packageForm.setValue("workingDays", [...current, day].sort());
    }
  };

  const addTimeSlot = () => {
    const current = packageForm.getValues("timeSlots");
    if (packageNewTimeSlot && !current.includes(packageNewTimeSlot)) {
      packageForm.setValue("timeSlots", [...current, packageNewTimeSlot].sort());
      setPackageNewTimeSlot("");
    }
  };

  const removeTimeSlot = (slot: string) => {
    const current = packageForm.getValues("timeSlots");
    packageForm.setValue("timeSlots", current.filter(s => s !== slot));
  };

  // Loading and access states
  if (!isAuthenticated || !isVendor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <AlertCircle className="h-16 w-16 text-amber-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-600 mb-4">You need to be a vendor to edit services.</p>
        <Button asChild>
          <Link to="/vendor-signup">Become a Vendor</Link>
        </Button>
      </div>
    );
  }

  if (serviceLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-eagle-green" />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Service Not Found</h1>
        <p className="text-gray-600 mb-4">The service you're looking for doesn't exist or you don't have access.</p>
        <Button asChild>
          <Link to="/vendor">Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'APPROVED':
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case 'PENDING_APPROVAL':
      case 'PENDING':
        return <Badge className="bg-amber-100 text-amber-800">Pending Approval</Badge>;
      case 'REJECTED':
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      case 'SUSPENDED':
        return <Badge className="bg-gray-100 text-gray-800">Suspended</Badge>;
      case 'ARCHIVED':
        return <Badge className="bg-gray-100 text-gray-600">Archived</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatPrice = (priceMinor: number, currency: string = 'ETB') => {
    const amount = priceMinor / 100;
    if (currency === 'ETB') {
      return `${amount.toLocaleString('en-ET', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ETB`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const watchedAvailabilityType = packageForm.watch("availabilityType");
  const watchedTimeSlots = packageForm.watch("timeSlots");
  const watchedWorkingDays = packageForm.watch("workingDays");

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
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Edit Service</h1>
              {getStatusBadge(service.status)}
            </div>
            <p className="text-muted-foreground">Manage your service and packages</p>
          </div>
        </div>

        {/* Rejection Notice */}
        {service.rejectionReason && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-4">
              <p className="text-red-800">
                <strong>Rejection Reason:</strong> {service.rejectionReason}
              </p>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="details" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Service Details</TabsTrigger>
            <TabsTrigger value="packages">Packages ({packages.length})</TabsTrigger>
            <TabsTrigger value="images">Images</TabsTrigger>
          </TabsList>

          {/* Service Details Tab */}
          <TabsContent value="details">
            <form onSubmit={metadataForm.handleSubmit(onMetadataSubmit)} className="space-y-6">
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
                      placeholder="e.g., Professional Photography Session"
                      {...metadataForm.register("title")}
                    />
                    {metadataForm.formState.errors.title && (
                      <p className="text-sm text-red-600 mt-1">{metadataForm.formState.errors.title.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe your service in detail..."
                      className="min-h-[120px]"
                      {...metadataForm.register("description")}
                    />
                  </div>

                  <div>
                    <Label>Category</Label>
                    {service.status === 'APPROVED' && (
                      <Alert className="mb-2 border-blue-200 bg-blue-50">
                        <Info className="h-4 w-4 text-blue-600" />
                        <AlertDescription className="text-blue-700 text-sm">
                          Category changes for approved services require admin approval.
                        </AlertDescription>
                      </Alert>
                    )}
                    <Controller
                      name="categoryId"
                      control={metadataForm.control}
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

              <Card>
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
                      {...metadataForm.register("location")}
                    />
                    {metadataForm.formState.errors.location && (
                      <p className="text-sm text-red-600 mt-1">{metadataForm.formState.errors.location.message}</p>
                    )}
                  </div>

                  <div>
                    <Label>City *</Label>
                    <Controller
                      name="city"
                      control={metadataForm.control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a city" />
                          </SelectTrigger>
                          <SelectContent>
                            {ETHIOPIAN_CITIES.map((city) => (
                              <SelectItem key={city} value={city}>
                                {city}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {metadataForm.formState.errors.city && (
                      <p className="text-sm text-red-600 mt-1">{metadataForm.formState.errors.city.message}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button type="submit" disabled={updateServiceMutation.isPending}>
                  {updateServiceMutation.isPending ? "Saving..." : "Save Service Details"}
                </Button>
              </div>
            </form>
          </TabsContent>

          {/* Packages Tab */}
          <TabsContent value="packages">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Service Packages
                    </CardTitle>
                    <CardDescription>
                      Manage different packages for your service. Each package can have its own pricing, duration, and availability.
                    </CardDescription>
                  </div>
                  <Button onClick={() => setShowAddPackageDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Package
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* VAT Notice */}
                <Alert className="mb-4 border-amber-200 bg-amber-50">
                  <Info className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-800">Pricing Information</AlertTitle>
                  <AlertDescription className="text-amber-700">
                    Prices shown are what you'll receive (vendor price). Platform fees are added for customers.
                    {vendorProfile?.vatStatus === 'VAT_REGISTERED' && (
                      <span className="block mt-1 font-medium">
                        As a VAT-registered vendor, VAT will be included in the customer price.
                      </span>
                    )}
                  </AlertDescription>
                </Alert>

                {packagesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : packages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No packages yet. Add your first package to start accepting bookings.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {packages.map((pkg) => (
                      <div
                        key={pkg.id}
                        className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold">{pkg.name}</h3>
                              {pkg.isDefault && (
                                <Badge variant="secondary" className="text-xs">
                                  <Star className="h-3 w-3 mr-1" />
                                  Default
                                </Badge>
                              )}
                              {getStatusBadge(pkg.status)}
                            </div>
                            {pkg.description && (
                              <p className="text-sm text-muted-foreground mb-2">{pkg.description}</p>
                            )}
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <DollarSign className="h-4 w-4" />
                                {formatPrice(pkg.vendorPriceMinor || pkg.basePriceMinor, pkg.currency)}
                              </span>
                              {pkg.durationMinutes != null && pkg.durationMinutes > 0 && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  {pkg.durationMinutes} min
                                </span>
                              )}
                              {(pkg.maxBookingsPerDay ?? 0) > 0 && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {pkg.maxBookingsPerDay}/day
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {!pkg.isDefault && pkg.status === 'APPROVED' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDefaultPackageMutation.mutate(pkg.id)}
                                disabled={setDefaultPackageMutation.isPending}
                              >
                                Set Default
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingPackage(pkg);
                                setShowEditPackageDialog(true);
                              }}
                            >
                              <Edit2 className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            {packages.length > 1 && pkg.status !== 'APPROVED' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => archivePackageMutation.mutate(pkg.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                        {pkg.rejectionReason && (
                          <Alert className="mt-3 border-red-200 bg-red-50">
                            <AlertCircle className="h-4 w-4 text-red-600" />
                            <AlertDescription className="text-red-700 text-sm">
                              {pkg.rejectionReason}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Images Tab */}
          <TabsContent value="images">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Service Images
                </CardTitle>
                <CardDescription>
                  Manage images for your service. The primary image will be shown as the cover.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ImageUpload
                  images={serviceImages}
                  onFilesSelected={(files) => uploadImagesMutation.mutate(files)}
                  onImageDelete={(imageId) => deleteImageMutation.mutate(imageId)}
                  onSetPrimary={(imageId) => setPrimaryImageMutation.mutate(imageId)}
                  maxImages={10}
                  isUploading={isUploadingImages}
                  disabled={false}
                  label=""
                  helperText="Upload images that showcase your service. First image will be the cover."
                  showPrimarySelector={true}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Category Change Request Dialog */}
        <Dialog open={showCategoryChangeDialog} onOpenChange={setShowCategoryChangeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Category Change</DialogTitle>
              <DialogDescription>
                This service is already approved. Category changes require admin approval. Please provide a reason for this change.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="categoryReason">Reason for Category Change *</Label>
                <Textarea
                  id="categoryReason"
                  placeholder="Explain why you want to change the category..."
                  value={categoryChangeReason}
                  onChange={(e) => setCategoryChangeReason(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCategoryChangeDialog(false);
                  setPendingCategoryId(null);
                  setCategoryChangeReason("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCategoryChangeSubmit}
                disabled={!categoryChangeReason.trim() || categoryChangeMutation.isPending}
              >
                {categoryChangeMutation.isPending ? "Submitting..." : "Submit Request"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Package Price Change Request Dialog */}
        <Dialog open={showPackagePriceDialog} onOpenChange={setShowPackagePriceDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Price Update</DialogTitle>
              <DialogDescription>
                This package is already approved. Price changes require admin approval. Please provide a reason for this change.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Package</Label>
                <Input value={selectedPackageForPriceChange?.name || ''} disabled />
              </div>
              <div>
                <Label>Current Price</Label>
                <Input 
                  value={selectedPackageForPriceChange 
                    ? formatPrice(selectedPackageForPriceChange.vendorPriceMinor || selectedPackageForPriceChange.basePriceMinor, selectedPackageForPriceChange.currency) 
                    : ''
                  } 
                  disabled 
                />
              </div>
              <div>
                <Label>New Price ({selectedPackageForPriceChange?.currency || 'ETB'})</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={pendingPackagePrice || ''}
                  onChange={(e) => setPendingPackagePrice(parseFloat(e.target.value) || null)}
                />
              </div>
              <div>
                <Label htmlFor="priceReason">Reason for Price Change *</Label>
                <Textarea
                  id="priceReason"
                  placeholder="Explain why you want to change the price..."
                  value={packagePriceChangeReason}
                  onChange={(e) => setPackagePriceChangeReason(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowPackagePriceDialog(false);
                  setSelectedPackageForPriceChange(null);
                  setPendingPackagePrice(null);
                  setPackagePriceChangeReason("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handlePackagePriceChangeSubmit}
                disabled={!packagePriceChangeReason.trim() || !pendingPackagePrice || packagePriceChangeMutation.isPending}
              >
                {packagePriceChangeMutation.isPending ? "Submitting..." : "Submit Request"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add/Edit Package Dialog */}
        <Dialog 
          open={showAddPackageDialog || showEditPackageDialog} 
          onOpenChange={(open) => {
            if (!open) {
              setShowAddPackageDialog(false);
              setShowEditPackageDialog(false);
              setEditingPackage(null);
            }
          }}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPackage ? 'Edit Package' : 'Add New Package'}</DialogTitle>
              <DialogDescription>
                {editingPackage 
                  ? 'Update the details of this package. Price changes for approved packages require admin approval.'
                  : 'Create a new package with its own pricing, duration, and availability settings.'
                }
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={packageForm.handleSubmit(onPackageSubmit)} className="space-y-6">
              {/* Package Basic Info */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="pkgName">Package Name *</Label>
                  <Input
                    id="pkgName"
                    placeholder="e.g., Basic Session, Premium Package"
                    {...packageForm.register("name")}
                  />
                  {packageForm.formState.errors.name && (
                    <p className="text-sm text-red-600 mt-1">{packageForm.formState.errors.name.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="pkgDescription">Description</Label>
                  <Textarea
                    id="pkgDescription"
                    placeholder="Describe what this package includes..."
                    {...packageForm.register("description")}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="pkgDuration">Duration (minutes)</Label>
                    <Controller
                      name="durationMinutes"
                      control={packageForm.control}
                      render={({ field }) => (
                        <Input
                          type="number"
                          min="1"
                          value={field.value || ''}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      )}
                    />
                  </div>
                  <div>
                    <Label htmlFor="pkgMaxBookings">Max Bookings/Day (0 = unlimited)</Label>
                    <Controller
                      name="maxBookingsPerDay"
                      control={packageForm.control}
                      render={({ field }) => (
                        <Input
                          type="number"
                          min="0"
                          value={field.value || 0}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      )}
                    />
                  </div>
                </div>

                {/* Pricing */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Pricing
                  </h4>
                  
                  {editingPackage?.status === 'APPROVED' && (
                    <Alert className="mb-3 border-amber-200 bg-amber-50">
                      <Info className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-700 text-sm">
                        Price changes for approved packages require admin approval.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className={isEthiopianVendor(vendorProfile) ? "" : "grid grid-cols-2 gap-4"}>
                    {!isEthiopianVendor(vendorProfile) && (
                      <div>
                        <Label>Currency *</Label>
                        <Controller
                          name="currency"
                          control={packageForm.control}
                          render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select currency" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableCurrencies.map((currency) => (
                                  <SelectItem key={currency.id} value={currency.code}>
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
                      <Label htmlFor="pkgPrice">
                        Your Price {isEthiopianVendor(vendorProfile) ? '(ETB)' : ''} *
                      </Label>
                      <Controller
                        name="basePrice"
                        control={packageForm.control}
                        render={({ field }) => (
                          <Input
                            type="number"
                            step="0.01"
                            min="0.01"
                            placeholder="0.00"
                            value={field.value || ''}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        )}
                      />
                      {packageForm.formState.errors.basePrice && (
                        <p className="text-sm text-red-600 mt-1">{packageForm.formState.errors.basePrice.message}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        This is what you'll receive. Platform fee will be added for customers.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Availability */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Availability
                  </h4>

                  <div className="space-y-4">
                    <div>
                      <Label className="mb-2 block">Availability Type *</Label>
                      <Controller
                        name="availabilityType"
                        control={packageForm.control}
                        render={({ field }) => (
                          <div className="flex gap-4">
                            <label className="flex items-center cursor-pointer">
                              <input
                                type="radio"
                                value="TIME_SLOTS"
                                checked={field.value === "TIME_SLOTS"}
                                onChange={() => field.onChange("TIME_SLOTS")}
                                className="mr-2"
                              />
                              <span>Time Slots</span>
                            </label>
                            <label className="flex items-center cursor-pointer">
                              <input
                                type="radio"
                                value="WORKING_HOURS"
                                checked={field.value === "WORKING_HOURS"}
                                onChange={() => field.onChange("WORKING_HOURS")}
                                className="mr-2"
                              />
                              <span>Working Hours</span>
                            </label>
                          </div>
                        )}
                      />
                    </div>

                    <div>
                      <Label className="mb-2 block">Working Days *</Label>
                      <div className="flex flex-wrap gap-2">
                        {DAYS_OF_WEEK.map((day) => (
                          <Button
                            key={day.value}
                            type="button"
                            variant={watchedWorkingDays.includes(day.value) ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleWorkingDay(day.value)}
                          >
                            {day.label.slice(0, 3)}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {watchedAvailabilityType === "TIME_SLOTS" ? (
                      <div>
                        <Label className="mb-2 block">Time Slots *</Label>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {watchedTimeSlots.map((slot) => (
                            <div key={slot} className="flex items-center gap-1 bg-gray-100 rounded-md px-3 py-1">
                              <span>{slot}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0"
                                onClick={() => removeTimeSlot(slot)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Input
                            type="time"
                            value={packageNewTimeSlot}
                            onChange={(e) => setPackageNewTimeSlot(e.target.value)}
                            className="w-32"
                          />
                          <Button type="button" variant="outline" size="sm" onClick={addTimeSlot}>
                            <Plus className="h-4 w-4 mr-1" />
                            Add Slot
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Start Time *</Label>
                          <Controller
                            name="workingHoursStart"
                            control={packageForm.control}
                            render={({ field }) => (
                              <Input type="time" value={field.value} onChange={field.onChange} />
                            )}
                          />
                        </div>
                        <div>
                          <Label>End Time *</Label>
                          <Controller
                            name="workingHoursEnd"
                            control={packageForm.control}
                            render={({ field }) => (
                              <Input type="time" value={field.value} onChange={field.onChange} />
                            )}
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <Label>Advance Booking (days)</Label>
                      <Controller
                        name="advanceBookingDays"
                        control={packageForm.control}
                        render={({ field }) => (
                          <Input
                            type="number"
                            min="1"
                            value={field.value || ''}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 30)}
                          />
                        )}
                      />
                      <p className="text-xs text-muted-foreground mt-1">How far in advance can customers book</p>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddPackageDialog(false);
                    setShowEditPackageDialog(false);
                    setEditingPackage(null);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createPackageMutation.isPending || updatePackageMutation.isPending}
                >
                  {createPackageMutation.isPending || updatePackageMutation.isPending
                    ? "Saving..."
                    : editingPackage ? "Update Package" : "Create Package"
                  }
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
