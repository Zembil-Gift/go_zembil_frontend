import { useState, useCallback, useEffect } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { customOrderTemplateService } from "@/services/customOrderTemplateService";
import { vendorService } from "@/services/vendorService";
import { apiService } from "@/services/apiService";
import { imageService } from "@/services/imageService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUpload } from "@/components/ImageUpload";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, Package, AlertCircle, Plus, Trash2, Camera, Info, 
  GripVertical, Type, Hash, Image as ImageIcon, Video
} from "lucide-react";
import type { 
  CreateCustomOrderTemplateRequest, 
  CustomizationFieldType 
} from "@/types/customOrders";

// Field type options
const FIELD_TYPES: { value: CustomizationFieldType; label: string; icon: React.ReactNode }[] = [
  { value: 'TEXT', label: 'Text', icon: <Type className="h-4 w-4" /> },
  { value: 'NUMBER', label: 'Number', icon: <Hash className="h-4 w-4" /> },
  { value: 'IMAGE', label: 'Image', icon: <ImageIcon className="h-4 w-4" /> },
  { value: 'VIDEO', label: 'Video', icon: <Video className="h-4 w-4" /> },
];

// Customization field schema
const customizationFieldSchema = z.object({
  fieldName: z.string().min(1, "Field name is required").max(128),
  fieldType: z.enum(['TEXT', 'NUMBER', 'IMAGE', 'VIDEO']),
  required: z.boolean().default(false),
  description: z.string().max(500).optional(),
  sortOrder: z.number().default(0),
});

// Template schema
const templateSchema = z.object({
  name: z.string().min(1, "Template name is required").max(255),
  description: z.string().max(5000).optional(),
  basePrice: z.number().min(0.01, "Base price must be greater than 0"),
  currency: z.string().min(3, "Currency is required").max(3),
  categoryId: z.number().optional(),
  fields: z.array(customizationFieldSchema).min(1, "At least one customization field is required"),
});

type TemplateFormData = z.infer<typeof templateSchema>;

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
// Helper function to check if vendor is Ethiopian
const isEthiopianVendor = (vendorProfile: any): boolean => {
  if (!vendorProfile) return false;
  return vendorProfile.countryCode === 'ET';
};

