import { useMutation, useQueryClient } from "@tanstack/react-query";
import authService, { OAuth2Provider } from "../services/authService";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            ux_mode?: 'popup' | 'redirect';
            use_fedcm_for_prompt?: boolean;
          }) => void;
          prompt: (momentListener?: (notification: {
            isNotDisplayed: () => boolean;
            isSkippedMoment: () => boolean;
            isDismissedMoment?: () => boolean;
            getNotDisplayedReason?: () => string;
            getSkippedReason?: () => string;
            getDismissedReason?: () => string;
          }) => void) => void;
          renderButton: (
            element: HTMLElement,
            options: {
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              logo_alignment?: 'left' | 'center';
              width?: number;
            }
          ) => void;
        };
      };
    };
  }
}

export function useOAuth2Login() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ accessToken, provider }: { accessToken: string; provider: OAuth2Provider }) => {
      return await authService.loginWithOAuth2(accessToken, provider);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["cart", "items"] });
    },
  });

  const loginWithGoogle = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      
      if (!clientId) {
        reject(new Error('Google Client ID not configured'));
        return;
      }

      if (!window.google) {
        reject(new Error('Google SDK not loaded'));
        return;
      }

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response) => {
          try {
            await mutation.mutateAsync({
              accessToken: response.credential,
              provider: 'GOOGLE',
            });
            resolve();
          } catch (error) {
            reject(error);
          }
        },
        ux_mode: 'popup',
        use_fedcm_for_prompt: false,
      });

      try {
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            reject(new Error('Google One Tap not available, please click the button'));
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  };



  return {
    loginWithGoogle,
    isLoading: mutation.isPending,
    error: mutation.error,
    data: mutation.data,
  };
}
