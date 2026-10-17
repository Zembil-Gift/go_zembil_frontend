import { dehydrate, QueryClient } from "@tanstack/react-query";
import { type LoaderFunctionArgs } from "react-router";
import {
  categoryService,
  type SubCategoryResponse,
} from "@/services/categoryService";
import { productService } from "@/services/productService";
import { optional, withApi } from "@/lib/ssr.server";

// /shop, /shop/:categorySlug and /shop/category/:subcategorySlug rendered on
// the server; see routes/product.tsx. The path carries the category filter as a
// slug (the pills in shop.tsx link to exactly those URLs, so they select before
// hydration and with scripts off); the query string carries search and the
// older ?categoryId=/?subCategoryId= form other pages still link to. Both are
// resolved here into the ids shop.tsx filters on.
export { default, meta } from "@/pages/shop";

const int = (v: string | null) => (v ? parseInt(v) : undefined);

export async function loader({ request, params }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  const categorySlug = params.categorySlug;
  const subcategorySlug = params.subcategorySlug;

  return withApi(request, async ({ currency }) => {
    // A subcategory slug does not say which category it belongs to; the
    // categories-with-subcategories feed is the only thing that does. Fetched
    // for /shop/category/:subcategorySlug alone.
    const withSubcategories = subcategorySlug
      ? await optional(() => categoryService.getCategoriesWithSubcategories())
      : undefined;
    const categories = await optional(() => categoryService.getCategories());

    const slugCategory = categorySlug
      ? categories?.find((category) => category.slug === categorySlug)
      : undefined;

    let slugSubCategory: SubCategoryResponse | undefined;
    if (subcategorySlug && withSubcategories) {
      for (const category of withSubcategories) {
        const sub = category.subcategories?.find(
          (item) => item.slug === subcategorySlug,
        );
        if (sub) {
          slugSubCategory = sub;
          break;
        }
      }
    }

    // The slug wins; the query string is what pre-slug links use.
    const categoryId =
      slugSubCategory?.categoryId ??
      slugCategory?.id ??
      int(url.searchParams.get("categoryId"));
    const subCategoryId =
      slugSubCategory?.id ?? int(url.searchParams.get("subCategoryId"));

    const [subCategories, firstPage] = await Promise.all([
      categoryId ? optional(() => categoryService.getSubCategories(categoryId)) : undefined,
      optional(() =>
        productService.getFilteredProducts({
          page: 0,
          size: 12,
          search: search || undefined,
          categoryId,
          subCategoryId,
        }),
      ),
    ]);

    // Keys must match shop.tsx exactly; the product list is an infinite query.
    const qc = new QueryClient();
    if (categories) qc.setQueryData(["categories"], categories);
    if (withSubcategories) qc.setQueryData(["categories", "with-subcategories"], withSubcategories);
    if (subCategories) qc.setQueryData(["subCategories", categoryId], subCategories);
    if (firstPage) {
      qc.setQueryData(
        ["products", "filtered", { size: 12, search, categoryId, subCategoryId, sortBy: "newest", currency }],
        { pages: [firstPage], pageParams: [0] },
      );
    }
    return { dehydratedState: dehydrate(qc) };
  });
}
