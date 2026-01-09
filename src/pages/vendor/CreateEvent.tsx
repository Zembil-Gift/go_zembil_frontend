import {useState, useEffect} from "react";
import {useForm, useFieldArray} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {z} from "zod";
import {useMutation, useQuery} from "@tanstack/react-query";
import {useNavigate, Link} from "react-router-dom";
import {useAuth} from "@/hooks/useAuth";
import {useToast} from "@/hooks/use-toast";
import {vendorService, VendorProfile, CreateEventRequest} from "@/services/vendorService";
import {apiService} from "@/services/apiService";
import {imageService} from "@/services/imageService";

const isEthiopianVendor = (vendorProfile: VendorProfile | undefined): boolean => {
    if (!vendorProfile) return false;
    return vendorProfile.countryCode === 'ET';
};
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {Label} from "@/components/ui/label";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {ImageUpload} from "@/components/ImageUpload";
import {ArrowLeft, Plus, Trash2, Calendar, MapPin, Ticket, AlertCircle, ImageIcon, Info} from "lucide-react";
import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";

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

const ticketTypeSchema = z.object({
    name: z.string().min(1, "Ticket name is required"),
    description: z.string().optional(),
    capacity: z.number().min(1, "Capacity must be at least 1"),
    amount: z.number().min(0, "Price must be 0 or greater"),
});

const eventSchema = z.object({
    title: z.string().min(1, "Event title is required").max(255),
    description: z.string().min(10, "Description must be at least 10 characters"),
    shortDescription: z.string().max(500).optional(),
    startDateTime: z.string().min(1, "Start date/time is required"),
    endDateTime: z.string().min(1, "End date/time is required"),
    timezone: z.string().optional(),
    venue: z.string().min(1, "Venue is required"),
    address: z.string().optional(),
    city: z.string().optional(),
    imageUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
    categoryId: z.string().optional(),
    currencyCode: z.string().min(1, "Currency is required"),
    ticketTypes: z.array(ticketTypeSchema).min(1, "At least one ticket type is required"),
});

type EventFormData = z.infer<typeof eventSchema>;

