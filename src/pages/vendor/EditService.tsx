import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, Link, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { serviceService, UpdateServiceRequest } from "@/services/serviceService";
import { vendorService, VendorProfile } from "@/services/vendorService";
import { imageService } from "@/services/imageService";
import { apiService } from "@/services/apiService";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ImageUpload } from "@/components/ImageUpload";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, Briefcase, AlertCircle, Plus, Trash2, Loader2, Camera, Info, DollarSign } from "lucide-react";

const isEthiopianVendor = (vendorProfile: VendorProfile | undefined): boolean => {
  if (!vendorProfile) return false;
  return vendorProfile.countryCode === 'ET';
};

interface Category {
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

const serviceSchema = z.object({
  title: z.string().min(1, "Service title is required").max(255),
  description: z.string().max(5000).optional(),
  location: z.string().min(1, "Location is required").max(500),
  city: z.string().min(1, "City is required").max(100),
  categoryId: z.string().optional(),
  basePrice: z.number().min(0.01, "Price must be greater than 0"),
  currency: z.string().default("ETB"),
  durationMinutes: z.number().min(1, "Duration must be at least 1 minute").optional(),
  availabilityType: z.enum(["TIME_SLOTS", "WORKING_HOURS"]).default("TIME_SLOTS"),
  workingDays: z.array(z.number()).default([1, 2, 3, 4, 5, 6]),
  timeSlots: z.array(z.string()).default(["09:00", "14:00", "18:00"]),
  workingHoursStart: z.string().default("09:00"),
  workingHoursEnd: z.string().default("18:00"),
  advanceBookingDays: z.number().min(1).default(30),
  maxBookingsPerDay: z.number().min(1).default(3),
  depositRequired: z.boolean().default(false),
  depositPercentage: z.number().min(0).max(100).default(0),
});

type ServiceFormData = z.infer<typeof serviceSchema>;

export default function EditService() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [newTimeSlot, setNewTimeSlot] = useState("");
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [showCategoryChangeDialog, setShowCategoryChangeDialog] = useState(false);
  const [pendingCategoryId, setPendingCategoryId] = useState<string | null>(null);
  const [categoryChangeReason, setCategoryChangeReason] = useState("");
  const [showPriceChangeDialog, setShowPriceChangeDialog] = useState(false);
  const [pendingPrice, setPendingPrice] = useState<number | null>(null);
  const [priceChangeReason, setPriceChangeReason] = useState("");

  const isVendor = user?.role?.toUpperCase() === 'VENDOR';
  const serviceId = id ? parseInt(id) : 0;

  const { data: service, isLoading: serviceLoading } = useQuery({
    queryKey: ['vendor', 'service', serviceId],
    queryFn: () => serviceService.getMyService(serviceId),
    enabled: isAuthenticated && isVendor && serviceId > 0,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiService.getRequest<Category[]>('/api/categories'),
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

  const availableCurrencies = isEthiopianVendor(vendorProfile)
    ? currencies.filter(c => c.code === 'ETB')
    : currencies;

  // Fetch service images
  const { data: serviceImages = [], refetch: refetchImages } = useQuery({
    queryKey: ['service-images', serviceId],
    queryFn: () => imageService.getServiceImages(serviceId),
    enabled: serviceId > 0,
  });

  // Image upload mutation
  const uploadImagesMutation = useMutation({
    mutationFn: async (files: File[]) => {
      setIsUploadingImages(true);
      return await imageService.uploadServiceImages(serviceId, files);
    },
    onSuccess: () => {
      toast({
        title: "Images Uploaded",
        description: "Your images have been uploaded successfully.",
      });
      refetchImages();
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload images",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsUploadingImages(false);
    },
  });

  // Delete image mutation
  const deleteImageMutation = useMutation({
    mutationFn: async (imageId: number) => {
      await imageService.deleteServiceImage(serviceId, imageId);
    },
    onSuccess: () => {
      toast({
        title: "Image Deleted",
        description: "The image has been removed.",
      });
      refetchImages();
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete image",
        variant: "destructive",
      });
    },
  });

