import { dehydrate, QueryClient } from "@tanstack/react-query";
import { redirect, type LoaderFunctionArgs, type MetaFunction } from "react-router";
import { packageService } from "@/services/packageService";
import { breadcrumbJsonLd, idFromParam, packagePath } from "@/lib/seo";
import { seoMeta } from "@/lib/seo-meta";
import { fetchEntity, withApi } from "@/lib/ssr.server";

// /packages/:packageId rendered on the server; see routes/product.tsx.
export { default } from "@/pages/package-detail";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const id = idFromParam(params.packageId);
  return withApi(request, async () => {
    const pkg = await fetchEntity(() => (id ? packageService.getPackageDetail(id) : null));

    const canonical = packagePath(id!, pkg.name);
    if (decodeURIComponent(new URL(request.url).pathname) !== canonical) {
      throw redirect(canonical, 301);
    }

    // Key must match package-detail.tsx exactly (it has no currency in it).
    const qc = new QueryClient();
    qc.setQueryData(["packages", "detail", id], pkg);

    return {
      dehydratedState: dehydrate(qc),
      seo: {
        title: pkg.name,
        description: pkg.description,
        image: pkg.images?.[0],
        type: "product" as const,
        canonicalPath: canonical,
        jsonLd: breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Packages", path: "/packages" },
          { name: pkg.name, path: canonical },
        ]),
      },
    };
  });
}

export const meta: MetaFunction<typeof loader> = ({ data, location }) =>
  seoMeta(data?.seo ?? { title: "Package not found", noindex: true }, location.pathname);
