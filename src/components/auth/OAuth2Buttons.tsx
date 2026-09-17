import { Separator } from "@/components/ui/separator";
import { useOAuth2Login } from "@/hooks/useOAuth2Login";
import { useOAuth2SDK } from "@/hooks/useOAuth2SDK";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useRef, useEffect, useState } from "react";
import authService from "@/services/authService";
import { useTranslation } from "react-i18next";

interface OAuth2ButtonsProps {
  onSuccess?: () => void;
  disabled?: boolean;
}

const NON_ADMIN_LOGIN_ROLES = new Set(['CUSTOMER', 'VENDOR', 'DELIVERY_PERSON']);

// Apple resolves signIn() with these when the user backs out. Not errors, so stay quiet.
const APPLE_CANCEL_CODES = new Set([
  'popup_closed_by_user',
  'user_cancelled_authorize',
  'user_trigger_new_signin_flow',
]);

export function OAuth2Buttons({ onSuccess, disabled }: OAuth2ButtonsProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const {  data } = useOAuth2Login();
  const { isGoogleReady, hasGoogleConfig, isAppleReady, hasAppleConfig } = useOAuth2SDK();
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);

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
                title: t("Sign in successful"),
                description: t("Welcome to goGerami!"),
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
            logo_alignment: 'center',
          }
        );
      } catch (error) {
        console.error('Error rendering Google button:', error);
      }
    }
  }, [isGoogleReady, hasGoogleConfig, onSuccess, toast]);

  useEffect(() => {
    // Apple requires init() before signIn(). redirectURI must be registered as a
    // Return URL on the Services ID even though usePopup skips the redirect.
    if (!isAppleReady || !hasAppleConfig || !window.AppleID) return;

    const clientId = import.meta.env.VITE_APPLE_CLIENT_ID;
    if (!clientId) return;

    try {
      window.AppleID.auth.init({
        clientId,
        scope: 'name email',
        redirectURI: window.location.origin,
        usePopup: true,
      });
    } catch (error) {
      console.error('Error initializing Apple sign in:', error);
    }
  }, [isAppleReady, hasAppleConfig]);

  const handleAppleSignIn = async () => {
    if (!window.AppleID) {
      toast({
        title: t("Apple sign in unavailable"),
        description: t("Could not load Apple sign in. Please check your connection and try again."),
        variant: "destructive",
      });
      return;
    }

    setIsAppleLoading(true);
    try {
      const response = await window.AppleID.auth.signIn();

      // Apple returns the name only on the very first authorization and never inside
      // the identity token, so forward it now or it is lost for good.
      const name = response.user?.name;
      const result = await authService.loginWithOAuth2(
        response.authorization.id_token,
        'APPLE',
        name ? { firstName: name.firstName, lastName: name.lastName } : undefined
      );

      toast({
        title: t("Sign in successful"),
        description: t("Welcome to goGerami!"),
      });

      if (onSuccess) {
        onSuccess();
      } else {
        handlePostLoginNavigation(result);
      }
    } catch (error: any) {
      // Apple rejects with { error: 'popup_closed_by_user' } on cancel — not a failure.
      if (APPLE_CANCEL_CODES.has(error?.error)) {
        return;
      }

      console.error('Apple login error:', error);

      const errorMessage =
        error?.message || "Failed to sign in with Apple. Please try again.";
      const isDeactivated = errorMessage.toLowerCase().includes('deactivated');

      toast({
        title: isDeactivated ? "Account Deactivated" : "Apple sign in failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsAppleLoading(false);
    }
  };

  const handlePostLoginNavigation = (loginData?: any) => {
    const userData = loginData?.user || data?.user;
    if (userData) {
      const userRole = userData.role?.toUpperCase();
      console.log('OAuth2 post-login navigation - User role:', userRole, 'Full user data:', userData);
      localStorage.removeItem("returnTo");

      if (userRole === 'VENDOR') {
        console.log('Navigating to vendor dashboard');
        navigate('/vendor');
      } else if (!NON_ADMIN_LOGIN_ROLES.has(userRole ?? '')) {
        console.log('Navigating to admin dashboard for non-customer/vendor/delivery role');
        navigate('/admin');
      } else {
        const returnUrl = localStorage.getItem('returnTo') || '/';
        console.log('Navigating to return URL:', returnUrl);
        navigate(returnUrl);
      }
    } else {
      console.log('No user data available, navigating to home');
      navigate('/');
    }
  };

  // Don't render if no provider is configured
  if (!hasGoogleConfig && !hasAppleConfig) {
    return null;
  }

  return (
    <div className="mt-6">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <Separator className="w-full" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-gray-500">{t("Or continue with")}</span>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {hasGoogleConfig && (
          // Google has no programmatic signIn() for the ID-token flow, so the real
          // button has to come from renderButton() after the SDK lands. Our own copy
          // paints at first render like Apple's; Google's is laid over it at opacity 0
          // so the click target is always theirs and nothing visibly swaps.
          <div
            className="relative w-full"
            style={{ opacity: isGoogleLoading ? 0.5 : 1, pointerEvents: isGoogleLoading ? 'none' : 'auto' }}
          >
            <div
              aria-hidden="true"
              className={`flex h-[44px] w-full items-center justify-center gap-2 rounded-[4px] border border-[#dadce0] bg-white text-[14px] font-medium text-[#3c4043] ${isGoogleReady ? '' : 'opacity-50'}`}
            >
              <svg className="h-[18px] w-[18px]" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z" />
                <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z" />
                <path fill="#FBBC05" d="M11.69 28.18c-.44-1.32-.69-2.73-.69-4.18s.25-2.86.69-4.18v-5.7H4.34A21.99 21.99 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z" />
                <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z" />
              </svg>
              {t("Continue with Google")}
            </div>
            <div ref={googleButtonRef} className="absolute inset-0 opacity-0" />
          </div>
        )}

        {hasAppleConfig && (
          <button
            type="button"
            onClick={handleAppleSignIn}
            disabled={disabled || isAppleLoading || !isAppleReady}
            aria-label={t("Continue with Apple")}
            className="flex h-[44px] w-full items-center justify-center gap-2 rounded-[4px] bg-black text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg
              className="h-[18px] w-[18px]"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M17.05 12.54c-.02-2.2 1.8-3.26 1.88-3.31-1.02-1.5-2.61-1.7-3.18-1.72-1.35-.14-2.64.79-3.33.79-.69 0-1.75-.77-2.87-.75-1.48.02-2.84.86-3.6 2.18-1.53 2.66-.39 6.6 1.1 8.76.73 1.06 1.6 2.25 2.75 2.2 1.1-.04 1.52-.71 2.85-.71 1.33 0 1.71.71 2.87.69 1.19-.02 1.94-1.08 2.66-2.14.84-1.23 1.19-2.42 1.21-2.48-.03-.01-2.32-.89-2.34-3.51zM14.88 5.9c.61-.74 1.02-1.77.91-2.8-.88.04-1.94.59-2.57 1.32-.56.65-1.05 1.7-.92 2.7.98.08 1.98-.5 2.58-1.22z" />
            </svg>
            {isAppleLoading ? 'Signing in…' : 'Continue with Apple'}
          </button>
        )}
      </div>
    </div>
  );
}

export default OAuth2Buttons;
