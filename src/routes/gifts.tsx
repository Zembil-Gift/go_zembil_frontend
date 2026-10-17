import { dehydrate, QueryClient } from "@tanstack/react-query";
import { type LoaderFunctionArgs } from "react-router";
import {
  categoryService,
  type CategoryWithSubcategories,
  type SubCategoryResponse,
} from "@/services/categoryService";
import { productService } from "@/services/productService";
import { optional, withApi } from "@/lib/ssr.server";

// /gifts and /gifts/:categorySlug rendered on the server; see routes/shop.tsx.
// The page component is unchanged: this module fetches into React Query under
// the page's own keys, so the catalogue is in the HTML and hydrates without a
// refetch. Those keys -- ["categories", "with-subcategories"] and
// ["gifts", "products", baseFilterParams, recipient, sort, price, currency] --
// and the slug-to-id resolution behind them must stay byte-identical to
// src/pages/gifts.tsx.
export { default, meta } from "@/pages/gifts";

// /gifts/:categorySlug carries either a product category or a recipient; the
// page's own known-recipient list decides which, and they resolve differently.
const knownRecipients = [
  "mom", "dad", "friends", "kids", "couples", "colleagues",
  "anniversary", "birthday", "wedding", "graduation", "housewarming",
  "christmas", "holiday", "valentine",
];

export async function loader({ request, params }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const slug = params.categorySlug;
  const searchParam = url.searchParams.get("search") || "";
  const sortParam = url.searchParams.get("sort") || "popularity";
  const priceParam = url.searchParams.get("price") || "all";
  const recipientParam = url.searchParams.get("recipient") || "";

  const categorySlug = slug && !knownRecipients.includes(slug) ? slug : url.searchParams.get("category");
  const pathRecipient = slug && knownRecipients.includes(slug) ? slug : null;
  const finalRecipientParam = recipientParam || pathRecipient;

  return withApi(request, async ({ currency }) => {
    // Categories first: the page cannot turn the slug into ids without them.
    const categories = await optional(() => categoryService.getCategoriesWithSubcategories());
    const list = categories ?? [];

    // Mirrors gifts.tsx's currentSubCategory/currentCategory useMemo resolvers.
    let currentSubCategory: SubCategoryResponse | null = null;
    if (categorySlug) {
      for (const category of list) {
        const sub = category.subcategories?.find((item) => item.slug === categorySlug);
        if (sub) {
          currentSubCategory = sub;
          break;
        }
      }
    }

    let currentCategory: CategoryWithSubcategories | null = null;
    if (categorySlug) {
      const sub = currentSubCategory;
      currentCategory = sub
        ? list.find((cat) => cat.id === sub.categoryId) || null
        : list.find((cat) => cat.slug === categorySlug) || null;
    }

    const baseFilterParams = {
      page: 0,
      size: 20,
      search: searchParam || undefined,
      subCategoryId: currentSubCategory?.id,
      categoryId: currentSubCategory ? undefined : currentCategory?.id,
    };

    const products = await optional(() => productService.getFilteredProducts(baseFilterParams));

    // Keys must match gifts.tsx exactly; React Query hashes the params object,
    // so identical shapes at the same array positions are what matter.
    const qc = new QueryClient();
    if (categories) qc.setQueryData(["categories", "with-subcategories"], categories);
    if (products) {
      qc.setQueryData(
        ["gifts", "products", baseFilterParams, finalRecipientParam, sortParam, priceParam, currency],
        products,
      );
    }
    return { dehydratedState: dehydrate(qc) };
  });
}
