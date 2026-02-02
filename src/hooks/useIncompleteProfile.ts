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
  
  // Check for OAuth2 users (they likely won't have passwords set initially)
  // We use hasPassword property from backend if available, or fall back to previous logic
  const hasPassword = user.hasPassword !== undefined ? user.hasPassword : false;
  const isOAuth2User = !hasPassword && (user.profileImageUrl?.includes('googleusercontent.com') || user.profileImageUrl?.includes('facebook.com'));
  
  // Check for missing critical fields - ensure we're checking against actual empty values
  if (!user.username || user.username.trim() === '') missingFields.push('username');
  if (!user.phoneNumber || user.phoneNumber.trim() === '') missingFields.push('phoneNumber');
  // birthDate is optional - removed from incomplete profile check
  if (!hasPassword) missingFields.push('password');

  return {
    isIncomplete: missingFields.length > 0,
    missingFields,
    isOAuth2User,
  };
}
