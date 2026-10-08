import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";

// ponytail: no auth gate here. Waiting on isLoading meant every first-time /
// incognito visitor stared at a spinner for a whole /auth/refresh round trip
// before the landing skeletons could paint. The landing page is public, so it
// renders immediately; the admin redirect just fires once auth resolves.
export default function HomeRoute() {
  const { isAuthenticated, user } = useAuth();

  const role = user?.role?.toUpperCase();
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";

  if (isAuthenticated && isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return <Landing />;
}
