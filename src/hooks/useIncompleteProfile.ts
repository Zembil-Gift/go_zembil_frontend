import { useAuth } from "@/hooks/useAuth";

/**
 * Hook to check if user profile is incomplete (missing critical info).
 * Returns true if user is missing username, phone, or password (for OAuth2 users).
 * Note: birthDate is optional and not required for profile completion.
 */
export function useIncompleteProfile() {
  const { user } = useAuth();

  if (!user) return { isIncomplete: false, missingFields: [], isOAuth2User: false };

  const missingFields: string[] = [];
  
  // Check for OAuth2 users (they won't have passwords set)
  const isOAuth2User = !user.password && (user.profileImageUrl?.includes('googleusercontent.com') || user.profileImageUrl?.includes('facebook.com'));
  
  // Check for missing critical fields
  if (!user.username) missingFields.push('username');
  if (!user.phoneNumber) missingFields.push('phoneNumber');
  // birthDate is optional - removed from incomplete profile check
  if (isOAuth2User && !user.password) missingFields.push('password');

  return {
    isIncomplete: missingFields.length > 0,
    missingFields,
    isOAuth2User,
  };
}
