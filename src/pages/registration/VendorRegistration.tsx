import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Store, Upload, MapPin, Globe, Phone, Mail, FileText, Image, CheckCircle, Package, Palette } from "lucide-react";

const vendorRegistrationSchema = z.object({
  businessName: z.string().min(2, "Business name must be at least 2 characters").max(200, "Business name is too long"),
  businessType: z.string().min(1, "Please select a business type"),
  ownerName: z.string().min(2, "Owner name must be at least 2 characters").max(200, "Owner name is too long"),
  businessDescription: z.string().min(100, "Business description must be at least 100 characters").max(1000, "Description is too long"),
  phoneNumber: z.string().min(10, "Phone number must be at least 10 digits"),
  email: z.string().email("Invalid email address"),
  businessAddress: z.object({
    street: z.string().min(5, "Street address is required"),
    city: z.string().min(2, "City is required"),
    state: z.string().min(2, "State/Region is required"),
    country: z.string().min(2, "Country is required"),
    zipCode: z.string().min(5, "ZIP/Postal code is required"),
  }),
  website: z.string().url("Invalid website URL").optional().or(z.literal("")),
  socialMediaLinks: z.object({
    instagram: z.string().url("Invalid Instagram URL").optional().or(z.literal("")),
    facebook: z.string().url("Invalid Facebook URL").optional().or(z.literal("")),
    tiktok: z.string().url("Invalid TikTok URL").optional().or(z.literal("")),
  }),
  productCategories: z.array(z.string()).min(1, "Please select at least one product category"),
  expectedMonthlyVolume: z.string().min(1, "Expected monthly volume is required"),
  businessLicenseUrl: z.string().min(1, "Business license upload is required"),
  productSamples: z.array(z.string()).min(1, "Please upload at least one product sample"),
  shippingRegions: z.array(z.string()).min(1, "Please select at least one shipping region"),
});

type VendorRegistrationForm = z.infer<typeof vendorRegistrationSchema>;

const BUSINESS_TYPES = [
  "Gift Shop",
  "Custom Orders",
  "Artisan Products", 
  "Traditional Crafts",
  "Cultural Items",
  "Jewelry & Accessories",
  "Home & Decor",
  "Food & Beverages",
  "Clothing & Textiles",
  "Beauty & Personal Care",
  "Electronics & Gadgets",
  "Books & Stationery",
  "Toys & Games",
  "Outdoor & Sports",
  "Other"
];

const PRODUCT_CATEGORIES = [
  "Ethiopian Traditional Items",
  "Custom Engraved Products",
  "Handmade Crafts",
  "Jewelry & Accessories", 
  "Home Decor",
  "Clothing & Fashion",
  "Food & Spices",
  "Coffee & Tea",
  "Beauty Products",
  "Religious Items",
  "Children's Gifts",
  "Corporate Gifts",
  "Wedding Gifts",
  "Holiday Gifts",
  "Personalized Items"
];

const SHIPPING_REGIONS = [
  "Addis Ababa", "Dire Dawa", "Mekelle", "Gondar", "Bahir Dar", "Awassa", "Jimma", "Dessie", "Adama", "Shashamane",
  "Washington DC", "New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia", "San Antonio", "San Diego", "Dallas",
  "London", "Manchester", "Birmingham", "Leeds", "Glasgow", "Sheffield", "Liverpool", "Edinburgh", "Bristol", "Leicester",
  "Toronto", "Vancouver", "Montreal", "Calgary", "Edmonton", "Ottawa", "Winnipeg", "Quebec City", "Hamilton", "Kitchener",
  "Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide", "Gold Coast", "Canberra", "Newcastle", "Wollongong", "Logan City"
];

const MONTHLY_VOLUMES = [
  "1-10 orders",
  "11-50 orders", 
  "51-100 orders",
  "101-500 orders",
  "500+ orders"
];

