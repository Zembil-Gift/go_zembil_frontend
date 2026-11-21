# SEO, hosting and rendering: where goGerami stands and where to go next

Scope: `go_zembil_frontend`, a Vite + React 18 SPA (react-router-dom v7) deployed as a
**Render static site** (`render.yaml`, `env: static`).

This is the short version for decision-making. `SEO.md` has the full audit, file references
and migration detail. Where this file says "see §x.y", that is a section of `SEO.md`.

1. [What SEO is already done](#1-what-seo-is-already-done)
2. [What can still be improved, as an e-commerce app](#2-what-can-still-be-improved-as-an-e-commerce-app)
3. [The limits of a Render static site](#3-the-limits-of-a-render-static-site)
4. [What a VPS would give you](#4-what-a-vps-would-give-you)
5. [Server rendering: React-only vs an SSR framework](#5-server-rendering-react-only-vs-an-ssr-framework)
6. [Recommendation](#6-recommendation)

---

## 1. What SEO is already done

| Area | What exists | Where |
|---|---|---|
| Per-page metadata | Unique `<title>`, description, canonical, Open Graph, Twitter card on every route | `src/hooks/useSeo.ts`, `src/lib/seo-routes.json` |
| Structured data (JSON-LD) | Product + Offer + AggregateRating, Event, Service, LocalBusiness, BreadcrumbList, Organization, WebSite + SearchAction | `src/lib/seo.ts` |
| Price safety | An `Offer` is emitted only when price *and* currency are known (prices vary per visitor via `X-Currency`). Enforced by a test | `src/lib/seo.check.ts` |
| Crawl control | `robots.txt` blocks authenticated paths, faceted `?q=`/`?sort=` URLs and SEO-tool scrapers; AI crawlers allowed on purpose | `public/robots.txt` |
| Sitemap | Generated at build from the live API: static routes + every product, service, event and package, with `lastmod` | `scripts/generate-sitemap.mjs` (prebuild) |
| `llms.txt` | Generated alongside the sitemap | same script |
| Descriptive URLs | `/product/ethiopian-coffee-gift-set-42`, `/services/wedding-decor-7`, `/events/timket-concert-3`, `/packages/coffee-hamper-9`; old bare-id links still resolve and are replaced with the canonical form | `slugPath` / `idFromParam` in `src/lib/seo.ts` |
| Prerendered static routes | 14 routes (`/shop`, `/gifts`, `/about`, `/custom-orders`, …) get a real HTML file with metadata, JSON-LD and a no-JS content fallback | `scripts/prerender.mjs` (postbuild) |
| Prerendered catalogue pages | One HTML file per product/service/event/package is **written** to `dist/` — but **not served** yet (see §3) | same script |
| Soft-404 mitigation | `noindex` on not-found and missing-entity states and on authenticated routes | page components |
| Headings | Homepage has an `<h1>`; the "two h1" finding was retracted (mutually exclusive branches) | `SEO.md` Part 0 |
| Content in the DOM | Tab panels use `forceMount`, so specs, delivery terms and vendor "About" are in the HTML; the shipping tab now renders | `SEO.md` §3.3 |
| Crawlable links | Service and event cards are real `<a href>` links, not `onClick` | `ServiceCard.tsx`, `EventCard.tsx` |
| Core Web Vitals | Offscreen images lazy-loaded (149/152), the two LCP images prioritised, card images resized via CDN, webfont request trimmed and preconnected, route-level code splitting | `SEO.md` Part 0 #10–13 |
| Language | `<html lang>` follows the active UI language | `src/i18n.ts` |
| Build guards | Build fails if a prerendered route has no rewrite in `render.yaml`, or if `robots.txt`/`sitemap.xml`/`llms.txt` is missing | `scripts/prerender.mjs` |
| Analytics | GA4 e-commerce events (`view_item`, purchase tracking) | `src/lib/analytics.ts` |

**Bottom line:** classic on-page SEO is in good shape. What is missing is almost entirely
about **what crawlers receive in the first HTML response for catalogue pages** — and that
is a hosting/rendering problem, not a content problem.

---

## 2. What can still be improved, as an e-commerce app

Ordered by value for effort. Items marked 🔒 need server-rendered or server-served HTML (§3–§5).

### Quick wins — no infrastructure change

1. **Google Search Console + baseline.** Verify the property, submit `/sitemap.xml`, record
   impressions, average position, indexed page count and CWV per template. Without this
   there is no way to know whether anything below worked. (§1.7)
2. **Google Merchant Center free listings.** For an e-commerce site this is often worth more
   than organic ranking: products appear in the Google Shopping tab and product panels for
   free. Needs a product feed (the prebuild already fetches every product — emitting a feed
   file next to `sitemap.xml` is a small addition) and a verified domain.
3. **Richer Product JSON-LD** — the fields Google uses for merchant listings and rich results:
   - `shippingDetails` (`OfferShippingDetails`: destination Ethiopia, delivery time)
   - `hasMerchantReturnPolicy`
   - `brand` (vendor name) — the builder already supports it, pass it through
   - `priceValidUntil` on offers
   - Only publish values that are true and match `/terms`.
4. **`sameAs` on `Organization`** pointing to the real social profiles, so search and AI
   engines resolve "goGerami" to one entity. (§3.5)
5. **Category pages in the sitemap.** `/shop/:categorySlug`, `/gifts/:categorySlug`,
   `/occasions/:categorySlug` are real landing pages for queries like "birthday gifts
   Ethiopia" but the sitemap lists none of them. Add them from the categories API.
6. **Vendor pages.** `/vendor/:id` is still a bare id and not in the sitemap. Give it the same
   slug treatment as products.
7. **Category copy.** 100–200 words of unique, true text at the top or bottom of each category
   page (what's in it, delivery areas, typical occasions). Thin category pages are the most
   common e-commerce ranking gap.
8. **Breadcrumb targets.** The live product page's breadcrumb JSON-LD names the
   subcategory but points it at `/shop` (`product-detail.tsx:334`), and the prerendered page
   has only `Home › Product`. Point the category crumb at its real category URL in both.
9. **Internal linking.** "Related products" / "More from this vendor" as real `<a href>`
   links on product pages spreads crawl depth across the catalogue.
10. **Out-of-stock handling.** Keep the page live with `availability: OutOfStock` rather than
    removing it; only redirect (to the category) when a product is gone for good.
11. **Images.** Finish the CDN resize rollout on landing sections and detail pages (§1.2);
    descriptive `alt` text using the product name; consider an image sitemap for products.
12. **Entry chunk** (444 KB) and **self-hosting the Google fonts** (§1.3, §1.4) — mobile LCP
    on slow Ethiopian connections matters for both ranking and conversion.
13. **Enforce the CSP** — one header rename, blocked only on confirming the API origin. Not
    SEO, but a security win sitting one word away. (§1.1)

### Needs server-served HTML 🔒

14. 🔒 **Catalogue pages visible to non-JS crawlers.** Every AI crawler (GPTBot, ClaudeBot,
    PerplexityBot…) and every link-preview bot (WhatsApp, Facebook, Telegram, LinkedIn) sees
    an empty `<div id="root">` on product pages today. For a diaspora gifting business whose
    growth loop is *sharing a gift link on WhatsApp*, a generic preview card is a real
    conversion cost.
15. 🔒 **Reviews and ratings in the initial HTML.** The most-quoted element in AI shopping
    answers; currently fetched client-side. (§3.4)
16. 🔒 **Real HTTP 404** for deleted products and bad URLs instead of 200 + `noindex`.
17. 🔒 **Fresh prices/stock** in structured data without waiting for a redeploy.
18. 🔒 **Amharic URLs (`/am/...`) with hreflang** — only worth it once the backend returns
    translated catalogue content. (§1.9)

---

## 3. The limits of a Render static site

A Render static site is a CDN serving files from `dist/`, plus a fixed list of redirect,
rewrite and header rules read from `render.yaml`. That's its strength (free-to-cheap, fast,
zero maintenance) and its ceiling: **there is no code running per request.**

| Limit | Concrete effect on goGerami |
|---|---|
| **No fallback logic in rewrites.** Measured 2026-09-17: a rewrite to a file that doesn't exist returns **HTTP 200 with an empty body** — not a 404, not the catch-all. | The obvious `/product/* → /product/*/index.html` rule would show a **blank white page** for any product created after the last build. So the prerendered catalogue files in `dist/` are written but unreachable. |
| **Rules are static and live in the repo.** | Serving each product by its own rewrite rule works, but the list would have to be regenerated and *committed* every time the catalogue changes. |
| **Content is frozen at build time.** | New products, price changes and deletions don't reach the sitemap or prerendered HTML until the next deploy. |
| **Every unknown URL returns 200.** | Soft 404s; `noindex` is the best available mitigation. |
| **No per-request decisions.** | Can't vary on currency cookie, language, or user agent; can't do server-side 301 slug canonicalisation (currently done in the browser). |
| **Headers are static.** | Fine for security and caching headers; no per-page `Last-Modified`/`ETag` logic. |
| **Build time grows with the catalogue.** | The prebuild fetches every entity; the postbuild writes a file per entity. OK at hundreds or low thousands, slower beyond. |

### Ways around it without leaving Render static (cheapest first)

- **Scheduled rebuild.** A GitHub Actions cron that calls the Render deploy hook every few
  hours keeps the sitemap and prerendered files fresh. Doesn't solve serving, only freshness.
- **Generate per-entity rewrites into `render.yaml` and commit them** from that same job.
  Serves the catalogue pages with graceful fallback. Works, but it's a bot committing to
  the repo on a schedule — ugly, and `render.yaml` grows with the catalogue.
- **An edge function in front of Render** (e.g. a Cloudflare Worker, if the domain is proxied
  through Cloudflare): request `/product/x/index.html`; if it's missing or empty, serve
  `/index.html`. A few lines of code, and it unlocks every prerendered file already being
  built. Probably the best value-for-effort fix while staying static.

---

## 4. What a VPS would give you

A VPS (Hetzner, DigitalOcean, Contabo, etc.) is a Linux machine you control. Put nginx on it
and serve the same `dist/` folder.

### The immediate win: the prerendered catalogue just works

nginx has exactly the fallback Render's rewrites lack:

```nginx
location / {
    try_files $uri $uri/index.html /index.html;
}
```

"Serve the exact file; else the prerendered page for this URL; else the app shell."
With **no code change**, every product, service, event and package page already built by
`scripts/prerender.mjs` becomes visible to Google, AI crawlers and WhatsApp previews, and any
product newer than the last build falls back gracefully to the SPA.

### Other advantages

| Advantage | Why it matters here |
|---|---|
| **Fresh content without redeploys** | A cron job runs `npm run build` (or just the prebuild + postbuild) every hour and atomically swaps the folder. New products get a real page within the hour. |
| **Real 404s** | Once a Node process renders pages (§5), unknown products return a genuine 404. |
| **Full SSR possible** | Run a Node server for React Router framework mode, Vite SSR, or Next.js. |
| **Server-side 301s** | Redirect `/product/42` → `/product/coffee-set-42` with a real 301 instead of a client-side replace. |
| **Per-request logic** | Currency/locale handling, bot-specific caching, custom headers. |
| **Co-locate with the API** | If the backend moves to the same machine or region, server-side data fetching for SSR is fast. |
| **Predictable cost** | Flat monthly price; no per-feature pricing tiers. |
| **Logs** | Raw access logs show exactly which crawlers visit, what status they get, and how often — very useful for verifying SEO work. |

### What you give up

| Cost | Mitigation |
|---|---|
| **You are the ops team**: OS updates, security patches, firewall, SSH hardening, TLS renewal (certbot) | Use a managed image, unattended-upgrades, and keep the box single-purpose |
| **No global CDN by default** — one server in one region; slower for diaspora users far from it | Put Cloudflare (free plan) in front for caching and TLS |
| **Uptime is on you** — a crash or full disk takes the storefront down | Uptime monitor, process manager (systemd / pm2), disk alerts |
| **Deploys need setting up** (Render did this for free) | A GitHub Action that builds and `rsync`s `dist/`, or builds on the box |
| **DDoS / abuse exposure** | Cloudflare in front again |

### Middle ground: a Render *web service* instead of a VPS

If the goal is SSR but not server admin, Render also runs Node **web services**. That gives
per-request rendering and real 404s with Render still handling TLS, deploys and restarts. Note
that free-tier web services sleep when idle and cold-start slowly, which is bad for crawlers
and first visitors — use a paid instance for a storefront.

---

## 5. Server rendering: React-only vs an SSR framework

**Yes, this can be done with React alone.** React has shipped server rendering since
the beginning; Next.js is one way to use it, not a requirement. Options, cheapest first:

### Option C — build-time prerendering (what exists now)

`scripts/prerender.mjs` writes HTML per route by string replacement over the built
`index.html`: real metadata, JSON-LD and a text fallback, but **not** the rendered React page.
No server, no new dependency.

- ✅ Enough for link previews, AI crawlers and metadata — *once it's served* (§3 / §4).
- ❌ Page body is a summary, not the real product page; no reviews; stale until rebuild.
- **Upgrade inside this option:** render the real component tree at build time with
  `renderToString` from `react-dom/server` instead of string replacement. Still React-only,
  still static — but every page component on those routes must be SSR-safe (no `window`
  access during render).

### Option B — Vite native SSR (pure React, hand-built)

`vite build --ssr` + `renderToPipeableStream` (React 18) + `StaticRouter` in a small Node
(Express/Fastify) server. Maximum control, no framework.

- ✅ Real HTML per request, real 404s, fresh data.
- ❌ You hand-write routing-to-data, data serialisation to the client, caching, streaming and
  error handling. This is rebuilding a framework by hand.

### Option A — React Router v7 framework mode ⭐ recommended

`react-router-dom` v7 is **already installed** — React Router v7 *is* Remix merged into the
router. Adding `@react-router/dev` switches on the framework half:

- Still **Vite**: `vite.config.ts`, Tailwind, `manualChunks`, aliases and the PWA plugin stay.
- Same `<Link>`, `useNavigate`, `useParams` — call sites don't change.
- Per-route `loader()` fetches data on the server; per-route `meta` export replaces `useSeo`
  (its `SeoInput` shape was written to map onto it).
- A `prerender` config can do build-time SSG — **so you can start with no server at all**
  and stay on Render static, then turn on `ssr: true` later on a Node host.
- The ~80 dashboard routes opt out with `clientLoader` + `HydrateFallback` and behave exactly
  as today. Only ~20 public routes need loaders.
- Rough size: **1.5–2 weeks**. (§2.4, §2.6)

One cleanup first: 5 files still import from `wouter` (`CartButton`, `VoiceSearchButton`,
`Search.tsx`, two animations) alongside react-router. Move them to react-router before
migrating so there's one router.

### Next.js

Works, and has a bigger ecosystem and better caching primitives — but for this codebase it
means everything in Option A **plus** a full router rewrite (~316 navigation call sites),
a `"use client"` audit across Radix/zustand/framer-motion/i18n/maps, replacing Vite and the
PWA setup, and moving headers/CSP into `next.config.js`. None of that adds SEO value beyond
Option A. Choose it only if the team wants Next.js for its own reasons. (§2.5)

### Things that bite in any SSR option

- **i18n:** the `localStorage` language detector doesn't exist on the server; first paint is
  English and Amharic flips after hydration. Proper fix is locale in the URL — plan it
  separately. (§2.4 item 6)
- **Currency:** a cached page rendered in USD must not be served to an ETB visitor. Render
  prices client-side, or vary the cache on currency. **Decide before caching any price.**
  (§2.4 item 7)
- **Auth:** low risk — access token is in memory and refresh token is an HttpOnly cookie;
  keep authenticated fetching client-side as it is.
- **Guardrail:** don't change URLs and rendering mode in the same deploy; record the Search
  Console baseline first. (§2.8)

### Comparison

| | Today (Render static + prerender) | + edge fallback or VPS nginx | RR7 framework, `prerender` only | RR7 / Vite SSR on Node |
|---|---|---|---|---|
| Catalogue metadata for non-JS crawlers | ❌ written, not served | ✅ | ✅ | ✅ |
| WhatsApp/Facebook previews for products | ❌ | ✅ | ✅ | ✅ |
| Full page body (reviews, specs) in HTML | ❌ | ❌ summary only | ✅ | ✅ |
| New product visible without rebuild | ❌ | ❌ (cron rebuild helps) | ❌ (cron rebuild helps) | ✅ |
| Real HTTP 404 | ❌ | ❌ | ❌ | ✅ |
| Server admin needed | none | none (edge) / yes (VPS) | none | Render web service or VPS |
| Effort | done | hours | ~2 weeks | ~2 weeks + hosting |

---

## 6. Recommendation

1. **This week, no infra change:** Search Console + baseline, category pages and vendors in
   the sitemap, richer Product JSON-LD (`shippingDetails`, return policy, `brand`), `sameAs`,
   and a Merchant Center product feed. (§2 items 1–6)
2. **Unlock the prerendered catalogue pages you already build.** Either an edge-function
   fallback in front of Render, or move the static files to a VPS with nginx `try_files`.
   Add a scheduled rebuild for freshness. This fixes product link previews and AI-crawler
   visibility for hours of work, not weeks.
3. **When the business needs reviews in the HTML, instant freshness or real 404s:** migrate to
   React Router v7 framework mode. Start with `prerender` (can stay static), then switch on
   SSR on a Node host (Render web service or VPS) if freshness requires it. Skip Next.js
   unless there's a non-SEO reason for it.
4. **Amharic URLs** only after the API returns translated catalogue content.

The SPA was never the main reason the site didn't rank — missing titles, sitemap, structured
data and ID URLs were, and those are fixed. What's left is getting catalogue HTML to crawlers
that don't run JavaScript, and that's a serving problem first and a framework problem second.