  // Set primary image mutation
  const setPrimaryImageMutation = useMutation({
    mutationFn: async (imageId: number) => {
      return await imageService.setServicePrimaryImage(serviceId, imageId);
    },
    onSuccess: () => {
      toast({
        title: "Primary Image Set",
        description: "The primary image has been updated.",
      });
      refetchImages();
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to set primary image",
        variant: "destructive",
      });
    },
  });

  const form = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      title: "",
      description: "",
      location: "",
      city: "",
      categoryId: "",
      basePrice: 0,
      currency: "ETB",
      durationMinutes: 60,
      availabilityType: "TIME_SLOTS",
      workingDays: [1, 2, 3, 4, 5, 6],
      timeSlots: ["09:00", "14:00", "18:00"],
      workingHoursStart: "09:00",
      workingHoursEnd: "18:00",
      advanceBookingDays: 30,
      maxBookingsPerDay: 3,
      depositRequired: false,
      depositPercentage: 0,
    },
  });


  // Populate form when service data loads
  useEffect(() => {
    if (service) {
      const availability = serviceService.parseAvailabilityConfig(service);
      const policies = serviceService.parsePoliciesConfig(service);
      
      form.reset({
        title: service.title || "",
        description: service.description || "",
        location: service.location || "",
        city: service.city || "",
        categoryId: service.categoryId?.toString() || "",
        basePrice: service.basePriceMinor / 100,
        currency: service.currency || "ETB",
        durationMinutes: service.durationMinutes || 60,
        availabilityType: service.availabilityType || "TIME_SLOTS",
        workingDays: availability.workingDays || [1, 2, 3, 4, 5, 6],
        timeSlots: availability.timeSlots || ["09:00", "14:00", "18:00"],
        workingHoursStart: availability.workingHoursStart || "09:00",
        workingHoursEnd: availability.workingHoursEnd || "18:00",
        advanceBookingDays: availability.advanceBookingDays || 30,
        maxBookingsPerDay: availability.maxBookingsPerDay || 3,
        depositRequired: policies.depositRequired || false,
        depositPercentage: policies.depositPercentage || 0,
      });
    }
  }, [service, form]);

  const workingDays = form.watch("workingDays");
  const availabilityType = form.watch("availabilityType");
  const timeSlots = form.watch("timeSlots");
  const depositRequired = form.watch("depositRequired");

  const toggleWorkingDay = (day: number) => {
    const current = form.getValues("workingDays");
    if (current.includes(day)) {
      form.setValue("workingDays", current.filter(d => d !== day));
    } else {
      form.setValue("workingDays", [...current, day].sort());
    }
  };

  const addTimeSlot = () => {
    if (newTimeSlot && !timeSlots.includes(newTimeSlot)) {
      form.setValue("timeSlots", [...timeSlots, newTimeSlot].sort());
      setNewTimeSlot("");
    }
  };

  const removeTimeSlot = (slot: string) => {
    form.setValue("timeSlots", timeSlots.filter(s => s !== slot));
  };

  const categoryChangeMutation = useMutation({
    mutationFn: async ({ categoryId, reason }: { categoryId: number; reason: string }) => {
      return await vendorService.createServiceCategoryChangeRequest(serviceId, {
        newSubCategoryId: categoryId,
        reason,
      });
    },
    onSuccess: () => {
      toast({
        title: "Category Change Request Submitted",
        description: "Your category change request has been submitted for admin approval.",
      });
      setShowCategoryChangeDialog(false);
      setPendingCategoryId(null);
      setCategoryChangeReason("");
      navigate("/vendor");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit category change request",
        variant: "destructive",
      });
    },
  });

  const priceChangeMutation = useMutation({
    mutationFn: async ({ price, currency, reason }: { price: number; currency: string; reason: string }) => {
      return await vendorService.createServicePriceUpdateRequest(serviceId, {
        newPrice: {
          currencyCode: currency,
          amount: price,
        },
        reason,
      });
    },
    onSuccess: () => {
      toast({
        title: "Price Update Request Submitted",
        description: "Your price update request has been submitted for admin approval.",
      });
      setShowPriceChangeDialog(false);
      setPendingPrice(null);
      setPriceChangeReason("");
      navigate("/vendor");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit price update request",
        variant: "destructive",
      });
    },
  });

  const updateServiceMutation = useMutation({
    mutationFn: async (data: ServiceFormData) => {
      const request: UpdateServiceRequest = {
        title: data.title,
        description: data.description,
        location: data.location,
        city: data.city,
        categoryId: data.categoryId ? parseInt(data.categoryId) : undefined,
        basePrice: data.basePrice,
        currency: data.currency,
        durationMinutes: data.durationMinutes,
        availabilityType: data.availabilityType,
        availabilityConfig: {
          workingDays: data.workingDays,
          blackoutDates: [],
          advanceBookingDays: data.advanceBookingDays,
          maxBookingsPerDay: data.maxBookingsPerDay,
          ...(data.availabilityType === "TIME_SLOTS"
            ? { timeSlots: data.timeSlots }
            : {
                workingHoursStart: data.workingHoursStart,
                workingHoursEnd: data.workingHoursEnd,
              }),
        },
        policiesConfig: {
          depositRequired: data.depositRequired,
          depositPercentage: data.depositRequired ? data.depositPercentage : 0,
        },
      };
      return await serviceService.updateService(serviceId, request);
    },
    onSuccess: () => {
      toast({
        title: "Service Updated",
        description: "Your service has been updated successfully.",
      });
      navigate("/vendor");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update service",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ServiceFormData) => {
    // Validate based on availability type
    if (data.availabilityType === "TIME_SLOTS" && data.timeSlots.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add at least one time slot.",
        variant: "destructive",
      });
      return;
    }
    if (data.availabilityType === "WORKING_HOURS") {
      if (!data.workingHoursStart || !data.workingHoursEnd) {
        toast({
          title: "Validation Error",
          description: "Please specify both working hours start and end times.",
          variant: "destructive",
        });
        return;
      }
      if (data.workingHoursStart >= data.workingHoursEnd) {
        toast({
          title: "Validation Error",
          description: "Working hours start must be before end time.",
          variant: "destructive",
        });
        return;
      }
    }
    if (data.workingDays.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one working day.",
        variant: "destructive",
      });
      return;
    }

    // Check if category changed for approved service
    if (service?.status === 'APPROVED' && data.categoryId && service.categoryId?.toString() !== data.categoryId) {
      setPendingCategoryId(data.categoryId);
      setShowCategoryChangeDialog(true);
      return;
    }

    // Check if price changed for approved service
    if (service?.status === 'APPROVED' && data.basePrice !== (service.basePriceMinor / 100)) {
      setPendingPrice(data.basePrice);
      setShowPriceChangeDialog(true);
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

  const handlePriceChangeSubmit = () => {
    if (!pendingPrice) return;
    const currency = form.getValues("currency");
    priceChangeMutation.mutate({
      price: pendingPrice,
      currency,
      reason: priceChangeReason,
    });
  };

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
        return <Badge className="bg-amber-100 text-amber-800">Pending Approval</Badge>;
      case 'REJECTED':
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container max-w-3xl mx-auto px-4">
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
            <p className="text-muted-foreground">Update your service details</p>
          </div>
        </div>

        {service.rejectionReason && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-4">
              <p className="text-red-800">
                <strong>Rejection Reason:</strong> {service.rejectionReason}
              </p>
            </CardContent>
          </Card>
        )}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
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
                  {...form.register("title")}
                />
                {form.formState.errors.title && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.title.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your service in detail..."
                  className="min-h-[120px]"
                  {...form.register("description")}
                />
              </div>

              <div>
                <Label>Category</Label>
                {service.status === 'APPROVED' && (
                  <Alert className="mb-2 border-blue-200 bg-blue-50">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-700 text-sm">
                      Category changes for approved services require admin approval. A request will be submitted when you save.
                    </AlertDescription>
                  </Alert>
                )}
                <Controller
                  name="categoryId"
                  control={form.control}
                  render={({ field }) => (
                    <Select 
                      value={field.value} 
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Service Images */}
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
                onFilesSelected={(files) => {
                  uploadImagesMutation.mutate(files);
                }}
                onImageDelete={(imageId) => {
                  deleteImageMutation.mutate(imageId);
                }}
                onSetPrimary={(imageId) => {
                  setPrimaryImageMutation.mutate(imageId);
                }}
                maxImages={10}
                isUploading={isUploadingImages}
                disabled={updateServiceMutation.isPending}
                label=""
                helperText="Upload images that showcase your service. First image will be the cover."
                showPrimarySelector={true}
              />
            </CardContent>
          </Card>


          {/* Location */}
          <Card>
            <CardHeader>
              <CardTitle>Location</CardTitle>
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
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.location.message}</p>
                )}
              </div>

              <div>
                <Label>City *</Label>
                <Controller
                  name="city"
                  control={form.control}
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
                {form.formState.errors.city && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.city.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Price Update Notice for approved services */}
              {service.status === 'APPROVED' && (
                <Alert className="border-blue-200 bg-blue-50">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                  <AlertTitle className="text-blue-800">Price Updates</AlertTitle>
                  <AlertDescription className="text-blue-700">
                    Price changes for approved services require admin approval. You can update other details directly.
                  </AlertDescription>
                </Alert>
              )}

              {/* VAT Notice */}
              <Alert className="border-amber-200 bg-amber-50">
                <Info className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800">Pricing Information</AlertTitle>
                <AlertDescription className="text-amber-700">
                  Enter your price (what you'll receive). Platform fees and applicable taxes will be calculated and shown to customers at checkout.
                  {vendorProfile?.vatStatus === 'VAT_REGISTERED' && (
                    <span className="block mt-1 font-medium">
                      As a VAT-registered vendor, VAT will be included in the customer price.
                    </span>
                  )}
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-4">
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
                            <SelectItem key={currency.id} value={currency.code}>
                              {currency.code} - {currency.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {isEthiopianVendor(vendorProfile) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Ethiopian vendors can only price in ETB
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="basePrice">Your Price *</Label>
                  <Controller
                    name="basePrice"
                    control={form.control}
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
                  {form.formState.errors.basePrice && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.basePrice.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    This is what you'll receive. Platform fee will be added for customers.
                  </p>
                </div>
              </div>
              <div>
                <Label htmlFor="durationMinutes">Duration (minutes)</Label>
                <Controller
                  name="durationMinutes"
                  control={form.control}
                  render={({ field }) => (
                    <Input
                      type="number"
                      min="1"
                      placeholder="60"
                      value={field.value || ''}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 60)}
                    />
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Availability */}
          <Card>
            <CardHeader>
              <CardTitle>Availability</CardTitle>
              <CardDescription>Configure when customers can book your service</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Availability Type */}
              <div>
                <Label className="mb-3 block">Availability Type *</Label>
                <Controller
                  name="availabilityType"
                  control={form.control}
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
                        <span>Predefined Time Slots</span>
                      </label>
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          value="WORKING_HOURS"
                          checked={field.value === "WORKING_HOURS"}
                          onChange={() => field.onChange("WORKING_HOURS")}
                          className="mr-2"
                        />
                        <span>Working Hours Range</span>
                      </label>
                    </div>
                  )}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {availabilityType === "TIME_SLOTS" 
                    ? "Customers can only book at specific time slots you define (e.g., 9:00 AM, 2:00 PM, 6:00 PM)"
                    : "Customers can book at any time within your working hours range"}
                </p>
              </div>

              <div>
                <Label className="mb-3 block">Working Days *</Label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <Button
                      key={day.value}
                      type="button"
                      variant={workingDays.includes(day.value) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleWorkingDay(day.value)}
                    >
                      {day.label.slice(0, 3)}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Conditional rendering based on availability type */}
              {availabilityType === "TIME_SLOTS" ? (
                <div>
                  <Label className="mb-3 block">Time Slots *</Label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {timeSlots.map((slot) => (
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
                      value={newTimeSlot}
                      onChange={(e) => setNewTimeSlot(e.target.value)}
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
                    <Label htmlFor="workingHoursStart">Working Hours Start *</Label>
                    <Controller
                      name="workingHoursStart"
                      control={form.control}
                      render={({ field }) => (
                        <Input
                          type="time"
                          value={field.value}
                          onChange={field.onChange}
                        />
                      )}
                    />
                  </div>
                  <div>
                    <Label htmlFor="workingHoursEnd">Working Hours End *</Label>
                    <Controller
                      name="workingHoursEnd"
                      control={form.control}
                      render={({ field }) => (
                        <Input
                          type="time"
                          value={field.value}
                          onChange={field.onChange}
                        />
                      )}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="advanceBookingDays">Advance Booking (days)</Label>
                  <Controller
                    name="advanceBookingDays"
                    control={form.control}
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
                <div>
                  <Label htmlFor="maxBookingsPerDay">Max Bookings Per Day</Label>
                  <Controller
                    name="maxBookingsPerDay"
                    control={form.control}
                    render={({ field }) => (
                      <Input
                        type="number"
                        min="1"
                        value={field.value || ''}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 3)}
                      />
                    )}
                  />
                </div>
              </div>
            </CardContent>
          </Card>


          {/* Policies */}
          <Card>
            <CardHeader>
              <CardTitle>Deposit Policy</CardTitle>
              <CardDescription>Set deposit requirements (cancellation policy is system-enforced)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">

              <div className="flex items-center justify-between">
                <div>
                  <Label>Require Deposit</Label>
                  <p className="text-sm text-muted-foreground">Require customers to pay a deposit when booking</p>
                </div>
                <Switch
                  checked={depositRequired}
                  onCheckedChange={(checked) => form.setValue("depositRequired", checked)}
                />
              </div>

              {depositRequired && (
                <div>
                  <Label htmlFor="depositPercentage">Deposit Percentage (%)</Label>
                  <Controller
                    name="depositPercentage"
                    control={form.control}
                    render={({ field }) => (
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={field.value || ''}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    )}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" asChild>
              <Link to="/vendor">Cancel</Link>
            </Button>
            <Button type="submit" disabled={updateServiceMutation.isPending}>
              {updateServiceMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>

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
                type="button"
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
                type="button"
                onClick={handleCategoryChangeSubmit}
                disabled={!categoryChangeReason.trim() || categoryChangeMutation.isPending}
              >
                {categoryChangeMutation.isPending ? "Submitting..." : "Submit Request"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Price Change Request Dialog */}
        <Dialog open={showPriceChangeDialog} onOpenChange={setShowPriceChangeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Price Update</DialogTitle>
              <DialogDescription>
                This service is already approved. Price changes require admin approval. Please provide a reason for this change.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>New Price</Label>
                <Input
                  type="number"
                  value={pendingPrice || ''}
                  readOnly
                  disabled
                />
              </div>
              <div>
                <Label htmlFor="priceReason">Reason for Price Change *</Label>
                <Textarea
                  id="priceReason"
                  placeholder="Explain why you want to change the price..."
                  value={priceChangeReason}
                  onChange={(e) => setPriceChangeReason(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowPriceChangeDialog(false);
                  setPendingPrice(null);
                  setPriceChangeReason("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handlePriceChangeSubmit}
                disabled={!priceChangeReason.trim() || priceChangeMutation.isPending}
              >
                {priceChangeMutation.isPending ? "Submitting..." : "Submit Request"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
