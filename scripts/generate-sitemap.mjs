#!/usr/bin/env node
/**
 * Writes public/sitemap.xml from the shared route table in src/lib/seo-routes.json.
 *
 * ponytail: static routes only. Products, services, events and vendors live
 * behind the API and would need a build-time fetch with credentials; until the
 * public routes render on the server there is nowhere to get a reliable
 * lastmod for them either. Add a second pass here when that lands -- the file
 * format and the writer below do not change, only the source of the URL list.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

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

const urls = Object.entries(routes)
  .map(
    ([path, meta]) =>
      `  <url>\n` +
      `    <loc>${SITE_URL}${path === "/" ? "/" : path}</loc>\n` +
      `    <lastmod>${lastmod}</lastmod>\n` +
      `    <changefreq>${meta.changefreq}</changefreq>\n` +
      `    <priority>${meta.priority.toFixed(1)}</priority>\n` +
      `  </url>`
  )
  .join("\n");

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
  `sitemap.xml: ${Object.keys(routes).length} urls · llms.txt written`
);
