import { Separator } from "@/components/ui/separator";
import { useOAuth2Login } from "@/hooks/useOAuth2Login";
import { useOAuth2SDK } from "@/hooks/useOAuth2SDK";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useRef, useEffect, useState } from "react";
import authService from "@/services/authService";

interface OAuth2ButtonsProps {
  onSuccess?: () => void;
  disabled?: boolean;
}

export function OAuth2Buttons({ onSuccess}: OAuth2ButtonsProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const {  data } = useOAuth2Login();
  const { isGoogleReady, hasGoogleConfig } = useOAuth2SDK();
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  useEffect(() => {
    // Render Google button when SDK is ready
    if (isGoogleReady && hasGoogleConfig && googleButtonRef.current && window.google) {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (!clientId) return;

      // Clear previous button if any
      googleButtonRef.current.innerHTML = '';

      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response) => {
            setIsGoogleLoading(true);
            try {
              // Use authService to handle OAuth2 login properly with tokenManager
              const result = await authService.loginWithOAuth2(response.credential, 'GOOGLE');
              
              toast({
                title: "Sign in successful",
                description: "Welcome to goGerami!",
              });
              
              if (onSuccess) {
                onSuccess();
              } else {
                handlePostLoginNavigation(result);
              }
            } catch (error: any) {
              console.error('Google login error:', error);
              
              const errorMessage = error?.message || "Failed to sign in with Google. Please try again.";
              const isDeactivated = errorMessage.toLowerCase().includes('deactivated');
              
              toast({
                title: isDeactivated ? "Account Deactivated" : "Google sign in failed",
                description: errorMessage,
                variant: "destructive",
              });
            } finally {
              setIsGoogleLoading(false);
            }
          },
          use_fedcm_for_prompt: false,
        });

        window.google.accounts.id.renderButton(
          googleButtonRef.current,
          {
            theme: 'outline',
            size: 'large',
            width: googleButtonRef.current.offsetWidth,
            text: 'continue_with',
          }
        );
      } catch (error) {
        console.error('Error rendering Google button:', error);
      }
    }
  }, [isGoogleReady, hasGoogleConfig, onSuccess, toast]);



  const handlePostLoginNavigation = (loginData?: any) => {
    const userData = loginData?.user || data?.user;
    if (userData) {
      const userRole = userData.role?.toUpperCase();
      localStorage.removeItem("returnTo");
      
      if (userRole === 'ADMIN') {
        navigate('/admin');
      } else if (userRole === 'VENDOR') {
        navigate('/vendor');
      } else {
        const returnUrl = localStorage.getItem('returnTo') || '/';
        navigate(returnUrl);
      }
    } else {
      navigate('/');
    }
  };

  // Don't render if Google is not configured
  if (!hasGoogleConfig) {
    return null;
  }

  return (
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
        {hasGoogleConfig && (
          <div 
            ref={googleButtonRef}
            className="w-full"
            style={{ minHeight: '44px', opacity: isGoogleLoading ? 0.5 : 1, pointerEvents: isGoogleLoading ? 'none' : 'auto' }}
          />
        )}
      </div>
    </div>
  );
}

export default OAuth2Buttons;
