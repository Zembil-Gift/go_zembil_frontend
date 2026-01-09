import {useState} from "react";
import {Link, useNavigate} from "react-router-dom";
import {z} from "zod";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {useMutation, useQuery} from "@tanstack/react-query";
import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import {Input} from "@/components/ui/input";
import {Separator} from "@/components/ui/separator";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {useToast} from "@/hooks/use-toast";
import authService from "@/services/authService";
import {apiService} from "@/services/apiService";
import {Coins, Eye, EyeOff, Lock, Mail, Phone, User} from "lucide-react";
import GoGeramiLogo from "@/components/GoGeramiLogo";

interface Currency {
  id: number;
  code: string;
  name: string;
  symbol: string;
  isActive: boolean;
  isDefault: boolean;
}

const phoneRegex = /^\+?[1-9]\d{6,14}$/;
const phoneValidation = z
  .string()
  .min(7, "Phone number must be at least 7 digits")
  .max(15, "Phone number must not exceed 15 digits")
  .regex(phoneRegex, "Please enter a valid phone number with country code (e.g., +251911234567)");

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
    preferredCurrencyCode: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords must match",
  });

type SignupForm = z.infer<typeof signupSchema>;

export default function SignUp() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Fetch available currencies
  const { data: currencies = [], isLoading: currenciesLoading } = useQuery({
    queryKey: ['currencies'],
    queryFn: async () => {
      const response = await apiService.getRequest<Currency[]>('/api/currencies');
      return response;
    },
  });

  // Find default currency
  const defaultCurrency = currencies.find(c => c.isDefault)?.code || 'USD';

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
      preferredCurrencyCode: "",
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (data: SignupForm) => {
        return await authService.register({
          firstName: data.firstName,
          lastName: data.lastName,
          username: data.username,
          email: data.email,
          phoneNumber: data.phoneNumber,
          password: data.password,
          role: 'CUSTOMER',
          preferredCurrencyCode: data.preferredCurrencyCode || defaultCurrency,
      });
    },
    onSuccess: () => {
      toast({
        title: "Account created successfully!", 
        description: "Welcome to goGerami! You can now sign in with your credentials." 
      });
      setTimeout(() => {
        console.log('Navigating to signin...');
        navigate('/signin');
      }, 1500);
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
                          <Input {...field} placeholder="Choose a username" className="pl-10 h-11" />
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
                          <Input {...field} type="email" placeholder="Enter your email" className="pl-10 h-11" />
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
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <Input {...field} type="tel" placeholder="(eg. +251911234567)" className="pl-10 h-11" maxLength={15} />
                        </div>
                      </FormControl>
                      <p className="text-xs text-gray-500 mt-1">Include country code (e.g., +251, +1, +44). 7-15 digits.</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="preferredCurrencyCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">Preferred Currency</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Coins className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4 z-10" />
                          <Select
                            value={field.value || defaultCurrency}
                            onValueChange={field.onChange}
                            disabled={currenciesLoading}
                          >
                            <SelectTrigger className="pl-10 h-11">
                              <SelectValue placeholder={currenciesLoading ? "Loading currencies..." : "Select currency"} />
                            </SelectTrigger>
                            <SelectContent className="bg-white">
                              {currencies.map((currency) => (
                                <SelectItem key={currency.code} value={currency.code}>
                                  <span className="flex items-center gap-2">
                                    <span className="font-medium">{currency.symbol}</span>
                                    <span>{currency.code}</span>
                                    <span className="text-gray-500">- {currency.name}</span>
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </FormControl>
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

                <Button
                  type="submit"
                  className="w-full h-11 bg-viridian-green hover:bg-viridian-green/90 text-white font-medium"
                  disabled={signupMutation.isPending}
                >
                  {signupMutation.isPending ? "Creating account..." : "Create account"}
                </Button>
              </form>
            </Form>

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
    </div>
  );
}