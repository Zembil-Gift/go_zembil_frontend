import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import GoGeramiLogo from "@/components/GoGeramiLogo";
import authService from "@/services/authService";
import { useTranslation } from "react-i18next";
import { passwordValidation } from "@/lib/passwordSchema";

const resetPasswordSchema = z.object({
  newPassword: passwordValidation,
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = searchParams.get("token");

  const form = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: ResetPasswordForm) => {
    if (!token) {
      setErrorMessage("Invalid reset link. Please request a new password reset.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await authService.resetPassword(token, data.newPassword, data.confirmPassword);
      setIsSuccess(true);
      toast({
        title: t("Password reset successful"),
        description: t("You can now sign in with your new password."),
      });
    } catch (error: any) {
      const message = error?.response?.data?.error ||
        error?.response?.data?.message ||
        "Something went wrong. Please try again.";
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  // No token provided in URL
  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full">
          <div className="flex justify-center mb-8">
            <Link to="/">
              <GoGeramiLogo size="md" />
            </Link>
          </div>

          <Card className="shadow-xl border-0">
            <CardContent className="pt-8 pb-8">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                  <AlertCircle size={28} className="text-red-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">{t("Invalid Reset Link")}</h2>
                <p className="text-gray-600 text-sm">
                  {t("This password reset link is invalid or has already been used. Please request a new one.")}
                </p>
                <div className="flex flex-col gap-3 pt-2">
                  <Link to="/forgot-password">
                    <Button className="w-full bg-primary-blue hover:bg-primary-blue/90 text-white">
                      {t("Request New Reset Link")}
                    </Button>
                  </Link>
                  <Link to="/signin">
                    <Button variant="outline" className="w-full">
                      <ArrowLeft size={16} className="mr-2" />
                      {t("Back to Sign In")}
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link to="/">
            <GoGeramiLogo size="md" />
          </Link>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-4">
            <div className="w-16 h-16 bg-primary-blue/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock size={28} className="text-primary-blue" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              {t("Set New Password")}
            </CardTitle>
            <p className="text-gray-600 mt-2 text-sm">
              {t("Enter your new password below.")}
            </p>
          </CardHeader>

          <CardContent>
            {isSuccess ? (
              <div className="space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                  <CheckCircle2 className="text-green-600 mt-0.5 flex-shrink-0" size={20} />
                  <div>
                    <p className="text-sm font-medium text-green-800">{t("Password reset successful!")}</p>
                    <p className="text-sm text-green-700 mt-1">
                      {t("Your password has been updated. You can now sign in with your new password.")}
                    </p>
                  </div>
                </div>

                <Button
                  className="w-full bg-primary-blue hover:bg-primary-blue/90 text-white"
                  onClick={() => navigate("/signin")}
                >
                  {t("Go to Sign In")}
                </Button>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  {errorMessage && (
                    <Alert variant="destructive">
                      <AlertDescription>{errorMessage}</AlertDescription>
                    </Alert>
                  )}

                  <FormField
                    control={form.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("New Password")}</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder={t("Enter new password")}
                              className="pl-10 pr-10"
                              disabled={isLoading}
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("Confirm Password")}</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <Input
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder={t("Confirm new password")}
                              className="pl-10 pr-10"
                              disabled={isLoading}
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Password requirements hint */}
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>{t("Password must contain:")}</p>
                    <ul className="list-disc list-inside space-y-0.5 ml-1">
                      <li>{t("At least 8 characters")}</li>
                      <li>{t("One uppercase letter (A–Z)")}</li>
                      <li>{t("One lowercase letter (a–z)")}</li>
                      <li>{t("One number (0–9)")}</li>
                      <li>{t("One special character (@$!%*?&# etc.)")}</li>
                    </ul>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-primary-blue hover:bg-primary-blue/90 text-white"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("Resetting...")}
                      </>
                    ) : (
                      "Reset Password"
                    )}
                  </Button>

                  <div className="text-center">
                    <Link
                      to="/signin"
                      className="text-sm text-gray-600 hover:text-primary-blue transition-colors inline-flex items-center gap-1"
                    >
                      <ArrowLeft size={14} />
                      {t("Back to Sign In")}
                    </Link>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
