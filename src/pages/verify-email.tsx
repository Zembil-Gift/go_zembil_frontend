import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import GoGeramiLogo from "@/components/GoGeramiLogo";
import { apiService } from "@/services/apiService";
import { tokenManager } from "@/services/tokenManager";
import { Mail, RefreshCw, CheckCircle2, Shield } from "lucide-react";
import { motion } from "framer-motion";

z.object({
  otp: z.string().length(6, "Please enter the 6-digit code"),
});
interface VerifyOtpResponse {
  accessToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    phoneNumber: string;
    firstName: string;
    lastName: string;
    role: string;
    profileImageUrl?: string;
    emailVerified: boolean;
  };
}

interface OtpResponse {
  success: boolean;
  message: string;
  email?: string;
  expiresInSeconds?: number;
}

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Get email from URL params or location state
  const email = searchParams.get('email') || (location.state as any)?.email || '';
  const returnUrl = searchParams.get('returnUrl') || '/';
  
  const [otpValues, setOtpValues] = useState<string[]>(Array(6).fill(''));
  const [countdown, setCountdown] = useState(0);
  const [isVerified, setIsVerified] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Redirect if no email provided
  useEffect(() => {
    if (!email) {
      toast({
        title: "Error",
        description: "Email address is required for verification",
        variant: "destructive",
      });
      navigate('/signup');
    }
  }, [email, navigate, toast]);

  // Check for existing OTP status on mount
  useEffect(() => {
    const checkOtpStatus = async () => {
      try {
        const response = await apiService.getRequest<{ remainingSeconds: number }>(
          `/auth/email-verification/otp-status?email=${encodeURIComponent(email)}`
        );
        if (response.remainingSeconds > 0) {
          setCountdown(response.remainingSeconds);
        }
      } catch (error) {
        // Ignore - just means no active OTP
      }
    };
    
    if (email) {
      checkOtpStatus();
    }
  }, [email]);

  // Verify OTP mutation
  const verifyMutation = useMutation({
    mutationFn: async (otpCode: string): Promise<VerifyOtpResponse> => {
      return await apiService.postRequest<VerifyOtpResponse>('/auth/email-verification/verify-otp', {
        email,
        otpCode,
      });
    },
    onSuccess: (response) => {
      setIsVerified(true);
      
      // Store tokens
      if (response.accessToken) {
        const normalizedUser = {
          ...response.user,
          id: response.user.id,
        };
        tokenManager.setTokenData(response.accessToken, response.expiresIn, normalizedUser);
      }
      
      toast({
        title: "Email Verified! 🎉",
        description: "Welcome to goGerami! Your account is now active.",
      });
      
      // Redirect after a short delay to show success animation
      setTimeout(() => {
        const userRole = response.user?.role?.toUpperCase();
        if (userRole === 'ADMIN') {
          navigate('/admin');
        } else if (userRole === 'VENDOR') {
          toast({
            title: "Email Verified Successfully!",
            description: "Your vendor account is pending admin approval. You'll be notified once approved.",
          });
          navigate('/vendor');
        } else {
          navigate(returnUrl || '/');
        }
      }, 2000);
    },
    onError: (error: any) => {
      const message = error?.message || "Invalid verification code. Please try again.";
      toast({
        title: "Verification Failed",
        description: message,
        variant: "destructive",
      });
      
      // Clear OTP inputs on error
      setOtpValues(Array(6).fill(''));
      inputRefs.current[0]?.focus();
    },
  });

  // Resend OTP mutation
  const resendMutation = useMutation({
    mutationFn: async (): Promise<OtpResponse> => {
      console.log('Resending OTP for email:', email);
      return await apiService.postRequest<OtpResponse>('/auth/email-verification/resend-otp', {
        email,
      });
    },
    onSuccess: (response) => {
      console.log('Resend success:', response);
      setCountdown(response.expiresInSeconds || 300);
      toast({
        title: "Code Sent!",
        description: `A new verification code has been sent to ${response.email || email}`,
      });
      
      // Clear OTP inputs
      setOtpValues(Array(6).fill(''));
      inputRefs.current[0]?.focus();
    },
    onError: (error: any) => {
      console.error('Resend error:', error);
      const message = error?.message || "Failed to resend code. Please try again.";
      
      // If error mentions waiting time, extract it and set countdown
      const waitMatch = message.match(/wait (\d+) seconds/);
      if (waitMatch) {
        setCountdown(parseInt(waitMatch[1]));
      }
      
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });

  // Handle OTP input change
  const handleOtpChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;
    
    const newValues = [...otpValues];
    newValues[index] = value;
    setOtpValues(newValues);
    
    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    
    // Auto-submit when all fields are filled
    if (newValues.every(v => v) && newValues.length === 6) {
      const otpCode = newValues.join('');
      verifyMutation.mutate(otpCode);
    }
  };

  // Handle paste
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    
    if (pastedData.length === 6) {
      const newValues = pastedData.split('');
      setOtpValues(newValues);
      inputRefs.current[5]?.focus();
      
      // Auto-submit
      verifyMutation.mutate(pastedData);
    }
  };

  // Handle backspace
  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = () => {
    console.log('handleResend called, countdown:', countdown, 'isPending:', resendMutation.isPending);
    if (countdown > 0) {
      console.log('Resend blocked by countdown');
      return;
    }
    if (resendMutation.isPending) {
      console.log('Resend already in progress');
      return;
    }
    console.log('Calling resendMutation.mutate()');
    resendMutation.mutate();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isVerified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-light-cream via-white to-gray-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </motion.div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Email Verified!</h1>
          <p className="text-gray-600">Redirecting you to your dashboard...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-light-cream via-white to-gray-50 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <GoGeramiLogo 
              size="md"
              variant="icon"
              className="h-10 w-10 lg:h-14 lg:w-14"
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Email</h1>
          <p className="text-gray-600">
            We've sent a verification code to
          </p>
          <p className="text-viridian-green font-medium mt-1">
            {email}
          </p>
        </div>

        <Card className="shadow-lg border-0">
          <CardContent className="p-6">
            {/* Security Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-viridian-green/10 rounded-full flex items-center justify-center">
                <Shield className="w-8 h-8 text-viridian-green" />
              </div>
            </div>

            {/* OTP Input Fields */}
            <div className="flex justify-center gap-2 mb-6" onPaste={handlePaste}>
              {otpValues.map((value, index) => (
                <Input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={value}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-14 text-center text-xl font-bold border-2 focus:border-viridian-green focus:ring-viridian-green"
                  disabled={verifyMutation.isPending}
                />
              ))}
            </div>

            {/* Timer and Resend */}
            <div className="text-center mb-6">
              {countdown > 0 ? (
                <p className="text-sm text-gray-500">
                  Code expires in <span className="font-medium text-viridian-green">{formatTime(countdown)}</span>
                </p>
              ) : (
                <p className="text-sm text-gray-500">
                  Code expired
                </p>
              )}
            </div>

            {/* Verify Button */}
            <Button
              onClick={() => verifyMutation.mutate(otpValues.join(''))}
              disabled={otpValues.some(v => !v) || verifyMutation.isPending}
              className="w-full h-12 bg-viridian-green hover:bg-viridian-green/90 text-white font-medium mb-4"
            >
              {verifyMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify Email"
              )}
            </Button>

            {/* Resend Button */}
            <Button
              variant="outline"
              onClick={handleResend}
              disabled={countdown > 0 || resendMutation.isPending}
              className="w-full h-11 border-gray-300"
            >
              {resendMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : countdown > 0 ? (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Resend in {formatTime(countdown)}
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Resend Code
                </>
              )}
            </Button>

            {/* Help Text */}
            <p className="text-center text-xs text-gray-500 mt-6">
              Didn't receive the email? Check your spam folder or resend.{" "}
              {/* <button 
                onClick={handleResend}
                disabled={countdown > 0 || resendMutation.isPending}
                className="text-viridian-green hover:underline disabled:opacity-50"
              >
                request a new code
              </button> */}
            </p>
          </CardContent>
        </Card>

        {/* Help text */}
        <div className="text-center mt-6 text-sm text-gray-500">
          <p>Need help? Contact support at info@afrodebab.com</p>
        </div>
      </div>
    </div>
  );
}