export default function VendorRegistration() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [businessLicenseFile, setBusinessLicenseFile] = useState<File | null>(null);
  const [productSampleFiles, setProductSampleFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();
  const navigate = useNavigate();

  const form = useForm<VendorRegistrationForm>({
    resolver: zodResolver(vendorRegistrationSchema),
    defaultValues: {
      businessName: "",
      businessType: "",
      ownerName: "",
      businessDescription: "",
      phoneNumber: "",
      email: "",
      businessAddress: {
        street: "",
        city: "",
        state: "",
        country: "",
        zipCode: "",
      },
      website: "",
      socialMediaLinks: {
        instagram: "",
        facebook: "",
        tiktok: "",
      },
      productCategories: [],
      expectedMonthlyVolume: "",
      businessLicenseUrl: "",
      productSamples: [],
      shippingRegions: [],
    },
  });

  const registerVendorMutation = useMutation({
    mutationFn: async (data: VendorRegistrationForm) => {
      return await apiRequest("POST", "/api/vendors/register", data);
    },
    onSuccess: () => {
      toast({
        title: "Vendor Registration Submitted Successfully!",
        description: "Your vendor application has been submitted for admin review. You'll receive a confirmation email shortly.",
        variant: "default",
      });
      navigate("/");
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to submit vendor registration. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCategoryToggle = (category: string) => {
    const newCategories = selectedCategories.includes(category)
      ? selectedCategories.filter(c => c !== category)
      : [...selectedCategories, category];
    setSelectedCategories(newCategories);
    form.setValue("productCategories", newCategories);
  };

  const handleRegionToggle = (region: string) => {
    const newRegions = selectedRegions.includes(region)
      ? selectedRegions.filter(r => r !== region)
      : [...selectedRegions, region];
    setSelectedRegions(newRegions);
    form.setValue("shippingRegions", newRegions);
  };

  const handleFileUpload = async (file: File, type: 'license' | 'sample') => {
    // For now, we'll simulate file upload with a placeholder URL
    // In production, this would upload to a cloud storage service
    const fileUrl = `https://placeholder.com/uploads/${type}/${file.name}`;
    
    if (type === 'license') {
      setBusinessLicenseFile(file);
      form.setValue("businessLicenseUrl", fileUrl);
    } else {
      const newSampleFiles = [...productSampleFiles, file];
      setProductSampleFiles(newSampleFiles);
      const sampleUrls = newSampleFiles.map(f => `https://placeholder.com/uploads/sample/${f.name}`);
      form.setValue("productSamples", sampleUrls);
    }

    toast({
      title: "File uploaded successfully",
      description: `${type === 'license' ? 'Business license' : 'Product sample'} uploaded.`,
    });
  };

  const removeSampleFile = (index: number) => {
    const newSampleFiles = productSampleFiles.filter((_, i) => i !== index);
    setProductSampleFiles(newSampleFiles);
    const sampleUrls = newSampleFiles.map(f => `https://placeholder.com/uploads/sample/${f.name}`);
    form.setValue("productSamples", sampleUrls);
  };

  const onSubmit = async (data: VendorRegistrationForm) => {
    setIsSubmitting(true);
    try {
      // Clean up social media links (remove empty strings)
      const cleanedSocialMedia = Object.fromEntries(
        Object.entries(data.socialMediaLinks).filter(([_, value]) => value !== "")
      );

      const submissionData = {
        ...data,
        socialMediaLinks: cleanedSocialMedia,
        website: data.website || undefined,
      };

      await registerVendorMutation.mutateAsync(submissionData);
    } catch (error) {
      console.error("Vendor registration error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-amber-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Store className="w-8 h-8 text-emerald-600" />
            <h1 className="text-4xl font-bold text-gray-900">Vendor Registration</h1>
            <Package className="w-8 h-8 text-emerald-600" />
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Join goZembil's marketplace and connect with the Ethiopian diaspora through authentic gifts. 
            Share your products with hearts around the world.
          </p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Business Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Store className="w-5 h-5" />
                <span>Business Information</span>
              </CardTitle>
              <CardDescription>
                Tell us about your business and what makes your products special
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="businessName">Business Name *</Label>
                  <Input
                    id="businessName"
                    placeholder="Your business or shop name"
                    {...form.register("businessName")}
                  />
                  {form.formState.errors.businessName && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.businessName.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="ownerName">Owner/Contact Name *</Label>
                  <Input
                    id="ownerName"
                    placeholder="Primary contact person"
                    {...form.register("ownerName")}
                  />
                  {form.formState.errors.ownerName && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.ownerName.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="businessType">Business Type *</Label>
                <Select onValueChange={(value) => form.setValue("businessType", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your business type" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUSINESS_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.businessType && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.businessType.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="businessDescription">Business Description *</Label>
                <Textarea
                  id="businessDescription"
                  placeholder="Describe your business, your products, your story, and what makes your offerings unique for the Ethiopian diaspora..."
                  className="min-h-[120px]"
                  {...form.register("businessDescription")}
                />
                {form.formState.errors.businessDescription && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.businessDescription.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Business Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="business@example.com"
                    {...form.register("email")}
                  />
                  {form.formState.errors.email && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.email.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="phoneNumber">Business Phone *</Label>
                  <Input
                    id="phoneNumber"
                    placeholder="+1234567890"
                    {...form.register("phoneNumber")}
                  />
                  {form.formState.errors.phoneNumber && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.phoneNumber.message}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Business Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="w-5 h-5" />
                <span>Business Address</span>
              </CardTitle>
              <CardDescription>
                Provide your business location for shipping and verification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="street">Street Address *</Label>
                <Input
                  id="street"
                  placeholder="123 Main Street"
                  {...form.register("businessAddress.street")}
                />
                {form.formState.errors.businessAddress?.street && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.businessAddress.street.message}</p>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    placeholder="City"
                    {...form.register("businessAddress.city")}
                  />
                  {form.formState.errors.businessAddress?.city && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.businessAddress.city.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="state">State/Region *</Label>
                  <Input
                    id="state"
                    placeholder="State or Region"
                    {...form.register("businessAddress.state")}
                  />
                  {form.formState.errors.businessAddress?.state && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.businessAddress.state.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="zipCode">ZIP/Postal Code *</Label>
                  <Input
                    id="zipCode"
                    placeholder="12345"
                    {...form.register("businessAddress.zipCode")}
                  />
                  {form.formState.errors.businessAddress?.zipCode && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.businessAddress.zipCode.message}</p>
                  )}
                </div>
              </div>
              <div>
                <Label htmlFor="country">Country *</Label>
                <Input
                  id="country"
                  placeholder="United States"
                  {...form.register("businessAddress.country")}
                />
                {form.formState.errors.businessAddress?.country && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.businessAddress.country.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Online Presence */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Globe className="w-5 h-5" />
                <span>Online Presence</span>
              </CardTitle>
              <CardDescription>
                Link your website and social media to build trust with customers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="website">Website URL</Label>
                <Input
                  id="website"
                  placeholder="https://yourbusiness.com"
                  {...form.register("website")}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="instagram">Instagram URL</Label>
                  <Input
                    id="instagram"
                    placeholder="https://instagram.com/your-page"
                    {...form.register("socialMediaLinks.instagram")}
                  />
                </div>
                <div>
                  <Label htmlFor="facebook">Facebook URL</Label>
                  <Input
                    id="facebook"
                    placeholder="https://facebook.com/your-page"
                    {...form.register("socialMediaLinks.facebook")}
                  />
                </div>
                <div>
                  <Label htmlFor="tiktok">TikTok URL</Label>
                  <Input
                    id="tiktok"
                    placeholder="https://tiktok.com/your-page"
                    {...form.register("socialMediaLinks.tiktok")}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Product Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Palette className="w-5 h-5" />
                <span>Product Information</span>
              </CardTitle>
              <CardDescription>
                Tell us about the products you want to sell on goZembil
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Product Categories *</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                  {PRODUCT_CATEGORIES.map((category) => (
                    <Button
                      key={category}
                      type="button"
                      variant={selectedCategories.includes(category) ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleCategoryToggle(category)}
                      className="justify-start text-xs h-auto py-2"
                    >
                      {category}
                    </Button>
                  ))}
                </div>
                {selectedCategories.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-600 mb-2">Selected categories:</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedCategories.map((category) => (
                        <Badge key={category} variant="secondary" className="text-xs">
                          {category}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {form.formState.errors.productCategories && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.productCategories.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="expectedMonthlyVolume">Expected Monthly Order Volume *</Label>
                <Select onValueChange={(value) => form.setValue("expectedMonthlyVolume", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select expected monthly orders" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHLY_VOLUMES.map((volume) => (
                      <SelectItem key={volume} value={volume}>
                        {volume}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.expectedMonthlyVolume && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.expectedMonthlyVolume.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Document Uploads */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Upload className="w-5 h-5" />
                <span>Required Documents & Product Samples</span>
              </CardTitle>
              <CardDescription>
                Upload your business license and product samples for verification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Business License/Registration *</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-2">Upload business license or registration document</p>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'license');
                    }}
                    className="hidden"
                    id="businessLicense"
                  />
                  <Button type="button" variant="outline" onClick={() => document.getElementById('businessLicense')?.click()}>
                    Choose File
                  </Button>
                  {businessLicenseFile && (
                    <p className="text-sm text-green-600 mt-2 flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      {businessLicenseFile.name}
                    </p>
                  )}
                </div>
                {form.formState.errors.businessLicenseUrl && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.businessLicenseUrl.message}</p>
                )}
              </div>

              <div>
                <Label>Product Samples *</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                  <Image className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-2">Upload high-quality photos of your products (minimum 1, maximum 5)</p>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      if (productSampleFiles.length + files.length <= 5) {
                        files.forEach(file => handleFileUpload(file, 'sample'));
                      } else {
                        toast({
                          title: "Too many files",
                          description: "You can upload maximum 5 product samples.",
                          variant: "destructive",
                        });
                      }
                    }}
                    className="hidden"
                    id="productSamples"
                  />
                  <Button type="button" variant="outline" onClick={() => document.getElementById('productSamples')?.click()}>
                    Choose Files
                  </Button>
                  {productSampleFiles.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {productSampleFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                          <span className="text-sm text-green-600 flex items-center">
                            <CheckCircle className="w-4 h-4 mr-1" />
                            {file.name}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeSampleFile(index)}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {form.formState.errors.productSamples && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.productSamples.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Shipping Regions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="w-5 h-5" />
                <span>Shipping Regions</span>
              </CardTitle>
              <CardDescription>
                Select the regions where you can ship your products
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {SHIPPING_REGIONS.map((region) => (
                  <Button
                    key={region}
                    type="button"
                    variant={selectedRegions.includes(region) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleRegionToggle(region)}
                    className="justify-start text-xs"
                  >
                    {region}
                  </Button>
                ))}
              </div>
              {selectedRegions.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-2">Selected shipping regions:</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedRegions.map((region) => (
                      <Badge key={region} variant="secondary" className="text-xs">
                        {region}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {form.formState.errors.shippingRegions && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.shippingRegions.message}</p>
              )}
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-center pt-6">
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white px-8 py-3"
            >
              {isSubmitting ? "Submitting..." : "Submit Vendor Registration"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}