export default function CreateCustomTemplate() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);

  const isVendor = user?.role?.toUpperCase() === 'VENDOR';

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiService.getRequest<Category[]>('/api/categories'),
  });

  // Fetch all subcategories
  const { data: allSubCategories = [], isLoading: isLoadingSubCategories } = useQuery({
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

  // Fetch vendor profile
  const { data: vendorProfile } = useQuery({
    queryKey: ['vendor', 'profile'],
    queryFn: () => vendorService.getMyProfile(),
    enabled: isAuthenticated && isVendor,
  });

  const availableCurrencies = isEthiopianVendor(vendorProfile)
    ? currencies.filter(c => c.code === 'ETB')
    : currencies;

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: "",
      description: "",
      basePrice: 0,
      currency: "ETB", // Will be updated by useEffect when vendorProfile loads
      categoryId: 0,
      fields: [{
        fieldName: "",
        fieldType: 'TEXT',
        required: false,
        description: "",
        sortOrder: 0,
      }],
    },
  });

  // Update currency when vendorProfile and currencies load
  useEffect(() => {
    if (vendorProfile && currencies.length > 0) {
      const currency = isEthiopianVendor(vendorProfile) ? "ETB" : (currencies[0]?.code || "ETB");
      form.setValue('currency', currency);
    }
  }, [vendorProfile, currencies, form]);

  const { fields: fieldArray, append: appendField, remove: removeField, update: updateField } = useFieldArray({
    control: form.control,
    name: "fields",
  });

  const fields = form.watch("fields");

  // Add new customization field
  const addField = () => {
    const newField = {
      fieldName: "",
      fieldType: 'TEXT' as CustomizationFieldType,
      required: false,
      description: "",
      sortOrder: fieldArray.length,
    };
    appendField(newField);
  };

  // Update field sort order for drag and drop (simplified)
  const moveField = (fromIndex: number, toIndex: number) => {
    const newFields = [...fields];
    const [movedField] = newFields.splice(fromIndex, 1);
    newFields.splice(toIndex, 0, movedField);
    
    // Update sort orders
    newFields.forEach((field, index) => {
      updateField(index, { ...field, sortOrder: index });
    });
  };

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      const request: CreateCustomOrderTemplateRequest = {
        name: data.name,
        description: data.description,
        basePrice: data.basePrice, // Send major units directly - backend handles conversion
        currency: data.currency,
        categoryId: data.categoryId || undefined,
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
          await imageService.uploadTemplateImages(createdTemplate.id, pendingImages);
        } catch (imageError: any) {
          console.error('Failed to upload template images:', imageError);
          toast({ 
            title: "Warning", 
            description: "Template created but some images failed to upload.", 
            variant: "destructive" 
          });
        } finally {
          setIsUploadingImages(false);
        }
      }

      return createdTemplate;
    },
    onSuccess: () => {
      toast({
        title: "Template Created",
        description: "Your custom order template has been submitted for admin approval.",
      });
      navigate("/vendor/custom-templates");
    },
    onError: (error: any) => {
      setIsUploadingImages(false);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create template", 
        variant: "destructive" 
      });
    },
  });

  const onSubmit = (data: TemplateFormData) => {
    // Validation
    if (data.fields.length === 0) {
      toast({ 
        title: "Validation Error", 
        description: "Please add at least one customization field.", 
        variant: "destructive" 
      });
      return;
    }

    // Check for empty field names
    const emptyFields = data.fields.filter(field => !field.fieldName.trim());
    if (emptyFields.length > 0) {
      toast({ 
        title: "Validation Error", 
        description: "All customization fields must have a name.", 
        variant: "destructive" 
      });
      return;
    }

    createTemplateMutation.mutate(data);
  };

  if (!isAuthenticated || !isVendor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <AlertCircle className="h-16 w-16 text-amber-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-600 mb-4">You need to be a vendor to create templates.</p>
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
            <p className="text-muted-foreground">Create a customizable product/service template (requires admin approval)</p>
          </div>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                <Label htmlFor="name">Template Name *</Label>
                <Input 
                  id="name" 
                  placeholder="Enter template name" 
                  {...form.register("name")} 
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.name.message}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description" 
                  placeholder="Describe your customizable product/service..." 
                  className="min-h-[100px]" 
                  {...form.register("description")} 
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>
                    {isEthiopianVendor(vendorProfile) ? "Base Price (ETB) *" : "Base Price *"}
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
                        value={field.value || ''} 
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} 
                      />
                    )} 
                  />
                  {form.formState.errors.basePrice && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.basePrice.message}</p>
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
                              <SelectItem key={currency.id} value={currency.code}>
                                {currency.code} - {currency.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {form.formState.errors.currency && (
                      <p className="text-sm text-red-600 mt-1">{form.formState.errors.currency.message}</p>
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
                    <Select 
                      value={field.value?.toString()} 
                      onValueChange={(value) => field.onChange(parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingSubCategories ? "Loading categories..." : "Select a category"} />
                      </SelectTrigger>
                      <SelectContent>
                        {allSubCategories.map((subCategory) => (
                          <SelectItem key={subCategory.id} value={subCategory.id.toString()}>
                            {subCategory.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Template Images */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Template Images
              </CardTitle>
              <CardDescription>
                Upload images that showcase your template. First image will be the cover.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ImageUpload
                images={[]}
                onFilesSelected={(files) => setPendingImages((prev) => [...prev, ...files])}
                maxImages={10}
                isUploading={isUploadingImages}
                disabled={createTemplateMutation.isPending}
                label=""
                helperText=""
              />
              {pendingImages.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm text-muted-foreground">{pendingImages.length} image(s) will be uploaded</p>
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
                          onClick={() => setPendingImages((prev) => prev.filter((_, i) => i !== index))}
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
          {/* Customization Fields */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GripVertical className="h-5 w-5" />
                Customization Fields *
              </CardTitle>
              <CardDescription>
                Define the fields customers can customize. At least one field is required.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-blue-200 bg-blue-50">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-800">Field Types</AlertTitle>
                <AlertDescription className="text-blue-700">
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li><strong>Text:</strong> Single or multi-line text input</li>
                    <li><strong>Number:</strong> Numeric input with validation</li>
                    <li><strong>Image:</strong> File upload for images</li>
                    <li><strong>Video:</strong> File upload for videos</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                {fieldArray.map((field, index) => (
                  <Card key={field.id} className="border-2 border-dashed border-gray-200">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                          <CardTitle className="text-lg">Field {index + 1}</CardTitle>
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
                          {form.formState.errors.fields?.[index]?.fieldName && (
                            <p className="text-sm text-red-600 mt-1">
                              {form.formState.errors.fields[index]?.fieldName?.message}
                            </p>
                          )}
                        </div>
                        
                        <div>
                          <Label>Field Type *</Label>
                          <Controller
                            name={`fields.${index}.fieldType`}
                            control={form.control}
                            render={({ field }) => (
                              <Select value={field.value} onValueChange={field.onChange}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select field type" />
                                </SelectTrigger>
                                <SelectContent>
                                  {FIELD_TYPES.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
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
                        <Label htmlFor={`required-${index}`} className="text-sm">
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

          {/* Policies */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Template Policies
              </CardTitle>
              <CardDescription>Important information about your custom order template</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-amber-200 bg-amber-50">
                <Info className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800">Admin Approval Required</AlertTitle>
                <AlertDescription className="text-amber-700">
                  Your template will be reviewed by our admin team before it becomes visible to customers. 
                  You'll be notified once it's approved or if any changes are needed.
                </AlertDescription>
              </Alert>

              <Alert className="border-blue-200 bg-blue-50">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-800">Pricing & Negotiation</AlertTitle>
                <AlertDescription className="text-blue-700">
                  <p className="mb-2">The base price you set is a starting point:</p>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>Customers will see this as the "starting from" price</li>
                    <li>You can adjust the final price based on their specific requirements</li>
                    <li>Price negotiation happens through the order chat system</li>
                    <li>Payment is only processed after both parties agree on the final price</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <Alert className="border-green-200 bg-green-50">
                <Info className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">Order Process</AlertTitle>
                <AlertDescription className="text-green-700">
                  <p className="mb-2">Once approved, customers can:</p>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>Browse your template in the custom orders section</li>
                    <li>Fill out the customization fields you've defined</li>
                    <li>Submit their order with their requirements</li>
                    <li>Communicate with you through the built-in chat system</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-between items-center py-4 border-t bg-white sticky bottom-0">
            <div className="text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                {fieldArray.length} customization field{fieldArray.length !== 1 ? 's' : ''} configured
              </span>
            </div>
            <div className="flex gap-4">
              <Button type="button" variant="outline" asChild>
                <Link to="/vendor/custom-templates">Cancel</Link>
              </Button>
              <Button 
                type="submit" 
                disabled={createTemplateMutation.isPending || isUploadingImages}
              >
                {isUploadingImages 
                  ? "Uploading Images..." 
                  : createTemplateMutation.isPending 
                    ? "Creating..." 
                    : "Create Template"
                }
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}