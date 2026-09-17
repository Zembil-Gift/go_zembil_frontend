#!/usr/bin/env node
/**
 * Bakes per-route metadata and a no-JS content fallback into static HTML files,
 * one per entry in src/lib/seo-routes.json.
 *
 * Why this exists: useSeo() writes correct tags for every route, but only after
 * the bundle downloads, parses and runs. Googlebot will wait; Facebook,
 * WhatsApp, LinkedIn, Slack, GPTBot, OAI-SearchBot, PerplexityBot and
 * ClaudeBot will not -- they read the HTML response and leave. Without this
 * step every shared link shows the same generic card and every AI crawler
 * indexes an empty <div>.
 *
 * ponytail: string replacement over the built index.html, not a headless
 * browser and not an SSR build. It needs no new dependency, no browser
 * download in CI and no component to be SSR-safe. Products are covered too,
 * from the list the prebuild already fetched. The ceiling is that a page is
 * only as fresh as the last build: a product added or repriced afterwards has
 * no file until the next deploy. Events and services still need real server
 * rendering (see docs/SEO.md Part 2).
 *
 * The fallback markup goes INSIDE #root, so React's createRoot().render()
 * replaces it on mount. Visitors never see it; crawlers without JS see only it.
 * Keep it a truthful summary of the real page -- an h1, the meta description
 * and the site's main links. Content that contradicts the rendered page is
 * cloaking.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
// Same reason the prebuild reaches into seo.ts, and the same constraint: the
// JSON-LD a crawler reads must be built by the code the app uses, not a second
// copy that drifts. "postbuild" therefore also runs with type stripping.
import { productJsonLd, clampDescription } from "../src/lib/seo.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const dist = resolve(root, "dist");

if (!existsSync(join(dist, "index.html"))) {
  console.error("prerender: dist/index.html not found -- run `vite build` first.");
  process.exit(1);
}

const SITE_URL = (process.env.VITE_SITE_URL || "https://gogerami.com").replace(
  /\/$/,
  ""
);
const SITE_NAME = "goGerami";
const OG_IMAGE = `${SITE_URL}/android-chrome-512x512.png`;

const routes = JSON.parse(
  readFileSync(resolve(root, "src/lib/seo-routes.json"), "utf8")
);

const template = readFileSync(join(dist, "index.html"), "utf8");

const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// Mirrors the footer/header nav so a crawler without JS still has a path to
// every other indexable page. Anything added here must exist in seo-routes.json.
const NAV = ["/shop", "/gifts", "/occasions", "/collections", "/packages", "/events", "/services", "/about", "/contact"];

const organization = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: OG_IMAGE,
  email: "info@gogerami.com",
  description:
    "goGerami is an Ethiopian gift marketplace that lets people abroad send authentic gifts, flowers and experiences to family and friends in Ethiopia.",
  areaServed: { "@type": "Country", name: "Ethiopia" },
};

const webSite = {
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

function head(path, meta, { image = OG_IMAGE, ogType = "website", extraLd = [] } = {}) {
  const url = `${SITE_URL}${path}`;
  // Unmarked: site-wide and true on every route, so they must outlive any
  // client-side navigation.
  const ld = [organization, webSite];
  // Marked with data-seo: page-specific, so useSeo must be able to clear it --
  // otherwise navigating /shop -> /product/5 leaves the shop breadcrumb behind
  // on the product page. useStaticSeo re-emits the identical block on mount.
  const pageLd = [...extraLd];

  if (path !== "/") {
    pageLd.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
        { "@type": "ListItem", position: 2, name: meta.h1, item: url },
      ],
    });
  }

  return [
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:title" content="${esc(meta.title)}" />`,
    `<meta property="og:description" content="${esc(meta.description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:type" content="${ogType}" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:image" content="${esc(image)}" />`,
    `<meta property="og:locale" content="en" />`,
    `<meta property="og:locale:alternate" content="am" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(meta.title)}" />`,
    `<meta name="twitter:description" content="${esc(meta.description)}" />`,
    `<meta name="twitter:image" content="${esc(image)}" />`,
    // The fallback below sits inside #root and is visually hidden, not
    // display:none. React removes it on mount, so any crawler that runs JS
    // (Googlebot included) never sees it -- it exists purely for the ones that
    // do not. Hiding it only covers the pre-hydration window for real visitors,
    // who would otherwise get a flash of unstyled text on every cold load.
    `<style>#seo-fallback{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}</style>`,
    ...ld.map(
      (b) => `<script type="application/ld+json">${JSON.stringify(b)}</script>`
    ),
    ...pageLd.map(
      (b) =>
        `<script type="application/ld+json" data-seo>${JSON.stringify(b)}</script>`
    ),
  ].join("\n    ");
}

function fallbackBody(path, meta) {
  const links = NAV.filter((p) => p !== path)
    .map((p) => `<li><a href="${p}">${esc(routes[p].h1)}</a></li>`)
    .join("");

  return (
    `<div id="seo-fallback">` +
    `<h1>${esc(meta.h1)}</h1>` +
    `<p>${esc(meta.description)}</p>` +
    (path === "/" ? "" : `<p><a href="/">${SITE_NAME} home</a></p>`) +
    `<nav aria-label="Sections"><ul>${links}</ul></nav>` +
    `</div>`
  );
}

function writePage(path, meta, opts) {
  let html = template;

  html = html.replace(
    /<title>[\s\S]*?<\/title>/,
    `<title>${esc(meta.title)}</title>`
  );
  html = html.replace(
    /<meta\s+name="description"\s+content="[\s\S]*?"\s*\/?>/,
    `<meta name="description" content="${esc(meta.description)}" />`
  );
  html = html.replace("</head>", `  ${head(path, meta, opts)}\n  </head>`);
  html = html.replace(
    '<div id="root"></div>',
    `<div id="root">${fallbackBody(path, meta)}</div>`
  );

  const outDir = path === "/" ? dist : join(dist, path);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "index.html"), html);
}

let written = 0;
for (const [path, meta] of Object.entries(routes)) {
  writePage(path, meta);
  written++;
}

// Products are per-entity and live behind the API, so they cannot come from
// seo-routes.json. The prebuild already fetched them and wrote the list; using
// that same list is what guarantees a prerendered page exists at every product
// URL the sitemap advertises.
const manifest = resolve(root, ".seo-catalogue.json");
const products = existsSync(manifest)
  ? JSON.parse(readFileSync(manifest, "utf8"))
  : [];

for (const p of products) {
  const meta = {
    title: `${p.name} | ${SITE_NAME}`,
    description: clampDescription(
      p.description ||
        `${p.name}, delivered anywhere in Ethiopia by ${SITE_NAME}.`
    ),
    h1: p.name,
  };

  writePage(p.path, meta, {
    image: p.image || OG_IMAGE,
    ogType: "product",
    extraLd: [
      productJsonLd({
        name: p.name,
        description: p.description || undefined,
        image: p.image || undefined,
        sku: p.id,
        price: p.price,
        currency: p.currency,
        inStock: p.inStock,
        path: p.path,
      }),
    ],
  });
}

// A prerendered file that Render never serves is worse than not having it: the
// build is green, the deploy is green, and every crawler quietly keeps getting
// the generic shell. Fail here instead, while someone is still looking.
const renderYaml = readFileSync(resolve(root, "render.yaml"), "utf8");
const unserved = Object.keys(routes).filter(
  (path) => path !== "/" && !new RegExp(`^\\s*source:\\s*${path}\\s*$`, "m").test(renderYaml)
);

if (unserved.length) {
  console.error(
    `prerender: render.yaml has no rewrite rule for ${unserved.join(", ")}.\n` +
      `  Each prerendered route needs, above the /* catch-all:\n` +
      unserved
        .map((p) => `      - type: rewrite\n        source: ${p}\n        destination: ${p}/index.html`)
        .join("\n")
  );
  process.exit(1);
}

// Measured on Render: a rewrite to a file that does not exist returns 200 with
// an empty body, so the obvious `/product/*` wildcard would serve a blank page
// for every product added after the last build. Until a serving mechanism that
// degrades gracefully is in place (see SEO.md 1.8), these files are written but
// never reached -- say it out loud rather than letting a green build imply
// otherwise.
if (products.length && !/^\s*source:\s*\/product\/\*\s*$/m.test(renderYaml)) {
  console.warn(
    `prerender: ${products.length} product pages written, but render.yaml has no` +
      ` "/product/*" rewrite -- nothing serves them yet.`
  );
}

// These are served from the dist root by filename, so the catch-all cannot
// swallow them -- but a missing one silently delists the whole site.
for (const f of ["robots.txt", "sitemap.xml", "llms.txt"]) {
  if (!existsSync(join(dist, f))) {
    console.error(`prerender: dist/${f} is missing -- did the prebuild step run?`);
    process.exit(1);
  }
}

console.log(
  `prerender: ${written} routes + ${products.length} products -> dist/**/index.html`
);
