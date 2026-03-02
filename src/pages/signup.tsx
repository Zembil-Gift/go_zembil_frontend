import {useState} from "react";
import {Link, useNavigate} from "react-router-dom";
import {z} from "zod";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {useMutation} from "@tanstack/react-query";
import {isValidPhoneNumber, parsePhoneNumberFromString} from "libphonenumber-js/max";
import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import {Input} from "@/components/ui/input";
import {Separator} from "@/components/ui/separator";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {PhoneInput} from "@/components/ui/phone-input";
import {Checkbox} from "@/components/ui/checkbox";
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription} from "@/components/ui/dialog";
import {ScrollArea} from "@/components/ui/scroll-area";
import {useToast} from "@/hooks/use-toast";
import authService from "@/services/authService";
import {Globe, Eye, EyeOff, Lock, Mail, User} from "lucide-react";
import GoGeramiLogo from "@/components/GoGeramiLogo";
import { SUPPORTED_COUNTRIES, getCurrencyForCountry } from "@/lib/countryConfig";
import OAuth2Buttons from "@/components/auth/OAuth2Buttons";

// Phone number validation using libphonenumber (E.164 format)
const phoneValidation = z
  .string()
  .min(1, "Phone number is required")
  .refine(
    (val) => {
      if (!val) return false;
      return isValidPhoneNumber(val);
    },
    "Please enter a valid phone number"
  )
  .transform((val) => {
    const parsed = parsePhoneNumberFromString(val);
    return parsed?.format("E.164") || val;
  });

const usernameRegex = /^[a-zA-Z][a-zA-Z0-9_]{2,19}$/;
const usernameValidation = z
  .string()
  .min(8, "Username must be at least 8 characters")
  .max(20, "Username must not exceed 20 characters")
  .regex(usernameRegex, "Username must start with a letter and contain only letters, numbers, and underscores");

const signupSchema = z
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
    country: z.string().min(1, "Please select your country"),
    acceptedTerms: z.boolean().refine(val => val, {
      message: "You must accept the Terms and Conditions to continue",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords must match",
  });

type SignupForm = z.infer<typeof signupSchema>;

