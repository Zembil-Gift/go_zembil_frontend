import { dehydrate, QueryClient } from "@tanstack/react-query";
import { type LoaderFunctionArgs } from "react-router";
import { categoryService } from "@/services/categoryService";
import { packageService } from "@/services/packageService";
import { optional, withApi } from "@/lib/ssr.server";

// /packages rendered on the server; see routes/product.tsx for how the page is
// unchanged and its data lands in React Query under the page's own keys. The
// filters come from the query string, read the way packages.tsx reads them.
export { default } from "@/pages/packages";

const ITEMS_PER_PAGE = 20;

const num = (v: string | null) => {
  if (!v) return undefined;
  const parsed = Number(v);
  return Number.isNaN(parsed) ? undefined : parsed;
};

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const categoryId = num(url.searchParams.get("categoryId"));
  const subCategoryId = num(url.searchParams.get("subCategoryId"));
  const page = Math.max(0, num(url.searchParams.get("page")) ?? 0);

  return withApi(request, async () => {
    const [categories, subCategories, browse] = await Promise.all([
      optional(() => categoryService.getCategories()),
      categoryId ? optional(() => categoryService.getSubCategories(categoryId)) : undefined,
      optional(async () => {
        // packages.tsx's queryFn, fallback branch included: a filtered page that
        // comes back empty falls back to the unfiltered list, flagged.
        const filtered = await packageService.browsePackages({
          page,
          size: ITEMS_PER_PAGE,
          categoryId,
          subCategoryId,
        });

        if ((categoryId || subCategoryId) && filtered.content.length === 0) {
          const allPackages = await packageService.browsePackages({ page, size: ITEMS_PER_PAGE });
          return { ...allPackages, isFallback: true };
        }

        return { ...filtered, isFallback: false };
      }),
    ]);

    // Keys must match packages.tsx exactly: ["categories"],
    // ["subCategories", categoryId] and ["packages", "browse", {...}].
    const qc = new QueryClient();
    if (categories) qc.setQueryData(["categories"], categories);
    if (subCategories) qc.setQueryData(["subCategories", categoryId], subCategories);
    if (browse) {
      qc.setQueryData(
        ["packages", "browse", { page, size: ITEMS_PER_PAGE, categoryId, subCategoryId }],
        browse,
      );
    }
    return { dehydratedState: dehydrate(qc) };
  });
}
