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
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/services/apiService";
import { User, Mail, Phone, Lock, Globe, Calendar, Building2, Eye, EyeOff } from "lucide-react";
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
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords must match",
  });

type VendorSignupForm = z.infer<typeof vendorSignupSchema>;

export default function VendorSignup() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

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
        supportedPaymentProviders: ["STRIPE", "CHAPA"],
      };

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
          <Link to="/" className="inline-block mb-6 flex justify-center">
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

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                    placeholder="John"
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
                    placeholder="Doe"
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
                      placeholder="johndoe"
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
                      placeholder="john@example.com"
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
                      placeholder="••••••••"
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
                      placeholder="••••••••"
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
                  placeholder="Describe your business and what makes it unique..."
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="businessEmail">Business Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="businessEmail"
                      type="email"
                      placeholder="contact@business.com"
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
                  placeholder="Addis Ababa"
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
              className="w-full md:w-auto text-white px-12 py-6 text-md"
            >
              {signupMutation.isPending ? "Creating Account..." : "Create Vendor Account"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
