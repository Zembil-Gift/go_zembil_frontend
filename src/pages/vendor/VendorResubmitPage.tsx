import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { vendorService, VendorProfile } from "@/services/vendorService";
import { vendorCategoryService } from "@/services/vendorCategoryService";
import { SUPPORTED_COUNTRIES, isEthiopianCountry } from "@/lib/countryConfig";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, RefreshCw } from "lucide-react";

const VENDOR_TYPES = [
  { value: "PRODUCT", label: "Product Vendor" },
  { value: "SERVICE", label: "Service Vendor" },
  { value: "HYBRID", label: "Hybrid Vendor" },
] as const;

const VAT_STATUS_OPTIONS = [
  { value: "VAT_REGISTERED", label: "VAT Registered" },
  { value: "NOT_VAT_REGISTERED", label: "Not VAT Registered" },
  { value: "VAT_EXEMPT", label: "VAT Exempt" },
] as const;

const resubmitSchema = z.object({
  businessName: z.string().min(2, "Business name is required"),
  description: z.string().max(1000, "Description must be less than 1000 characters").optional(),
  businessEmail: z.string().email("Valid business email is required"),
  businessPhone: z.string().min(5, "Business phone is required"),
  city: z.string().min(2, "City is required"),
  country: z.string().min(2, "Country is required"),
  vendorCategoryId: z.string().min(1, "Vendor category is required"),
  vendorType: z.enum(["PRODUCT", "SERVICE", "HYBRID"]),
  vatStatus: z.enum(["VAT_REGISTERED", "NOT_VAT_REGISTERED", "VAT_EXEMPT"]).optional(),
}).refine((data) => {
  if (isEthiopianCountry(data.country)) {
    return !!data.vatStatus;
  }
  return true;
}, {
  message: "VAT status is required for Ethiopian vendors",
  path: ["vatStatus"],
});

type ResubmitForm = z.infer<typeof resubmitSchema>;

