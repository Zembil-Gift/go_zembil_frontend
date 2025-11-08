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
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Star, Upload, MapPin, Clock, Camera, Globe, Phone, Mail, FileText, Image, CheckCircle } from "lucide-react";

const celebrityRegistrationSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(200, "Full name is too long"),
  stageName: z.string().max(200, "Stage name is too long").optional(),
  bio: z.string().min(50, "Bio must be at least 50 characters").max(1000, "Bio is too long"),
  phoneNumber: z.string().min(10, "Phone number must be at least 10 digits"),
  email: z.string().email("Invalid email address"),
  socialMediaLinks: z.object({
    instagram: z.string().url("Invalid Instagram URL").optional().or(z.literal("")),
    tiktok: z.string().url("Invalid TikTok URL").optional().or(z.literal("")),
    youtube: z.string().url("Invalid YouTube URL").optional().or(z.literal("")),
    twitter: z.string().url("Invalid Twitter URL").optional().or(z.literal("")),
    facebook: z.string().url("Invalid Facebook URL").optional().or(z.literal("")),
  }),
  deliveryAvailability: z.object({
    days: z.array(z.string()).min(1, "Please select at least one day"),
    hours: z.object({
      start: z.string().min(1, "Start time is required"),
      end: z.string().min(1, "End time is required"),
    }),
  }),
  deliveryRegions: z.array(z.string()).min(1, "Please select at least one delivery region"),
  pricePerDelivery: z.string().min(1, "Price per delivery is required"),
  profilePictureUrl: z.string().optional(),
  governmentIdUrl: z.string().min(1, "Government ID upload is required"),
});

type CelebrityRegistrationForm = z.infer<typeof celebrityRegistrationSchema>;

const DAYS_OF_WEEK = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
];

const DELIVERY_REGIONS = [
  "Addis Ababa", "Dire Dawa", "Mekelle", "Gondar", "Bahir Dar", "Awassa", "Jimma", "Dessie", "Adama", "Shashamane",
  "Washington DC", "New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia", "San Antonio", "San Diego", "Dallas",
  "London", "Manchester", "Birmingham", "Leeds", "Glasgow", "Sheffield", "Liverpool", "Edinburgh", "Bristol", "Leicester",
  "Toronto", "Vancouver", "Montreal", "Calgary", "Edmonton", "Ottawa", "Winnipeg", "Quebec City", "Hamilton", "Kitchener",
  "Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide", "Gold Coast", "Canberra", "Newcastle", "Wollongong", "Logan City"
];

