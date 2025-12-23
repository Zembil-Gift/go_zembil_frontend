import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/services/apiService";
import { User, Mail, Phone, Lock, Globe, Calendar, Building2, Eye, EyeOff, PlayCircle, CheckCircle2, ArrowRight, ArrowLeft, FileText } from "lucide-react";
import GoGeramiLogo from "@/components/GoGeramiLogo";

interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
}

interface Currency {
  id: number;
  code: string;
  name: string;
  symbol: string;
  isActive: boolean;
  isDefault: boolean;
}

const COUNTRIES = [
  { value: "United States", label: "United States" },
  { value: "Ethiopia", label: "Ethiopia" },
  { value: "Canada", label: "Canada" },
  { value: "United Kingdom", label: "United Kingdom" },
  { value: "Europe", label: "Europe" },
  { value: "Australia", label: "Australia" },
  {value: "Middle East", label: "Middle East" },
];

const VENDOR_TYPES = [
  { value: "PRODUCT", label: "Product Vendor", description: "I sell physical goods that require delivery" },
  { value: "SERVICE", label: "Service Vendor", description: "I provide experiences, events, or time-based services" },
  { value: "HYBRID", label: "Hybrid Vendor", description: "I sell both physical products and services" },
];

const VAT_STATUS_OPTIONS = [
  { value: "VAT_REGISTERED", label: "VAT Registered", description: "I am registered for VAT with the Ethiopian Revenue Authority" },
  { value: "NOT_VAT_REGISTERED", label: "Not VAT Registered", description: "I am not registered for VAT" },
  { value: "VAT_EXEMPT", label: "VAT Exempt", description: "My business is exempt from VAT" },
];

// Terms and Conditions for vendors
const VENDOR_TERMS = [
  {
    id: "quality",
    title: "Product Quality Standards",
    description: "I agree to maintain high-quality standards for all products and services I offer on the platform. All items must be accurately described and match the images provided.",
  },
  {
    id: "pricing",
    title: "Fair Pricing Policy",
    description: "I agree to set fair and competitive prices for my products. I will not engage in price gouging or deceptive pricing practices.",
  },
  {
    id: "shipping",
    title: "Shipping & Fulfillment",
    description: "I commit to processing and shipping orders within the specified timeframes. I will provide accurate tracking information and handle shipping issues promptly.",
  },
  {
    id: "returns",
    title: "Returns & Refunds Policy",
    description: "I agree to honor the platform's return and refund policies. I will process refunds within 5-7 business days of receiving returned items.",
  },
  {
    id: "communication",
    title: "Customer Communication",
    description: "I will respond to customer inquiries within 24-48 hours and maintain professional communication at all times.",
  },
  {
    id: "compliance",
    title: "Legal Compliance",
    description: "I confirm that my business operates legally and I have all necessary permits and licenses. I will comply with all applicable local and international laws.",
  },
  {
    id: "commission",
    title: "Platform Commission",
    description: "I understand and agree to the platform's commission structure. Commission rates will be clearly communicated and deducted from each sale.",
  },
  {
    id: "content",
    title: "Content Guidelines",
    description: "I agree not to upload prohibited content, counterfeit goods, or items that violate intellectual property rights. All product listings will be honest and accurate.",
  },
  {
    id: "data",
    title: "Data Protection",
    description: "I agree to handle customer data responsibly and in compliance with privacy regulations. I will not misuse or share customer information.",
  },
  {
    id: "termination",
    title: "Account Termination",
    description: "I understand that violation of these terms may result in account suspension or termination. The platform reserves the right to remove listings that violate policies.",
  },
];

const ONBOARDING_VIDEO_URL = "https://www.youtube.com/embed/8vSZA0l5XKs?list=PLvt-hujkg6kYsQsxDHXxrwe9a8Pu59CQ_";

type OnboardingStep = "terms" | "video" | "form";

