import { dehydrate, QueryClient } from "@tanstack/react-query";
import { Navigate, type LoaderFunctionArgs } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import { productService } from "@/services/productService";
import { eventOrderService } from "@/services/eventOrderService";
import { serviceService } from "@/services/serviceService";
import { packageService } from "@/services/packageService";
import { categoryService } from "@/services/categoryService";
import { optional, withApi } from "@/lib/ssr.server";

// The landing page's catalogue sections, rendered on the server so the HTML
// links to real products (see routes/product.tsx for how the cache is seeded).
// Every section is optional: one failing feed renders as it does today, a
// skeleton the browser fills in, rather than failing the home page.
// CampaignBanner stays client-side: it waits on auth and depends on the role.
export async function loader({ request }: LoaderFunctionArgs) {
  return withApi(request, async ({ currency }) => {
    // Keys must match landing.tsx and its sections exactly.
    const feeds: [unknown[], () => Promise<unknown>][] = [
      [["products", "featured", currency], () => productService.getFeaturedProducts(16)],
      [["events", "featured", currency], () => eventOrderService.getFeaturedEvents(0, 12)],
      [["services", "featured", currency], () => serviceService.getFeaturedServices(0, 12)],
      [["packages", "featured", currency], () => packageService.getFeaturedPackages(0, 12)],
      [["products", "ads", currency], () => productService.getAdProducts(3)],
      [["events", "ads", currency], () => eventOrderService.getAdEvents(2)],
      [["services", "ads", currency], () => serviceService.getAdServicePackages(2)],
      [["packages", "ads", currency], () => packageService.getAdPackages(2)],
      [["categories", "with-products"], () => categoryService.getCategoriesWithProducts()],
      [["categories"], () => categoryService.getCategories()],
      // ShopGridSection's first page, unfiltered; an infinite query's shape.
      [
        ["products", "filtered", { size: 12, search: "", categoryId: undefined, subCategoryId: undefined, sortBy: "newest", currency }],
        async () => ({ pages: [await productService.getFilteredProducts({ page: 0, size: 12 })], pageParams: [0] }),
      ],
    ];
    const results = await Promise.all(feeds.map(([, fn]) => optional(fn)));

    const qc = new QueryClient();
    feeds.forEach(([key], i) => {
      if (results[i] !== undefined) qc.setQueryData(key, results[i]);
    });
    return { dehydratedState: dehydrate(qc) };
  });
}

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
