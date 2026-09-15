import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  DEFAULT_OG_IMAGE,
  SITE_NAME,
  STATIC_ROUTES,
  breadcrumbJsonLd,
  absoluteUrl,
  clampDescription,
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
  /** Suppresses writes while data is still loading, so a half-built title is never published. */
  enabled?: boolean;
}

// Everything this hook writes carries the marker, so the next route can clear
// the previous route's tags without touching anything hand-written in index.html.
const MARK = "data-seo";

function setMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[${attr}="${CSS.escape(key)}"]`
  );
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
  el.setAttribute(MARK, "");
}

function setLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
  el.setAttribute(MARK, "");
}

function clearManaged() {
  document.head.querySelectorAll(`[${MARK}]`).forEach((el) => el.remove());
}

/**
 * Per-route document metadata: title, description, canonical, Open Graph,
 * Twitter card and JSON-LD.
 *
 * ponytail: this is ~90 lines of DOM calls instead of react-helmet-async. The
 * dependency buys an SSR story this app cannot use yet, and an ordering model
 * for competing <head> writers that a one-call-per-page convention does not
 * need. When routes move to server rendering, the SeoInput shape maps straight
 * onto a route `meta` export and this file is deleted.
 *
 * Note the ceiling: tags written here are only visible to crawlers that execute
 * JavaScript. Googlebot does; Facebook, WhatsApp, LinkedIn, Slack and every AI
 * crawler do not. `scripts/prerender.mjs` bakes the same tags into the static
 * routes at build time to cover those; dynamic routes stay JS-only until the
 * pages render on the server.
 */
export function useSeo(input: SeoInput) {
  const { pathname } = useLocation();
  const serialized = JSON.stringify(input);

  useEffect(() => {
    const seo: SeoInput = JSON.parse(serialized);
    if (seo.enabled === false) return;

    clearManaged();

    const title = seo.title ? withBrand(seo.title) : SITE_NAME;
    const url = absoluteUrl(seo.canonicalPath ?? pathname);
    const image = seo.image ? absoluteUrl(seo.image) : DEFAULT_OG_IMAGE;
    const description = seo.description
      ? clampDescription(seo.description)
      : undefined;

    document.title = title;

    if (description) setMeta("name", "description", description);
    setLink("canonical", url);

    // Only ever written as a restriction. Absent means "index, follow", which
    // is the default -- emitting it explicitly adds a tag that says nothing.
    if (seo.noindex) setMeta("name", "robots", "noindex, follow");

    setMeta("property", "og:title", title);
    setMeta("property", "og:url", url);
    setMeta("property", "og:type", seo.type || "website");
    setMeta("property", "og:site_name", SITE_NAME);
    setMeta("property", "og:image", image);
    if (description) setMeta("property", "og:description", description);

    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:image", image);
    if (description) setMeta("name", "twitter:description", description);

    const blocks = seo.jsonLd
      ? Array.isArray(seo.jsonLd)
        ? seo.jsonLd
        : [seo.jsonLd]
      : [];
    for (const block of blocks) {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.setAttribute(MARK, "");
      script.textContent = JSON.stringify(block);
      document.head.appendChild(script);
    }
  }, [serialized, pathname]);
}

export default useSeo;

/**
 * Metadata for a route whose copy lives in `src/lib/seo-routes.json` — the same
 * table the sitemap and the prerenderer read, so the three can never disagree.
 */
export function useStaticSeo(path: string, extra?: Partial<SeoInput>) {
  const route = STATIC_ROUTES[path];
  useSeo({
    title: route?.title,
    description: route?.description,
    canonicalPath: path,
    // Mirrors what scripts/prerender.mjs bakes into the static HTML, so the
    // crawler that runs JS and the crawler that does not read the same trail.
    jsonLd:
      path === "/" || !route
        ? null
        : breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: route.h1, path },
          ]),
    ...extra,
  });
}

/**
 * Keeps a page out of the index without touching any other tag.
 *
 * Deliberately not `useSeo({ noindex: true })`: that clears and rewrites the
 * whole managed set, and this runs in route guards that wrap pages which may
 * set their own title. Owning exactly one element keeps the two independent.
 */
export function useNoindex(active = true) {
  useEffect(() => {
    if (!active) return;
    const el = document.createElement("meta");
    el.setAttribute("name", "robots");
    el.setAttribute("content", "noindex, follow");
    el.setAttribute("data-seo-noindex", "");
    document.head.appendChild(el);
    return () => el.remove();
  }, [active]);
}