const vendorSignupSchema = z
  .object({
    // User account fields
    firstName: z.string().min(2, "First name must be at least 2 characters"),
    lastName: z.string().min(2, "Last name must be at least 2 characters"),
    username: z.string().min(3, "Username must be at least 3 characters"),
    email: z.string().email("Please enter a valid email address"),
    phoneNumber: z
      .string()
      .min(10, "Phone number must be at least 10 digits")
      .regex(/^\+?\d+$/, "Phone number must contain only numbers and optional + at start"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/, "Password must contain both letters and numbers"),
    confirmPassword: z.string().min(8, "Password confirmation must be at least 8 characters"),
    birthDate: z.string().min(1, "Birth date is required"),
    preferredCurrencyCode: z.string().optional(),
    
    // Vendor business fields
    businessName: z.string().min(2, "Business name must be at least 2 characters").max(200),
    description: z.string().max(1000, "Description must be less than 1000 characters").optional(),
    businessEmail: z.string().email("Valid business email is required"),
    businessPhone: z.string().min(10, "Business phone is required"),
    contactName: z.string().optional(),
    city: z.string().min(2, "City is required"),
    country: z.string().min(2, "Country is required"),
    categoryId: z.string().min(1, "Please select a category"),
    vendorType: z.string().min(1, "Please select a vendor type"),
    vatStatus: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords must match",
  })
  .refine((data) => {
    // VAT status is required for Ethiopian vendors
    if (data.country === "Ethiopia" && !data.vatStatus) {
      return false;
    }
    return true;
  }, {
    path: ["vatStatus"],
    message: "VAT status is required for Ethiopian vendors",
  });

type VendorSignupForm = z.infer<typeof vendorSignupSchema>;

