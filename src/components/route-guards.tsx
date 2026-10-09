import React from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

// Moved verbatim from the old components/Router.tsx. The route modules in
// src/routes/ wrap these around <Outlet />, so every guarded page behaves
// exactly as it did when each <Route element> wrapped it individually. They
// also own what used to be useNoindex() here: a `noindex` meta export.

export function RouteLoading({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-eagle-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  );
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-ethiopian-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">{t("Checking authentication...")}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const currentPath = location.pathname + location.search;
    localStorage.setItem("returnTo", currentPath);
    return <Navigate to="/signin" replace />;
  }

  return <>{children}</>;
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const userRole = user?.role?.toUpperCase();
  const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";

  React.useEffect(() => {
    if (!isLoading && isAuthenticated && !isAdmin) {
      toast({
        title: t("Access Denied"),
        description: t("You need administrator privileges to access this page."),
        variant: "destructive",
      });
      navigate("/", { replace: true });
    }
  }, [isLoading, isAuthenticated, isAdmin, toast, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-eagle-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">{t("Verifying admin access...")}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const currentPath = location.pathname + location.search;
    localStorage.setItem("returnTo", currentPath);
    return <Navigate to="/signin" replace />;
  }

  if (!isAdmin) {
  }

  return <>{children}</>;
}

export function VendorRoute({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const userRole = user?.role?.toUpperCase();
  const isVendor = userRole === "VENDOR";

  React.useEffect(() => {
    if (!isLoading && isAuthenticated && !isVendor) {
      toast({
        title: t("Access Denied"),
        description: t("You need vendor privileges to access this page."),
        variant: "destructive",
      });
      navigate("/", { replace: true });
    }
  }, [isLoading, isAuthenticated, isVendor, toast, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-viridian-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">{t("Verifying vendor access...")}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const currentPath = location.pathname + location.search;
    localStorage.setItem("returnTo", currentPath);
    return <Navigate to="/signin" replace />;
  }

  if (!isVendor) {
    return null;
  }

  return <>{children}</>;
}

export function DeliveryRoute({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const userRole = user?.role?.toUpperCase();
  const isDeliveryPerson = userRole === "DELIVERY_PERSON";

  React.useEffect(() => {
    if (!isLoading && isAuthenticated && !isDeliveryPerson) {
      toast({
        title: t("Access Denied"),
        description: t("You need delivery person privileges to access this page."),
        variant: "destructive",
      });
      navigate("/", { replace: true });
    }
  }, [isLoading, isAuthenticated, isDeliveryPerson, toast, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-ethiopian-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">{t("Verifying delivery access...")}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const currentPath = location.pathname + location.search;
    localStorage.setItem("returnTo", currentPath);
    return <Navigate to="/signin" replace />;
  }

  if (!isDeliveryPerson) {
    return null;
  }

  return <>{children}</>;
}
