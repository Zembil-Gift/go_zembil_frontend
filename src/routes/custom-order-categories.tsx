import { dehydrate, QueryClient } from "@tanstack/react-query";
import { type LoaderFunctionArgs } from "react-router";
import { customOrderTemplateService } from "@/services/customOrderTemplateService";
import { optional, withApi } from "@/lib/ssr.server";

// /custom-orders/categories rendered on the server; see routes/shop.tsx. The
// page's query key is the signed-in visitor's currency, which the server cannot
// see, so the server seeds the guest key ("default") -- exactly what the page
// itself uses before auth resolves.
export { default } from "@/pages/customer/CustomOrderCategories";

export async function loader({ request }: LoaderFunctionArgs) {
  return withApi(request, async () => {
    const categories = await optional(() =>
      customOrderTemplateService.getCategoriesWithTemplates(),
    );

    // Key must match CustomOrderCategories.tsx exactly.
    const qc = new QueryClient();
    if (categories) {
      qc.setQueryData(["custom-order-categories", "default"], categories);
    }
    return { dehydratedState: dehydrate(qc) };
  });
}
