import { useState, useEffect } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, Link, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { vendorService, VendorProfile, UpdateEventRequest } from "@/services/vendorService";
import { apiService } from "@/services/apiService";
import { imageService, ImageDto } from "@/services/imageService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUpload } from "@/components/ImageUpload";
import {
  ArrowLeft,
  Calendar,
  AlertCircle,
  Trash2,
  RefreshCw,
  MapPin,
  Ticket,
  DollarSign,
  AlertTriangle,
  ImageIcon,
  Info
} from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

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

const ticketTypeSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "Ticket name is required"),
  description: z.string().optional(),
  capacity: z.number().min(1, "Capacity must be at least 1"),
  // Price fields are read-only for existing tickets
  currencyCode: z.string().optional(),
  currentPrice: z.number().optional(),
  isActive: z.boolean().optional(),
});

const eventEditSchema = z.object({
  title: z.string().min(1, "Event title is required").max(255),
  description: z.string().min(10, "Description must be at least 10 characters"),
  shortDescription: z.string().max(500).optional(),
  startDateTime: z.string().min(1, "Start date/time is required"),
  endDateTime: z.string().min(1, "End date/time is required"),
  timezone: z.string().optional(),
  venue: z.string().min(1, "Venue is required"),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  categoryId: z.string().optional(),
  organizerContact: z.string().optional(),
  ticketTypes: z.array(ticketTypeSchema).min(1, "At least one ticket type is required"),
});

type EventEditFormData = z.infer<typeof eventEditSchema>;

const COUNTRIES = [
  { value: "Ethiopia", label: "Ethiopia" },
  { value: "United States", label: "United States" },
  { value: "Kenya", label: "Kenya" },
  { value: "United Kingdom", label: "United Kingdom" },
  { value: "Canada", label: "Canada" },
];

// Ethiopian vendors can only create/edit events in Ethiopia
const getAvailableCountries = (vendorProfile: VendorProfile | undefined) => {
  if (isEthiopianVendor(vendorProfile)) {
    return [{ value: "Ethiopia", label: "Ethiopia" }];
  }
  return COUNTRIES;
};

