import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  vendorService,
  VendorProfile,
  CreateEventRequest,
} from "@/services/vendorService";
import { apiService } from "@/services/apiService";
import { imageService } from "@/services/imageService";
import { toInstantISOString } from "@/lib/instant";
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
import {
  ArrowLeft,
  Plus,
  Trash2,
  Calendar,
  MapPin,
  Ticket,
  AlertCircle,
  ImageIcon,
  Info,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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

const ticketTypeSchema = z.object({
  name: z.string().min(1, "Ticket name is required"),
  description: z.string().optional(),
  capacity: z.number().min(1, "Capacity must be at least 1"),
  amount: z.number().min(0, "Price must be 0 or greater"),
});

const eventSchema = z.object({
  title: z.string().min(1, "Event title is required").max(255),
  description: z.string().min(10, "Description must be at least 10 characters"),
  summary: z.string().min(1, "Summary is required").max(500),
  startDateTime: z.string().min(1, "Start date/time is required"),
  endDateTime: z.string().min(1, "End date/time is required"),
  timezone: z.string().optional(),
  location: z.string().min(1, "Location is required"),
  city: z.string().min(1, "City is required"),
  organizerContact: z.string().optional(),
  imageUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  categoryId: z.string().optional(),
  currencyCode: z.string().min(1, "Currency is required"),
  ticketTypes: z
    .array(ticketTypeSchema)
    .min(1, "At least one ticket type is required"),
});

type EventFormData = z.infer<typeof eventSchema>;

type EventDraft = {
  formData: EventFormData;
  currentStep: number;
  updatedAt: string;
};

const EVENT_DRAFT_STORAGE_KEY = "vendor:create-event-draft:v1";
const EVENT_TOTAL_STEPS = 3;
const EVENT_STEP_TITLES = [
  "Event Details",
  "Date, Time & Location",
  "Pricing & Tickets",
];

const DEFAULT_EVENT_VALUES: EventFormData = {
  title: "",
  description: "",
  summary: "",
  startDateTime: "",
  endDateTime: "",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  location: "",
  city: "",
  organizerContact: "",
  imageUrl: "",
  categoryId: "",
  currencyCode: "ETB",
  ticketTypes: [
    {
      name: "",
      description: "",
      capacity: 0,
      amount: 1,
    },
  ],
};

const clampEventStep = (step: number) =>
  Math.min(EVENT_TOTAL_STEPS, Math.max(1, Math.floor(step || 1)));

const hasMeaningfulEventDraftData = (
  formData: EventFormData,
  hasPendingImages: boolean
) => {
  const hasBasicDetails =
    Boolean(formData.title.trim()) ||
    Boolean(formData.summary.trim()) ||
    Boolean(formData.description.trim());
  const hasDateLocation =
    Boolean(formData.startDateTime) ||
    Boolean(formData.endDateTime) ||
    Boolean(formData.location.trim()) ||
    Boolean(formData.city.trim()) ||
    Boolean(formData.organizerContact?.trim());
  const hasCategory = Boolean(formData.categoryId);
  const hasTicketDetails = formData.ticketTypes.some((ticket, index) => {
    const defaultTicket = DEFAULT_EVENT_VALUES.ticketTypes[index] || {
      name: "",
      description: "",
      capacity: 0,
      amount: 1,
    };

    return (
      Boolean(ticket.name?.trim()) ||
      Boolean(ticket.description?.trim()) ||
      ticket.capacity !== defaultTicket.capacity ||
      ticket.amount !== defaultTicket.amount
    );
  });

  return (
    hasBasicDetails ||
    hasDateLocation ||
    hasCategory ||
    hasTicketDetails ||
    hasPendingImages
  );
};

const getStoredEventDraft = (): EventDraft | null => {
  if (typeof window === "undefined") return null;

  try {
    const rawDraft = localStorage.getItem(EVENT_DRAFT_STORAGE_KEY);
    if (!rawDraft) return null;

    const parsed = JSON.parse(rawDraft) as Partial<EventDraft>;
    if (!parsed?.formData) return null;

    return {
      formData: {
        ...DEFAULT_EVENT_VALUES,
        ...parsed.formData,
        ticketTypes:
          Array.isArray(parsed.formData.ticketTypes) &&
          parsed.formData.ticketTypes.length > 0
            ? parsed.formData.ticketTypes
            : DEFAULT_EVENT_VALUES.ticketTypes,
      },
      currentStep: clampEventStep(parsed.currentStep ?? 1),
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch {
    return null;
  }
};

const saveEventDraft = (
  formData: EventFormData,
  currentStep: number,
  hasPendingImages: boolean
) => {
  if (typeof window === "undefined") return;

  try {
    if (!hasMeaningfulEventDraftData(formData, hasPendingImages)) {
      localStorage.removeItem(EVENT_DRAFT_STORAGE_KEY);
      return;
    }

    const draft: EventDraft = {
      formData,
      currentStep: clampEventStep(currentStep),
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(EVENT_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Ignore storage errors
  }
};

export default function CreateEvent() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isVendor = user?.role?.toUpperCase() === "VENDOR";

  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isDraftInitialized, setIsDraftInitialized] = useState(false);
  const [showDraftDecision, setShowDraftDecision] = useState(false);
  const [storedDraft, setStoredDraft] = useState<EventDraft | null>(null);

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

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: DEFAULT_EVENT_VALUES,
  });

  const {
    fields: ticketFields,
    append: appendTicket,
    remove: removeTicket,
  } = useFieldArray({
    control: form.control,
    name: "ticketTypes",
  });

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
    const draft = getStoredEventDraft();
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
      saveEventDraft(form.getValues(), currentStep, pendingImages.length > 0);
    });

    return () => subscription.unsubscribe();
  }, [form, currentStep, isDraftInitialized, showDraftDecision, pendingImages]);

  useEffect(() => {
    if (!isDraftInitialized || showDraftDecision) return;
    saveEventDraft(form.getValues(), currentStep, pendingImages.length > 0);
  }, [currentStep, form, isDraftInitialized, showDraftDecision, pendingImages]);

  const handleStartNewDraft = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(EVENT_DRAFT_STORAGE_KEY);
    }

    setPendingImages([]);
    setCurrentStep(1);
    form.reset(DEFAULT_EVENT_VALUES);
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

    form.reset({ ...DEFAULT_EVENT_VALUES, ...storedDraft.formData });
    setCurrentStep(clampEventStep(storedDraft.currentStep));
    setShowDraftDecision(false);
    setIsDraftInitialized(true);

    toast({
      title: "Draft Restored",
      description:
        "Your saved event draft has been loaded. Images need re-upload.",
    });
  };

  const handleNextStep = async () => {
    const fieldsByStep: Record<number, Array<keyof EventFormData>> = {
      1: ["title", "summary", "description"],
      2: ["startDateTime", "endDateTime", "location", "city"],
      3: ["currencyCode", "ticketTypes"],
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

    setCurrentStep((prev) => clampEventStep(prev + 1));
  };

  const createEventMutation = useMutation({
    mutationFn: async (data: EventFormData) => {
      const eventPayload: CreateEventRequest = {
        title: data.title,
        description: data.description,
        summary: data.summary,
        location: data.location,
        city: data.city,
        eventDate: toInstantISOString(data.startDateTime) || data.startDateTime,
        eventEndDate: toInstantISOString(data.endDateTime),
        eventTypeId: data.categoryId ? parseInt(data.categoryId) : undefined,
        bannerImageUrl: data.imageUrl || undefined,
        organizerContact: data.organizerContact || undefined,
        ticketTypes: data.ticketTypes.map((tt, index) => ({
          name: tt.name,
          description: tt.description,
          capacity: tt.capacity,
          price: tt.amount,
          currency: data.currencyCode,
          sortOrder: index,
        })),
      };

      const createdEvent = await vendorService.createEvent(eventPayload);

      if (pendingImages.length > 0 && createdEvent?.id) {
        console.log(
          `Uploading ${pendingImages.length} images for event ${createdEvent.id}...`
        );
        setIsUploadingImages(true);
        try {
          await imageService.uploadEventImages(createdEvent.id, pendingImages);
          console.log("Event images uploaded successfully");
        } catch (imageError) {
          console.error("Failed to upload event images:", imageError);
          toast({
            title: "Warning",
            description:
              "Event created but some images failed to upload. You can add them later.",
            variant: "destructive",
          });
        } finally {
          setIsUploadingImages(false);
        }
      }

      return createdEvent;
    },
    onSuccess: () => {
      if (typeof window !== "undefined") {
        localStorage.removeItem(EVENT_DRAFT_STORAGE_KEY);
      }

      // Invalidate relevant queries so lists refresh immediately
      queryClient.invalidateQueries({ queryKey: ["vendor", "events"] });
      queryClient.invalidateQueries({
        queryKey: ["vendor", "pending-rejected-events"],
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "pending-events"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "all-events"] });

      toast({
        title: "Event Created",
        description: "Your event has been submitted for admin approval.",
      });
      navigate("/vendor");
    },
    onError: (error: any) => {
      setIsUploadingImages(false);
      toast({
        title: "Error",
        description: error.message || "Failed to create event",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EventFormData) => {
    console.log("Event form submitted with data:", data);

    if (pendingImages.length === 0) {
      toast({
        title: "Image Required",
        description:
          "Please upload at least one event image before creating the event.",
        variant: "destructive",
      });
      return;
    }

    createEventMutation.mutate(data);
  };

  const onError = (errors: any) => {
    console.log("Event form validation errors:", errors);

    if (errors.title || errors.summary || errors.description) {
      setCurrentStep(1);
    } else if (
      errors.startDateTime ||
      errors.endDateTime ||
      errors.location ||
      errors.city
    ) {
      setCurrentStep(2);
    } else if (errors.currencyCode || errors.ticketTypes) {
      setCurrentStep(3);
    }

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
        <p className="text-gray-600 mb-4">
          You need to be a vendor to create events.
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
            <h1 className="text-2xl font-bold">Create Event</h1>
            <p className="text-muted-foreground">
              Add a new event with ticket types (requires admin approval)
            </p>
          </div>
        </div>

        {showDraftDecision && storedDraft ? (
          <Card>
            <CardHeader>
              <CardTitle>Saved Draft Found</CardTitle>
              <CardDescription>
                You have a saved event draft from{" "}
                {new Date(storedDraft.updatedAt).toLocaleString()}. Continue
                where you stopped or start a new event.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-3 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleStartNewDraft}
              >
                Create New Event
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {EVENT_STEP_TITLES.map((stepTitle, index) => {
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
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.title.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="summary">Summary *</Label>
                    <Input
                      id="summary"
                      placeholder="Brief event summary"
                      {...form.register("summary")}
                    />
                    {form.formState.errors.summary && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.summary.message}
                      </p>
                    )}
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
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.description.message}
                      </p>
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
                        Upload up to 10 images for your event. The first image
                        will be the primary/cover image.
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
                        disabled={createEventMutation.isPending}
                        label=""
                        helperText="Drag and drop images here, or click to select. First image will be the cover."
                      />
                      {pendingImages.length > 0 && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {pendingImages.length} image(s) will be uploaded when
                          you create the event
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <div>
                    <Label>Category</Label>
                    <SubcategorySearchCombobox
                      value={form.watch("categoryId")}
                      onValueChange={(value) =>
                        form.setValue("categoryId", value)
                      }
                      placeholder="Search and select a category (optional)"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Date, Time & Location */}
            {currentStep === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle> Date, Time & Location</CardTitle>
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
                        <p className="text-sm text-red-600 mt-1">
                          {form.formState.errors.startDateTime.message}
                        </p>
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
                        <p className="text-sm text-red-600 mt-1">
                          {form.formState.errors.endDateTime.message}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>

                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Location
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="location">Location *</Label>
                    <Input
                      id="location"
                      placeholder="Enter event location (venue, address, etc.)"
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
                      placeholder="City"
                      {...form.register("city")}
                    />
                    {form.formState.errors.city && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.city.message}
                      </p>
                    )}
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
            )}

            {/* Pricing */}
            {currentStep === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle>Pricing *</CardTitle>
                  <CardDescription>
                    Set the currency for all ticket types
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
                      Enter your ticket prices (what you'll receive).
                      {vendorProfile?.vatStatus === "VAT_REGISTERED" && (
                        <span className="block mt-1 font-medium">
                          As a VAT-registered vendor, VAT will be included in
                          the customer price.
                        </span>
                      )}
                    </AlertDescription>
                  </Alert>

                  {!isEthiopianVendor(vendorProfile) ? (
                    <div>
                      <Label>Currency *</Label>
                      <Select
                        value={form.watch("currencyCode")}
                        onValueChange={(value) =>
                          form.setValue("currencyCode", value)
                        }
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
                      {form.formState.errors.currencyCode && (
                        <p className="text-sm text-red-600 mt-1">
                          {form.formState.errors.currencyCode.message}
                        </p>
                      )}
                    </div>
                  ) : null}
                </CardContent>

                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Ticket className="h-5 w-5" />
                    Ticket Types *
                  </CardTitle>
                  <CardDescription>
                    Define the ticket types and pricing for your event
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {ticketFields.map((ticketField, ticketIndex) => (
                    <div
                      key={ticketField.id}
                      className="border rounded-lg p-4 space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">
                          Ticket Type {ticketIndex + 1}
                        </h4>
                        {ticketFields.length > 1 && (
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
                            {...form.register(
                              `ticketTypes.${ticketIndex}.name`
                            )}
                          />
                        </div>
                        <div>
                          <Label>Capacity *</Label>
                          <Input
                            type="number"
                            min="1"
                            placeholder="100"
                            {...form.register(
                              `ticketTypes.${ticketIndex}.capacity`,
                              { valueAsNumber: true }
                            )}
                          />
                        </div>
                      </div>

                      <div>
                        <Label>Description</Label>
                        <Input
                          placeholder="What's included with this ticket"
                          {...form.register(
                            `ticketTypes.${ticketIndex}.description`
                          )}
                        />
                      </div>

                      <div>
                        <Label>
                          {isEthiopianVendor(vendorProfile)
                            ? "Price (ETB) *"
                            : `Price (${
                                form.watch("currencyCode") || "Currency"
                              }) *`}
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          {...form.register(
                            `ticketTypes.${ticketIndex}.amount`,
                            { valueAsNumber: true }
                          )}
                        />
                      </div>
                    </div>
                  ))}

                  {form.formState.errors.ticketTypes && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.ticketTypes.message}
                    </p>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      appendTicket({
                        name: "",
                        description: "",
                        capacity: 0,
                        amount: 0,
                      })
                    }
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Ticket Type
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Submit */}
            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" asChild>
                <Link to="/vendor">Cancel</Link>
              </Button>

              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setCurrentStep((prev) => clampEventStep(prev - 1))
                  }
                >
                  Back
                </Button>
              )}

              {currentStep < EVENT_TOTAL_STEPS ? (
                <Button type="button" onClick={handleNextStep}>
                  Next
                </Button>
              ) : (
                <Button type="submit" disabled={createEventMutation.isPending}>
                  {createEventMutation.isPending
                    ? "Creating..."
                    : "Create Event"}
                </Button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
