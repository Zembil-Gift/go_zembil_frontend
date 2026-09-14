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
 * download in CI and no component to be SSR-safe. The ceiling is that only
 * static routes are covered -- /product/:id and friends need real server
 * rendering (see docs/SEO.md Part 2) because their content is per-entity and
 * lives behind the API.
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

function head(path, meta) {
  const url = `${SITE_URL}${path}`;
  // Unmarked: site-wide and true on every route, so they must outlive any
  // client-side navigation.
  const ld = [organization, webSite];
  // Marked with data-seo: page-specific, so useSeo must be able to clear it --
  // otherwise navigating /shop -> /product/5 leaves the shop breadcrumb behind
  // on the product page. useStaticSeo re-emits the identical block on mount.
  const pageLd = [];

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
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:image" content="${OG_IMAGE}" />`,
    `<meta property="og:locale" content="en" />`,
    `<meta property="og:locale:alternate" content="am" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(meta.title)}" />`,
    `<meta name="twitter:description" content="${esc(meta.description)}" />`,
    `<meta name="twitter:image" content="${OG_IMAGE}" />`,
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

let written = 0;
for (const [path, meta] of Object.entries(routes)) {
  let html = template;

  html = html.replace(
    /<title>[\s\S]*?<\/title>/,
    `<title>${esc(meta.title)}</title>`
  );
  html = html.replace(
    /<meta\s+name="description"\s+content="[\s\S]*?"\s*\/?>/,
    `<meta name="description" content="${esc(meta.description)}" />`
  );
  html = html.replace("</head>", `  ${head(path, meta)}\n  </head>`);
  html = html.replace(
    '<div id="root"></div>',
    `<div id="root">${fallbackBody(path, meta)}</div>`
  );

  const outDir = path === "/" ? dist : join(dist, path);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "index.html"), html);
  written++;
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

// These are served from the dist root by filename, so the catch-all cannot
// swallow them -- but a missing one silently delists the whole site.
for (const f of ["robots.txt", "sitemap.xml", "llms.txt"]) {
  if (!existsSync(join(dist, f))) {
    console.error(`prerender: dist/${f} is missing -- did the prebuild step run?`);
    process.exit(1);
  }
}

console.log(
  `prerender: ${written} routes -> dist/**/index.html (all served by render.yaml)`
);