export default function EditEvent() {
  const { id } = useParams<{ id: string }>();
  const eventId = id ? parseInt(id, 10) : null;

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const isVendor = user?.role?.toUpperCase() === 'VENDOR';

  // State for image management
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [currentImages, setCurrentImages] = useState<ImageDto[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);

  // Fetch event data
  const { data: event, isLoading: eventLoading, error: eventError } = useQuery({
    queryKey: ['vendor', 'event', eventId],
    queryFn: () => vendorService.getMyEvent(eventId!),
    enabled: !!eventId && isAuthenticated && isVendor,
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

  // Fetch currencies
  const { data: currencies = [] } = useQuery({
    queryKey: ['currencies'],
    queryFn: () => apiService.getRequest<Currency[]>('/api/currencies'),
  });

  // Note: availableCurrencies would be used for adding new ticket types
  // Currently, new tickets must be added via the create event flow
  const _availableCurrencies = isEthiopianVendor(vendorProfile)
    ? currencies.filter(c => c.code === 'ETB')
    : currencies;
  void _availableCurrencies; // Reserved for future use

  const form = useForm<EventEditFormData>({
    resolver: zodResolver(eventEditSchema),
    defaultValues: {
      title: "",
      description: "",
      shortDescription: "",
      startDateTime: "",
      endDateTime: "",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      venue: "",
      address: "",
      city: "",
      country: "",
      categoryId: "",
      organizerContact: "",
      ticketTypes: [],
    },
  });

  const { fields: ticketFields, remove: removeTicket } = useFieldArray({
    control: form.control,
    name: "ticketTypes",
  });

  // Populate form when event data is loaded
  useEffect(() => {
    if (event) {
      // Load event images - use fullUrl from backend
      const imageObjects: ImageDto[] = (event.images || []).map((img, index) => ({
        id: img.id || index + 1,
        url: img.url,
        fullUrl: img.fullUrl,
        originalFilename: img.originalFilename || `image-${index + 1}`,
        altText: img.altText || event.title,
        sortOrder: img.sortOrder ?? index,
        isPrimary: img.isPrimary ?? (index === 0),
        fileSize: img.fileSize || 0,
        contentType: img.contentType || 'image/jpeg',
        createdAt: img.createdAt || new Date().toISOString(),
      }));
      setCurrentImages(imageObjects);

      // Load ticket types - use the correct response structure
      // Backend returns: vendorPriceMinor (what vendor receives), currency (String)
      // Vendors should see their price (before commission), not the customer price
      const ticketData = event.ticketTypes?.map(tt => ({
        id: tt.id,
        name: tt.name,
        description: tt.description || "",
        capacity: tt.capacity,
        currencyCode: tt.currency || "ETB",
        // Convert from minor units (cents) to major units (dollars/birr)
        // Use vendorPriceMinor - what the vendor receives (before platform commission)
        currentPrice: tt.vendorPriceMinor ? tt.vendorPriceMinor / 100 : 0,
        isActive: tt.isActive,
      })) || [];

      // Ethiopian vendors should always have Ethiopia as country
      const countryValue = isEthiopianVendor(vendorProfile) ? "Ethiopia" : "";

      form.reset({
        title: event.title || "",
        description: event.description || "",
        shortDescription: "",
        startDateTime: event.eventDate ? new Date(event.eventDate).toISOString().slice(0, 16) : "",
        endDateTime: event.eventEndDate ? new Date(event.eventEndDate).toISOString().slice(0, 16) : "",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        venue: event.location || "",
        address: "",
        city: event.city || "",
        country: countryValue,
        categoryId: event.eventTypeId?.toString() || "",
        organizerContact: event.organizerContact || "",
        ticketTypes: ticketData,
      });
    }
  }, [event, form, vendorProfile]);

  // Check if vendor owns this event
  // Note: For events, event.vendorId is the Vendor entity ID (not userId)
  // so we compare with vendorProfile.id (vendor entity ID)
  const isEventOwner = event && vendorProfile && event.vendorId === vendorProfile.id;

  // Update event mutation
  const updateEventMutation = useMutation({
    mutationFn: async (data: EventEditFormData) => {
      if (!eventId) throw new Error("Event ID is required");

      const eventPayload: UpdateEventRequest = {
        title: data.title,
        description: data.description,
        shortDescription: data.shortDescription,
        startDateTime: data.startDateTime,
        endDateTime: data.endDateTime,
        venue: data.venue,
        address: data.address,
        city: data.city,
        country: data.country,
      };

      // Use the appropriate endpoint based on event status
      const isPendingOrRejected = event?.status === 'PENDING' || event?.status === 'REJECTED';

      if (isPendingOrRejected) {
        return vendorService.editPendingOrRejectedEvent(eventId, eventPayload);
      } else {
        return vendorService.updateEvent(eventId, eventPayload);
      }
    },
    onSuccess: async () => {
      // Handle ticket type updates (for non-price fields only)
      const formTickets = form.getValues("ticketTypes");
      
      try {
        for (const ticket of formTickets) {
          if (ticket.id) {
            // Existing ticket - update non-price fields
            await vendorService.updateTicketType(ticket.id, {
              name: ticket.name,
              description: ticket.description,
              capacity: ticket.capacity,
              isActive: ticket.isActive,
            });
          }
          // Note: Adding new ticket types would require a separate flow
          // as they need initial pricing which requires approval
        }
      } catch (ticketError: any) {
        console.error("Failed to update some ticket types:", ticketError);
        toast({
          title: "Warning",
          description: "Event updated but some ticket types failed to update.",
          variant: "destructive",
        });
      }

      // Upload any pending images
      if (pendingImages.length > 0 && eventId) {
        setIsUploadingImages(true);
        try {
          await imageService.uploadEventImages(eventId, pendingImages);
        } catch (imageError) {
          console.error("Failed to upload event images:", imageError);
          toast({
            title: "Warning",
            description: "Event updated but some images failed to upload.",
            variant: "destructive",
          });
        } finally {
          setIsUploadingImages(false);
        }
      }

      toast({
        title: "Event Updated",
        description: event?.status === 'PENDING' || event?.status === 'REJECTED'
          ? "Your event has been updated and resubmitted for review."
          : "Your event has been updated successfully.",
      });

      queryClient.invalidateQueries({ queryKey: ['vendor', 'events'] });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'pending-rejected-events'] });

      navigate("/vendor");
    },
    onError: (error: any) => {
      setIsUploadingImages(false);
      toast({
        title: "Error",
        description: error.response?.data?.message || error.message || "Failed to update event",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EventEditFormData) => {
    // Validate that at least one image exists
    const totalImages = currentImages.length + pendingImages.length;
    if (totalImages === 0) {
      toast({
        title: "Image Required",
        description: "Please upload at least one event image.",
        variant: "destructive",
      });
      return;
    }

    updateEventMutation.mutate(data);
  };

  const onError = (errors: any) => {
    console.log("Form validation errors:", errors);
    toast({
      title: "Validation Error",
      description: "Please fill in all required fields correctly.",
      variant: "destructive",
    });
  };

  if (!isAuthenticated || !isVendor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <AlertCircle className="h-16 w-16 text-amber-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-600 mb-4">You need to be a vendor to edit events.</p>
        <Button asChild>
          <Link to="/vendor-signup">Become a Vendor</Link>
        </Button>
      </div>
    );
  }

  if (eventLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin text-eagle-green mx-auto mb-4" />
          <p className="text-gray-600">Loading event...</p>
        </div>
      </div>
    );
  }

  if (eventError || !event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Event Not Found</h1>
        <p className="text-gray-600 mb-4">The event you're looking for doesn't exist or couldn't be loaded.</p>
        <Button asChild>
          <Link to="/vendor">Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  if (!isEventOwner) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <AlertCircle className="h-16 w-16 text-amber-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Unauthorized</h1>
        <p className="text-gray-600 mb-4">You can only edit your own events.</p>
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
      case 'CANCELLED':
        return <Badge className="bg-gray-100 text-gray-800">Cancelled</Badge>;
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
              <h1 className="text-2xl font-bold">Edit Event</h1>
              {getStatusBadge(event.status)}
            </div>
            <p className="text-muted-foreground">Update your event details (ticket prices require a separate request)</p>
          </div>
        </div>

        {/* Status Alerts */}
        {event.status === 'REJECTED' && event.rejectionReason && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Event Rejected</AlertTitle>
            <AlertDescription>
              <strong>Reason:</strong> {event.rejectionReason}
              <br />
              Please address this issue and save to resubmit for review.
            </AlertDescription>
          </Alert>
        )}

        {event.status === 'PENDING' && (
          <Alert className="mb-6 border-amber-200 bg-amber-50">
            <Info className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800">Pending Review</AlertTitle>
            <AlertDescription className="text-amber-700">
              This event is currently under review. Any changes will require re-approval.
            </AlertDescription>
          </Alert>
        )}

        {/* Price Update Notice */}
        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <DollarSign className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800">Ticket Price Updates</AlertTitle>
          <AlertDescription className="text-blue-700">
            Ticket price changes require admin approval. Go to the{' '}
            <Link to="/vendor" className="font-medium underline">
              Requests tab
            </Link>{' '}
            in your dashboard to submit price change requests.
          </AlertDescription>
        </Alert>

        <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Event Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Event Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter event title"
                  {...form.register("title")}
                />
                {form.formState.errors.title && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.title.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="shortDescription">Short Description</Label>
                <Input
                  id="shortDescription"
                  placeholder="Brief event summary"
                  {...form.register("shortDescription")}
                />
              </div>

              <div>
                <Label htmlFor="description">Full Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Detailed event description"
                  className="min-h-[120px]"
                  {...form.register("description")}
                />
                {form.formState.errors.description && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.description.message}</p>
                )}
              </div>

              {/* Event Images */}
              <Card className="border-dashed">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Event Images
                  </CardTitle>
                  <CardDescription>
                    Upload up to 10 images for your event. The first image will be the primary/cover image.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ImageUpload
                    images={currentImages}
                    onFilesSelected={(files) => {
                      setPendingImages(prev => [...prev, ...files]);
                    }}
                    maxImages={10}
                    isUploading={isUploadingImages}
                    disabled={updateEventMutation.isPending}
                    label=""
                    helperText="Drag and drop images here, or click to select."
                  />
                  {pendingImages.length > 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {pendingImages.length} new image(s) will be uploaded when you save
                    </p>
                  )}
                </CardContent>
              </Card>

              <div>
                <Label>Category</Label>
                <Controller
                  name="categoryId"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category (optional)" />
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

              <div>
                <Label htmlFor="organizerContact">Organizer Contact</Label>
                <Input
                  id="organizerContact"
                  placeholder="Contact information for attendees"
                  {...form.register("organizerContact")}
                />
              </div>
            </CardContent>
          </Card>

          {/* Date & Time */}
          <Card>
            <CardHeader>
              <CardTitle>Date & Time</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDateTime">Start Date/Time *</Label>
                  <Input
                    id="startDateTime"
                    type="datetime-local"
                    {...form.register("startDateTime")}
                  />
                  {form.formState.errors.startDateTime && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.startDateTime.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="endDateTime">End Date/Time *</Label>
                  <Input
                    id="endDateTime"
                    type="datetime-local"
                    {...form.register("endDateTime")}
                  />
                  {form.formState.errors.endDateTime && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.endDateTime.message}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="venue">Venue Name *</Label>
                <Input
                  id="venue"
                  placeholder="Enter Venue Name"
                  {...form.register("venue")}
                />
                {form.formState.errors.venue && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.venue.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  placeholder="Street address"
                  {...form.register("address")}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    placeholder="City"
                    {...form.register("city")}
                  />
                </div>
                <div>
                  <Label>Country</Label>
                  <Controller
                    name="country"
                    control={form.control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableCountries(vendorProfile).map((country) => (
                            <SelectItem key={country.value} value={country.value}>
                              {country.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {isEthiopianVendor(vendorProfile) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Ethiopian vendors can only create events in Ethiopia
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ticket Types */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5" />
                Ticket Types
              </CardTitle>
              <CardDescription>
                Update ticket details. Price changes require a separate approval request.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {ticketFields.map((ticketField, ticketIndex) => {
                const ticketId = form.watch(`ticketTypes.${ticketIndex}.id`);
                const currentPrice = form.watch(`ticketTypes.${ticketIndex}.currentPrice`);
                const currencyCode = form.watch(`ticketTypes.${ticketIndex}.currencyCode`);

                return (
                  <div key={ticketField.id} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Ticket Type {ticketIndex + 1}</h4>
                      {ticketFields.length > 1 && !ticketId && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTicket(ticketIndex)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Name *</Label>
                        <Input
                          placeholder="e.g., General Admission, VIP"
                          {...form.register(`ticketTypes.${ticketIndex}.name`)}
                        />
                      </div>
                      <div>
                        <Label>Capacity *</Label>
                        <Input
                          type="number"
                          min="1"
                          placeholder="100"
                          {...form.register(`ticketTypes.${ticketIndex}.capacity`, { valueAsNumber: true })}
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Description</Label>
                      <Input
                        placeholder="What's included with this ticket"
                        {...form.register(`ticketTypes.${ticketIndex}.description`)}
                      />
                    </div>

                    {/* Current Price (Read-only for existing tickets) */}
                    {ticketId && currentPrice !== undefined && (
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
                            onClick={() => {
                              toast({
                                title: "Price Change Request",
                                description: "Go to your dashboard's Requests tab to submit a ticket price change request.",
                              });
                              navigate("/vendor");
                            }}
                          >
                            <DollarSign className="h-4 w-4 mr-1" />
                            Request Price Change
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {form.formState.errors.ticketTypes && (
                <p className="text-sm text-red-600">{form.formState.errors.ticketTypes.message}</p>
              )}

              <Alert className="border-amber-200 bg-amber-50">
                <Info className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-700">
                  Adding new ticket types with pricing requires creating a new event or going through the admin approval process.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" asChild>
              <Link to="/vendor">Cancel</Link>
            </Button>
            <Button
              type="submit"
              disabled={updateEventMutation.isPending || isUploadingImages}
            >
              {updateEventMutation.isPending || isUploadingImages ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  {isUploadingImages ? "Uploading Images..." : "Saving..."}
                </>
              ) : (
                event.status === 'PENDING' || event.status === 'REJECTED'
                  ? "Save & Resubmit"
                  : "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