export default function CreateEvent() {
    const navigate = useNavigate();
    const {user, isAuthenticated} = useAuth();
    const {toast} = useToast();

    const isVendor = user?.role?.toUpperCase() === 'VENDOR';

    const [pendingImages, setPendingImages] = useState<File[]>([]);
    const [isUploadingImages, setIsUploadingImages] = useState(false);

    const {data: categories = []} = useQuery({
        queryKey: ['categories'],
        queryFn: () => apiService.getRequest<Category[]>('/api/categories'),
    });

    const {data: allSubCategories = [], isLoading: isLoadingSubCategories} = useQuery({
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

    const {data: currencies = []} = useQuery({
        queryKey: ['currencies'],
        queryFn: () => apiService.getRequest<Currency[]>('/api/currencies'),
    });

    const {data: vendorProfile} = useQuery({
        queryKey: ['vendor', 'profile'],
        queryFn: () => vendorService.getMyProfile(),
        enabled: isAuthenticated && isVendor,
    });

    const availableCurrencies = isEthiopianVendor(vendorProfile)
        ? currencies.filter(c => c.code === 'ETB')
        : currencies;

    const form = useForm<EventFormData>({
        resolver: zodResolver(eventSchema),
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
            imageUrl: "",
            categoryId: "",
            currencyCode: "ETB", // Will be updated by useEffect when vendorProfile loads
            ticketTypes: [
                {
                    name: "",
                    description: "",
                    capacity: 0,
                    amount: 1,
                },
            ],
        },
    });

    const {fields: ticketFields, append: appendTicket, remove: removeTicket} = useFieldArray({
        control: form.control,
        name: "ticketTypes",
    });

    // Update currencyCode when vendorProfile and currencies load
    useEffect(() => {
        if (vendorProfile && currencies.length > 0) {
            const currency = isEthiopianVendor(vendorProfile) ? "ETB" : (currencies[0]?.code || "ETB");
            form.setValue('currencyCode', currency);
        }
    }, [vendorProfile, currencies, form]);

    const createEventMutation = useMutation({
        mutationFn: async (data: EventFormData) => {
            const eventPayload: CreateEventRequest = {
                title: data.title,
                description: data.description,
                location: data.venue,
                city: data.city || '',
                eventDate: data.startDateTime,
                eventEndDate: data.endDateTime,
                eventTypeId: data.categoryId ? parseInt(data.categoryId) : undefined,
                bannerImageUrl: data.imageUrl || undefined,
                organizerContact: undefined,
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
                console.log(`Uploading ${pendingImages.length} images for event ${createdEvent.id}...`);
                setIsUploadingImages(true);
                try {
                    await imageService.uploadEventImages(createdEvent.id, pendingImages);
                    console.log("Event images uploaded successfully");
                } catch (imageError) {
                    console.error("Failed to upload event images:", imageError);
                    toast({
                        title: "Warning",
                        description: "Event created but some images failed to upload. You can add them later.",
                        variant: "destructive",
                    });
                } finally {
                    setIsUploadingImages(false);
                }
            }

            return createdEvent;
        },
        onSuccess: () => {
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
                description: "Please upload at least one event image before creating the event.",
                variant: "destructive",
            });
            return;
        }

        createEventMutation.mutate(data);
    };

    const onError = (errors: any) => {
        console.log("Event form validation errors:", errors);
        toast({
            title: "Validation Error",
            description: "Please fill in all required fields correctly.",
            variant: "destructive",
        });
    };

    if (!isAuthenticated || !isVendor) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4">
                <AlertCircle className="h-16 w-16 text-amber-500 mb-4"/>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
                <p className="text-gray-600 mb-4">You need to be a vendor to create events.</p>
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
                            <ArrowLeft className="h-5 w-5"/>
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">Create Event</h1>
                        <p className="text-muted-foreground">Add a new event with ticket types (requires admin
                            approval)</p>
                    </div>
                </div>

                <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-6">
                    {/* Basic Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Calendar className="h-5 w-5"/>
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
                                        <ImageIcon className="h-4 w-4"/>
                                        Event Images
                                    </CardTitle>
                                    <CardDescription>
                                        Upload up to 10 images for your event. The first image will be the primary/cover
                                        image.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ImageUpload
                                        images={[]}
                                        onFilesSelected={(files) => {
                                            setPendingImages(prev => [...prev, ...files]);
                                        }}
                                        maxImages={10}
                                        isUploading={isUploadingImages}
                                        disabled={createEventMutation.isPending}
                                        label=""
                                        helperText="Drag and drop images here, or click to select. First image will be the cover."
                                    />
                                    {pendingImages.length > 0 && (
                                        <p className="text-sm text-muted-foreground mt-2">
                                            {pendingImages.length} image(s) will be uploaded when you create the event
                                        </p>
                                    )}
                                </CardContent>
                            </Card>

                            <div>
                                <Label>Category</Label>
                                <Select onValueChange={(value) => form.setValue("categoryId", value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={isLoadingSubCategories ? "Loading categories..." : "Select a category (optional)"}/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {allSubCategories.map((subCategory) => (
                                            <SelectItem key={subCategory.id} value={subCategory.id.toString()}>
                                                {subCategory.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
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
                                <MapPin className="h-5 w-5"/>
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

                            <div>
                                <Label htmlFor="city">City</Label>
                                <Input
                                    id="city"
                                    placeholder="City"
                                    {...form.register("city")}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Pricing */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Pricing *</CardTitle>
                            <CardDescription>Set the currency for all ticket types</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* VAT Notice */}
                            <Alert className="border-blue-200 bg-blue-50">
                                <Info className="h-4 w-4 text-blue-600" />
                                <AlertTitle className="text-blue-800">Pricing Information</AlertTitle>
                                <AlertDescription className="text-blue-700">
                                    Enter your ticket prices (what you'll receive).
                                    {vendorProfile?.vatStatus === 'VAT_REGISTERED' && (
                                        <span className="block mt-1 font-medium">
                                            As a VAT-registered vendor, VAT will be included in the customer price.
                                        </span>
                                    )}
                                </AlertDescription>
                            </Alert>

                            {!isEthiopianVendor(vendorProfile) ? (
                                <div>
                                    <Label>Currency *</Label>
                                    <Select
                                        value={form.watch("currencyCode")}
                                        onValueChange={(value) => form.setValue("currencyCode", value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select currency"/>
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
                                        <p className="text-sm text-red-600 mt-1">{form.formState.errors.currencyCode.message}</p>
                                    )}
                                </div>
                            ) : null}
                        </CardContent>
                    </Card>

                    {/* Ticket Types */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Ticket className="h-5 w-5"/>
                                Ticket Types *
                            </CardTitle>
                            <CardDescription>Define the ticket types and pricing for your event</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {ticketFields.map((ticketField, ticketIndex) => (
                                <div key={ticketField.id} className="border rounded-lg p-4 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-medium">Ticket Type {ticketIndex + 1}</h4>
                                        {ticketFields.length > 1 && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeTicket(ticketIndex)}
                                            >
                                                <Trash2 className="h-4 w-4 text-red-500"/>
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
                                                {...form.register(`ticketTypes.${ticketIndex}.capacity`, {valueAsNumber: true})}
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

                                    <div>
                                        <Label>
                                            {isEthiopianVendor(vendorProfile) ? "Price (ETB) *" : `Price (${form.watch("currencyCode") || "Currency"}) *`}
                                        </Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            placeholder="0.00"
                                            {...form.register(`ticketTypes.${ticketIndex}.amount`, {valueAsNumber: true})}
                                        />
                                    </div>
                                </div>
                            ))}

                            {form.formState.errors.ticketTypes && (
                                <p className="text-sm text-red-600">{form.formState.errors.ticketTypes.message}</p>
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
                                <Plus className="h-4 w-4 mr-2"/>
                                Add Ticket Type
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Submit */}
                    <div className="flex justify-end gap-4">
                        <Button type="button" variant="outline" asChild>
                            <Link to="/vendor">Cancel</Link>
                        </Button>
                        <Button type="submit" disabled={createEventMutation.isPending}>
                            {createEventMutation.isPending ? "Creating..." : "Create Event"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
