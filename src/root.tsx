import React, { useEffect, useMemo, useState } from "react";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  isRouteErrorResponse,
  useLoaderData,
  useMatches,
  useRouteError,
  useRouteLoaderData,
  type HeadersFunction,
  type LinksFunction,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";
import {
  HydrationBoundary,
  QueryClient,
  QueryClientProvider,
  type DehydratedState,
} from "@tanstack/react-query";
import { I18nextProvider, useTranslation } from "react-i18next";
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
import { detectGuestCurrency } from "@/lib/detectGuestCurrency";
import {
  AUTH_HINT_COOKIE,
  CURRENCY_COOKIE,
  resolvePrefs,
  writeCookie,
  type Prefs,
} from "@/lib/prefs";
import { noindexMeta, staticMeta } from "@/lib/seo-meta";
import i18n, { loadBundle } from "./i18n";
import stylesheet from "./index.css?url";

// Root of the app: the document shell, providers and global listeners that
// index.html, main.tsx, App.tsx and the old components/Router.tsx used to be.

// Browser-only: this module is also evaluated on the server for every render.
if (typeof window !== "undefined") {
  initAnalytics();
}

const DEFAULT_TITLE = "goGerami - Ethiopian Gift Delivery Platform";
const DEFAULT_DESCRIPTION =
  "goGerami connects hearts across distances through meaningful Ethiopian gifts. Send authentic cultural items, custom products, and heartfelt surprises to your loved ones in Ethiopia.";

/** The visitor's currency, language and auth hint, from cookies and headers. */
export async function loader({ request }: LoaderFunctionArgs): Promise<Prefs> {
  const prefs = resolvePrefs(request);
  // The Amharic bundle is lazy in the browser; the server must have it before
  // it renders, or an Amharic visitor gets English HTML and a hydration flip.
  await loadBundle(prefs.lang);
  return prefs;
}

// What the root loader answers only changes when the browser changes a cookie,
// and then the browser already holds the new value -- refetching it on every
// navigation would just add a server round trip to pages that need none.
export const shouldRevalidate = () => false;

// Errors render in this route's boundary, and React Router drops a thrown
// response's headers unless the boundary route forwards them -- this is what
// gets the 503's Retry-After (lib/ssr.server.ts) to the crawler.
export const headers: HeadersFunction = ({ errorHeaders }) => errorHeaders ?? new Headers();

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

// Every route without its own `meta` lands here: the pages whose copy is in
// seo-routes.json by pathname, otherwise the site defaults.
export const meta: MetaFunction = ({ location, error }) => {
  if (error) {
    const missing = isRouteErrorResponse(error) && error.status === 404;
    return noindexMeta(missing ? "Page not found" : "Something went wrong", location.pathname);
  }
  return (
    staticMeta(location.pathname) ?? [
      { title: DEFAULT_TITLE },
      { name: "description", content: DEFAULT_DESCRIPTION },
    ]
  );
};

export function Layout({ children }: { children: React.ReactNode }) {
  // Undefined when the root loader itself failed; the error page still needs a document.
  const prefs = useRouteLoaderData<typeof loader>("root");
  return (
    // data-currency carries the server's choice to entry.client.tsx, which
    // seeds the browser's currency store with it before hydrating, so the
    // first client render asks for exactly the prices the server rendered.
    <html
      lang={prefs?.lang ?? "en"}
      data-currency={prefs?.currency}
      // Extensions (translators, password managers) add attributes here.
      suppressHydrationWarning
    >
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1" />
        <meta name="theme-color" content="#FDCB2D" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="goGerami" />
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

/**
 * Writes the cookies the next server render reads (src/lib/prefs.ts).
 * MIGRATION-VPS-SSR.md §6.3 and §6.4.
 */
function PrefsSync({ currency, currencySource }: Pick<Prefs, "currency" | "currencySource">) {
  const { user, isAuthenticated, isInitialized } = useAuth();

  // The server only guessed (country, or USD) unless the cookie told it. The
  // browser's timezone is the better guess: switch to it if it disagrees --
  // prices refetch, since every price query is keyed on the currency -- and
  // remember the answer so the next page renders in it straight away.
  useEffect(() => {
    if (currencySource === "cookie") return;
    const fromTimezone = detectGuestCurrency();
    if (fromTimezone && fromTimezone !== currency) {
      useGuestCurrencyStore.getState().setGuestCurrency(fromTimezone);
    }
    writeCookie(CURRENCY_COOKIE, fromTimezone ?? currency);
  }, [currency, currencySource]);

  // A signed-in visitor's saved currency wins; the server renders in it next time.
  useEffect(() => {
    if (user?.preferredCurrencyCode) writeCookie(CURRENCY_COOKIE, user.preferredCurrencyCode);
  }, [user?.preferredCurrencyCode]);

  // Lets the server draw the signed-in header's shape (streamlined-header.tsx).
  useEffect(() => {
    if (isInitialized) writeCookie(AUTH_HINT_COOKIE, isAuthenticated ? "1" : null);
  }, [isInitialized, isAuthenticated]);

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

/** Everything the matched routes' loaders fetched, for React Query. */
function useLoaderQueries(): DehydratedState {
  const matches = useMatches();
  return useMemo(
    () => ({
      mutations: [],
      queries: matches.flatMap(
        (m) => (m.data as { dehydratedState?: DehydratedState } | undefined)?.dehydratedState?.queries ?? [],
      ),
    }),
    [matches],
  );
}

export default function App() {
  const prefs = useLoaderData<typeof loader>();
  const isServer = typeof window === "undefined";

  // The browser has one cache and one i18n instance for the whole visit. On
  // the server those module-level singletons would be shared by every
  // concurrent request -- one visitor's prices or language leaking into
  // another's page -- so each server render gets its own.
  const [client] = useState(() =>
    isServer ? new QueryClient({ defaultOptions: queryClient.getDefaultOptions() }) : queryClient,
  );
  const i18nInstance = useMemo(
    () => (isServer ? i18n.cloneInstance({ lng: prefs.lang }) : i18n),
    [isServer, prefs.lang],
  );
  const loaderQueries = useLoaderQueries();

  return (
    <I18nextProvider i18n={i18nInstance}>
      <LanguageProvider>
        <QueryClientProvider client={client}>
          <HydrationBoundary state={loaderQueries}>
            <AuthProvider>
              <AnalyticsIdentity />
              <PrefsSync currency={prefs.currency} currencySource={prefs.currencySource} />
              <TooltipProvider>
                <ScrollToTop />
                <AnalyticsPageviewTracker />
                <RoleBasedPrefetch />
                <Outlet />
                <Toaster />
                <PwaUpdatePrompt />
              </TooltipProvider>
            </AuthProvider>
          </HydrationBoundary>
        </QueryClientProvider>
      </LanguageProvider>
    </I18nextProvider>
  );
}

// Shown while a client-only route (everything behind a login) loads.
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
