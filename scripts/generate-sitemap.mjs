#!/usr/bin/env node
/**
 * Writes public/sitemap.xml and public/llms.txt.
 *
 * Static routes come from src/lib/seo-routes.json, which the app and the
 * prerenderer read too. Catalogue entities (products, services, events,
 * packages) are fetched from the API when SITEMAP_API_URL or VITE_API_URL
 * points at a reachable backend.
 *
 * ponytail: the fetch is best-effort by design. A build must not fail because
 * the API is slow, down, or simply not configured in this environment -- a
 * sitemap listing the 14 static routes is worth far more than a red build. The
 * console says which of the two happened, so a silently static sitemap in CI
 * is visible rather than mysterious.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
// Imported, not reimplemented: the sitemap must emit the exact URL the app
// treats as canonical, or every catalogue entry redirects on arrival.
//
// Reaching into a .ts file is why "prebuild" runs node with
// --experimental-strip-types. Node 23.6+ strips types unflagged, but Render
// builds on Node 22, which throws ERR_UNKNOWN_FILE_EXTENSION without it.
// Keep seo.ts free of enum/namespace/parameter properties -- type stripping
// erases annotations, it does not compile non-erasable syntax.
import { productPath, slugify } from "../src/lib/seo.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

const SITE_URL = (process.env.VITE_SITE_URL || "https://gogerami.com").replace(
  /\/$/,
  ""
);

const routes = JSON.parse(
  readFileSync(resolve(root, "src/lib/seo-routes.json"), "utf8")
);

const lastmod = new Date().toISOString().slice(0, 10);

const API = (process.env.SITEMAP_API_URL || process.env.VITE_API_URL || "").replace(/\/$/, "");
// 100, not 200: /api/v1/products rejects size=200 with HTTP 400, which the
// best-effort catch below swallowed -- every product silently missing from the
// sitemap while services and packages came through fine.
const PAGE_SIZE = 100;
const MAX_PAGES = 50; // 5k entities per type; raise when the catalogue does

async function fetchPaged(path) {
  const items = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const sep = path.includes("?") ? "&" : "?";
    const res = await fetch(`${API}${path}${sep}page=${page}&size=${PAGE_SIZE}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
    const body = await res.json();
    // Spring pages arrive as { content, last }; some endpoints return a bare array.
    const batch = Array.isArray(body) ? body : (body.content ?? []);
    items.push(...batch);
    if (Array.isArray(body) || body.last || batch.length < PAGE_SIZE) break;
  }
  return items;
}

/**
 * Entity URLs, or [] if the API is unset or unreachable.
 * `updatedAt` is used for lastmod where the entity carries one.
 */
async function catalogueUrls() {
  if (!API) {
    console.log("sitemap: no SITEMAP_API_URL/VITE_API_URL — static routes only");
    return [];
  }

  const sources = [
    { path: "/api/v1/products", url: (e) => productPath(e.id, e.name), changefreq: "weekly", priority: 0.7 },
    { path: "/api/services",    url: (e) => `/services/${e.id}`, changefreq: "weekly", priority: 0.7 },
    { path: "/api/events",      url: (e) => `/events/${e.slug ?? e.id}`, changefreq: "daily", priority: 0.7 },
    { path: "/api/v1/packages", url: (e) => `/packages/${e.id}`, changefreq: "weekly", priority: 0.6 },
  ];

  const urls = [];
  for (const src of sources) {
    try {
      const items = await fetchPaged(src.path);
      for (const e of items) {
        if (e?.id == null) continue;
        urls.push({
          loc: src.url(e),
          lastmod: (e.updatedAt ?? e.createdAt ?? "").slice(0, 10) || lastmod,
          changefreq: src.changefreq,
          priority: src.priority,
        });
      }
      console.log(`sitemap: ${items.length} from ${src.path}`);
    } catch (err) {
      console.warn(`sitemap: skipped ${src.path} — ${err.message}`);
    }
  }
  return urls;
}

const catalogue = await catalogueUrls();

const entry = (loc, mod, changefreq, priority) =>
  `  <url>\n` +
  `    <loc>${SITE_URL}${loc}</loc>\n` +
  `    <lastmod>${mod}</lastmod>\n` +
  `    <changefreq>${changefreq}</changefreq>\n` +
  `    <priority>${priority.toFixed(1)}</priority>\n` +
  `  </url>`;

const urls = [
  ...Object.entries(routes).map(([path, meta]) =>
    entry(path === "/" ? "/" : path, lastmod, meta.changefreq, meta.priority)
  ),
  ...catalogue.map((u) => entry(u.loc, u.lastmod, u.changefreq, u.priority)),
].join("\n");

writeFileSync(
  resolve(root, "public/sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${urls}\n` +
    `</urlset>\n`
);

// A Markdown map of the site for LLM consumers. Cheap to emit alongside the
// sitemap; adoption is not broad, so spend no further time on it.
const llms =
  `# goGerami\n\n` +
  `> Ethiopian gift marketplace. People abroad order gifts, flowers, hampers, ` +
  `events and services for delivery to family and friends anywhere in Ethiopia.\n\n` +
  `## Pages\n\n` +
  Object.entries(routes)
    .map(([path, m]) => `- [${m.h1}](${SITE_URL}${path}): ${m.description}`)
    .join("\n") +
  `\n`;

writeFileSync(resolve(root, "public/llms.txt"), llms);

console.log(
  `sitemap.xml: ${Object.keys(routes).length} static + ${catalogue.length} catalogue urls · llms.txt written`
);
