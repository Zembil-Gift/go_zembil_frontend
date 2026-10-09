import { dehydrate, QueryClient } from "@tanstack/react-query";
import { type LoaderFunctionArgs, type MetaFunction } from "react-router";
import { reviewService } from "@/services/reviewService";
import { breadcrumbJsonLd, vendorJsonLd } from "@/lib/seo";
import { seoMeta } from "@/lib/seo-meta";
import { fetchEntity, optional, withApi } from "@/lib/ssr.server";

// /vendor/:id (the public shop page, not the /vendor dashboard) rendered on
// the server; see routes/product.tsx. Still a bare id -- slug URLs for vendors
// are Phase 5.
export { default } from "@/pages/vendor-detail";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const vendorId = Number(params.id);
  return withApi(request, async () => {
    const vendor = await fetchEntity(() =>
      Number.isInteger(vendorId) && vendorId > 0 ? reviewService.getVendorPublicProfile(vendorId) : null,
    );
    const [ratingSummary, reviews] = await Promise.all([
      optional(() => reviewService.getVendorRatingSummary(vendorId)),
      optional(() => reviewService.getVendorReviews(vendorId, 0, 10)),
    ]);

    // Keys must match vendor-detail.tsx exactly. vendor-reviews is an infinite
    // query, so its cache entry is the { pages, pageParams } shape.
    const qc = new QueryClient();
    qc.setQueryData(["vendor-profile", vendorId], vendor);
    if (ratingSummary) qc.setQueryData(["vendor-rating-summary", vendorId], ratingSummary);
    if (reviews) qc.setQueryData(["vendor-reviews", vendorId], { pages: [reviews], pageParams: [0] });

    const path = `/vendor/${vendorId}`;
    return {
      dehydratedState: dehydrate(qc),
      seo: {
        title: `${vendor.businessName} — Ethiopian Gifts & Delivery`,
        description: vendor.description,
        image: vendor.logoUrl,
        type: "profile" as const,
        canonicalPath: path,
        // LocalBusiness rather than Organization: these are real shops with a
        // city, which is what lets an assistant answer "who sells X in Addis".
        jsonLd: [
          vendorJsonLd({
            name: vendor.businessName,
            description: vendor.description,
            image: vendor.logoUrl,
            city: vendor.city,
            ratingValue: ratingSummary?.averageRating,
            reviewCount: ratingSummary?.totalReviews,
            path,
          }),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Shop", path: "/shop" },
            { name: vendor.businessName, path },
          ]),
        ],
      },
    };
  });
}

export const meta: MetaFunction<typeof loader> = ({ data, location }) =>
  seoMeta(data?.seo ?? { title: "Vendor not found", noindex: true }, location.pathname);
