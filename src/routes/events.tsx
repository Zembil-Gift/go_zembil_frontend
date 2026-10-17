import { dehydrate, QueryClient } from "@tanstack/react-query";
import { type LoaderFunctionArgs } from "react-router";
import { eventOrderService } from "@/services/eventOrderService";
import { type Country, type EventFilters } from "@/types/events";
import { optional, withApi } from "@/lib/ssr.server";

// /events rendered on the server; see routes/shop.tsx for how the cache is
// seeded. events.tsx has no title of its own, so only the component is
// re-exported. The filters come from the query string, read the way events.tsx
// reads them into its initial state.
export { default } from "@/pages/events";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);

  return withApi(request, async ({ currency }) => {
    // events.tsx's initial state for this URL: page 0, 12 per page, and the
    // search box starts equal to ?q.
    const eventsPage = 0;
    const eventsPerPage = 12;
    const eventFilters: EventFilters = {
      q: url.searchParams.get("q") || "",
      country: (url.searchParams.get("country") as Country) || undefined,
      city: url.searchParams.get("city") || "",
      category: url.searchParams.get("category") || "",
      sort: url.searchParams.get("sort") || "popular",
      dateFrom: url.searchParams.get("dateFrom") || "",
      dateTo: url.searchParams.get("dateTo") || "",
      priceMin: url.searchParams.get("priceMin") ? Number(url.searchParams.get("priceMin")) : undefined,
      priceMax: url.searchParams.get("priceMax") ? Number(url.searchParams.get("priceMax")) : undefined,
    };

    const realEvents = await optional(() =>
      eventOrderService.searchEvents(
        eventFilters.q,
        eventFilters.city,
        eventFilters.category ? parseInt(eventFilters.category) : undefined,
        eventsPage,
        eventsPerPage,
      ),
    );

    // Key must match events.tsx exactly; priceMin/priceMax stay in the key but
    // are not passed to the API.
    const qc = new QueryClient();
    if (realEvents) {
      qc.setQueryData(["real-events", eventFilters, eventsPage, currency], realEvents);
    }
    return { dehydratedState: dehydrate(qc) };
  });
}
