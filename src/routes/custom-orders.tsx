import { dehydrate, QueryClient } from "@tanstack/react-query";
import { type LoaderFunctionArgs } from "react-router";
import { customOrderTemplateService } from "@/services/customOrderTemplateService";
import { optional, withApi } from "@/lib/ssr.server";

// /custom-orders rendered on the server; see routes/shop.tsx for how the cache
// is seeded. Without this the page's own query is disabled until the auth
// handshake resolves (custom-orders.tsx), so the server HTML said "No approved
// templates available yet" no matter what the API held.
export { default } from "@/pages/custom-orders";

export async function loader({ request }: LoaderFunctionArgs) {
  return withApi(request, async ({ currency }) => {
    const approved = await optional(() =>
      customOrderTemplateService.getApproved(0, 20),
    );

    // Key must match custom-orders.tsx exactly.
    const qc = new QueryClient();
    if (approved) {
      qc.setQueryData(["custom-order-templates-approved", currency], approved);
    }
    return { dehydratedState: dehydrate(qc) };
  });
}