export default function VendorSignup() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("terms");
  const [acceptedTerms, setAcceptedTerms] = useState<Record<string, boolean>>({});
  const [hasWatchedVideo, setHasWatchedVideo] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if all terms are accepted
  const allTermsAccepted = VENDOR_TERMS.every(term => acceptedTerms[term.id]);

  // Handle individual term toggle
  const handleTermToggle = (termId: string) => {
    setAcceptedTerms(prev => ({
      ...prev,
      [termId]: !prev[termId]
    }));
  };

  // Handle accept all
  const handleAcceptAll = () => {
    const allAccepted: Record<string, boolean> = {};
    VENDOR_TERMS.forEach(term => {
      allAccepted[term.id] = true;
    });
    setAcceptedTerms(allAccepted);
  };

  // Handle reject all
  const handleRejectAll = () => {
    setAcceptedTerms({});
  };

  // Count accepted terms
  const acceptedCount = Object.values(acceptedTerms).filter(Boolean).length;

  // Fetch available currencies
  const { data: currencies = [] } = useQuery({
    queryKey: ['currencies'],
    queryFn: async () => {
      const response = await apiService.getRequest<Currency[]>('/api/currencies');
      return response;
    },
  });

  // Fetch categories for vendor type
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await apiService.getRequest<Category[]>('/api/categories');
      return response;
    },
  });

  const defaultCurrency = currencies.find(c => c.isDefault)?.code || 'USD';

  const form = useForm<VendorSignupForm>({
    resolver: zodResolver(vendorSignupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      username: "",
      email: "",
      phoneNumber: "",
      password: "",
      confirmPassword: "",
      birthDate: "",
      preferredCurrencyCode: "",
      businessName: "",
      description: "",
      businessEmail: "",
      businessPhone: "",
      contactName: "",
      city: "",
      country: "",
      categoryId: "",
      vendorType: "",
      vatStatus: "",
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (data: VendorSignupForm) => {
      const payload = {
        firstName: data.firstName,
        lastName: data.lastName,
        username: data.username,
        email: data.email,
        phoneNumber: data.phoneNumber,
        password: data.password,
        birthDate: data.birthDate,
        preferredCurrencyCode: data.preferredCurrencyCode || defaultCurrency,
        businessName: data.businessName,
        description: data.description || undefined,
        businessEmail: data.businessEmail,
        businessPhone: data.businessPhone,
        contactName: data.contactName || undefined,
        city: data.city,
        country: data.country,
        categoryId: parseInt(data.categoryId),
        vendorType: data.vendorType,
        vatStatus: data.country === "Ethiopia" && data.vatStatus ? data.vatStatus : undefined,
        supportedPaymentProviders: ["STRIPE", "CHAPA"],
      };

      console.log('Vendor signup payload:', JSON.stringify(payload, null, 2));
      return await apiService.postRequest('/api/vendors/signup', payload);
    },
    onSuccess: () => {
      toast({
        title: "Vendor Account Created Successfully!",
        description: "Your vendor account has been created. Please check your email for verification and await admin approval.",
        variant: "default",
      });
      navigate("/signin");
    },
    onError: (error: any) => {
      toast({
        title: "Signup Failed",
        description: error.message || "Failed to create vendor account. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: VendorSignupForm) => {
    await signupMutation.mutateAsync(data);
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="flex justify-center mb-6">
            <GoGeramiLogo 
              size="lg"
              variant="icon"
              className="h-16 w-16"
            />
          </Link>
          <div className="flex items-center justify-center space-x-2 mb-4">
            <h1 className="text-4xl font-bold text-gray-900">Vendor Signup</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Create your vendor account and join goGerami's marketplace.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Already have an account?{" "}
            <Link to="/signin" className="text-emerald-600 hover:text-emerald-700 font-medium">
              Sign in here
            </Link>
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div className={`flex items-center ${currentStep === "terms" ? "text-emerald-600" : allTermsAccepted ? "text-emerald-600" : "text-gray-400"}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${currentStep === "terms" ? "border-emerald-600 bg-emerald-50" : allTermsAccepted ? "border-emerald-600 bg-emerald-600 text-white" : "border-gray-300"}`}>
                {allTermsAccepted ? <CheckCircle2 className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
              </div>
              <span className="ml-2 font-medium text-center hidden sm:inline">Terms </span>
            </div>
            <div className="w-16 h-0.5 bg-gray-300">
              <div className={`h-full transition-all duration-300 ${allTermsAccepted ? "bg-emerald-600 w-full" : "w-0"}`} />
            </div>
            <div className={`flex items-center ${currentStep === "video" ? "text-emerald-600" : hasWatchedVideo ? "text-emerald-600" : "text-gray-400"}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${currentStep === "video" ? "border-emerald-600 bg-emerald-50" : hasWatchedVideo ? "border-emerald-600 bg-emerald-600 text-white" : "border-gray-300"}`}>
                {hasWatchedVideo ? <CheckCircle2 className="w-5 h-5" /> : <PlayCircle className="w-5 h-5" />}
              </div>
              <span className="ml-2 font-medium hidden sm:inline">Video</span>
            </div>
            <div className="w-16 h-0.5 bg-gray-300">
              <div className={`h-full transition-all duration-300 ${hasWatchedVideo ? "bg-emerald-600 w-full" : "w-0"}`} />
            </div>
            <div className={`flex items-center ${currentStep === "form" ? "text-emerald-600" : "text-gray-400"}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${currentStep === "form" ? "border-emerald-600 bg-emerald-50" : "border-gray-300"}`}>
                <User className="w-5 h-5" />
              </div>
              <span className="ml-2 font-medium hidden sm:inline">Details</span>
            </div>
          </div>
        </div>

        {/* Step 1: Terms and Conditions */}
        {currentStep === "terms" && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <span>Terms & Conditions</span>
              </CardTitle>
              <CardDescription>
                Please read and accept all terms and conditions to continue with your vendor registration.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Accept All / Reject All Buttons */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700">
                    {acceptedCount} of {VENDOR_TERMS.length} terms accepted
                  </span>
                  <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-600 transition-all duration-300" 
                      style={{ width: `${(acceptedCount / VENDOR_TERMS.length) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={handleRejectAll}
                    disabled={acceptedCount === 0}
                  >
                    Clear All
                  </Button>
                  <Button 
                    type="button" 
                    size="sm"
                    onClick={handleAcceptAll}
                    disabled={allTermsAccepted}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Accept All
                  </Button>
                </div>
              </div>

              {/* Terms List */}
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {VENDOR_TERMS.map((term, index) => (
                  <div
                    key={term.id}
                    className={`p-4 rounded-lg border transition-all duration-200 ${
                      acceptedTerms[term.id] 
                        ? "border-emerald-200 bg-emerald-50" 
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id={term.id}
                        checked={acceptedTerms[term.id] || false}
                        onCheckedChange={() => handleTermToggle(term.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <label 
                          htmlFor={term.id} 
                          className="font-medium text-gray-900 cursor-pointer flex items-center"
                        >
                          <span className="text-emerald-600 mr-2">{index + 1}.</span>
                          {term.title}
                        </label>
                        <p className="text-sm text-gray-600 mt-1">{term.description}</p>
                      </div>
                      {acceptedTerms[term.id] && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Continue Button */}
              <div className="flex justify-end pt-4 border-t">
                <Button
                  type="button"
                  onClick={() => setCurrentStep("video")}
                  disabled={!allTermsAccepted}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  Continue to Video
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Onboarding Video */}
        {currentStep === "video" && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <PlayCircle className="w-5 h-5 text-emerald-600" />
                <span>Vendor Onboarding Video</span>
              </CardTitle>
              <CardDescription>
                Watch this short video to learn how to navigate goGerami's as a vendor.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Video Player */}
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                <iframe
                  width="100%"
                  height="100%"
                  src={ONBOARDING_VIDEO_URL}
                  title="Vendor Onboarding Video"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0"
                />
              </div>

              {/* Video Info */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">What you'll learn:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• How to set up your vendor profile for success</li>
                  <li>• Best practices for product listings and photography</li>
                  <li>• Understanding the payment and commission structure</li>
                  <li>• Tips for excellent customer service</li>
                  <li>• How to handle orders and shipping efficiently</li>
                </ul>
              </div>

              {/* Confirmation Checkbox */}
              <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg border">
                <Checkbox
                  id="watchedVideo"
                  checked={hasWatchedVideo}
                  onCheckedChange={(checked) => setHasWatchedVideo(checked as boolean)}
                  className="mt-1"
                />
                <label htmlFor="watchedVideo" className="cursor-pointer">
                  <span className="font-medium text-gray-900">I have watched the onboarding video</span>
                  <p className="text-sm text-gray-600 mt-1">
                    By checking this box, I confirm that I have watched and understood the vendor onboarding video.
                  </p>
                </label>
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep("terms")}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Terms
                </Button>
                <Button
                  type="button"
                  onClick={() => setCurrentStep("form")}
                  disabled={!hasWatchedVideo}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  Continue to Registration
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Registration Form */}
        {currentStep === "form" && (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Back to Video Button */}
          <div className="flex justify-start mb-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentStep("video")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Video
            </Button>
          </div>

          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>Personal Information</span>
              </CardTitle>
              <CardDescription>
                Create your user account details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    placeholder=""
                    {...form.register("firstName")}
                  />
                  {form.formState.errors.firstName && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.firstName.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    placeholder=""
                    {...form.register("lastName")}
                  />
                  {form.formState.errors.lastName && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="username">Username *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="username"
                      placeholder=""
                      className="pl-10"
                      {...form.register("username")}
                    />
                  </div>
                  {form.formState.errors.username && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.username.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder=""
                      className="pl-10"
                      {...form.register("email")}
                    />
                  </div>
                  {form.formState.errors.email && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.email.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phoneNumber">Phone Number *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="phoneNumber"
                      placeholder="+251911000000"
                      className="pl-10"
                      {...form.register("phoneNumber")}
                    />
                  </div>
                  {form.formState.errors.phoneNumber && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.phoneNumber.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="birthDate">Birth Date *</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="birthDate"
                      type="date"
                      className="pl-10"
                      {...form.register("birthDate")}
                    />
                  </div>
                  {form.formState.errors.birthDate && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.birthDate.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="password">Password *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder=""
                      className="pl-10 pr-10"
                      {...form.register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {form.formState.errors.password && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.password.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="confirmPassword"
                      type={showConfirm ? "text" : "password"}
                      placeholder=""
                      className="pl-10 pr-10"
                      {...form.register("confirmPassword")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {form.formState.errors.confirmPassword && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.confirmPassword.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="country">Country *</Label>
                  <Select onValueChange={(value) => {
                    form.setValue("country", value);
                    // Auto-set ETB for Ethiopian vendors
                    if (value === "Ethiopia") {
                      form.setValue("preferredCurrencyCode", "ETB");
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((country) => (
                        <SelectItem key={country.value} value={country.value}>
                          {country.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.country && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.country.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="preferredCurrencyCode">Preferred Currency</Label>
                  <Select 
                    onValueChange={(value) => form.setValue("preferredCurrencyCode", value)}
                    value={form.watch("preferredCurrencyCode") || (form.watch("country") === "Ethiopia" ? "ETB" : defaultCurrency)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {(form.watch("country") === "Ethiopia" 
                        ? currencies.filter(c => c.code === "ETB")
                        : currencies
                      ).map((currency) => (
                        <SelectItem key={currency.id} value={currency.code}>
                          {currency.name} ({currency.symbol})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.watch("country") === "Ethiopia" && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Ethiopian vendors can only use ETB currency.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Business Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building2 className="w-5 h-5" />
                <span>Business Information</span>
              </CardTitle>
              <CardDescription>
                Tell us about your business
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="businessName">Business Name *</Label>
                <Input
                  id="businessName"
                  {...form.register("businessName")}
                />
                {form.formState.errors.businessName && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.businessName.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="description">Business Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your business..."
                  className="min-h-[100px]"
                  {...form.register("description")}
                />
                {form.formState.errors.description && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.description.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="categoryId">Business Category *</Label>
                <Select onValueChange={(value) => form.setValue("categoryId", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your business category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.categoryId && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.categoryId.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="vendorType">Vendor Type *</Label>
                <Select onValueChange={(value) => form.setValue("vendorType", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your vendor type" />
                  </SelectTrigger>
                  <SelectContent>
                    {VENDOR_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex flex-col">
                          <span>{type.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.watch("vendorType") && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {VENDOR_TYPES.find(t => t.value === form.watch("vendorType"))?.description}
                  </p>
                )}
                {form.formState.errors.vendorType && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.vendorType.message}</p>
                )}
              </div>

              {/* VAT Status - Only shown for Ethiopian vendors */}
              {form.watch("country") === "Ethiopia" && (
                <div className="p-4 border border-amber-200 bg-amber-50 rounded-lg">
                  <Label htmlFor="vatStatus" className="text-amber-800">VAT Registration Status *</Label>
                  <Select 
                    onValueChange={(value) => form.setValue("vatStatus", value)}
                    value={form.watch("vatStatus") || undefined}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select your VAT status" />
                    </SelectTrigger>
                    <SelectContent>
                      {VAT_STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          <div className="flex flex-col">
                            <span>{status.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.watch("vatStatus") && (
                    <p className="text-xs text-amber-700 mt-1">
                      {VAT_STATUS_OPTIONS.find(s => s.value === form.watch("vatStatus"))?.description}
                    </p>
                  )}
                  {form.watch("vatStatus") === "VAT_REGISTERED" && (
                    <p className="text-xs text-amber-800 mt-2 font-medium">
                      Note: As a VAT-registered vendor, your product prices should be VAT-inclusive (15% VAT). 
                      The platform will automatically calculate and track VAT for tax reporting.
                    </p>
                  )}
                  {form.formState.errors.vatStatus && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.vatStatus.message}</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="businessEmail">Business Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="businessEmail"
                      type="email"
                      placeholder=""
                      className="pl-10"
                      {...form.register("businessEmail")}
                    />
                  </div>
                  {form.formState.errors.businessEmail && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.businessEmail.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="businessPhone">Business Phone *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="businessPhone"
                      placeholder="+251911111111"
                      className="pl-10"
                      {...form.register("businessPhone")}
                    />
                  </div>
                  {form.formState.errors.businessPhone && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.businessPhone.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="contactName">Contact Person Name</Label>
                <Input
                  id="contactName"
                  placeholder="Primary contact person"
                  {...form.register("contactName")}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  You can add your business logo later from your vendor dashboard after approval.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Location Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Globe className="w-5 h-5" />
                <span>Business Location</span>
              </CardTitle>
              <CardDescription>
                Where is your business based?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  placeholder="Enter City"
                  {...form.register("city")}
                />
                {form.formState.errors.city && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.city.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex flex-col items-center gap-4 pt-6">
            <Button
              type="submit"
              size="lg"
              disabled={signupMutation.isPending}
              className="w-full md:w-auto text-white px-12 py-6 text-md bg-emerald-600 hover:bg-emerald-700"
            >
              {signupMutation.isPending ? "Creating Account..." : "Create Vendor Account"}
            </Button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}
