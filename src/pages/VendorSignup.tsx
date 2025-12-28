import { useState, useRef, useEffect } from "react";
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
import { certificateService, CertificateResponse } from "@/services/certificateService";
import { vendorTermsService, VendorTermsResponse } from "@/services/vendorTermsService";
import { User, Mail, Phone, Lock, Globe, Calendar, Building2, Eye, EyeOff, PlayCircle, CheckCircle2, ArrowRight, ArrowLeft, FileText, Award, Loader2, Play, Pause } from "lucide-react";
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

const ONBOARDING_VIDEO_URL = "/videos/vendor-onboarding.mp4";

type OnboardingStep = "video" | "certificate" | "form" | "terms";

// Format seconds to MM:SS
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const vendorSignupSchema = z
  .object({
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
    certificateCode: z.string().min(1, "Certificate code is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords must match",
  })
  .refine((data) => {
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
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("video");
  const [acceptedTerms, setAcceptedTerms] = useState<Record<number, boolean>>({});
  const [hasWatchedVideo, setHasWatchedVideo] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [certificateEmail, setCertificateEmail] = useState("");
  const [certificateFullName, setCertificateFullName] = useState("");
  const [generatedCertificate, setGeneratedCertificate] = useState<CertificateResponse | null>(null);
  const [certificateCode, setCertificateCode] = useState("");
  const [isCertificateValidated, setIsCertificateValidated] = useState(false);
  const [termsData, setTermsData] = useState<VendorTermsResponse | null>(null);
  const [isLoadingTerms, setIsLoadingTerms] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleVideoEnded = () => {
    setHasWatchedVideo(true);
    setIsVideoPlaying(false);
    toast({
      title: "Video Completed!",
      description: "You can now generate your onboarding certificate.",
      variant: "default",
    });
  };

  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
      setVideoProgress(videoRef.current.currentTime);
    }
  };

  const handleVideoLoadedMetadata = () => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration);
    }
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isVideoPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsVideoPlaying(!isVideoPlaying);
    }
  };

  const { data: currencies = [] } = useQuery({
    queryKey: ['currencies'],
    queryFn: async () => {
      const response = await apiService.getRequest<Currency[]>('/api/currencies');
      return response;
    },
  });

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
      certificateCode: "",
    },
  });

  // Fetch terms when vendor type changes
  const selectedVendorType = form.watch("vendorType");
  
  useEffect(() => {
    if (selectedVendorType && currentStep === "terms") {
      fetchTermsForVendorType(selectedVendorType);
    }
  }, [selectedVendorType, currentStep]);

  const fetchTermsForVendorType = async (vendorType: string) => {
    setIsLoadingTerms(true);
    try {
      const terms = await vendorTermsService.getTermsByVendorType(vendorType);
      setTermsData(terms);
      setAcceptedTerms({});
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load terms and conditions",
        variant: "destructive",
      });
    } finally {
      setIsLoadingTerms(false);
    }
  };

  const allTermsAccepted = termsData ? termsData.terms.every(term => acceptedTerms[term.id]) : false;

  const handleTermToggle = (termId: number) => {
    setAcceptedTerms(prev => ({
      ...prev,
      [termId]: !prev[termId]
    }));
  };

  const handleAcceptAll = () => {
    if (termsData) {
      const allAccepted: Record<number, boolean> = {};
      termsData.terms.forEach(term => {
        allAccepted[term.id] = true;
      });
      setAcceptedTerms(allAccepted);
    }
  };

  const handleRejectAll = () => {
    setAcceptedTerms({});
  };

  const acceptedCount = Object.values(acceptedTerms).filter(Boolean).length;

  const generateCertificateMutation = useMutation({
    mutationFn: async () => {
      return certificateService.generateCertificate({
        email: certificateEmail,
        fullName: certificateFullName,
      });
    },
    onSuccess: (data) => {
      setGeneratedCertificate(data);
      toast({
        title: "Certificate Generated!",
        description: "Your onboarding certificate has been generated. Please download it and save the certificate code.",
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Certificate Generation Failed",
        description: error.message || "Failed to generate certificate. Please try again.",
        variant: "destructive",
      });
    },
  });

  const validateCertificateMutation = useMutation({
    mutationFn: async () => {
      return certificateService.validateCertificate(certificateCode);
    },
    onSuccess: (data) => {
      if (data.isValid) {
        setIsCertificateValidated(true);
        form.setValue("certificateCode", certificateCode);
        if (data.email) {
          form.setValue("email", data.email);
        }
        toast({
          title: "Certificate Validated!",
          description: "Your certificate is valid. You can now proceed with registration.",
          variant: "default",
        });
      } else {
        toast({
          title: "Invalid Certificate",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Validation Failed",
        description: error.message || "Failed to validate certificate. Please try again.",
        variant: "destructive",
      });
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (data: VendorSignupForm) => {
      const acceptedTermIds = termsData ? termsData.terms.filter(t => acceptedTerms[t.id]).map(t => t.id) : [];
      
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
        certificateCode: data.certificateCode,
        termsVersion: termsData?.version || 1,
        acceptedTermIds: acceptedTermIds,
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

  const handleProceedToTerms = async () => {
    const isValid = await form.trigger();
    if (isValid) {
      const vendorType = form.getValues("vendorType");
      if (vendorType) {
        await fetchTermsForVendorType(vendorType);
        setCurrentStep("terms");
      }
    }
  };

  const onSubmit = async (data: VendorSignupForm) => {
    if (!allTermsAccepted) {
      toast({
        title: "Terms Required",
        description: "Please accept all terms and conditions to continue.",
        variant: "destructive",
      });
      return;
    }
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
          <div className="flex items-center justify-center space-x-2 sm:space-x-4">
            <div className={`flex items-center ${currentStep === "video" ? "text-emerald-600" : hasWatchedVideo ? "text-emerald-600" : "text-gray-400"}`}>
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 ${currentStep === "video" ? "border-emerald-600 bg-emerald-50" : hasWatchedVideo ? "border-emerald-600 bg-emerald-600 text-white" : "border-gray-300"}`}>
                {hasWatchedVideo ? <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <PlayCircle className="w-4 h-4 sm:w-5 sm:h-5" />}
              </div>
              <span className="ml-1 sm:ml-2 font-medium text-xs sm:text-sm hidden sm:inline">Video</span>
            </div>
            <div className="w-8 sm:w-16 h-0.5 bg-gray-300">
              <div className={`h-full transition-all duration-300 ${hasWatchedVideo ? "bg-emerald-600 w-full" : "w-0"}`} />
            </div>
            <div className={`flex items-center ${currentStep === "certificate" ? "text-emerald-600" : isCertificateValidated ? "text-emerald-600" : "text-gray-400"}`}>
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 ${currentStep === "certificate" ? "border-emerald-600 bg-emerald-50" : isCertificateValidated ? "border-emerald-600 bg-emerald-600 text-white" : "border-gray-300"}`}>
                {isCertificateValidated ? <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <Award className="w-4 h-4 sm:w-5 sm:h-5" />}
              </div>
              <span className="ml-1 sm:ml-2 font-medium text-xs sm:text-sm hidden sm:inline">Certificate</span>
            </div>
            <div className="w-8 sm:w-16 h-0.5 bg-gray-300">
              <div className={`h-full transition-all duration-300 ${isCertificateValidated ? "bg-emerald-600 w-full" : "w-0"}`} />
            </div>
            <div className={`flex items-center ${currentStep === "form" ? "text-emerald-600" : "text-gray-400"}`}>
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 ${currentStep === "form" ? "border-emerald-600 bg-emerald-50" : currentStep === "terms" ? "border-emerald-600 bg-emerald-600 text-white" : "border-gray-300"}`}>
                {currentStep === "terms" ? <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <User className="w-4 h-4 sm:w-5 sm:h-5" />}
              </div>
              <span className="ml-1 sm:ml-2 font-medium text-xs sm:text-sm hidden sm:inline">Details</span>
            </div>
            <div className="w-8 sm:w-16 h-0.5 bg-gray-300">
              <div className={`h-full transition-all duration-300 ${currentStep === "terms" ? "bg-emerald-600 w-full" : "w-0"}`} />
            </div>
            <div className={`flex items-center ${currentStep === "terms" ? "text-emerald-600" : "text-gray-400"}`}>
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 ${currentStep === "terms" ? "border-emerald-600 bg-emerald-50" : "border-gray-300"}`}>
                <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span className="ml-1 sm:ml-2 font-medium text-xs sm:text-sm hidden sm:inline">Terms</span>
            </div>
          </div>
        </div>


        {/* Step 1: Onboarding Video */}
        {currentStep === "video" && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <PlayCircle className="w-5 h-5 text-emerald-600" />
                <span>Vendor Onboarding Video</span>
              </CardTitle>
              <CardDescription>
                Watch this video completely to learn how to navigate goGerami as a vendor.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  className="w-full aspect-video"
                  onEnded={handleVideoEnded}
                  onTimeUpdate={handleVideoTimeUpdate}
                  onLoadedMetadata={handleVideoLoadedMetadata}
                  onPlay={() => setIsVideoPlaying(true)}
                  onPause={() => setIsVideoPlaying(false)}
                  controlsList="nodownload noplaybackrate"
                  disablePictureInPicture
                  playsInline
                >
                  <source src={ONBOARDING_VIDEO_URL} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handlePlayPause}
                      className="text-white hover:bg-white/20"
                    >
                      {isVideoPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </Button>
                    
                    <div className="flex-1 h-2 bg-white/30 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 transition-all duration-200"
                        style={{ width: `${videoDuration > 0 ? (videoProgress / videoDuration) * 100 : 0}%` }}
                      />
                    </div>
                    
                    <span className="text-white text-sm font-mono min-w-[80px] text-right">
                      {formatTime(videoProgress)} / {formatTime(videoDuration)}
                    </span>
                  </div>
                </div>
              </div>

              <div className={`p-4 rounded-lg border ${hasWatchedVideo ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {hasWatchedVideo ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-green-600 mr-2" />
                        <span className="font-medium text-green-900">Video Completed!</span>
                      </>
                    ) : (
                      <>
                        <PlayCircle className="w-5 h-5 text-amber-600 mr-2" />
                        <span className="font-medium text-amber-900">
                          {videoProgress > 0 ? 'Keep watching...' : 'Please watch the entire video'}
                        </span>
                      </>
                    )}
                  </div>
                  {!hasWatchedVideo && videoDuration > 0 && (
                    <span className="text-sm text-amber-700">
                      {Math.round((videoProgress / videoDuration) * 100)}% complete
                    </span>
                  )}
                </div>
              </div>


              {hasWatchedVideo && !generatedCertificate && (
                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200 space-y-4">
                  <h4 className="font-medium text-emerald-900 flex items-center">
                    <Award className="w-5 h-5 mr-2" />
                    Generate Your Onboarding Certificate
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="certFullName">Full Name *</Label>
                      <Input
                        id="certFullName"
                        placeholder="Enter your full name"
                        value={certificateFullName}
                        onChange={(e) => setCertificateFullName(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="certEmail">Email *</Label>
                      <Input
                        id="certEmail"
                        type="email"
                        placeholder="Enter your email"
                        value={certificateEmail}
                        onChange={(e) => setCertificateEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={() => generateCertificateMutation.mutate()}
                    disabled={!certificateEmail || !certificateFullName || generateCertificateMutation.isPending}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {generateCertificateMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Award className="w-4 h-4 mr-2" />
                        Generate Certificate
                      </>
                    )}
                  </Button>
                </div>
              )}

              {generatedCertificate && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-green-900 flex items-center">
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                      Certificate Generated Successfully!
                    </h4>
                  </div>
                  <div className="bg-white p-4 rounded border">
                    <p className="text-sm text-gray-600 mb-2">Your Certificate Code:</p>
                    <p className="text-xl font-mono font-bold text-emerald-600">{generatedCertificate.certificateCode}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      Valid until: {new Date(generatedCertificate.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedCertificate.certificateCode);
                      toast({ title: "Copied!", description: "Certificate code copied to clipboard" });
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    Copy Certificate Code
                  </Button>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t">
                <Button
                  type="button"
                  onClick={() => setCurrentStep("certificate")}
                  disabled={!hasWatchedVideo}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  Continue to Certificate Validation
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}


        {/* Step 2: Certificate Validation */}
        {currentStep === "certificate" && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Award className="w-5 h-5 text-emerald-600" />
                <span>Validate Your Certificate</span>
              </CardTitle>
              <CardDescription>
                Enter your onboarding certificate code to proceed with registration.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="certificateCode">Certificate Code *</Label>
                <div className="flex gap-2">
                  <Input
                    id="certificateCode"
                    placeholder="CERT-XXXXXXXXXXXX"
                    value={certificateCode}
                    onChange={(e) => {
                      setCertificateCode(e.target.value.toUpperCase());
                      setIsCertificateValidated(false);
                    }}
                    className="font-mono"
                  />
                  <Button
                    type="button"
                    onClick={() => validateCertificateMutation.mutate()}
                    disabled={!certificateCode || validateCertificateMutation.isPending}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {validateCertificateMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Validate"
                    )}
                  </Button>
                </div>
              </div>

              {isCertificateValidated && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mr-2" />
                    <span className="font-medium text-green-900">Certificate Validated Successfully!</span>
                  </div>
                </div>
              )}

              {!isCertificateValidated && (
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <h4 className="font-medium text-amber-900 mb-2">Don't have a certificate?</h4>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep("video")}
                    size="sm"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Go Back to Video
                  </Button>
                </div>
              )}

              <div className="flex justify-between pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setCurrentStep("video")}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Video
                </Button>
                <Button
                  type="button"
                  onClick={() => setCurrentStep("form")}
                  disabled={!isCertificateValidated}
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
        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
          <div className="flex justify-start mb-4">
            <Button type="button" variant="outline" onClick={() => setCurrentStep("certificate")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Certificate
            </Button>
          </div>

          {/* Personal Information */}
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
                  {form.formState.errors.firstName && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.firstName.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input id="lastName" {...form.register("lastName")} />
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
                    <Input id="username" className="pl-10" {...form.register("username")} />
                  </div>
                  {form.formState.errors.username && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.username.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input id="email" type="email" className="pl-10" {...form.register("email")} />
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
                    <Input id="phoneNumber" placeholder="+251911000000" className="pl-10" {...form.register("phoneNumber")} />
                  </div>
                  {form.formState.errors.phoneNumber && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.phoneNumber.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="birthDate">Birth Date *</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input id="birthDate" type="date" className="pl-10" {...form.register("birthDate")} />
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
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="businessName">Business Name *</Label>
                <Input id="businessName" {...form.register("businessName")} />
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
                        {type.label}
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
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    <Input id="businessEmail" type="email" className="pl-10" {...form.register("businessEmail")} />
                  </div>
                  {form.formState.errors.businessEmail && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.businessEmail.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="businessPhone">Business Phone *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input id="businessPhone" placeholder="+251911111111" className="pl-10" {...form.register("businessPhone")} />
                  </div>
                  {form.formState.errors.businessPhone && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.businessPhone.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="contactName">Contact Person Name</Label>
                <Input id="contactName" placeholder="Primary contact person" {...form.register("contactName")} />
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
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="city">City *</Label>
                <Input id="city" placeholder="Enter City" {...form.register("city")} />
                {form.formState.errors.city && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.city.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Continue to Terms Button */}
          <div className="flex justify-end pt-6">
            <Button
              type="button"
              onClick={handleProceedToTerms}
              className="bg-emerald-600 hover:bg-emerald-700 px-8"
            >
              Continue to Terms & Conditions
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </form>
        )}


        {/* Step 4: Terms and Conditions */}
        {currentStep === "terms" && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <span>Terms & Conditions</span>
              </CardTitle>
              <CardDescription>
                Please read and accept all terms and conditions for {form.watch("vendorType")} vendors to complete your registration.
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
                  {/* Accept All / Reject All Buttons */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-700">
                        {acceptedCount} of {termsData.terms.length} terms accepted
                      </span>
                      <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-600 transition-all duration-300" 
                          style={{ width: `${(acceptedCount / termsData.terms.length) * 100}%` }}
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
                    {termsData.terms.map((term, index) => (
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
                            id={`term-${term.id}`}
                            checked={acceptedTerms[term.id] || false}
                            onCheckedChange={() => handleTermToggle(term.id)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <label 
                              htmlFor={`term-${term.id}`} 
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
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No terms found for this vendor type.
                </div>
              )}


              {/* Navigation Buttons */}
              <div className="flex justify-between pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep("form")}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Details
                </Button>
                <Button
                  type="button"
                  onClick={form.handleSubmit(onSubmit)}
                  disabled={!allTermsAccepted || signupMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {signupMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    "Create Vendor Account"
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
