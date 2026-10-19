import { dehydrate, QueryClient } from "@tanstack/react-query";
import { redirect, type LoaderFunctionArgs, type MetaFunction } from "react-router";
import { productService, extractPriceAmount, type Product } from "@/services/productService";
import { reviewService } from "@/services/reviewService";
import { getPriceCurrency } from "@/lib/currency";
import { getAllProductImages } from "@/utils/imageUtils";
import { breadcrumbJsonLd, idFromParam, productJsonLd, productPath } from "@/lib/seo";
import { seoMeta, type SeoInput } from "@/lib/seo-meta";
import { fetchEntity, optional, withApi } from "@/lib/ssr.server";

// /product/:id rendered on the server. The page component is unchanged; this
// module fetches what it needs into React Query under the page's own keys, so
// it renders complete HTML and hydrates without refetching.
export { default } from "@/pages/product-detail";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const id = idFromParam(params.id);
  return withApi(request, async ({ currency }) => {
    const product = await fetchEntity(() => (id ? productService.getProductById(id) : null));

    // One product, one URL: a bare id or a stale slug gets a real 301.
    const canonical = productPath(id!, product.name);
    if (decodeURIComponent(new URL(request.url).pathname) !== canonical) {
      throw redirect(canonical, 301);
    }

    const [ratingSummary, vendorProfile, reviews] = await Promise.all([
      optional(() => reviewService.getProductRatingSummary(id!)),
      product.vendorId ? optional(() => reviewService.getVendorPublicProfileByUserId(product.vendorId!)) : undefined,
      optional(() => reviewService.getProductReviews(id!, 0, 5)),
    ]);

    // Keys must match product-detail.tsx and ProductReviewsSection exactly.
    const qc = new QueryClient();
    qc.setQueryData(["products", "detail", id, currency], product);
    if (ratingSummary) qc.setQueryData(["product-rating-summary", id], ratingSummary);
    if (vendorProfile) qc.setQueryData(["vendor-profile-by-user", product.vendorId], vendorProfile);
    if (reviews) qc.setQueryData(["product-reviews", id, 0], reviews);

    return {
      dehydratedState: dehydrate(qc),
      seo: productSeo(id!, product, ratingSummary?.averageRating, ratingSummary?.totalReviews, vendorProfile?.businessName),
    };
  });
}

export const meta: MetaFunction<typeof loader> = ({ data, location }) =>
  seoMeta(data?.seo ?? { title: "Product not found", noindex: true }, location.pathname);

/**
 * What product-detail.tsx used to pass to useSeo, for the state the page first
 * renders in (no variant picked yet) -- so the JSON-LD price, stock and images
 * are exactly what the server HTML shows.
 */
function productSeo(
  id: number,
  product: Product,
  ratingValue?: number,
  reviewCount?: number,
  brand?: string,
): SeoInput {
  const skus = (product.productSku ?? []).filter((sku) => sku.price != null);
  const onlySku = skus.length === 1 ? skus[0] : null;
  const price = onlySku?.price ?? skus[0]?.price;
  const currentPrice = price ? extractPriceAmount(price) : extractPriceAmount(product.price);
  const currency =
    onlySku?.price?.currencyCode ?? skus[0]?.price?.currencyCode ?? getPriceCurrency(product.price);
  const stock =
    skus.length > 1 ? null : onlySku?.stockQuantity !== undefined ? onlySku.stockQuantity : product.stockQuantity || 0;
  const images =
    skus.length <= 1 && onlySku?.images?.length
      ? [...onlySku.images].sort((a, b) => a.sortOrder - b.sortOrder).map((img) => img.fullUrl)
      : getAllProductImages(product.images);
  const path = productPath(id, product.name);

  return {
    title: `${product.name}${brand ? ` — ${brand}` : ""}`,
    description:
      product.description || `Send ${product.name} to family and friends in Ethiopia with goGerami.`,
    image: images[0],
    type: "product",
    canonicalPath: path,
    jsonLd: [
      productJsonLd({
        name: product.name,
        description: product.description,
        image: images.slice(0, 5),
        sku: onlySku?.id ?? product.id,
        brand,
        // Whatever this visitor is shown: the API converts per X-Currency.
        price: currentPrice ?? undefined,
        currency,
        inStock: stock === null || stock > 0,
        path,
        ratingValue,
        reviewCount,
      }),
      breadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: "Shop", path: "/shop" },
        ...(product.subCategoryName ? [{ name: product.subCategoryName, path: "/shop" }] : []),
        { name: product.name, path },
      ]),
    ],
  };
}
