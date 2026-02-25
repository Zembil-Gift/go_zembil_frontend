import { useAuth } from "@/hooks/useAuth";
import { Navigate, useLocation } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectPath?: string;
}

export default function ProtectedRoute({ children, redirectPath = "/signin" }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-ethiopian-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to signin
  if (!isAuthenticated) {
    // Store the current path for redirect after login
    const currentPath = location.pathname + location.search;
    localStorage.setItem('returnTo', currentPath);
    return <Navigate to={redirectPath} replace />;
  }

  // If authenticated, render the protected content
  return <>{children}</>;
}