export default function SignUp() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      username: "",
      email: "",
      phoneNumber: "",
      password: "",
      confirmPassword: "",
      country: "",
      acceptedTerms: false,
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (data: SignupForm) => {
        // Derive currency from country selection
        const preferredCurrencyCode = getCurrencyForCountry(data.country);
        return await authService.register({
          firstName: data.firstName,
          lastName: data.lastName,
          username: data.username,
          email: data.email,
          phoneNumber: data.phoneNumber,
          password: data.password,
          roleCode: 'CUSTOMER',
          country: data.country,
          preferredCurrencyCode,
      });
    },
    onSuccess: (response, variables) => {
      // Check if email verification is required
      if (response.requiresEmailVerification) {
        toast({
          title: "Account created!", 
          description: "Please verify your email to continue." 
        });
        // Redirect to email verification page
        setTimeout(() => {
          const returnUrl = new URLSearchParams(window.location.search).get('returnUrl');
          navigate('/verify-email', { 
            state: { 
              email: variables.email,
              returnUrl: returnUrl ? decodeURIComponent(returnUrl) : '/'
            }
          });
        }, 500);
      } else {
        // Email verification not required (unlikely but handle it)
        toast({
          title: "Account created successfully!", 
          description: "Welcome to goGerami! You are now logged in." 
        });
        setTimeout(() => {
          const returnUrl = new URLSearchParams(window.location.search).get('returnUrl');
          navigate(returnUrl ? decodeURIComponent(returnUrl) : '/');
        }, 1000);
      }
    },
    onError: (error: any) => {
      console.error('Error details:', {
        message: error?.message,
        response: error?.response,
        stack: error?.stack
      });
      // Use generic message for security - don't reveal if email/username exists
      const errorMsg = error?.message?.toLowerCase() || "";
      const isUserExistsError = errorMsg.includes("email") || errorMsg.includes("username") || errorMsg.includes("already");
      toast({
        title: "Sign up failed",
        description: isUserExistsError 
          ? "Account already exists. Please sign in instead."
          : (error?.message || "Unable to create account. Please check your details and try again."),
        variant: "destructive",
        duration: 5000,
      });
    },
  });

  const onSubmit = (data: SignupForm) => {
    signupMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-light-cream via-white to-gray-50 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-5">
          <div className="flex justify-center mb-2">
            <GoGeramiLogo 
              size="md"
              variant="icon"
              className="h-8 w-8 lg:h-12 lg:w-12"
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Create your account</h1>
          <p className="text-gray-600">Join goGerami to start sending meaningful gifts</p>
        </div>

        <Card className="shadow-lg border-0">
          <CardContent className="p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">First name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="First name" className="h-11" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">Last name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Last name" className="h-11" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">Username</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <Input {...field} placeholder="Choose a username" className="pl-10 h-11" autoComplete="off" />
                        </div>
                      </FormControl>
                      <p className="text-xs text-gray-500 mt-1">8-20 characters, start with a letter, letters/numbers/underscores only</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <Input {...field} type="email" placeholder="Enter your email" className="pl-10 h-11" autoComplete="username" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">Phone number</FormLabel>
                      <FormControl>
                        <PhoneInput
                          id="phoneNumber"
                          value={field.value}
                          onChange={(value, _isValid, e164) => {
                            field.onChange(e164 || value);
                          }}
                          defaultCountry="ET"
                          placeholder="911 234 567"
                          error={!!form.formState.errors.phoneNumber}
                        />
                      </FormControl>
                      <p className="text-xs text-gray-500 mt-1">Select your country and enter your phone number</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">Country</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4 z-10" />
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger className="pl-10 h-11">
                              <SelectValue placeholder="Select your country" />
                            </SelectTrigger>
                            <SelectContent className="bg-white">
                              {SUPPORTED_COUNTRIES.map((country) => (
                                <SelectItem key={country.value} value={country.value}>
                                  <span className="flex items-center gap-2">
                                    <span>{country.label}</span>
                                    <span className="text-gray-500">({country.currencyCode})</span>
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </FormControl>
                      <p className="text-xs text-gray-500 mt-1">Your currency will be set based on your country</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <Input
                              {...field}
                              type={showPassword ? "text" : "password"}
                              placeholder="Create a password"
                              className="pl-10 pr-10 h-11"
                              autoComplete="new-password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword((v) => !v)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <p className="text-xs text-gray-500 mt-1">At least 8 characters with uppercase, lowercase, number, and special character</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">Confirm password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <Input
                              {...field}
                              type={showConfirm ? "text" : "password"}
                              placeholder="Confirm your password"
                              className="pl-10 pr-10 h-11"
                              autoComplete="new-password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirm((v) => !v)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Terms and Conditions Checkbox */}
                <FormField
                  control={form.control}
                  name="acceptedTerms"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm font-normal">
                          I agree to the{" "}
                          <button
                            type="button"
                            onClick={() => setShowTermsDialog(true)}
                            className="text-viridian-green hover:text-viridian-green/80 underline font-medium"
                          >
                            Terms and Conditions
                          </button>
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full h-11 bg-viridian-green hover:bg-viridian-green/90 text-white font-medium"
                  disabled={signupMutation.isPending}
                >
                  {signupMutation.isPending ? "Creating account..." : "Create account"}
                </Button>
              </form>
            </Form>

            <OAuth2Buttons 
              disabled={signupMutation.isPending}
              onSuccess={() => {
                toast({
                  title: "Account created successfully!",
                  description: "Welcome to goGerami!",
                });
                navigate('/');
              }}
            />

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">Already have an account?</span>
                </div>
              </div>

              <div className="mt-4 text-center text-sm space-y-2">
                <Link to="/signin" className="block text-viridian-green hover:text-viridian-green/80 font-medium">
                  Sign in
                </Link>
                <div className="text-gray-500">or</div>
                <Link to="/vendor-signup" className="block text-emerald-600 hover:text-emerald-700 font-medium">
                  Sign up as a Vendor
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Terms and Conditions Dialog */}
      <Dialog open={showTermsDialog} onOpenChange={setShowTermsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Terms and Conditions</DialogTitle>
            <DialogDescription>
              Please read our terms and conditions carefully before signing up.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[50vh] pr-4">
            <div className="space-y-4 text-sm text-gray-700">
              <section>
                <h3 className="font-semibold text-gray-900 mb-2">1. Account Registration</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>You must provide accurate and complete information during registration</li>
                  <li>You are responsible for maintaining the confidentiality of your account credentials</li>
                  <li>You must be at least 18 years old to create an account</li>
                  <li>One person may only create one customer account</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-gray-900 mb-2">2. Using Our Platform</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>You agree to use goGerami only for lawful purposes</li>
                  <li>You will not engage in fraudulent transactions or misuse the platform</li>
                  <li>You will treat vendors and other users with respect</li>
                  <li>You will not attempt to manipulate reviews or ratings</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-gray-900 mb-2">3. Orders and Payments</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>All orders are subject to vendor acceptance and availability</li>
                  <li>Prices are displayed in your selected currency and may include applicable taxes</li>
                  <li>Payment must be completed at the time of order unless otherwise specified</li>
                  <li>You agree to pay all fees associated with your purchases</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-gray-900 mb-2">4. Delivery and Gifts</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Delivery times are estimates provided by vendors</li>
                  <li>You are responsible for providing accurate delivery addresses</li>
                  <li>Gift recipients may be contacted regarding their delivery</li>
                  <li>Some items may have restrictions on delivery locations</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-gray-900 mb-2">5. Returns and Refunds</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Return and refund policies vary by vendor</li>
                  <li>You must review the vendor's return policy before purchasing</li>
                  <li>Disputes should first be addressed with the vendor</li>
                  <li>goGerami may mediate disputes when necessary</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-gray-900 mb-2">6. Privacy and Data</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Your personal information is collected and used as described in our Privacy Policy</li>
                  <li>We may send you notifications about orders, promotions, and platform updates</li>
                  <li>You can manage your communication preferences in your account settings</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-gray-900 mb-2">7. Limitation of Liability</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>goGerami is a marketplace connecting buyers and vendors</li>
                  <li>We are not responsible for vendor products or services</li>
                  <li>Our liability is limited to the amount you paid for the transaction in question</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-gray-900 mb-2">8. Changes to Terms</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>We may update these terms from time to time</li>
                  <li>Continued use of the platform constitutes acceptance of updated terms</li>
                  <li>Significant changes will be communicated via email or platform notification</li>
                </ul>
              </section>

              <p className="text-gray-600 mt-4 pt-4 border-t">
                If you have questions about these terms, please contact our support team at{" "}
                <a href="mailto:support@gogerami.com" className="text-viridian-green hover:underline">
                  support@gogerami.com
                </a>
              </p>
            </div>
          </ScrollArea>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowTermsDialog(false)}>
              Close
            </Button>
            <Button 
              className="bg-viridian-green hover:bg-viridian-green/90"
              onClick={() => {
                form.setValue("acceptedTerms", true);
                setShowTermsDialog(false);
              }}
            >
              I Accept
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}