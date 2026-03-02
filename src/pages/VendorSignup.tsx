import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { isValidPhoneNumber, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/max";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PhoneInput } from "@/components/ui/phone-input";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/services/apiService";
import { vendorTermsService, VendorTermsResponse } from "@/services/vendorTermsService";
import { vendorCategoryService } from "@/services/vendorCategoryService";
import { SUPPORTED_COUNTRIES, getCurrencyForCountry, isEthiopianCountry } from "@/lib/countryConfig";
import { User, Mail, Lock, Calendar, Building2, Eye, EyeOff, PlayCircle, CheckCircle2, ArrowRight, ArrowLeft, FileText, Loader2, Download, ExternalLink, Shield, DollarSign, Package, MessageCircle, Scale, FileCheck, MapPin } from "lucide-react";
import GoGeramiLogo from "@/components/GoGeramiLogo";
import { LocationPicker, type LocationData } from "@/components/maps";

interface CertificateResponse {
  certificateCode: string;
  email: string;
  fullName: string;
  vendorType: string;
  issuedAt: string;
  expiresAt: string;
  isUsed: boolean;
  isValid: boolean;
}

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

const ONBOARDING_VIDEO_IDS: Record<string, string> = {
  PRODUCT: "MJzYpgf7IEY", 
  SERVICE: "cZ6cN72lqSg",
  HYBRID: "RlTCNmSJw1w", 
};

const DEFAULT_VIDEO_ID = "dQw4w9WgXcQ";

type OnboardingStep = "form" | "terms" | "video";

// Phone number validation using libphonenumber (E.164 format)
const phoneValidation = z
  .string()
  .min(1, "Phone number is required")
  .refine(
    (val) => {
      if (!val) return false;
      // Validate using libphonenumber-js
      return isValidPhoneNumber(val);
    },
    "Please enter a valid phone number"
  )
  .transform((val) => {
    // Normalize to E.164 format for storage
    const parsed = parsePhoneNumberFromString(val);
    return parsed?.format("E.164") || val;
  });

// Username validation: 8-20 chars, alphanumeric + underscores, must start with letter
const usernameRegex = /^[a-zA-Z][a-zA-Z0-9_]{2,19}$/;
const usernameValidation = z
  .string()
  .min(8, "Username must be at least 8 characters")
  .max(20, "Username must not exceed 20 characters")
  .regex(usernameRegex, "Username must start with a letter and contain only letters, numbers, and underscores");

const vendorSignupSchema = z
  .object({
    firstName: z.string().min(2, "First name must be at least 2 characters"),
    lastName: z.string().min(2, "Last name must be at least 2 characters"),
    username: usernameValidation,
    email: z.string().email("Please enter a valid email address"),
    phoneNumber: phoneValidation,
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/^(?=.*[a-z])/, "Password must contain at least one lowercase letter")
      .regex(/^(?=.*[A-Z])/, "Password must contain at least one uppercase letter")
      .regex(/^(?=.*\d)/, "Password must contain at least one number")
      .regex(/^(?=.*[@$!%*?&#^()_+=\-\[\]{}|;:',.<>/~`])/, "Password must contain at least one special character"),
    confirmPassword: z.string().min(8, "Password confirmation must be at least 8 characters"),
    birthDate: z.string().min(1, "Birth date is required").refine((date) => {
      const birthDate = new Date(date);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
      return age >= 18;
    }, "You must be at least 18 years old to sign up as a vendor"),
    businessName: z.string()
      .min(2, "Business name must be at least 2 characters")
      .max(200, "Business name is too long")
      .regex(/^[a-zA-Z0-9\s\-'&.]+$/, "Business name contains invalid characters. Only letters, numbers, spaces, hyphens, apostrophes, ampersands, and periods are allowed"),
    description: z.string().max(1000, "Description must be less than 1000 characters").optional(),
    businessEmail: z.string().email("Valid business email is required"),
    businessPhone: phoneValidation,
    city: z.string().min(2, "City is required"),
    country: z.string().min(2, "Country is required"),
    vendorCategoryId: z.string().min(1, "Please select a business category"),
    vendorType: z.string().min(1, "Please select a vendor type"),
    vatStatus: z.string().optional(),
    // Geolocation fields (auto-populated from map picker)
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    placeId: z.string().optional(),
    formattedAddress: z.string().optional(),
    streetAddress: z.string().optional(),
    deliveryRadiusKm: z.number().min(1).max(100).optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords must match",
  })
  .refine((data) => {
    return !(data.country === "Ethiopia" && !data.vatStatus);

  }, {
    path: ["vatStatus"],
    message: "VAT status is required for Ethiopian vendors",
  });

type VendorSignupForm = z.infer<typeof vendorSignupSchema>;

export default function VendorSignup() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("form");
  const [acceptedTerms, setAcceptedTerms] = useState<Record<number, boolean>>({});
  const [hasWatchedVideo, setHasWatchedVideo] = useState(false);
  const [videoCompletedChecked, setVideoCompletedChecked] = useState(false);
  const [generatedCertificate, setGeneratedCertificate] = useState<CertificateResponse | null>(null);
  const [termsData, setTermsData] = useState<VendorTermsResponse | null>(null);
  const [isLoadingTerms, setIsLoadingTerms] = useState(false);
  const [allTermsAccepted, setAllTermsAccepted] = useState(false);
  const [formData, setFormData] = useState<Partial<VendorSignupForm> | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [showFullTermsModal, setShowFullTermsModal] = useState(false);
  const [selectedTermForDetail, setSelectedTermForDetail] = useState<number | null>(null);
  const [phoneCountry, setPhoneCountry] = useState<CountryCode>("ET");
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: vendorCategories = [] } = useQuery({
    queryKey: ['vendor-categories'],
    queryFn: () => vendorCategoryService.getAllActiveCategories(),
  });

  const form = useForm<VendorSignupForm>({
    resolver: zodResolver(vendorSignupSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      firstName: "", lastName: "", username: "", email: "", phoneNumber: "",
      password: "", confirmPassword: "", birthDate: "",
      businessName: "", description: "", businessEmail: "", businessPhone: "",
      city: "", country: "", vendorCategoryId: "", vendorType: "", vatStatus: "",
      latitude: undefined, longitude: undefined, placeId: "", formattedAddress: "", streetAddress: "", deliveryRadiusKm: 25,
    },
  });

  // Generate certificate mutation
  const generateCertificateMutation = useMutation({
    mutationFn: async () => {
      const vendorType = formData?.vendorType || form.getValues("vendorType");
      const email = formData?.email || form.getValues("email");
      const firstName = formData?.firstName || form.getValues("firstName");
      const lastName = formData?.lastName || form.getValues("lastName");
      
      return await apiService.postRequest<CertificateResponse>('/api/vendor-certificates/generate', {
        email,
        fullName: `${firstName} ${lastName}`,
        vendorType,
      });
    },
    onSuccess: (data) => {
      setGeneratedCertificate(data);
      toast({ title: "Certificate Generated!", description: "Your onboarding certificate is ready.", variant: "default" });
    },
    onError: (error: any) => {
      toast({ title: "Certificate Generation Failed", description: error.message || "Please try again.", variant: "destructive" });
    },
  });

  // Automatically trigger certificate generation if video is already watched
  useEffect(() => {
    if (currentStep === "video" && hasWatchedVideo && !generatedCertificate && !generateCertificateMutation.isPending && !generateCertificateMutation.isError && form.getValues("email")) {
      // Small delay to ensure render cycle complete
      const timer = setTimeout(() => {
        generateCertificateMutation.mutate();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentStep, hasWatchedVideo, generatedCertificate, form]);


  const handleVideoCompletedCheckbox = (checked: boolean) => {
    setVideoCompletedChecked(checked);
    setHasWatchedVideo(checked);
  };

  const selectedVendorType = form.watch("vendorType");

  const fetchTermsForVendorType = async (vendorType: string) => {
    setIsLoadingTerms(true);
    try {
      const terms = await vendorTermsService.getTermsByVendorType(vendorType);
      setTermsData(terms);
      setAcceptedTerms({});
      setAllTermsAccepted(false);
    } catch {
      toast({ title: "Error", description: "Failed to load terms and conditions", variant: "destructive" });
    } finally {
      setIsLoadingTerms(false);
    }
  };

  const handleAcceptAllTerms = (checked: boolean) => {
    setAllTermsAccepted(checked);
    if (checked && termsData) {
      const allAccepted: Record<number, boolean> = {};
      termsData.terms.forEach(term => { allAccepted[term.id] = true; });
      setAcceptedTerms(allAccepted);
    } else {
      setAcceptedTerms({});
    }
  };

  // Get icon for term by key
  const getTermIcon = (termKey: string) => {
    const icons: Record<string, React.ReactNode> = {
      quality: <Shield className="w-5 h-5" />,
      pricing: <DollarSign className="w-5 h-5" />,
      fulfillment: <Package className="w-5 h-5" />,
      inventory: <Package className="w-5 h-5" />,
      returns: <ArrowLeft className="w-5 h-5" />,
      communication: <MessageCircle className="w-5 h-5" />,
      safety: <Shield className="w-5 h-5" />,
      commission: <DollarSign className="w-5 h-5" />,
      content: <FileCheck className="w-5 h-5" />,
      data: <Lock className="w-5 h-5" />,
      termination: <Scale className="w-5 h-5" />,
    };
    return icons[termKey] || <FileText className="w-5 h-5" />;
  };

  // Download certificate PDF (public endpoint, no auth needed)
  const handleDownloadCertificatePdf = async () => {
    if (!generatedCertificate) return;
    
    setIsDownloadingPdf(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/vendor-certificates/${generatedCertificate.certificateCode}/pdf`
      );
      
      if (!response.ok) {
        throw new Error('Failed to download PDF');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `onboarding-certificate-${generatedCertificate.certificateCode}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({ title: "Downloaded!", description: "Certificate PDF downloaded successfully." });
    } catch {
      toast({ title: "Error", description: "Failed to download certificate PDF.", variant: "destructive" });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Signup mutation
  const signupMutation = useMutation({
    mutationFn: async (data: VendorSignupForm) => {
      const acceptedTermIds = termsData ? termsData.terms.filter(t => acceptedTerms[t.id]).map(t => t.id) : [];
      
      // Derive currency from country selection
      const preferredCurrencyCode = getCurrencyForCountry(data.country);
      const isEthiopian = isEthiopianCountry(data.country);
      
      // Set supported payment providers based on country
      const supportedPaymentProviders = isEthiopian 
        ? ["CHAPA", "TELEBIRR"] 
        : ["STRIPE"];
      
      const payload = {
        firstName: data.firstName,
        lastName: data.lastName,
        username: data.username,
        email: data.email,
        phoneNumber: data.phoneNumber,
        password: data.password,
        birthDate: data.birthDate,
        preferredCurrencyCode,
        businessName: data.businessName,
        description: data.description || undefined,
        businessEmail: data.businessEmail,
        businessPhone: data.businessPhone,
        city: data.city,
        country: data.country,
        vendorCategoryId: parseInt(data.vendorCategoryId),
        vendorType: data.vendorType,
        vatStatus: isEthiopian && data.vatStatus ? data.vatStatus : undefined,
        supportedPaymentProviders,
        // Geolocation fields from map picker
        latitude: data.latitude || undefined,
        longitude: data.longitude || undefined,
        placeId: data.placeId || undefined,
        formattedAddress: data.formattedAddress || undefined,
        streetAddress: data.streetAddress || undefined,
        deliveryRadiusKm: data.deliveryRadiusKm || undefined,
        certificateCode: generatedCertificate?.certificateCode || "",
        termsVersion: termsData?.version || 1,
        acceptedTermIds,
      };

      return await apiService.postRequest<{
        user: { id: number; email: string; firstName: string; lastName: string };
        vendor: any;
        message: string;
        requiresEmailVerification?: boolean;
      }>('/api/vendors/signup', payload);
    },
    onSuccess: (_response, variables) => {
      // Always redirect to email verification for vendors
      toast({
        title: "Vendor Account Created!",
        description: "Please verify your email to continue.",
        variant: "default",
      });
      // Redirect to email verification page
      setTimeout(() => {
        navigate('/verify-email', { 
          state: { 
            email: variables.email,
            returnUrl: '/signin'
          }
        });
      }, 500);
    },
    onError: (error: any) => {
      // Use generic message for security - don't reveal if email/username exists
      const errorMsg = error?.message?.toLowerCase() || "";
      const isUserExistsError = errorMsg.includes("email") || errorMsg.includes("username") || errorMsg.includes("already");
      toast({ 
        title: "Signup Failed", 
        description: isUserExistsError 
          ? "An account with these details already exists. Please sign in instead."
          : (error.message || "Please try again."), 
        variant: "destructive" 
      });
    },
  });

  const handleProceedToTerms = async () => {
    const fieldsToValidate = [
      "firstName", "lastName", "username", "email", "phoneNumber",
      "password", "confirmPassword", "birthDate", "businessName",
      "businessEmail", "businessPhone", "city", "country", "vendorCategoryId", "vendorType"
    ] as const;
    
    const isValid = await form.trigger(fieldsToValidate);
    const country = form.getValues("country");
    const vatStatus = form.getValues("vatStatus");
    
    if (country === "Ethiopia" && !vatStatus) {
      form.setError("vatStatus", { message: "VAT status is required for Ethiopian vendors" });
    }
    
    if (!isValid || (country === "Ethiopia" && !vatStatus)) {
      // Count all errors
      const errors = form.formState.errors;
      const errorCount = Object.keys(errors).reduce((count, key) => {
        const error = errors[key as keyof typeof errors];
        return count + (error ? 1 : 0);
      }, 0);
      
      toast({
        title: "Validation Errors",
        description: `Please fix ${errorCount} error${errorCount > 1 ? 's' : ''} before continuing.`,
        variant: "destructive",
      });

      // Scroll to first error
      const firstErrorField = Object.keys(errors)[0];
      const element = document.getElementById(firstErrorField);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.focus();
      }
      
      return;
    }
    
    // Check for duplicate email, username, and phone number before proceeding
    const email = form.getValues("email");
    const username = form.getValues("username");
    const phoneNumber = form.getValues("phoneNumber");
    
    try {
      const [emailExists, usernameExists, phoneExists] = await Promise.all([
        apiService.getRequest<boolean>(`/api/users/check-email?email=${encodeURIComponent(email)}`),
        apiService.getRequest<boolean>(`/api/users/check-username?username=${encodeURIComponent(username)}`),
        apiService.getRequest<boolean>(`/api/users/check-phone?phoneNumber=${encodeURIComponent(phoneNumber)}`)
      ]);
      
      if (emailExists || usernameExists || phoneExists) {
        // Use generic message for security - don't reveal which field exists
        toast({ title: "Account Exists", description: "An account with these details already exists. Please sign in instead.", variant: "destructive" });
        return;
      }
    } catch (error) {
      toast({ title: "Validation Error", description: "Could not verify account availability. Please try again.", variant: "destructive" });
      return;
    }
    
    const vendorType = form.getValues("vendorType");
    setFormData(form.getValues());
    await fetchTermsForVendorType(vendorType);
    setCurrentStep("terms");

    // Ensure the new step starts at the top of the page
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleProceedToVideo = () => {
    if (!allTermsAccepted) {
      toast({ title: "Terms Required", description: "Please read and accept the full Terms & Conditions.", variant: "destructive" });
      return;
    }
    setVideoCompletedChecked(false);
    setHasWatchedVideo(false);
    setGeneratedCertificate(null);
    setCurrentStep("video");

    // Ensure the new step starts at the top of the page
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onSubmit = async (data: VendorSignupForm) => {
    if (!generatedCertificate) {
      toast({ title: "Certificate Required", description: "Please generate your certificate first.", variant: "destructive" });
      return;
    }
    await signupMutation.mutateAsync(data);
  };

  const getVideoId = () => {
    const vendorType = formData?.vendorType || selectedVendorType;
    return ONBOARDING_VIDEO_IDS[vendorType] || DEFAULT_VIDEO_ID;
  };

  const getVendorTypeLabel = () => {
    const vendorType = formData?.vendorType || selectedVendorType;
    return VENDOR_TYPES.find(t => t.value === vendorType)?.label || "Vendor";
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="flex justify-center mb-6">
            <GoGeramiLogo size="lg" variant="icon" className="h-16 w-16" />
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Vendor Signup</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Create your vendor account and join goGerami's marketplace.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Already have an account?{" "}
            <Link to="/signin" className="text-emerald-600 hover:text-emerald-700 font-medium">Sign in here</Link>
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-2 sm:space-x-4">
            <div className={`flex items-center ${currentStep === "form" ? "text-emerald-600" : formData ? "text-emerald-600" : "text-gray-400"}`}>
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 ${currentStep === "form" ? "border-emerald-600 bg-emerald-50" : formData ? "border-emerald-600 bg-emerald-600 text-white" : "border-gray-300"}`}>
                {formData && currentStep !== "form" ? <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <User className="w-4 h-4 sm:w-5 sm:h-5" />}
              </div>
              <span className="ml-1 sm:ml-2 font-medium text-xs sm:text-sm hidden sm:inline">Details</span>
            </div>
            <div className="w-8 sm:w-16 h-0.5 bg-gray-300">
              <div className={`h-full transition-all duration-300 ${formData ? "bg-emerald-600 w-full" : "w-0"}`} />
            </div>
            
            <div className={`flex items-center ${currentStep === "terms" ? "text-emerald-600" : allTermsAccepted ? "text-emerald-600" : "text-gray-400"}`}>
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 ${currentStep === "terms" ? "border-emerald-600 bg-emerald-50" : allTermsAccepted ? "border-emerald-600 bg-emerald-600 text-white" : "border-gray-300"}`}>
                {allTermsAccepted && currentStep !== "terms" ? <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <FileText className="w-4 h-4 sm:w-5 sm:h-5" />}
              </div>
              <span className="ml-1 sm:ml-2 font-medium text-xs sm:text-sm hidden sm:inline">Terms</span>
            </div>
            <div className="w-8 sm:w-16 h-0.5 bg-gray-300">
              <div className={`h-full transition-all duration-300 ${allTermsAccepted ? "bg-emerald-600 w-full" : "w-0"}`} />
            </div>
            
            <div className={`flex items-center ${currentStep === "video" ? "text-emerald-600" : generatedCertificate ? "text-emerald-600" : "text-gray-400"}`}>
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 ${currentStep === "video" ? "border-emerald-600 bg-emerald-50" : generatedCertificate ? "border-emerald-600 bg-emerald-600 text-white" : "border-gray-300"}`}>
                {generatedCertificate ? <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <PlayCircle className="w-4 h-4 sm:w-5 sm:h-5" />}
              </div>
              <span className="ml-1 sm:ml-2 font-medium text-xs sm:text-sm hidden sm:inline">Video & Complete</span>
            </div>
          </div>
        </div>


        {/* Step 1: Registration Form */}
        {currentStep === "form" && (
        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>Personal Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input id="firstName" {...form.register("firstName")} />
                  {form.formState.errors.firstName && <p className="text-sm text-red-600 mt-1">{form.formState.errors.firstName.message}</p>}
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input id="lastName" {...form.register("lastName")} />
                  {form.formState.errors.lastName && <p className="text-sm text-red-600 mt-1">{form.formState.errors.lastName.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="username">Username *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input id="username" className="pl-10" {...form.register("username")} maxLength={20} autoComplete="off" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">8-20 characters, start with a letter, letters/numbers/underscores only</p>
                  {form.formState.errors.username && <p className="text-sm text-red-600 mt-1">{form.formState.errors.username.message}</p>}
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input id="email" type="email" className="pl-10" {...form.register("email")} autoComplete="username" />
                  </div>
                  {form.formState.errors.email && <p className="text-sm text-red-600 mt-1">{form.formState.errors.email.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phoneNumber">Phone Number *</Label>
                  <PhoneInput
                    id="phoneNumber"
                    value={form.watch("phoneNumber")}
                    country={phoneCountry}
                    onCountryChange={setPhoneCountry}
                    onChange={(value, isValid, e164) => {
                      const nextValue = e164 || value;
                      const hasDigits = nextValue.replace(/\D/g, "").length > 0;
                      form.setValue("phoneNumber", nextValue, { shouldValidate: hasDigits });
                      if (!hasDigits) {
                        form.clearErrors("phoneNumber");
                        return;
                      }
                      if (!isValid && hasDigits) {
                        form.setError("phoneNumber", { message: "Please enter a valid phone number" });
                      } else {
                        form.clearErrors("phoneNumber");
                      }
                    }}
                    defaultCountry="ET"
                    placeholder="911 234 567"
                    error={!!form.formState.errors.phoneNumber}
                  />
                  <p className="text-xs text-gray-500 mt-1">Select your country and enter your phone number</p>
                  {form.formState.errors.phoneNumber && <p className="text-sm text-red-600 mt-1">{form.formState.errors.phoneNumber.message}</p>}
                </div>
                <div>
                  <Label htmlFor="birthDate">Birth Date *</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input id="birthDate" type="date" className="pl-10" {...form.register("birthDate")} />
                  </div>
                  {form.formState.errors.birthDate && <p className="text-sm text-red-600 mt-1">{form.formState.errors.birthDate.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="password">Password *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input id="password" type={showPassword ? "text" : "password"} className="pl-10 pr-10" {...form.register("password")} autoComplete="new-password" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">At least 8 characters with uppercase, lowercase, number, and special character</p>
                  {form.formState.errors.password && <p className="text-sm text-red-600 mt-1">{form.formState.errors.password.message}</p>}
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input id="confirmPassword" type={showConfirm ? "text" : "password"} className="pl-10 pr-10" {...form.register("confirmPassword")} autoComplete="new-password" />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {form.formState.errors.confirmPassword && <p className="text-sm text-red-600 mt-1">{form.formState.errors.confirmPassword.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="country">Country *</Label>
                  <Select 
                    value={form.watch("country")}
                    onValueChange={(value) => {
                      form.setValue("country", value);
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_COUNTRIES.map((country) => (
                        <SelectItem key={country.value} value={country.value}>
                          {country.label} ({country.currencyCode})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">Your currency will be set based on your country</p>
                  {form.formState.errors.country && <p className="text-sm text-red-600 mt-1">{form.formState.errors.country.message}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building2 className="w-5 h-5" />
                <span>Business Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="businessName">Business Name *</Label>
                <Input id="businessName" {...form.register("businessName")} />
                {form.formState.errors.businessName && <p className="text-sm text-red-600 mt-1">{form.formState.errors.businessName.message}</p>}
              </div>

              <div>
                <Label htmlFor="description">Business Description</Label>
                <Textarea id="description" placeholder="Describe your business..." className="min-h-[100px]" {...form.register("description")} />
              </div>

              <div>
                <Label htmlFor="vendorCategoryId">Business Category *</Label>
                <Select value={form.watch("vendorCategoryId")} onValueChange={(value) => form.setValue("vendorCategoryId", value)}>
                  <SelectTrigger><SelectValue placeholder="Select your business category" /></SelectTrigger>
                  <SelectContent>
                    {vendorCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>{category.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.vendorCategoryId && <p className="text-sm text-red-600 mt-1">{form.formState.errors.vendorCategoryId.message}</p>}
              </div>

              <div>
                <Label htmlFor="vendorType">Vendor Type *</Label>
                <Select value={form.watch("vendorType")} onValueChange={(value) => form.setValue("vendorType", value)}>
                  <SelectTrigger><SelectValue placeholder="Select your vendor type" /></SelectTrigger>
                  <SelectContent>
                    {VENDOR_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.watch("vendorType") && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {VENDOR_TYPES.find(t => t.value === form.watch("vendorType"))?.description}
                  </p>
                )}
                {form.formState.errors.vendorType && <p className="text-sm text-red-600 mt-1">{form.formState.errors.vendorType.message}</p>}
              </div>

              {form.watch("country") === "Ethiopia" && (
                <div className="p-4 border border-amber-200 bg-amber-50 rounded-lg">
                  <Label htmlFor="vatStatus" className="text-amber-800">VAT Registration Status *</Label>
                  <Select onValueChange={(value) => form.setValue("vatStatus", value)} value={form.watch("vatStatus") || undefined}>
                    <SelectTrigger className="mt-2"><SelectValue placeholder="Select your VAT status" /></SelectTrigger>
                    <SelectContent>
                      {VAT_STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.vatStatus && <p className="text-sm text-red-600 mt-1">{form.formState.errors.vatStatus.message}</p>}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="businessEmail">Business Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input id="businessEmail" type="email" className="pl-10" {...form.register("businessEmail")} />
                  </div>
                  {form.formState.errors.businessEmail && <p className="text-sm text-red-600 mt-1">{form.formState.errors.businessEmail.message}</p>}
                </div>
                <div>
                  <Label htmlFor="businessPhone">Business Phone *</Label>
                  <PhoneInput
                    id="businessPhone"
                    value={form.watch("businessPhone")}
                    country={phoneCountry}
                    onCountryChange={setPhoneCountry}
                    onChange={(value, isValid, e164) => {
                      const nextValue = e164 || value;
                      const hasDigits = nextValue.replace(/\D/g, "").length > 0;
                      form.setValue("businessPhone", nextValue, { shouldValidate: hasDigits });
                      if (!hasDigits) {
                        form.clearErrors("businessPhone");
                        return;
                      }
                      if (!isValid && hasDigits) {
                        form.setError("businessPhone", { message: "Please enter a valid business phone number" });
                      } else {
                        form.clearErrors("businessPhone");
                      }
                    }}
                    defaultCountry="ET"
                    placeholder="911 111 111"
                    error={!!form.formState.errors.businessPhone}
                  />
                  <p className="text-xs text-gray-500 mt-1">Select country and enter your business phone number</p>
                  {form.formState.errors.businessPhone && <p className="text-sm text-red-600 mt-1">{form.formState.errors.businessPhone.message}</p>}
                </div>
              </div>

              <div>
                <Label htmlFor="city">City *</Label>
                <Input id="city" placeholder="Enter City" {...form.register("city")} />
                {form.formState.errors.city && <p className="text-sm text-red-600 mt-1">{form.formState.errors.city.message}</p>}
              </div>

              {/* Business Location Map Picker */}
              <div className="space-y-2 pt-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  Business Location
                </Label>
                <p className="text-xs text-gray-500">
                  Pin your business location on the map. This helps with delivery pricing and connects you with nearby customers. Your country and city will be auto-detected.
                </p>
                <LocationPicker
                  latitude={form.watch("latitude")}
                  longitude={form.watch("longitude")}
                  onLocationSelect={(location: LocationData) => {
                    form.setValue("latitude", location.latitude, { shouldValidate: true });
                    form.setValue("longitude", location.longitude, { shouldValidate: true });
                    form.setValue("placeId", location.placeId);
                    form.setValue("formattedAddress", location.formattedAddress);
                    form.setValue("streetAddress", location.streetAddress);

                    // Auto-populate city from map if empty or different
                    if (location.city) {
                      form.setValue("city", location.city, { shouldValidate: true });
                    }

                    // Auto-match country from map to supported countries
                    if (location.country) {
                      const matchedCountry = SUPPORTED_COUNTRIES.find(
                        (c) =>
                          c.value.toLowerCase() === location.country.toLowerCase() ||
                          c.label.toLowerCase() === location.country.toLowerCase()
                      );
                      if (matchedCountry) {
                        form.setValue("country", matchedCountry.value, { shouldValidate: true });
                      }
                    }
                  }}
                  height="300px"
                  placeholder="Search for your business location..."
                />
                {form.watch("formattedAddress") && (
                  <p className="text-xs text-emerald-700 bg-emerald-50 rounded-md px-3 py-2 mt-1">
                    📍 {form.watch("formattedAddress")}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end pt-6">
            <Button type="button" onClick={handleProceedToTerms} className="bg-emerald-600 hover:bg-emerald-700 px-8">
              Continue to Terms & Conditions
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </form>
        )}


        {/* Step 2: Terms and Conditions */}
        {currentStep === "terms" && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <span>Terms & Conditions</span>
              </CardTitle>
              <CardDescription>
                Review the key points below and accept the full legal terms to continue.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingTerms ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                  <span className="ml-2">Loading terms...</span>
                </div>
              ) : termsData ? (
                <>
                  {/* Key Points Summary Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {termsData.terms.map((term) => (
                      <div
                        key={term.id}
                        className="p-4 rounded-lg border bg-white hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => setSelectedTermForDetail(selectedTermForDetail === term.id ? null : term.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                            {getTermIcon(term.termKey)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 text-sm">{term.title}</h4>
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                              {term.summary || term.description.substring(0, 100) + '...'}
                            </p>
                          </div>
                        </div>
                        {selectedTermForDetail === term.id && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-sm text-gray-700">{term.summary || term.description.substring(0, 200)}</p>
                            <Button
                              variant="link"
                              size="sm"
                              className="p-0 h-auto text-emerald-600 mt-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowFullTermsModal(true);
                              }}
                            >
                              Read full details <ExternalLink className="w-3 h-3 ml-1" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* View Full Terms Button */}
                  <div className="flex justify-center pt-4">
                    <Dialog open={showFullTermsModal} onOpenChange={setShowFullTermsModal}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="gap-2">
                          <FileText className="w-4 h-4" />
                          View Full Terms & Conditions
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh]">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-emerald-600" />
                            goGerami Vendor Terms & Conditions
                          </DialogTitle>
                          <DialogDescription>
                            Please read carefully before accepting
                          </DialogDescription>
                        </DialogHeader>
                        <ScrollArea className="h-[60vh] pr-4">
                          <div className="space-y-8">
                            {termsData.terms.map((term, index) => (
                              <div key={term.id} className="space-y-2">
                                <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                                  <span className="text-emerald-600">{index + 1}.</span>
                                  {term.title}
                                </h3>
                                <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed pl-6">
                                  {term.description}
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {/* Acceptance Checkbox */}
                  <div className={`p-4 rounded-lg border transition-all duration-200 ${
                    allTermsAccepted ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20" : "border-gray-300 bg-white"
                  }`}>
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="accept-all-terms"
                        checked={allTermsAccepted}
                        onCheckedChange={handleAcceptAllTerms}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <label htmlFor="accept-all-terms" className="font-medium cursor-pointer flex items-center text-gray-900">
                          <CheckCircle2 className={`w-5 h-5 mr-2 ${allTermsAccepted ? "text-emerald-600" : "text-gray-400"}`} />
                          I have read and agree to the full goGerami Vendor Terms & Conditions
                        </label>
                        <p className="text-xs text-gray-500 mt-1">
                          By checking this box, you acknowledge that you have read, understood, and agree to be bound by all {termsData.terms.length} sections of the Terms & Conditions.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">No terms found for this vendor type.</div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 sm:justify-between pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep("form")}
                  className="w-full sm:w-auto"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Details
                </Button>
                <Button
                  type="button"
                  onClick={handleProceedToVideo}
                  disabled={!allTermsAccepted}
                  className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto"
                >
                  Continue to Onboarding Video
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Video & Complete Registration */}
        {currentStep === "video" && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <PlayCircle className="w-5 h-5 text-emerald-600" />
                <span>{getVendorTypeLabel()} Onboarding Video</span>
              </CardTitle>
              <CardDescription>
                Watch this video to learn how to navigate goGerami as a {getVendorTypeLabel().toLowerCase()}. You may scrub forward or back as needed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                <iframe
                  className="w-full h-full absolute inset-0"
                  src={`https://www.youtube.com/embed/${getVideoId()}?rel=0`}
                  title={`${getVendorTypeLabel()} Onboarding Video`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`https://www.youtube.com/watch?v=${getVideoId()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open in YouTube
                </a>
              </div>

              <div className={`p-4 rounded-lg border ${hasWatchedVideo ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="video-completed"
                    checked={videoCompletedChecked}
                    onCheckedChange={(c) => handleVideoCompletedCheckbox(c === true)}
                    className="mt-0.5"
                  />
                  <label htmlFor="video-completed" className="text-sm font-medium cursor-pointer leading-tight">
                    I've completed the onboarding video
                  </label>
                </div>
                {hasWatchedVideo && (
                  <p className="text-sm text-green-700 mt-2 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    Your onboarding certificate will be generated below.
                  </p>
                )}
              </div>

              {/* Certificate Generation & Download */}
              {hasWatchedVideo && (
                <div className="space-y-4">
                  {!generatedCertificate ? (
                    <div className="p-6 bg-emerald-50 rounded-lg border border-emerald-200 text-center">
                      <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
                      <h4 className="font-medium text-emerald-900 text-lg mb-2">
                         {generateCertificateMutation.isPending ? "Generating Certificate..." : "Certificate Generation Needed"}
                      </h4>
                      <p className="text-sm text-emerald-700 mb-4">
                         {generateCertificateMutation.isPending 
                            ? "Please wait while we generate your onboarding certificate." 
                            : "Click below to generate your certificate."}
                      </p>
                      {generateCertificateMutation.isPending ? (
                         <div className="flex justify-center py-2">
                           <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                         </div>
                      ) : (
                        <Button
                          type="button"
                          onClick={() => generateCertificateMutation.mutate()}
                          className="bg-emerald-600 hover:bg-emerald-700"
                        >
                          Generate Certificate
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="p-6 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center justify-center mb-4">
                        <CheckCircle2 className="w-12 h-12 text-green-600" />
                      </div>
                      <h4 className="font-medium text-green-900 text-lg text-center mb-4">Certificate Generated!</h4>
                      <p className="text-sm text-green-700 text-center mb-4">
                        Your onboarding certificate is ready. You can download it for your records.
                      </p>
                      <div className="flex justify-center">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleDownloadCertificatePdf}
                          disabled={isDownloadingPdf}
                          className="w-full sm:w-auto"
                        >
                          {isDownloadingPdf ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4 mr-2" />
                          )}
                          Download Certificate PDF
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 sm:justify-between pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep("terms")}
                  className="w-full sm:w-auto"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Terms
                </Button>
                <Button
                  type="button"
                  onClick={form.handleSubmit(onSubmit)}
                  disabled={!generatedCertificate || signupMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto"
                >
                  {signupMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    "Complete Registration"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