export default function CelebrityRegistration() {
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [governmentIdFile, setGovernmentIdFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();
  const navigate = useNavigate();

  const form = useForm<CelebrityRegistrationForm>({
    resolver: zodResolver(celebrityRegistrationSchema),
    defaultValues: {
      fullName: "",
      stageName: "",
      bio: "",
      phoneNumber: "",
      email: "",
      socialMediaLinks: {
        instagram: "",
        tiktok: "",
        youtube: "",
        twitter: "",
        facebook: "",
      },
      deliveryAvailability: {
        days: [],
        hours: { start: "", end: "" },
      },
      deliveryRegions: [],
      pricePerDelivery: "",
      profilePictureUrl: "",
      governmentIdUrl: "",
    },
  });

  const registerCelebrityMutation = useMutation({
    mutationFn: async (data: CelebrityRegistrationForm) => {
      return await apiRequest("POST", "/api/celebrities/register", data);
    },
    onSuccess: () => {
      toast({
        title: "Registration Submitted Successfully!",
        description: "Your celebrity registration has been submitted for admin review. You'll receive a confirmation email shortly.",
        variant: "default",
      });
      navigate("/");
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to submit celebrity registration. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDayToggle = (day: string) => {
    const newDays = selectedDays.includes(day)
      ? selectedDays.filter(d => d !== day)
      : [...selectedDays, day];
    setSelectedDays(newDays);
    form.setValue("deliveryAvailability.days", newDays);
  };

  const handleRegionToggle = (region: string) => {
    const newRegions = selectedRegions.includes(region)
      ? selectedRegions.filter(r => r !== region)
      : [...selectedRegions, region];
    setSelectedRegions(newRegions);
    form.setValue("deliveryRegions", newRegions);
  };

  const handleFileUpload = async (file: File, type: 'profile' | 'government') => {
    // For now, we'll simulate file upload with a placeholder URL
    // In production, this would upload to a cloud storage service
    const fileUrl = `https://placeholder.com/uploads/${type}/${file.name}`;
    
    if (type === 'profile') {
      setProfilePictureFile(file);
      form.setValue("profilePictureUrl", fileUrl);
    } else {
      setGovernmentIdFile(file);
      form.setValue("governmentIdUrl", fileUrl);
    }

    toast({
      title: "File uploaded successfully",
      description: `${type === 'profile' ? 'Profile picture' : 'Government ID'} uploaded.`,
    });
  };

  const onSubmit = async (data: CelebrityRegistrationForm) => {
    setIsSubmitting(true);
    try {
      // Clean up social media links (remove empty strings)
      const cleanedSocialMedia = Object.fromEntries(
        Object.entries(data.socialMediaLinks).filter(([_, value]) => value !== "")
      );

      const submissionData = {
        ...data,
        socialMediaLinks: cleanedSocialMedia,
        pricePerDelivery: parseFloat(data.pricePerDelivery),
      };

      await registerCelebrityMutation.mutateAsync(submissionData);
    } catch (error) {
      console.error("Celebrity registration error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-amber-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Star className="w-8 h-8 text-amber-500" />
            <h1 className="text-4xl font-bold text-gray-900">Celebrity Registration</h1>
            <Star className="w-8 h-8 text-amber-500" />
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Join goZembil as a verified celebrity and offer personalized gift delivery experiences 
            to connect hearts across distances.
          </p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Camera className="w-5 h-5" />
                <span>Personal Information</span>
              </CardTitle>
              <CardDescription>
                Tell us about yourself and build your celebrity profile
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    placeholder="Your legal full name"
                    {...form.register("fullName")}
                  />
                  {form.formState.errors.fullName && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.fullName.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="stageName">Stage/Public Name</Label>
                  <Input
                    id="stageName"
                    placeholder="Your known public name (optional)"
                    {...form.register("stageName")}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="bio">Bio/Personal Message *</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell your fans about yourself, your career, and why you're excited to deliver personalized gifts..."
                  className="min-h-[120px]"
                  {...form.register("bio")}
                />
                {form.formState.errors.bio && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.bio.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    {...form.register("email")}
                  />
                  {form.formState.errors.email && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.email.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="phoneNumber">Phone Number *</Label>
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

          {/* Social Media Links */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Globe className="w-5 h-5" />
                <span>Social Media Presence</span>
              </CardTitle>
              <CardDescription>
                Link your social media accounts to build trust with customers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries({
                  instagram: "Instagram",
                  tiktok: "TikTok", 
                  youtube: "YouTube",
                  twitter: "Twitter",
                  facebook: "Facebook"
                }).map(([platform, label]) => (
                  <div key={platform}>
                    <Label htmlFor={platform}>{label} URL</Label>
                    <Input
                      id={platform}
                      placeholder={`https://${platform}.com/your-profile`}
                      {...form.register(`socialMediaLinks.${platform as keyof typeof form.formState.defaultValues.socialMediaLinks}`)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* File Uploads */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Upload className="w-5 h-5" />
                <span>Document & Photo Upload</span>
              </CardTitle>
              <CardDescription>
                Upload your profile picture and government-issued ID for verification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Profile Picture</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                    <Image className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 mb-2">Upload your professional photo</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, 'profile');
                      }}
                      className="hidden"
                      id="profilePicture"
                    />
                    <Button type="button" variant="outline" onClick={() => document.getElementById('profilePicture')?.click()}>
                      Choose File
                    </Button>
                    {profilePictureFile && (
                      <p className="text-sm text-green-600 mt-2 flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        {profilePictureFile.name}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label>Government-Issued ID *</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 mb-2">Upload valid ID for verification</p>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, 'government');
                      }}
                      className="hidden"
                      id="governmentId"
                    />
                    <Button type="button" variant="outline" onClick={() => document.getElementById('governmentId')?.click()}>
                      Choose File
                    </Button>
                    {governmentIdFile && (
                      <p className="text-sm text-green-600 mt-2 flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        {governmentIdFile.name}
                      </p>
                    )}
                  </div>
                  {form.formState.errors.governmentIdUrl && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.governmentIdUrl.message}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="w-5 h-5" />
                <span>Delivery Availability</span>
              </CardTitle>
              <CardDescription>
                Set your availability for personalized gift deliveries
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Available Days *</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <Button
                      key={day}
                      type="button"
                      variant={selectedDays.includes(day) ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleDayToggle(day)}
                      className="justify-start"
                    >
                      {day.slice(0, 3)}
                    </Button>
                  ))}
                </div>
                {form.formState.errors.deliveryAvailability?.days && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.deliveryAvailability.days.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startTime">Available From *</Label>
                  <Input
                    id="startTime"
                    type="time"
                    {...form.register("deliveryAvailability.hours.start")}
                  />
                </div>
                <div>
                  <Label htmlFor="endTime">Available Until *</Label>
                  <Input
                    id="endTime"
                    type="time"
                    {...form.register("deliveryAvailability.hours.end")}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="pricePerDelivery">Price Per Delivery (USD) *</Label>
                <Input
                  id="pricePerDelivery"
                  type="number"
                  placeholder="150"
                  min="1"
                  step="0.01"
                  {...form.register("pricePerDelivery")}
                />
                {form.formState.errors.pricePerDelivery && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.pricePerDelivery.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Delivery Regions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="w-5 h-5" />
                <span>Delivery Regions</span>
              </CardTitle>
              <CardDescription>
                Select the cities and regions where you can deliver gifts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {DELIVERY_REGIONS.map((region) => (
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
                  <p className="text-sm text-gray-600 mb-2">Selected regions:</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedRegions.map((region) => (
                      <Badge key={region} variant="secondary" className="text-xs">
                        {region}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {form.formState.errors.deliveryRegions && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.deliveryRegions.message}</p>
              )}
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-center pt-6">
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-3"
            >
              {isSubmitting ? "Submitting..." : "Submit Celebrity Registration"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}