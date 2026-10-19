import type { MetaDescriptor } from "react-router";
import {
  DEFAULT_OG_IMAGE,
  SITE_NAME,
  STATIC_ROUTES,
  absoluteUrl,
  breadcrumbJsonLd,
  clampDescription,
  organizationJsonLd,
  webSiteJsonLd,
  withBrand,
} from "@/lib/seo";

export interface SeoInput {
  /** Page title without the brand suffix -- `withBrand` appends it. */
  title?: string;
  description?: string;
  /** Defaults to the current pathname. Pass this when a page has several URLs. */
  canonicalPath?: string;
  image?: string;
  /** og:type. "product" for items, "article" for editorial, else "website". */
  type?: "website" | "product" | "article" | "profile";
  noindex?: boolean;
  jsonLd?: object | object[] | null;
}

/**
 * Per-route document metadata for a route `meta` export: title, description,
 * canonical, Open Graph, Twitter card and JSON-LD.
 *
 * This replaces the old useSeo hook, which wrote the same tags into <head>
 * from an effect -- invisible to every crawler that does not run JavaScript.
 * A `meta` export is rendered into the server HTML and kept up to date by
 * React Router on client navigation, so there is one writer for <head>.
 */
export function seoMeta(seo: SeoInput, pathname: string): MetaDescriptor[] {
  const title = seo.title ? withBrand(seo.title) : SITE_NAME;
  const url = absoluteUrl(seo.canonicalPath ?? pathname);
  const image = seo.image ? absoluteUrl(seo.image) : DEFAULT_OG_IMAGE;
  const description = seo.description ? clampDescription(seo.description) : undefined;

  const tags: MetaDescriptor[] = [{ title }];
  if (description) tags.push({ name: "description", content: description });
  tags.push({ tagName: "link", rel: "canonical", href: url });

  // Only ever written as a restriction. Absent means "index, follow", which is
  // the default -- emitting it explicitly adds a tag that says nothing.
  if (seo.noindex) tags.push({ name: "robots", content: "noindex, follow" });

  tags.push(
    { property: "og:title", content: title },
    { property: "og:url", content: url },
    { property: "og:type", content: seo.type || "website" },
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:image", content: image },
  );
  if (description) tags.push({ property: "og:description", content: description });

  tags.push(
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:image", content: image },
  );
  if (description) tags.push({ name: "twitter:description", content: description });

  const blocks = seo.jsonLd ? (Array.isArray(seo.jsonLd) ? seo.jsonLd : [seo.jsonLd]) : [];
  for (const block of blocks) tags.push({ "script:ld+json": block });

  return tags;
}

/**
 * Metadata for a route whose copy lives in `src/lib/seo-routes.json` -- the
 * same table the sitemap reads, so the two can never disagree. Undefined for a
 * path that is not in the table.
 */
export function staticMeta(path: string): MetaDescriptor[] | undefined {
  const route = STATIC_ROUTES[path];
  if (!route) return undefined;
  return seoMeta(
    {
      title: route.title,
      description: route.description,
      canonicalPath: path,
      jsonLd:
        path === "/"
          ? // Who the site is, once, on the page search engines treat as the entity's home.
            [organizationJsonLd(), webSiteJsonLd()]
          : breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: route.h1, path },
            ]),
    },
    path,
  );
}

/** Title-only noindex metadata for pages that should never be in search results. */
export function noindexMeta(title: string | undefined, pathname: string): MetaDescriptor[] {
  return seoMeta({ title, noindex: true }, pathname);
}
