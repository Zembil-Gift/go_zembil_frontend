import { dehydrate, QueryClient } from "@tanstack/react-query";
import { type LoaderFunctionArgs } from "react-router";
import { categoryService } from "@/services/categoryService";
import { serviceService } from "@/services/serviceService";
import { optional, withApi } from "@/lib/ssr.server";

// /services rendered on the server; see routes/shop.tsx for how the cache is
// seeded. services.tsx has no title of its own, so only the component is
// re-exported. The filters come from the query string, read the way
// services.tsx reads them into its initial state.
export { default } from "@/pages/services";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const categoryIdParam = url.searchParams.get("categoryId");
  const cityParam = url.searchParams.get("city") || "";
  const searchParam = url.searchParams.get("search") || "";

  return withApi(request, async ({ currency }) => {
    // services.tsx's initial state for this URL: page 0, 12 per page, the
    // debounced search starts equal to ?search, and an unset city is "all".
    const page = 0;
    const size = 12;
    const query = searchParam;
    const city = cityParam || "all";
    const categoryId = categoryIdParam ? parseInt(categoryIdParam) : undefined;

    const [categories, services] = await Promise.all([
      optional(() => categoryService.getCategories()),
      optional(() =>
        serviceService.getServices({
          page,
          size,
          query: query || undefined,
          city: city === "all" ? undefined : city || undefined,
          categoryId,
        }),
      ),
    ]);

    // Keys must match services.tsx exactly.
    const qc = new QueryClient();
    if (categories) qc.setQueryData(["categories"], categories);
    if (services) {
      qc.setQueryData(["services", { page, size, query, city, categoryId, currency }], services);
    }
    return { dehydratedState: dehydrate(qc) };
  });
}
