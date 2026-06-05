import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  isValidPhoneNumber,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js/max";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PhoneInput } from "@/components/ui/phone-input";
import { useToast } from "@/hooks/use-toast";
import {
  mouTermsService,
  MouTermsResponse,
} from "@/services/mouTermsService";
import { vendorCategoryService } from "@/services/vendorCategoryService";
import { partnershipApplicationService } from "@/services/partnershipApplicationService";
import {
  SUPPORTED_COUNTRIES,
} from "@/lib/countryConfig";
import {
  Building2,
  Mail,
  FileText,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  ExternalLink,
  Shield,
  DollarSign,
  Package,
  MessageCircle,
  Scale,
  FileCheck,
  Lock,
  MapPin,
} from "lucide-react";
import GoGeramiLogo from "@/components/GoGeramiLogo";
import {
  GoogleMapsProvider,
  LocationPicker,
  type LocationData,
} from "@/components/maps";

const VENDOR_TYPES = [
  { value: "PRODUCT", label: "Product Vendor", description: "I sell physical goods that require delivery" },
  { value: "SERVICE", label: "Service Vendor", description: "I provide experiences, events, or time-based services" },
  { value: "HYBRID", label: "Hybrid Vendor", description: "I sell both physical products and services" },
];

const phoneValidation = z
  .string()
  .min(1, "Phone number is required")
  .refine((val) => {
    if (!val) return false;
    return isValidPhoneNumber(val);
  }, "Please enter a valid phone number")
  .transform((val) => {
    const parsed = parsePhoneNumberFromString(val);
    return parsed?.format("E.164") || val;
  });

