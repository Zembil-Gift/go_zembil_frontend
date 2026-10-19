import { dehydrate, QueryClient } from "@tanstack/react-query";
import { redirect, type LoaderFunctionArgs, type MetaFunction } from "react-router";
import { eventOrderService } from "@/services/eventOrderService";
import { eventsService } from "@/services/eventsService";
import { reviewService } from "@/services/reviewService";
import { breadcrumbJsonLd, eventJsonLd, eventPath, idFromParam } from "@/lib/seo";
import { seoMeta, type SeoInput } from "@/lib/seo-meta";
import { fetchEntity, optional, withApi } from "@/lib/ssr.server";

// /events/:slug rendered on the server; see routes/product.tsx for the shape.
// "/events/timket-concert-3" (or a bare "/events/3") is an API event; a slug
// with no trailing id is one of eventsService's mock events, as before.
export { default } from "@/pages/event-detail";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const slug = params.slug!;
  const id = idFromParam(slug);
  return withApi(request, async ({ currency }) => {
    const qc = new QueryClient();

    if (id === undefined) {
      const mock = await fetchEntity(() => eventsService.getEventBySlug(slug));
      qc.setQueryData(["event", slug], mock);
      return { dehydratedState: dehydrate(qc), seo: eventSeo(`/events/${slug}`, mock) };
    }

    const event = await fetchEntity(() => eventOrderService.getEvent(id));
    const canonical = eventPath(id, event.title);
    if (decodeURIComponent(new URL(request.url).pathname) !== canonical) {
      throw redirect(canonical, 301);
    }

    const [vendorProfile, ratingSummary, reviews] = await Promise.all([
      event.vendorId ? optional(() => reviewService.getVendorPublicProfile(event.vendorId)) : undefined,
      optional(() => reviewService.getEventRatingSummary(id)),
      optional(() => reviewService.getEventReviews(id, 0, 5)),
    ]);

    // Keys must match event-detail.tsx and EventReviewsSection exactly.
    qc.setQueryData(["api-event", id, currency], event);
    if (vendorProfile) qc.setQueryData(["vendor-profile", event.vendorId], vendorProfile);
    if (ratingSummary) qc.setQueryData(["event-rating-summary", id], ratingSummary);
    if (reviews) qc.setQueryData(["event-reviews", id, 0], reviews);

    return { dehydratedState: dehydrate(qc), seo: eventSeo(canonical, event) };
  });
}

export const meta: MetaFunction<typeof loader> = ({ data, location }) =>
  seoMeta(data?.seo ?? { title: "Event not found", noindex: true }, location.pathname);

/**
 * event-detail.tsx's old useSeo input. The API and mock shapes share these
 * fields under the same names, which is all the metadata needs.
 */
function eventSeo(path: string, event: object): SeoInput {
  const e = event as {
    title?: string;
    description?: string;
    city?: string;
    location?: string;
    venue?: string;
    eventDate?: string;
    startDate?: string;
  };
  return {
    title: `${e.title}${e.city ? ` — ${e.city}` : ""}`,
    description: e.description,
    type: "article",
    canonicalPath: path,
    jsonLd: [
      eventJsonLd({
        name: e.title || "",
        description: e.description,
        startDate: e.eventDate || e.startDate,
        venue: e.location || e.venue,
        city: e.city,
        path,
      }),
      breadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: "Events", path: "/events" },
        { name: e.title || "", path },
      ]),
    ],
  };
}
