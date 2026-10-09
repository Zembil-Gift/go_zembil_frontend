import { dehydrate, QueryClient } from "@tanstack/react-query";
import { redirect, type LoaderFunctionArgs, type MetaFunction } from "react-router";
import { serviceService } from "@/services/serviceService";
import { reviewService } from "@/services/reviewService";
import { breadcrumbJsonLd, idFromParam, serviceJsonLd, servicePath } from "@/lib/seo";
import { seoMeta, type SeoInput } from "@/lib/seo-meta";
import { fetchEntity, optional, withApi } from "@/lib/ssr.server";

// /services/:id rendered on the server; see routes/product.tsx for the shape.
export { default } from "@/pages/service-detail";

type Service = Awaited<ReturnType<typeof serviceService.getService>>;

export async function loader({ request, params }: LoaderFunctionArgs) {
  const id = idFromParam(params.id);
  return withApi(request, async ({ currency }) => {
    const service = await fetchEntity(() => (id ? serviceService.getService(id) : null));

    const canonical = servicePath(id!, service.title);
    if (decodeURIComponent(new URL(request.url).pathname) !== canonical) {
      throw redirect(canonical, 301);
    }

    const [ratingSummary, reviews] = await Promise.all([
      optional(() => reviewService.getServiceRatingSummary(service.id)),
      optional(() => reviewService.getServiceReviews(service.id, 0, 5)),
    ]);

    // Keys must match service-detail.tsx and ServiceReviewsSection exactly.
    const qc = new QueryClient();
    qc.setQueryData(["service", id, currency], service);
    if (ratingSummary) qc.setQueryData(["service-rating-summary", service.id], ratingSummary);
    if (reviews) qc.setQueryData(["service-reviews", service.id, 0], reviews);

    return { dehydratedState: dehydrate(qc), seo: serviceSeo(id!, service) };
  });
}

export const meta: MetaFunction<typeof loader> = ({ data, location }) =>
  seoMeta(data?.seo ?? { title: "Service not found", noindex: true }, location.pathname);

/** service-detail.tsx's old useSeo input, for the package it first renders. */
function serviceSeo(id: number, service: Service): SeoInput {
  const approved = (service.packages ?? []).filter((pkg) => pkg.status === "APPROVED");
  const pkg = approved.length === 1 ? approved[0] : service.defaultPackage || approved[0] || null;
  const byOrder = (a: { sortOrder: number }, b: { sortOrder: number }) => a.sortOrder - b.sortOrder;
  const images = [
    ...[...(pkg?.images ?? [])].sort(byOrder).map((img) => img.fullUrl),
    ...[...(service.images ?? [])].sort(byOrder).map((img) => img.fullUrl),
  ];
  const path = servicePath(id, service.title);

  return {
    title: `${service.title}${service.city ? ` in ${service.city}` : ""}`,
    description: service.description,
    image: images[0],
    canonicalPath: path,
    jsonLd: [
      serviceJsonLd({
        name: service.title,
        description: service.description,
        image: images[0],
        price: pkg?.basePrice ?? service.basePrice ?? undefined,
        currency: pkg?.currency ?? service.currency ?? "ETB",
        providerName: service.vendorName,
        path,
      }),
      breadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: "Services", path: "/services" },
        { name: service.title, path },
      ]),
    ],
  };
}
