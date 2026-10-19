import { dehydrate, QueryClient } from "@tanstack/react-query";
import { type LoaderFunctionArgs } from "react-router";
import { customOrderTemplateService } from "@/services/customOrderTemplateService";
import { optional, withApi } from "@/lib/ssr.server";

// /custom-orders/category/:categoryId rendered on the server; see
// routes/shop.tsx. The page's query key ends in the visitor's currency, which
// the server cannot see, so the server seeds the guest key ("default") and a
// signed-in visitor gets the usual refetch under theirs.
export { default } from "@/pages/customer/CustomOrderTemplates";

const int = (v: string | undefined) => (v ? parseInt(v) : undefined);

export async function loader({ request, params }: LoaderFunctionArgs) {
  const categoryId = int(params.categoryId);

  return withApi(request, async () => {
    const templates = categoryId
      ? await optional(() =>
          customOrderTemplateService.getByCategory(categoryId, 0, 20),
        )
      : undefined;

    // Key must match CustomOrderTemplates.tsx exactly.
    const qc = new QueryClient();
    if (templates) {
      qc.setQueryData(
        ["custom-order-templates", categoryId, 0, "default"],
        templates,
      );
    }
    return { dehydratedState: dehydrate(qc) };
  });
}