const partnerSignupSchema = z.object({
  businessName: z
    .string()
    .min(2, "Business name must be at least 2 characters")
    .max(200, "Business name is too long"),
  businessEmail: z.string().email("Valid business email is required"),
  businessPhone: phoneValidation,
  description: z
    .string()
    .max(1000, "Description must be less than 1000 characters")
    .optional(),
  country: z.string().min(2, "Country is required"),
  city: z.string().min(2, "City is required"),
  vendorType: z.string().optional(),
  vendorCategoryId: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

type PartnerSignupForm = z.infer<typeof partnerSignupSchema>;

export default function PartnerSignup() {
  const [currentStep, setCurrentStep] = useState<"form" | "terms">("form");
  const [termsData, setTermsData] = useState<MouTermsResponse | null>(null);
  const [isLoadingTerms, setIsLoadingTerms] = useState(false);
  const [allTermsAccepted, setAllTermsAccepted] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState<Record<number, boolean>>({});
  const [showFullTermsModal, setShowFullTermsModal] = useState(false);
  const [selectedTermForDetail, setSelectedTermForDetail] = useState<number | null>(null);
  const [phoneCountry, setPhoneCountry] = useState<CountryCode>("ET");
  const { toast } = useToast();

  const { data: vendorCategories = [] } = useQuery({
    queryKey: ["vendor-categories"],
    queryFn: () => vendorCategoryService.getAllActiveCategories(),
  });

  const form = useForm<PartnerSignupForm>({
    resolver: zodResolver(partnerSignupSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      businessName: "",
      businessEmail: "",
      businessPhone: "",
      description: "",
      country: "",
      city: "",
      vendorType: "",
      vendorCategoryId: "",
      latitude: undefined,
      longitude: undefined,
    },
  });

  const createApplicationMutation = useMutation({
    mutationFn: async (data: PartnerSignupForm) => {
      const payload = {
        businessName: data.businessName,
        businessEmail: data.businessEmail,
        businessPhone: data.businessPhone,
        description: data.description || undefined,
        city: data.city,
        country: data.country,
        vendorCategoryId: data.vendorCategoryId ? parseInt(data.vendorCategoryId) : null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        status: "MOU_SIGNED" as const,
      };

      return await partnershipApplicationService.createApplication(payload);
    },
    onSuccess: () => {
      toast({
        title: "Application Submitted!",
        description: "Your partnership application has been received. We'll review it and get back to you.",
      });
      form.reset();
      setCurrentStep("form");
      setAllTermsAccepted(false);
      setAcceptedTerms({});
      setTermsData(null);
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const handleProceedToTerms = async () => {
    const fieldsToValidate = [
      "businessName",
      "businessEmail",
      "businessPhone",
      "city",
      "country",
    ] as const;

    const isValid = await form.trigger(fieldsToValidate);
    if (!isValid) {
      const errors = form.formState.errors;
      const errorCount = Object.keys(errors).length;
      toast({
        title: "Validation Errors",
        description: `Please fix ${errorCount} error${errorCount > 1 ? "s" : ""} before continuing.`,
        variant: "destructive",
      });
      return;
    }

    setIsLoadingTerms(true);
    try {
      const terms = await mouTermsService.getUniversalTerms();
      setTermsData(terms);
      setAcceptedTerms({});
      setAllTermsAccepted(false);
      setCurrentStep("terms");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      toast({
        title: "Error",
        description: "Failed to load terms and conditions",
        variant: "destructive",
      });
    } finally {
      setIsLoadingTerms(false);
    }
  };

  const handleAcceptAllTerms = (checked: boolean) => {
    setAllTermsAccepted(checked);
    if (checked && termsData) {
      const allAccepted: Record<number, boolean> = {};
      termsData.terms.forEach((term) => {
        allAccepted[term.id] = true;
      });
      setAcceptedTerms(allAccepted);
    } else {
      setAcceptedTerms({});
    }
  };

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

  const handleSubmit = async () => {
    if (!allTermsAccepted) {
      toast({
        title: "Terms Required",
        description: "Please read and accept the Terms & Conditions.",
        variant: "destructive",
      });
      return;
    }
    const data = form.getValues();
    await createApplicationMutation.mutateAsync(data);
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="flex justify-center mb-6">
            <GoGeramiLogo size="lg" variant="icon" className="h-16 w-16" />
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Partner Registration
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Register your business as a partner on goGerami's marketplace.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Want the full vendor experience?{" "}
            <Link
              to="/vendor-signup"
              className="text-emerald-600 hover:text-emerald-700 font-medium"
            >
              Sign up as a vendor here
            </Link>
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div
              className={`flex items-center ${
                currentStep === "form" ? "text-emerald-600" : "text-emerald-600"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                  currentStep === "form"
                    ? "border-emerald-600 bg-emerald-50"
                    : "border-emerald-600 bg-emerald-600 text-white"
                }`}
              >
                {currentStep !== "form" ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <Building2 className="w-5 h-5" />
                )}
              </div>
              <span className="ml-2 font-medium text-sm">
                Business Details
              </span>
            </div>
            <div className="w-16 h-0.5 bg-gray-300">
              <div
                className={`h-full transition-all duration-300 ${
                  currentStep === "terms" ? "bg-emerald-600 w-full" : "w-0"
                }`}
              />
            </div>
            <div
              className={`flex items-center ${
                currentStep === "terms" ? "text-emerald-600" : "text-gray-400"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                  currentStep === "terms"
                    ? "border-emerald-600 bg-emerald-50"
                    : "border-gray-300"
                }`}
              >
                <FileText className="w-5 h-5" />
              </div>
              <span className="ml-2 font-medium text-sm">
                Terms & Submit
              </span>
            </div>
          </div>
        </div>

        {/* Step 1: Business Information Form */}
        {currentStep === "form" && (
          <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
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
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.businessName.message}
                    </p>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="vendorType">Vendor Type</Label>
                    <Select
                      value={form.watch("vendorType")}
                      onValueChange={(value) =>
                        form.setValue("vendorType", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select vendor type" />
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
                        {VENDOR_TYPES.find(
                          (t) => t.value === form.watch("vendorType")
                        )?.description}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="vendorCategoryId">Business Category</Label>
                    <Select
                      value={form.watch("vendorCategoryId")}
                      onValueChange={(value) =>
                        form.setValue("vendorCategoryId", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select business category" />
                      </SelectTrigger>
                      <SelectContent>
                        {vendorCategories.map((cat) => (
                          <SelectItem
                            key={cat.id}
                            value={cat.id.toString()}
                          >
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="businessEmail">Business Email *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="businessEmail"
                        type="email"
                        className="pl-10"
                        {...form.register("businessEmail")}
                      />
                    </div>
                    {form.formState.errors.businessEmail && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.businessEmail.message}
                      </p>
                    )}
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
                        form.setValue("businessPhone", nextValue, {
                          shouldValidate: hasDigits,
                        });
                        if (!hasDigits) {
                          form.clearErrors("businessPhone");
                          return;
                        }
                        if (!isValid && hasDigits) {
                          form.setError("businessPhone", {
                            message: "Please enter a valid business phone number",
                          });
                        } else {
                          form.clearErrors("businessPhone");
                        }
                      }}
                      defaultCountry="ET"
                      placeholder="911 111 111"
                      error={!!form.formState.errors.businessPhone}
                    />
                    {form.formState.errors.businessPhone && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.businessPhone.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="country">Country *</Label>
                    <Select
                      value={form.watch("country")}
                      onValueChange={(value) =>
                        form.setValue("country", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        {SUPPORTED_COUNTRIES.map((country) => (
                          <SelectItem key={country.value} value={country.value}>
                            {country.label} ({country.currencyCode})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.country && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.country.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      placeholder="Enter City"
                      {...form.register("city")}
                    />
                    {form.formState.errors.city && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.city.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Business Location Map Picker */}
                <div className="space-y-2 pt-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    Business Location
                  </Label>
                  <p className="text-xs text-gray-500">
                    Pin your business location on the map. This helps with
                    delivery pricing and connects you with nearby customers.
                  </p>
                  <GoogleMapsProvider>
                    <LocationPicker
                      latitude={form.watch("latitude")}
                      longitude={form.watch("longitude")}
                      onLocationSelect={(location: LocationData) => {
                        form.setValue("latitude", location.latitude);
                        form.setValue("longitude", location.longitude);
                        if (location.city) {
                          form.setValue("city", location.city);
                        }
                        if (location.country) {
                          const matchedCountry = SUPPORTED_COUNTRIES.find(
                            (c) =>
                              c.value.toLowerCase() === location.country.toLowerCase() ||
                              c.label.toLowerCase() === location.country.toLowerCase()
                          );
                          if (matchedCountry) {
                            form.setValue("country", matchedCountry.value);
                          }
                        }
                      }}
                      height="300px"
                      placeholder="Search for your business location..."
                    />
                  </GoogleMapsProvider>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end pt-2">
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

        {/* Step 2: Terms and Conditions */}
        {currentStep === "terms" && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <span>Terms & Conditions</span>
              </CardTitle>
              <CardDescription>
                Review the key points below and accept the full legal terms to
                submit your partnership application.
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {termsData.terms.map((term) => (
                      <div
                        key={term.id}
                        className="p-4 rounded-lg border bg-white hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() =>
                          setSelectedTermForDetail(
                            selectedTermForDetail === term.id ? null : term.id
                          )
                        }
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                            {getTermIcon(term.termKey)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 text-sm">
                              {term.title}
                            </h4>
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                              {term.summary ||
                                term.description.substring(0, 100) + "..."}
                            </p>
                          </div>
                        </div>
                        {selectedTermForDetail === term.id && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-sm text-gray-700">
                              {term.summary ||
                                term.description.substring(0, 200)}
                            </p>
                            <Button
                              variant="link"
                              size="sm"
                              className="p-0 h-auto text-emerald-600 mt-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowFullTermsModal(true);
                              }}
                            >
                              Read full details{" "}
                              <ExternalLink className="w-3 h-3 ml-1" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-center pt-4">
                    <Dialog
                      open={showFullTermsModal}
                      onOpenChange={setShowFullTermsModal}
                    >
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
                            goGerami MOU Terms & Conditions
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
                                  <span className="text-emerald-600">
                                    {index + 1}.
                                  </span>
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

                  <div
                    className={`p-4 rounded-lg border transition-all duration-200 ${
                      allTermsAccepted
                        ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20"
                        : "border-gray-300 bg-white"
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="accept-all-terms"
                        checked={allTermsAccepted}
                        onCheckedChange={handleAcceptAllTerms}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <label
                          htmlFor="accept-all-terms"
                          className="font-medium cursor-pointer flex items-center text-gray-900"
                        >
                          <CheckCircle2
                            className={`w-5 h-5 mr-2 ${
                              allTermsAccepted
                                ? "text-emerald-600"
                                : "text-gray-400"
                            }`}
                          />
                          I have read and agree to the full goGerami MOU
                          Terms & Conditions
                        </label>
                        <p className="text-xs text-gray-500 mt-1">
                          By checking this box, you acknowledge that you have
                          read, understood, and agree to be bound by all{" "}
                          {termsData.terms.length} sections of the Terms &
                          Conditions.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No terms found.
                </div>
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
                  onClick={handleSubmit}
                  disabled={!allTermsAccepted || createApplicationMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto"
                >
                  {createApplicationMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Application"
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
