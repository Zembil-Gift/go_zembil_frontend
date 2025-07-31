import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Gift, Mail, Lock, Facebook } from "lucide-react";
import GoZembilLogo from "@/components/GoZembilLogo";
import GiftingHeartAnimation from "@/components/animations/GiftingHeartAnimation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { MockApiService } from "@/services/mockApiService";

const signinSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type SigninForm = z.infer<typeof signinSchema>;

export default function SignIn() {
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Show a message if user was redirected from a protected route
  useEffect(() => {
    const returnTo = localStorage.getItem('returnTo');
    if (returnTo && returnTo !== '/') {
      toast({
        title: "Sign in required",
        description: `Please sign in to access ${returnTo}`,
        variant: "default",
      });
    }
  }, [toast]);

  const form = useForm<SigninForm>({
    resolver: zodResolver(signinSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const signinMutation = useMutation({
    mutationFn: async (data: SigninForm) => {
      // Use mock authentication
      const result = await MockApiService.login();
      return result;
    },
    onSuccess: () => {
      toast({
        title: "Sign in successful",
        description: "Welcome to goZembil!",
        variant: "default",
      });
      
      // Navigate to return URL or home
      const returnTo = localStorage.getItem('returnTo') || '/';
      localStorage.removeItem('returnTo');
      navigate(returnTo);
    },
    onError: (error: any) => {
      toast({
        title: "Sign in failed",
        description: error.message || "Please check your credentials and try again",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SigninForm) => {
    signinMutation.mutate(data);
  };

  const handleDemoLogin = () => {
    // Quick demo login without form validation
    signinMutation.mutate({
      email: "demo@example.com",
      password: "demo123"
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-light-cream via-white to-gray-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Animation */}
      <div className="absolute inset-0 flex items-center justify-center opacity-10">
        <GiftingHeartAnimation size="large" showText={false} />
      </div>
      
      <div className="w-full max-w-md relative z-10">
        {/* Header - Further reduced spacing */}
        <div className="text-center mb-5">
          <Link to="/" className="inline-flex items-center mb-2">
            <GoZembilLogo size="lg" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h1>
          <p className="text-gray-600">Sign in to your goZembil account</p>
        </div>

        <Card className="shadow-lg border-0">
          <CardContent className="p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">Email</FormLabel>
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
                      <FormLabel className="text-sm font-medium text-gray-700">Password</FormLabel>
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
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full h-11 bg-ethiopian-gold hover:bg-ethiopian-gold/90 text-white font-medium"
                  disabled={signinMutation.isPending}
                >
                  {signinMutation.isPending ? "Signing in..." : "Sign in"}
                </Button>

                {/* Demo Login Button */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11"
                  onClick={handleDemoLogin}
                  disabled={signinMutation.isPending}
                >
                  Demo Login (Skip Form)
                </Button>
              </form>
            </Form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">Or continue with</span>
                </div>
              </div>

              <div className="mt-4">
                <Button variant="outline" className="w-full h-11" disabled>
                  <Facebook className="mr-2 h-4 w-4" />
                  Continue with Facebook
                </Button>
              </div>
            </div>

            <div className="mt-6 text-center text-sm">
              <span className="text-gray-600">Don't have an account? </span>
              <Link to="/signup" className="text-ethiopian-gold hover:text-ethiopian-gold/80 font-medium">
                Sign up
              </Link>
            </div>

            <div className="mt-4 text-center">
              <Link to="/forgot-password" className="text-sm text-gray-500 hover:text-gray-700">
                Forgot your password?
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}