export default function VendorResubmitPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: vendorProfile, isLoading: loadingProfile } = useQuery<VendorProfile>({
    queryKey: ["vendor", "profile"],
    queryFn: () => vendorService.getMyProfile(),
  });

  const { data: vendorCategories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ["vendor-categories"],
    queryFn: () => vendorCategoryService.getAllActiveCategories(),
  });

  const form = useForm<ResubmitForm>({
    resolver: zodResolver(resubmitSchema),
    defaultValues: {
      businessName: "",
      description: "",
      businessEmail: "",
      businessPhone: "",
      city: "",
      country: "Ethiopia",
      vendorCategoryId: "",
      vendorType: "PRODUCT",
      vatStatus: "NOT_VAT_REGISTERED",
      supportedPaymentProviders: ["CHAPA", "TELEBIRR"],
    },
  });

  useEffect(() => {
    if (!vendorProfile) return;
    const country = vendorProfile.country || "Ethiopia";

    form.reset({
      businessName: vendorProfile.businessName || "",
      description: vendorProfile.description || "",
      businessEmail: vendorProfile.businessEmail || "",
      businessPhone: vendorProfile.businessPhone || "",
      city: vendorProfile.city || "",
      country,
      vendorCategoryId: vendorProfile.vendorCategoryId ? String(vendorProfile.vendorCategoryId) : "",
      vendorType: (vendorProfile.vendorType as "PRODUCT" | "SERVICE" | "HYBRID") || "PRODUCT",
      vatStatus: (vendorProfile.vatStatus as "VAT_REGISTERED" | "NOT_VAT_REGISTERED" | "VAT_EXEMPT" | undefined) || "NOT_VAT_REGISTERED",
    });
  }, [vendorProfile, form]);

  const selectedCountry = form.watch("country");
  const isEthiopia = isEthiopianCountry(selectedCountry);

  useEffect(() => {
    if (!isEthiopia) {
      form.setValue("vatStatus", undefined);
    }
  }, [selectedCountry]);

  const resubmitMutation = useMutation({
    mutationFn: (values: ResubmitForm) => vendorService.resubmitMyApplication({
      businessName: values.businessName,
      description: values.description || undefined,
      businessEmail: values.businessEmail,
      businessPhone: values.businessPhone,
      city: values.city,
      country: values.country,
      vendorCategoryId: Number(values.vendorCategoryId),
      vendorType: values.vendorType,
      vatStatus: isEthiopianCountry(values.country) ? values.vatStatus : undefined,
      supportedPaymentProviders: vendorProfile.supportedPaymentProviders,
    }),
    onSuccess: () => {
      toast({
        title: "Application resubmitted",
        description: "Your vendor application was updated and sent for review.",
      });
      queryClient.invalidateQueries({ queryKey: ["vendor", "profile"] });
      navigate("/vendor");
    },
    onError: (error: any) => {
      toast({
        title: "Resubmission failed",
        description: error?.message || "Unable to resubmit application",
        variant: "destructive",
      });
    },
  });

  if (loadingProfile || loadingCategories) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!vendorProfile) {
    return <div className="text-center py-12 text-muted-foreground">Vendor profile not found.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-800">
            <AlertTriangle className="h-5 w-5" />
            Resubmit Vendor Application
          </CardTitle>
          <CardDescription className="text-red-700">
            Update your information and resubmit for admin review.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-800">{vendorProfile.rejectionReason || "Your previous submission was rejected."}</p>
          {vendorProfile.rejectedAt && (
            <p className="text-xs text-red-700 mt-1">Rejected on {new Date(vendorProfile.rejectedAt).toLocaleString()}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vendor Information</CardTitle>
          <CardDescription>
            This form mirrors the vendor registration details and will update your existing vendor profile.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit((v) => resubmitMutation.mutate(v))} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Business Name *</Label>
                <Input {...form.register("businessName")} />
                {form.formState.errors.businessName && <p className="text-sm text-red-600 mt-1">{form.formState.errors.businessName.message}</p>}
              </div>
              <div>
                <Label>Business Email *</Label>
                <Input type="email" {...form.register("businessEmail")} />
                {form.formState.errors.businessEmail && <p className="text-sm text-red-600 mt-1">{form.formState.errors.businessEmail.message}</p>}
              </div>
              <div>
                <Label>Business Phone *</Label>
                <Input {...form.register("businessPhone")} />
                {form.formState.errors.businessPhone && <p className="text-sm text-red-600 mt-1">{form.formState.errors.businessPhone.message}</p>}
              </div>
              <div>
                <Label>City *</Label>
                <Input {...form.register("city")} />
                {form.formState.errors.city && <p className="text-sm text-red-600 mt-1">{form.formState.errors.city.message}</p>}
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea className="min-h-[120px]" {...form.register("description")} />
              {form.formState.errors.description && <p className="text-sm text-red-600 mt-1">{form.formState.errors.description.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Country *</Label>
                <Controller
                  name="country"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        {SUPPORTED_COUNTRIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div>
                <Label>Business Category *</Label>
                <Controller
                  name="vendorCategoryId"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {vendorCategories.map((cat) => (
                          <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.vendorCategoryId && <p className="text-sm text-red-600 mt-1">{form.formState.errors.vendorCategoryId.message}</p>}
              </div>

              <div>
                <Label>Vendor Type *</Label>
                <Controller
                  name="vendorType"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select vendor type" />
                      </SelectTrigger>
                      <SelectContent>
                        {VENDOR_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            {isEthiopia && (
              <div>
                <Label>VAT Status *</Label>
                <Controller
                  name="vatStatus"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select VAT status" />
                      </SelectTrigger>
                      <SelectContent>
                        {VAT_STATUS_OPTIONS.map((v) => (
                          <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.vatStatus && <p className="text-sm text-red-600 mt-1">{form.formState.errors.vatStatus.message}</p>}
              </div>
            )}

        

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => navigate('/vendor')}>Cancel</Button>
              <Button type="submit" disabled={resubmitMutation.isPending}>
                {resubmitMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Resubmitting...
                  </>
                ) : (
                  'Submit Updated Application'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
