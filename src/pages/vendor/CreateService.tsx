import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { serviceService, CreateServiceRequest } from "@/services/serviceService";
import { vendorService, VendorProfile } from "@/services/vendorService";
import { imageService } from "@/services/imageService";
import { apiService } from "@/services/apiService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ImageUpload } from "@/components/ImageUpload";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, Briefcase, AlertCircle, Plus, Trash2, Camera, Info } from "lucide-react";

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
  // For TIME_SLOTS
  timeSlots: z.array(z.string()).default(["09:00", "14:00", "18:00"]),
  // For WORKING_HOURS
  workingHoursStart: z.string().default("09:00"),
  workingHoursEnd: z.string().default("18:00"),
  advanceBookingDays: z.number().min(1).default(30),
  maxBookingsPerDay: z.number().min(1).default(3),
  // Note: rescheduleHours and cancellationPolicy are system-enforced (48h/24h tiers)
  depositRequired: z.boolean().default(false),
  depositPercentage: z.number().min(0).max(100).default(0),
});

type ServiceFormData = z.infer<typeof serviceSchema>;

export default function CreateService() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [newTimeSlot, setNewTimeSlot] = useState("");
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);

  const isVendor = user?.role?.toUpperCase() === 'VENDOR';

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

  const form = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      title: "",
      description: "",
      location: "",
      city: "",
      categoryId: "",
      basePrice: 0,
      currency: isEthiopianVendor(vendorProfile) ? "ETB" : (currencies[0]?.code || "ETB"),
      durationMinutes: 0,
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

  // Update currency when vendor profile loads
  useEffect(() => {
    if (vendorProfile && isEthiopianVendor(vendorProfile)) {
      const currentCurrency = form.getValues("currency");
      if (currentCurrency !== "ETB") {
        form.setValue("currency", "ETB");
      }
    }
  }, [vendorProfile, form]);

  const workingDays = form.watch("workingDays");
  const timeSlots = form.watch("timeSlots");
  const depositRequired = form.watch("depositRequired");
  const availabilityType = form.watch("availabilityType");


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

  const createServiceMutation = useMutation({
    mutationFn: async (data: ServiceFormData) => {
      const request: CreateServiceRequest = {
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
      
      // Validate file sizes before creating service
      const maxFileSize = 10 * 1024 * 1024; // 10MB in bytes
      for (const file of pendingImages) {
        if (file.size > maxFileSize) {
          throw new Error(`Image "${file.name}" exceeds the 10MB file size limit (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
        }
      }
      
      // Create the service first
      const createdService = await serviceService.createService(request);
      
      // Upload images if any are pending
      if (pendingImages.length > 0 && createdService?.id) {
        setIsUploadingImages(true);
        try {
          console.log(`Uploading ${pendingImages.length} images for service ${createdService.id}...`);
          await imageService.uploadServiceImages(createdService.id, pendingImages);
          console.log(`Service ${createdService.id} images uploaded successfully`);
        } catch (imageError: any) {
          console.error(`Failed to upload images for service ${createdService.id}:`, imageError);
          // Don't fail the whole operation, just warn the user
          toast({
            title: "Warning",
            description: "Service created but some images failed to upload. You can add them later from the edit page.",
            variant: "destructive",
          });
        } finally {
          setIsUploadingImages(false);
        }
      }
      
      return createdService;
    },
    onSuccess: () => {
      toast({
        title: "Service Created",
        description: "Your service has been submitted for admin approval.",
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
    createServiceMutation.mutate(data);
  };

  if (!isAuthenticated || !isVendor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <AlertCircle className="h-16 w-16 text-amber-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-600 mb-4">You need to be a vendor to create services.</p>
        <Button asChild>
          <Link to="/vendor-signup">Become a Vendor</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container max-w-3xl mx-auto px-4">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/vendor">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Create Service</h1>
            <p className="text-muted-foreground">Add a new service to your offerings (requires admin approval)</p>
          </div>
        </div>

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
                <Controller
                  name="categoryId"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
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
                Upload images that showcase your service. The first image will be used as the cover.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ImageUpload
                images={[]}
                onFilesSelected={(files) => {
                  setPendingImages((prev) => [...prev, ...files]);
                }}
                maxImages={10}
                isUploading={isUploadingImages}
                disabled={createServiceMutation.isPending}
                label=""
                helperText="Upload images that showcase your service. First image will be the cover."
              />
              {pendingImages.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm text-muted-foreground">
                    {pendingImages.length} image(s) will be uploaded when you create the service
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
                          onClick={() => {
                            setPendingImages((prev) => prev.filter((_, i) => i !== index));
                          }}
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
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  placeholder="e.g., Addis Ababa"
                  {...form.register("city")}
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
              {/* VAT Notice */}
              <Alert className="border-blue-200 bg-blue-50">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-800">Pricing Information</AlertTitle>
                <AlertDescription className="text-blue-700">
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
                      placeholder=""
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
              <CardTitle>Policies</CardTitle>
              <CardDescription>Deposit settings for your service</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* System-enforced policy notice */}
              <Alert className="border-blue-200 bg-blue-50">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-800">Cancellation & Reschedule Policy</AlertTitle>
                <AlertDescription className="text-blue-700">
                  <p className="mb-2">All services follow the platform's standard policy:</p>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>Free cancellation up to 48 hours before service (100% refund minus platform fee)</li>
                    <li>50% refund for cancellations 24-48 hours before service</li>
                    <li>No refund for cancellations less than 24 hours before service</li>
                    <li>Free reschedule allowed up to 48 hours before service (one time only)</li>
                  </ul>
                </AlertDescription>
              </Alert>

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
            <Button type="submit" disabled={createServiceMutation.isPending || isUploadingImages}>
              {isUploadingImages 
                ? "Uploading Images..." 
                : createServiceMutation.isPending 
                ? "Creating..." 
                : "Create Service"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
