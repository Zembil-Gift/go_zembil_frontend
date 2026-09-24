import staticRoutes from "./seo-routes.json" with { type: "json" };

/**
 * Canonical origin. Overridable per environment so preview deploys do not
 * advertise production URLs as their canonical.
 */
export const SITE_URL = (
  import.meta.env?.VITE_SITE_URL || "https://gogerami.com"
).replace(/\/$/, "");

export const SITE_NAME = "goGerami";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/android-chrome-512x512.png`;

export interface StaticRouteSeo {
  title: string;
  description: string;
  h1: string;
  priority: number;
  changefreq: string;
}

export const STATIC_ROUTES: Record<string, StaticRouteSeo> = staticRoutes;

/** Absolute URL for a path. Accepts an already-absolute URL and passes it through. */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * "Product name" -> "Product name | goGerami". Titles that already carry the
 * brand are left alone so they do not end up doubled.
 */
export function withBrand(title: string): string {
  return title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
}

/**
 * Search engines truncate around 160 characters and reward a complete sentence
 * over a clipped one, so cut on a word boundary.
 */
export function clampDescription(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/** Site-wide identity. Emitted once, from the app shell. */
export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: DEFAULT_OG_IMAGE,
    email: "info@gogerami.com",
    description:
      "goGerami is an Ethiopian gift marketplace that lets people abroad send authentic gifts, flowers and experiences to family and friends in Ethiopia.",
    areaServed: { "@type": "Country", name: "Ethiopia" },
  };
}

/** Enables the sitelinks search box, and tells engines how to query the catalogue. */
export function webSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/shop?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/** `crumbs` runs root-first and must match the visible breadcrumb trail. */
export function breadcrumbJsonLd(crumbs: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: absoluteUrl(c.path),
    })),
  };
}

export interface ProductJsonLdInput {
  name: string;
  description?: string;
  image?: string | string[];
  sku?: string | number;
  brand?: string;
  price?: number | string;
  currency?: string;
  inStock?: boolean;
  path: string;
  ratingValue?: number;
  reviewCount?: number;
}

export function productJsonLd(p: ProductJsonLdInput) {
  const images = (Array.isArray(p.image) ? p.image : [p.image]).filter(
    Boolean
  ) as string[];

  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    url: absoluteUrl(p.path),
  };

  if (p.description) node.description = clampDescription(p.description, 500);
  if (images.length) node.image = images.map(absoluteUrl);
  if (p.sku != null) node.sku = String(p.sku);
  if (p.brand) node.brand = { "@type": "Brand", name: p.brand };

  // Price and currency travel together: an Offer with one and not the other is
  // invalid, and a wrong currency is worse than no Offer at all -- the whole
  // catalogue is converted per visitor via the X-Currency header.
  if (p.price != null && p.currency) {
    node.offers = {
      "@type": "Offer",
      price: String(p.price),
      priceCurrency: p.currency,
      availability: p.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: absoluteUrl(p.path),
    };
  }

  if (p.ratingValue && p.reviewCount) {
    node.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: p.ratingValue,
      reviewCount: p.reviewCount,
    };
  }

  return node;
}

export interface EventJsonLdInput {
  name: string;
  description?: string;
  image?: string;
  startDate?: string;
  endDate?: string;
  venue?: string;
  city?: string;
  price?: number | string;
  currency?: string;
  path: string;
}

export function eventJsonLd(e: EventJsonLdInput) {
  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: e.name,
    url: absoluteUrl(e.path),
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
  };

  if (e.description) node.description = clampDescription(e.description, 500);
  if (e.image) node.image = absoluteUrl(e.image);
  if (e.startDate) node.startDate = e.startDate;
  if (e.endDate) node.endDate = e.endDate;

  if (e.venue || e.city) {
    node.location = {
      "@type": "Place",
      name: e.venue || e.city,
      address: {
        "@type": "PostalAddress",
        addressLocality: e.city || "Addis Ababa",
        addressCountry: "ET",
      },
    };
  }

  if (e.price != null && e.currency) {
    node.offers = {
      "@type": "Offer",
      price: String(e.price),
      priceCurrency: e.currency,
      url: absoluteUrl(e.path),
      availability: "https://schema.org/InStock",
    };
  }

  return node;
}

export interface ServiceJsonLdInput {
  name: string;
  description?: string;
  image?: string;
  price?: number | string;
  currency?: string;
  providerName?: string;
  path: string;
}

export function serviceJsonLd(s: ServiceJsonLdInput) {
  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: s.name,
    url: absoluteUrl(s.path),
    areaServed: { "@type": "Country", name: "Ethiopia" },
  };

  if (s.description) node.description = clampDescription(s.description, 500);
  if (s.image) node.image = absoluteUrl(s.image);
  if (s.providerName) {
    node.provider = { "@type": "Organization", name: s.providerName };
  }
  if (s.price != null && s.currency) {
    node.offers = {
      "@type": "Offer",
      price: String(s.price),
      priceCurrency: s.currency,
    };
  }

  return node;
}

export interface VendorJsonLdInput {
  name: string;
  description?: string;
  image?: string;
  city?: string;
  ratingValue?: number;
  reviewCount?: number;
  path: string;
}

export function vendorJsonLd(v: VendorJsonLdInput) {
  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: v.name,
    url: absoluteUrl(v.path),
    address: {
      "@type": "PostalAddress",
      addressLocality: v.city || "Addis Ababa",
      addressCountry: "ET",
    },
  };

  if (v.description) node.description = clampDescription(v.description, 500);
  if (v.image) node.image = absoluteUrl(v.image);
  if (v.ratingValue && v.reviewCount) {
    node.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: v.ratingValue,
      reviewCount: v.reviewCount,
    };
  }

  return node;
}

/** "coffee-gift-sets" -> "Coffee Gift Sets". For titling category routes off the URL. */
export function slugToLabel(slug: string): string {
  return slug
    .replace(/[-_]+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** "Ethiopian Coffee Gift Set!" -> "ethiopian-coffee-gift-set" */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")   // strip accents
    .replace(/[^a-z0-9]+/g, "-")       // non-Latin scripts collapse to "-"
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
}

/**
 * Canonical catalogue URL: "/product/ethiopian-coffee-gift-set-42",
 * "/services/wedding-decor-7", "/events/timket-concert-3", "/packages/coffee-hamper-9".
 *
 * The numeric id stays on the end so lookups need no slug column and no
 * uniqueness guarantee, and so every old /product/42 link keeps resolving --
 * `idFromParam` reads the id off the last segment either way. An Amharic-only
 * name slugifies to nothing, which degrades to /product/42.
 */
export function slugPath(base: string, id: number | string, name?: string): string {
  const slug = name ? slugify(name) : "";
  return slug ? `${base}/${slug}-${id}` : `${base}/${id}`;
}

export const productPath = (id: number | string, name?: string) => slugPath("/product", id, name);
export const servicePath = (id: number | string, name?: string) => slugPath("/services", id, name);
export const eventPath = (id: number | string, name?: string) => slugPath("/events", id, name);
export const packagePath = (id: number | string, name?: string) => slugPath("/packages", id, name);

/** Reads the trailing numeric id out of "ethiopian-coffee-gift-set-42" or "42". */
export function idFromParam(param?: string): number | undefined {
  if (!param) return undefined;
  const id = Number(/(\d+)$/.exec(param)?.[1]);
  return Number.isFinite(id) && id > 0 ? id : undefined;
}
