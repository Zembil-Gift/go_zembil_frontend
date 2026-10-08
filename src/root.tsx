import React, { useEffect } from "react";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  isRouteErrorResponse,
  useRouteError,
  type LinksFunction,
} from "react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import ScrollToTop from "@/components/ScrollToTop";
import AnalyticsPageviewTracker from "@/components/AnalyticsPageviewTracker";
import PwaUpdatePrompt from "@/components/PwaUpdatePrompt";
import { RouteLoading } from "@/components/route-guards";
import { queryClient } from "@/lib/queryClient";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { useGuestCurrencyStore } from "@/stores/currency-store";
import { initAnalytics, identifyUser, clearUserIdentity } from "@/lib/analytics";
import stylesheet from "./index.css?url";
import "./i18n";

// Root of the app: what index.html, main.tsx, App.tsx and the providers/global
// listeners of the old components/Router.tsx used to be, in one route module.

// Guest currency detection runs before the first render so the very first API
// call already carries X-Currency -- an effect would be too late, since child
// effects (the first queries) run before a parent's. Browser-only: this module
// is also evaluated at build time to render the HTML shell.
if (typeof window !== "undefined") {
  useGuestCurrencyStore.getState().detectCurrency();
  initAnalytics();
}

export const links: LinksFunction = () => [
  { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
  { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
  { rel: "manifest", href: "/manifest.json" },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  // The Google Identity script is appended from a React effect, so its DNS +
  // TLS handshake only starts after the bundle parses. This pulls it forward.
  { rel: "preconnect", href: "https://accounts.google.com", crossOrigin: "anonymous" },
  // The Gotham stylesheet had no preconnect, so it paid a full DNS + TLS
  // handshake on the critical path while the Google faces reused theirs.
  { rel: "preconnect", href: "https://fonts.cdnfonts.com", crossOrigin: "anonymous" },
  { rel: "stylesheet", href: "https://fonts.cdnfonts.com/css/gotham" },
  // DM Sans: only the 300..800 weights the app uses, no opsz axis; the italic
  // axis stays (`italic` is used in ~20 places).
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300..800;1,300..800&family=Playfair+Display:wght@400;500;600;700&family=Nunito:wght@300;400;500;600;700&display=swap",
  },
  { rel: "stylesheet", href: stylesheet },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    // i18n sets <html lang> from the visitor's language before hydration.
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1" />
        <meta name="theme-color" content="#FDCB2D" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="goGerami" />
        <title>goGerami - Ethiopian Gift Delivery Platform</title>
        <meta
          name="description"
          content="goGerami connects hearts across distances through meaningful Ethiopian gifts. Send authentic cultural items, custom products, and heartfelt surprises to your loved ones in Ethiopia."
        />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

// Syncs the GA4 user identity with the authenticated user so events can be
// segmented by role/currency/country. Must live inside AuthProvider.
function AnalyticsIdentity() {
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      identifyUser({
        id: user.id,
        role: user.role,
        preferredCurrencyCode: user.preferredCurrencyCode,
        country: user.country,
      });
    } else {
      clearUserIdentity();
    }
  }, [isAuthenticated, user]);

  return null;
}

function RoleBasedPrefetch() {
  const { isAuthenticated, isLoading, user } = useAuth();

  // ponytail: the shop routes are their own chunks, so they stay off the
  // homepage's first paint, then get pulled in while the browser is idle. By
  // the time anyone clicks through, the chunk is already cached.
  // requestIdleCallback is missing on Safari, hence the timeout.
  useEffect(() => {
    const prefetch = () => {
      void import("@/pages/shop");
      void import("@/pages/gifts");
      void import("@/pages/product-detail");
      void import("@/pages/cart");
    };

    const idle = window.requestIdleCallback;
    if (idle) {
      const handle = idle(prefetch, { timeout: 3000 });
      return () => window.cancelIdleCallback?.(handle);
    }

    const handle = window.setTimeout(prefetch, 1500);
    return () => window.clearTimeout(handle);
  }, []);

  useEffect(() => {
    if (isLoading || !isAuthenticated) {
      return;
    }

    const role = user?.role?.toUpperCase();

    if (role === "ADMIN" || role === "SUPER_ADMIN") {
      void Promise.all([
        import("@/pages/admin/AdminDashboard"),
        import("@/pages/admin/AdminUsers"),
      ]);
      return;
    }

    if (role === "VENDOR") {
      void Promise.all([
        import("@/pages/vendor/VendorDashboardLayout"),
        import("@/pages/vendor/VendorOverview"),
      ]);
      return;
    }

    if (role === "DELIVERY_PERSON") {
      void Promise.all([
        import("@/pages/delivery/DeliveryLayout"),
        import("@/pages/delivery/DeliveryDashboard"),
      ]);
    }
  }, [isAuthenticated, isLoading, user?.role]);

  return null;
}

export default function App() {
  return (
    <LanguageProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AnalyticsIdentity />
          <TooltipProvider>
            <ScrollToTop />
            <AnalyticsPageviewTracker />
            <RoleBasedPrefetch />
            <Outlet />
            <Toaster />
            <PwaUpdatePrompt />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </LanguageProvider>
  );
}

// What the HTML shell shows until the bundle has loaded and hydrated.
export function HydrateFallback() {
  return <RouteLoading message="Loading page..." />;
}

export function ErrorBoundary() {
  const { t } = useTranslation();
  const error = useRouteError();
  const status = isRouteErrorResponse(error) ? error.status : 500;
  if (!isRouteErrorResponse(error)) console.error(error);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-lg w-full bg-white border border-gray-200 rounded-xl shadow-sm p-8 text-center">
        <h1 className="text-2xl font-bold text-eagle-green mb-3">
          {status === 404 ? t("Page Not Found") : t("Something Went Wrong")}
        </h1>
        <p className="text-gray-600 mb-6">
          {status === 404
            ? t("The page you're looking for doesn't exist.")
            : t("Please try again later.")}
        </p>
        <a
          href="/"
          className="inline-flex h-10 items-center justify-center rounded-md bg-eagle-green px-4 text-sm font-medium text-white hover:bg-viridian-green"
        >
          {t("Go Home")}
        </a>
      </div>
    </div>
  );
}
