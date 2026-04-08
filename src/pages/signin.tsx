import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useLogin } from "../hooks/useLogin";
import GoGeramiLogo from "@/components/GoGeramiLogo";
import OAuth2Buttons from "@/components/auth/OAuth2Buttons";
import authService from "@/services/authService";

const signinSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type SigninForm = z.infer<typeof signinSchema>;

const NON_ADMIN_LOGIN_ROLES = new Set([
  "CUSTOMER",
  "VENDOR",
  "DELIVERY_PERSON",
]);

export default function SignIn() {
  const [showPassword, setShowPassword] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const redirectWithRefresh = (path: string) => {
    window.location.assign(path);
  };

  const finishSigninWithRefresh = (rawRole?: string | null) => {
    const userRole = rawRole?.toUpperCase();
    localStorage.removeItem("returnTo");

    if (userRole === "VENDOR") {
      redirectWithRefresh("/vendor");
      return;
    }

    if (userRole === "DELIVERY_PERSON") {
      redirectWithRefresh("/delivery");
      return;
    }

    if (!NON_ADMIN_LOGIN_ROLES.has(userRole ?? "")) {
      redirectWithRefresh("/admin");
      return;
    }

    redirectWithRefresh(getReturnUrl());
  };

  // Get return URL from query params or localStorage
  const getReturnUrl = (): string => {
    // First check query params (from 401 redirect)
    const returnUrl = searchParams.get("returnUrl");
    if (returnUrl) {
      return decodeURIComponent(returnUrl);
    }
    // Fallback to localStorage (from protected route)
    const returnTo = localStorage.getItem("returnTo");
    if (returnTo && returnTo !== "/") {
      return returnTo;
    }
    return "/";
  };

  // Show a message if user was redirected from a protected route
  useEffect(() => {
    const returnUrl = getReturnUrl();
    if (returnUrl && returnUrl !== "/") {
      toast({
        title: "Sign in required",
        description: "Please sign in to continue",
        variant: "default",
      });
    }
  }, [toast, searchParams]);

  const form = useForm<SigninForm>({
    resolver: zodResolver(signinSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const signinMutation = useLogin();

  const onSubmit = async (data: SigninForm) => {
    console.log("Form submitted with data:", data);

    try {
      console.log("Attempting login...");
      const result = await signinMutation.mutateAsync({
        email: data.email,
        password: data.password,
      });

      console.log("Login successful:", result);

      toast({
        title: "Sign in successful",
        description: "Welcome to goGerami!",
      });

      finishSigninWithRefresh(result.user?.role);
    } catch (err: any) {
      console.error("Login error:", err);

      // Check if error is due to email not verified
      const responseData = err?.response?.data;
      const isEmailNotVerified =
        responseData?.error === "EMAIL_NOT_VERIFIED" ||
        responseData?.details?.requiresVerification === true ||
        err?.message?.toLowerCase().includes("verify your email");

      if (isEmailNotVerified) {
        const email = responseData?.details?.email || data.email;
        setUnverifiedEmail(email);
      } else {
        toast({
          title: "Sign in failed",
          description:
            err?.message || "Invalid email or password. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleVerifyEmail = async () => {
    if (!unverifiedEmail) return;
    setIsSendingOtp(true);
    try {
      await authService.sendVerificationOtp(unverifiedEmail);
      navigate("/verify-email", {
        state: {
          email: unverifiedEmail,
          returnUrl: getReturnUrl(),
        },
      });
    } catch (err: any) {
      toast({
        title: "Failed to send verification code",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSendingOtp(false);
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-light-cream via-white to-gray-50 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="w-full max-w-md relative z-10">
        {/* Header - Further reduced spacing */}
        <div className="text-center mb-5">
          <div className="flex justify-center mb-2">
            <GoGeramiLogo
              size="md"
              variant="icon"
              className="h-8 w-8 lg:h-12 lg:w-12"
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Welcome back
          </h1>
          <p className="text-gray-600">Sign in to your goGerami account</p>
        </div>

        <Card className="shadow-lg border-0">
          <CardContent className="p-6">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">
                        Email
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <Input
                            {...field}
                            type="email"
                            placeholder="Enter your email"
                            className="pl-10 h-11"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">
                        Password
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <Input
                            {...field}
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            className="pl-10 pr-10 h-11"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full h-11 bg-viridian-green hover:bg-viridian-green/90 text-white font-medium"
                  disabled={signinMutation.isPending}
                >
                  {signinMutation.isPending ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            </Form>

            {unverifiedEmail && (
              <Alert className="mt-4 border-amber-300 bg-amber-50">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  <p className="font-medium mb-1">Email not verified</p>
                  <p className="text-sm mb-3">
                    Your account (
                    <span className="font-medium">{unverifiedEmail}</span>)
                    hasn't been verified yet. Click below to receive a
                    verification code.
                  </p>
                  <Button
                    size="sm"
                    onClick={handleVerifyEmail}
                    disabled={isSendingOtp}
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    {isSendingOtp ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                        Sending code...
                      </>
                    ) : (
                      <>
                        <Mail className="w-3 h-3 mr-2" />
                        Send verification code
                      </>
                    )}
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            <OAuth2Buttons
              disabled={signinMutation.isPending}
              onSuccess={() => {
                const userRole = localStorage.getItem("user")
                  ? JSON.parse(
                      localStorage.getItem("user")!
                    ).role?.toUpperCase()
                  : null;
                finishSigninWithRefresh(userRole);
              }}
            />

            <div className="mt-6 text-center text-sm">
              <span className="text-gray-600">Don't have an account? </span>
              <Link
                to="/signup"
                className="text-viridian-green hover:text-viridian-green/80 font-medium"
              >
                Sign up
              </Link>
              <span className="text-gray-600"> or </span>
              <Link
                to="/vendor-signup"
                className="text-emerald-600 hover:text-emerald-700 font-medium"
              >
                Sign up as Vendor
              </Link>
            </div>

            <div className="mt-4 text-center">
              <Link
                to="/forgot-password"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Forgot your password?
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
