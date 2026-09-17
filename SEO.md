# SEO & GEO: status, what's left, and the server-rendering path

Scope: `go_zembil_frontend` (Vite + React 18 SPA, react-router-dom v7, deployed as a
Render static site).

- **Part 0** — audit, with current status against each finding.
- **Part 1** — what is left that needs **no framework change**.
- **Part 2** — server-rendered HTML without leaving React. Where the Next.js question gets
  answered, and the answer is "probably not".
- **Part 3** — GEO (Generative Engine Optimization): visibility to ChatGPT, Perplexity,
  Claude and AI Overviews.

---

## Status

Eight commits, `4293eb9` through `8f06b53`.

| | |
|---|---|
| `4293eb9` | Per-route metadata, prerendered static routes, robots.txt, sitemap, JSON-LD |
| `55e57b1` | Shipping tab rendered; tab content kept in the DOM |
| `d731f75` | Offscreen images lazy; the two LCP elements prioritised |
| `8d14f6c` | Service and event card images on the CDN resize layer |
| `278be8d` | Service and event cards are real links |
| `be5cc2b` | Descriptive product URLs |
| `0d7fd68` | Catalogue entities in the sitemap |
| `8f06b53` | Webfont request trimmed, Gotham origin preconnected |

Verification that runs today:

```
npm run build                      # prebuild: sitemap+llms.txt · postbuild: prerender+guard
node --test src/lib/seo.check.ts   # 14 assertions over the SEO helpers
node --test src/utils/cdnImage.check.ts
```

The build fails if `render.yaml` loses a rewrite rule for a prerendered route, or if
`robots.txt` / `sitemap.xml` / `llms.txt` are missing from `dist`.

Known baseline noise, all pre-existing and unrelated: 21 `tsc` errors and 5 ESLint
"unused eslint-disable directive" errors (from the `eslint-plugin-react-hooks` v7 bump).

---

## Part 0 — Audit

| # | Finding | Status |
|---|---------|--------|
| 1 | Every URL served the same `<title>` and `<meta description>` | **Fixed** — `src/hooks/useSeo.ts`, `src/lib/seo-routes.json` |
| 2 | No `robots.txt`, no `sitemap.xml` | **Fixed** — hand-written `robots.txt`; generated `sitemap.xml` + `llms.txt` |
| 3 | No canonical, OG, Twitter card or structured data | **Fixed** — all via `useSeo`; Product/Event/Service/LocalBusiness/Breadcrumb/Organization/WebSite in `src/lib/seo.ts` |
| 4 | Crawlers received an empty `<div id="root">` | **Partly fixed** — 14 static routes prerendered. Dynamic routes still client-only; needs Part 2 |
| 5 | Homepage had no `<h1>` | **Fixed** — visually-hidden `<h1>` (the hero is a rotating graphic with no heading) |
| 6 | ~~Two `<h1>` on product and vendor pages~~ | **Retracted.** Both files contain two, but on mutually exclusive branches — the second is the early-return "not found" state. Never both in the DOM. The real issue there was a missing entity rendering under HTTP 200; those now carry `noindex` |
| 7 | Product URLs were numeric ids | **Fixed** — `/product/ethiopian-coffee-gift-set-42`, id parsed off the last segment |
| 8 | Every unknown URL returns HTTP 200 → soft 404s | **Mitigated** — `noindex` on not-found and missing-entity states. A real 404 status needs Part 2 |
| 9 | Amharic invisible to search | **Partly fixed** — `<html lang>` tracks `i18n.resolvedLanguage`. Locale URLs deliberately **not** built; see §1.9 |
| 10 | 152 `<img>`, 11 with any loading hint | **Fixed** — 149 have `loading`; the 3 exclusions are deliberate |
| 11 | CDN resize helper used in 5 files | **Partly fixed** — service and event cards added. Detail-page and landing-section images still bypass it |
| 12 | 58 `onClick` navigations with no `href` | **Partly fixed** — the two card components fixed. The rest are on `noindex` pages |
| 13 | 444 KB entry chunk | **Open** |
| 14 | Invisible to every generative engine | **Partly fixed** — static routes carry metadata, JSON-LD and a no-JS fallback. Dynamic routes need Part 2 |
| 15 | Tab content unmounted; `shipping` tab had no `TabsContent` | **Fixed** — `forceMount`, and the shipping panel now renders |

Things that were already right and were left alone:

- Access token in memory, refresh token in an **HttpOnly cookie** (`src/services/tokenManager.ts`).
  The single biggest reason server-rendering this app is feasible — see Part 2.
- Route-level code splitting via `React.lazy` for everything but the landing page.
- Deliberate `manualChunks` in `vite.config.ts` keeping `recharts`/`clsx` off the homepage.
- `gift-card.tsx` already used `<Link>`, `cdnImage`/`cdnSrcSet` and a `srcSet` — it was the
  template the service and event cards were brought up to.

---

## Part 1 — What's left, with no framework change

### 1.1 CSP is still report-only — blocked on one fact

`render.yaml:117` is `Content-Security-Policy-Report-Only`. The rename to
`Content-Security-Policy` is the whole change.

What blocks it: `connect-src` must list the production API origin, and `VITE_API_URL` is set
only in the Render dashboard. `https://*.onrender.com` and `https://*.gogerami.com` are both
already listed and almost certainly cover it — but the failure mode of being wrong is *every
API call blocked site-wide*, with nothing in the build to catch it.

Verified in support of the flip: no code makes a cross-origin `fetch`/XHR. Every external
host referenced in `src/` (`images.unsplash.com`, `grainy-gradients.vercel.app`, R2 presigned
URLs) is an `<img src>` or a CSS background, covered by `img-src 'self' data: blob: https:`.
So the API origin is the only unknown.

**To finish:** confirm the production `VITE_API_URL` origin matches one of those two
patterns, then rename the header.

### 1.2 Images: the remaining CDN work

149 of 152 `<img>` now carry `loading`, and the two LCP elements are prioritised. What
remains is the byte win: `cdnImage`/`cdnSrcSet` are used by `gift-card.tsx`,
`ServiceCard.tsx`, `EventCard.tsx` and `product-detail.tsx`, but the landing sections
(`TrendingGiftsSection`, `ShopGridSection`, `TopCategoriesSection`) and the remaining detail
pages still request full-resolution originals.

Note the correction: 142 of the 152 sit in a sized container with `object-cover`, so the
container already reserves the space. Adding `width`/`height` to those changes nothing —
this is a bandwidth problem, not a CLS problem.

### 1.3 Entry chunk is 444 KB

`landing.tsx` is the one page statically imported in `src/components/Router.tsx` — correct
for LCP. Check `stats.html` for what else rides in with it; `getCountries` (164 KB) and
`vendor-qr-scanner` (368 KB) must not be reachable from the entry graph.

### 1.4 Self-hosting the Google faces

`index.html` loads Gotham from `fonts.cdnfonts.com` plus three families from Google Fonts.
The request has been trimmed (the unused `opsz` axis dropped, `100..1000` narrowed to the
`300..800` actually used) and `fonts.cdnfonts.com` now has a `preconnect`, but both are
still third-party origins on the critical path.

**Gotham should not be self-hosted.** It is a commercially licensed Hoefler face, and
`fonts.cdnfonts.com` redistributing it is questionable on its own terms. Self-hosting it
from there moves a licensing question into this repo. That is a business decision, not a
build optimisation.

Self-hosting the three Google faces as `woff2` with `font-display: swap`, and preloading the
one used above the fold, is worthwhile and independent of the Gotham question.

### 1.5 Remaining `onClick` navigations

The two that mattered are fixed. The other ~56 are on checkout, payment, dashboard and
order-tracking pages, all `noindex`. The "Back to Events" / "Back to Services" buttons on
the detail pages are the only public ones left, and both destinations are already linked
from the header and footer, so converting them buys close to nothing.

### 1.6 Slug URLs for services, packages and vendors

Products are done. `productPath`/`productIdFromParam` in `src/lib/seo.ts` generalise to
`/services/:id`, `/packages/:id` and `/vendor/:id` with the same trailing-id trick and the
same canonical redirect. Lower value than products, same shape of work.

### 1.7 Search Console

Verify the property, submit `https://gogerami.com/sitemap.xml`, and record the baseline:
impressions, average position, indexed page count, and field CWV per template. Without it
there is no way to tell whether any of this worked.

### 1.8 What cannot be done without server rendering

- A real **HTTP 404** status. `noindex` is the best a static host can do.
- **Reviews in the initial HTML** — the most-quoted element in generative shopping answers,
  currently client-fetched by `ProductReviewsSection`.
- **Per-visitor currency** correctness on any cached page.
- Metadata on **dynamic routes** for crawlers that do not run JS. The postbuild now writes a
  real file per product (`dist/product/<slug>-<id>/index.html`, from the same list the sitemap
  uses), but nothing on a Render static site serves it:

  - `/product/foo-42` matches no file, so the `/*` catch-all returns the app shell.
  - A wildcard `/product/* -> /product/*/index.html` would serve those files, but **measured
    2026-09-17: a rewrite whose destination is missing returns HTTP 200 with an empty body**,
    not a 404 and not a fall-through. Every product created after the last build would be a
    blank white page. Unacceptable.
  - Enumerating one rewrite per product degrades gracefully — an unmatched path falls to the
    catch-all — but the list has to be regenerated and committed whenever the catalogue
    changes, since Render reads `render.yaml` from the repo, not from build output.

  So this stays blocked on either a scheduled job that regenerates those rules, or the move to
  a real server in Part 2.

### 1.9 Locale URLs — recommended against, for now

`/am/` URLs plus reciprocal `hreflang` were on the plan. On inspection they would hurt.

`src/services/api.ts` sends no `Accept-Language` header and no locale parameter, and no
catalogue field is passed through `t()` — only category names, in `CategoryCarousel.tsx`.
So the backend returns identical product names, descriptions and prices regardless of UI
language; `src/locales/amharic.json` translates chrome only.

`/am/product/coffee-set-42` would therefore be near-identical to `/product/coffee-set-42`:
double the crawl surface, an invitation to a duplicate-content split, and no new indexable
content on the pages that matter most.

**Revisit when the backend localises content** — an `Accept-Language` header on the API
client is the precondition. At that point locale routing is worth doing properly, and it is
substantially cleaner once routes render on the server (Part 2).

---

## Part 2 — Server-rendered HTML, without leaving React

### 2.0 You do not need Next.js for this

Next.js is one way to get HTML to a crawler. It is not the only one, and for this codebase
it is not the cheapest. Four options, in ladder order.

**Option A — React Router v7 framework mode. Recommended.**

`react-router-dom@7.18.2` is already installed. React Router v7 *is* Remix — the framework
merged into the router. The SSR framework is already a dependency; only its declarative half
is currently in use. Adding `@react-router/dev` turns the rest on:

- Still a **Vite** build. `vite.config.ts`, `manualChunks`, Tailwind, PostCSS, path aliases
  and the PWA plugin all survive.
- Same `<Link to>`, `useNavigate`, `useParams`. Every `<Link>` and `navigate()` call site
  **does not change**.
- A per-route `meta` export puts a real `<title>` and `<meta>` in the server response. The
  `SeoInput` shape in `src/hooks/useSeo.ts` was written to map onto it, so the per-page copy
  survives the move and only the plumbing is swapped.
- `loader()` runs on the server, so product data is in the HTML.
- A `prerender` config does build-time SSG for listed paths, including a function that
  queries the API — so products can be static with no runtime server at all.
- The ~80 dashboard routes export `clientLoader` + `HydrateFallback` and never touch the
  server data path. They behave exactly as they do today.

Against Next.js: no router rewrite, no `app/` restructure, no `"use client"` audit across
`src/components/ui/*`, no build-tool swap, no second app to run in parallel. Same outcome,
roughly a third of the work, and the escape hatch for the dashboards is a per-route export
rather than an architectural decision.

**Option B — Vite native SSR.** `vite build --ssr` with `renderToPipeableStream` and
`StaticRouter`. Pure React, maximum control, and you hand-write the server, the data-loading
convention, the caching and the streaming. That is Option A rebuilt by hand. Choose it only
if framework mode is rejected for a reason this document does not anticipate.

**Option C — build-time prerendering only. Partly shipped.** `scripts/prerender.mjs` already
does this for the 14 static routes, by string replacement over the built `index.html` rather
than a headless browser — no new dependency, no browser in CI, no component made SSR-safe.
No server, stays on Render static, costs nothing to run. For
products it would mean HTML stale until the next deploy and a build whose duration grows
with the catalogue — and the current approach cannot reach them at all, since it has no way
to render per-entity content. Viable up to a few thousand entities with a real renderer;
past that, Option A.

**Option D — dynamic rendering (Prerender.io, Rendertron, UA-sniffing a headless browser).**
Not recommended. Google classifies it as a workaround rather than a solution, it creates a
second source of truth that silently drifts from the real page, and it bills per render.
It does technically work, so keep it in mind as an emergency stopgap — not as a plan.

### 2.1 What server-rendered HTML buys

| | Vite SPA today | Server-rendered (Option A or B) |
|---|---|---|
| HTML sent to crawlers | empty `<div id="root">` | fully rendered page |
| Social/WhatsApp link previews | broken on every route | correct per entity |
| Per-page metadata | JS-injected, JS-only crawlers | in the HTML response |
| 404 | HTTP 200 soft 404 | real HTTP 404 |
| Sitemap freshness | stale until next deploy | dynamic route, revalidated |
| LCP on `/product/:id` | JS parse → hydrate → API call → paint | HTML with content in the first response |
| hreflang / `/am/` URLs | routing surgery | built-in i18n routing |
| Hosting | static CDN | Node runtime (or Vercel) |

### 2.2 The critical constraint that makes this feasible

**Only about 20 of the ~120 routes need to be server-rendered.**

Public and worth indexing: `/`, `/about`, `/contact`, `/privacy`, `/terms`, `/shop`,
`/shop/:categorySlug`, `/shop/category/:subcategorySlug`, `/gifts`, `/gifts/:categorySlug`,
`/occasions`, `/occasions/:categorySlug`, `/collections`, `/events`, `/events/:id`,
`/services`, `/services/:id`, `/packages`, `/packages/:packageId`, `/product/:id`,
`/vendor/:id`, `/gift-experiences`.

Everything under `/admin`, `/vendor`, `/delivery`, `/employee`, plus `/checkout`, `/cart`,
`/profile`, `/my-orders`, `/wishlist`, `/track`, and all `/payment/*` routes is behind auth
and has **zero** SEO value. Around 80 route definitions and the overwhelming majority of the
402 `.ts`/`.tsx` files live there.

Those do not need server rendering, loaders, metadata exports or data-fetching rewrites. They need to be *moved and made to compile*. That is the difference between a
manageable migration and a rewrite, and every plan below is built on it.

### 2.3 Option A in detail — what ports unchanged

Because framework mode is still Vite and still React Router, the list of things that do not
move is most of the repo:

- **The build.** `vite.config.ts` keeps its `manualChunks`, its aliases and its plugins.
  `@react-router/dev` is added as one more Vite plugin.
- **Every navigation call site.** 258 `<Link to>` and 58 `useNavigate()` calls are unchanged.
  `useParams`, `useSearchParams`, `useLocation` keep the same imports.
- **All of Tailwind** — `tailwind.config.js`, `postcss.config.js`, `src/index.css`, every
  class in every component.
- **All `src/components/ui/*`** (Radix + CVA). No `"use client"` directives — framework mode
  has no Server Components, so there is no boundary to audit. Components that touch `window`
  need a mount guard or a `clientLoader`, which many already have.
- **`src/services/*`** — the axios layer keeps working in the browser exactly as today.
  Only the ~20 public routes add a server-side `loader`.
- **`src/types`, `src/lib`, `src/utils`, `src/stores`, `src/hooks`.**
- **`src/locales/*.json`** and the flattening logic in `src/i18n.ts`.
- **The PWA setup.** Still Vite, so `vite-plugin-pwa` and the ~200 lines of workbox
  `runtimeCaching` stay as they are.
- **Images.** `cdnImage`/`cdnSrcSet` remain the pipeline. No `next/image` decision to make.

That list is the argument. Compare it with §2.5.

### 2.4 Option A in detail — what has to change

**1. Route configuration.** `src/components/Router.tsx` (~900 lines) becomes a `routes.ts`
plus a file per route module. Mechanical, but it is the largest single block of work and it
requires re-reading the protected-route nesting carefully rather than transcribing it.

**2. Data loading on ~20 public routes.** Each gets a `loader()` that fetches on the server.
Everything else keeps `useQuery` untouched, or moves to `clientLoader` if convenient. React
Query and loaders coexist fine; do not attempt to unify them in the same pass.

**3. Dashboards opt out explicitly.** Every route under `/admin`, `/vendor`, `/delivery`,
`/employee` exports a `clientLoader` and a `HydrateFallback` so it never renders on the
server. This is the escape hatch that keeps ~80 routes out of the migration, and it is a
two-line export per route, not an architectural decision.

**4. `meta` exports replace the `useSeo` hook.** `src/hooks/useSeo.ts` was the right call on
a pure SPA and becomes redundant the moment framework mode lands. Its `SeoInput` already
mirrors the descriptor shape a `meta` export wants, and `src/lib/seo-routes.json` holds the
static copy independently of it, so the migration is mechanical: the JSON-LD builders in
`src/lib/seo.ts` move across untouched.

**5. Auth — low risk, and the pleasant surprise.** `src/services/tokenManager.ts` keeps the
access token **in memory** and the refresh token in an **HttpOnly cookie**. Nothing auth-related
lives in `localStorage`, so there is no hydration mismatch to untangle. The axios
refresh-and-retry interceptor in `src/services/api.ts` is browser-only — keep authenticated
fetching on the client exactly as it is. The public routes that need SSR need no auth.

**6. i18n — the piece most likely to be underestimated.** `react-i18next` with a
`localStorage` detector does not survive contact with SSR: the server does not know the
visitor's language, so the first paint is always English and the client swaps after
hydration. That is a hydration mismatch *and* it leaves Amharic unindexed. The fix is locale
in the URL (`/am/shop`), resolved server-side from the path. Plan it as its own phase.

**7. Currency — easy to get wrong expensively.** `src/stores/currency-store.ts` detects guest
currency and sends `X-Currency` (`src/services/api.ts`). A prerendered or cached page rendered
in USD can be served to an ETB visitor — wrong prices, and wrong `priceCurrency` in the
JSON-LD. Options in order of preference: render prices client-side only (safe, small CLS
cost); `Vary` the cache on the currency cookie; or put currency in the URL. **Decide before
caching any page with a price on it.** This is a correctness bug, not an SEO one.

**8. Deployment.** Full SSR needs a Node service (`@react-router/serve` or a `@react-router/node`
adapter), and `render.yaml` currently describes a static site. If you use `prerender` for
everything instead, it stays static and free. The security headers and CSP stay in
`render.yaml` either way. Note the CSP is still `Content-Security-Policy-Report-Only` — worth
enforcing while this area is being touched. `.github/workflows/github-pages.yml` survives only
in the fully-prerendered case; static hosting cannot run SSR.

### 2.5 What changes *additionally* if you choose Next.js instead

Everything in §2.4, plus:

- **Full router rewrite.** `app/` directory structure; `useNavigate()` → `useRouter()`;
  `<Link to>` → `<Link href>`; `useLocation()` → `usePathname()`; `React.lazy` splitting
  deleted; `ScrollToTop.tsx` deleted; `AnalyticsPageviewTracker` rewired to `usePathname`.
  All 316 navigation call sites are touched.
- **Server/client boundary audit.** `framer-motion`, all Radix primitives, `zustand`,
  `react-i18next`, `react-hook-form`, `recharts`, `embla-carousel`, `leaflet`,
  `@react-google-maps/api`, `qrcode.react`, `html5-qrcode` are client-only. Decide the
  boundary per directory up front — scattering `"use client"` reactively as errors appear is
  how this turns into a month. Note the trap: a `/product/:id` page that ends up entirely
  `"use client"` renders nothing on the server, and the whole migration bought nothing.
- **Build-tool swap.** `vite.config.ts` and its deliberate `manualChunks` are discarded and
  re-derived in Next's bundler.
- **PWA swap.** `vite-plugin-pwa` → `@ducanh2912/next-pwa` or a hand-written service worker.
  The `runtimeCaching` rules and `navigateFallbackDenylist` port over nearly verbatim.
- **Image pipeline decision.** `next/image` with a custom loader calling `cdnImage`, *or*
  plain `<img>` with `cdnSrcSet`. Not both — double-resizing burns Cloudflare quota for
  nothing.
- **Headers and CSP** move from `render.yaml` into `next.config.js` `headers()`.

Next.js is a better framework than React Router framework mode on several axes — a larger
ecosystem, better docs, more hiring familiarity, and genuinely better caching primitives. None
of those advantages are SEO or GEO advantages. If the team wants Next.js for its own sake,
that is a legitimate reason; it is just not a reason this document supplies.

### 2.6 Phased plan

**Phase A — Part 1, on Vite. Done (`4293eb9`..`8f06b53`), with the remainder in Part 1.**
robots, generated sitemap, per-route metadata, JSON-LD, the `h1` fix, slug URLs, `noindex`
on authed routes, image loading hints, a partial `cdnImage` rollout and a trimmed webfont
request all shipped. Still open: CSP enforcement, the rest of the CDN rollout, self-hosting
the Google faces, the entry chunk, and Search Console.

Submit the sitemap and record the baseline before starting Phase B — that is what proves
whether Phase B was worth it. None of Phase A is thrown away by it.

**Phase B — React Router framework mode. ~1.5-2 weeks.**
Add `@react-router/dev`, convert `Router.tsx` to `routes.ts`, add `loader()` and `meta` to the
~20 public routes, `clientLoader` + `HydrateFallback` on everything else. Start with `ssr: false`
and a `prerender` list — that ships static HTML with no server and no new hosting bill — then
turn `ssr: true` on only if freshness demands it.

Unlike the Next.js path, there is no second app and no parallel deploy: this is a branch of
the existing repo that either passes review or does not.

**Phase C — locale routing. Blocked on the backend, not on Phase B.**
`/am/` URLs, server-side locale resolution, reciprocal hreflang. Do not start this until the
API localises catalogue content — see §1.9 for why it would currently create duplicate
pages rather than reach new searchers.

### 2.7 Per-route rendering strategy (Phase B)

| Route | Strategy | Revalidate |
|---|---|---|
| `/`, `/about`, `/contact`, `/privacy`, `/terms` | Static | on deploy |
| `/shop`, `/gifts`, `/occasions`, `/collections`, `/packages`, `/services`, `/events` | ISR | 1 h |
| `/shop/:categorySlug`, `/occasions/:categorySlug`, `/gifts/:categorySlug` | ISR + `generateStaticParams` for known categories | 1 h |
| `/product/:id`, `/services/:id`, `/packages/:id`, `/vendor/:id` | prerender + rebuild on entity change, or SSR with a short cache | 15 min or on webhook |
| `/events/:id` | ISR | 15 min |
| `/search` | SSR, `noindex` | — |
| everything authenticated | client-rendered, `noindex` | — |

Prices and stock are the thing to watch: a cached or prerendered page does not reflect a price
change until it is rebuilt. Either trigger a rebuild from the backend's product-update path,
or render the price client-side over a server-rendered shell. The JSON-LD `offers.price`
must agree with whatever the visitor sees — a mismatch between structured data and the
rendered page is a manual-action risk with Google, not just a stale number.

### 2.8 Migration guardrails

- **Do not change URLs and rendering mode in the same deploy.** The slug URLs shipped in
  `be5cc2b`; let them index before migrating. If rankings move, you know which change did it.
- **Redirect map before cutover.** Any URL that changes needs a 301. Pull the actual URL
  list from Search Console, not from `Router.tsx` — the ones with inbound links are the ones
  that matter.
- **Keep the sitemap and `robots.txt` byte-identical across the cutover.**
- **Log-check the first week.** Confirm crawlers get 200s and rendered HTML on the new
  routes, and real 404s on the dead ones.
- **Record the baseline now, before Phase B**: impressions, average position, indexed page
  count, and field CWV per template. Phase A has already shipped without one, so the sooner
  this is captured the sooner there is something to compare Phase B against.

### 2.9 Honest assessment

The SPA was not why the site did not rank. Missing titles, missing sitemap, missing
structured data and ID-based URLs were, and every one of those has now been fixed without
touching the framework.

What the SPA still costs, and what no amount of Phase A work fixes:

- broken link previews in WhatsApp, Messenger and LinkedIn for **every catalogue URL**, on
  a product whose growth loop is diaspora users sharing gift links. Static routes are
  covered by the prerenderer; products, services and events cannot be;
- soft 404s on every bad URL — `noindex` is a mitigation, not a status code;
- a slow first paint on product pages, which costs conversions as much as rankings;
- reviews and ratings absent from the HTML, the most-quoted element in AI shopping answers;
- **absence of the entire catalogue from every generative engine** — see Part 3, the
  strongest item on this list and the one with no static-host mitigation at all.

Those are real and they justify Phase B. They do not justify rewriting 80 dashboard routes,
and they do not specifically justify Next.js over the cheaper Option A.

---
## Part 3 — GEO (Generative Engine Optimization)

Visibility inside ChatGPT, Perplexity, Claude, Copilot and Google AI Overviews. Shares
Part 2's plumbing, but stricter, and the failure mode is worse.

### 3.1 Generative crawlers do not run JavaScript. At all.

`GPTBot`, `OAI-SearchBot`, `ChatGPT-User`, `PerplexityBot`, `ClaudeBot`, `Claude-SearchBot`,
`Google-Extended`, `Meta-ExternalAgent`, `Amazonbot`, `Bytespider` — all fetch raw HTML and
leave. None execute the bundle.

| | Googlebot | Generative crawlers |
|---|---|---|
| Runs JS | yes, on a delay, against a budget | **no** |
| Sees a client-rendered route | eventually, degraded | `<div id="root"></div>` |

**Where this now stands.** The 14 static routes carry real metadata, JSON-LD and a no-JS
content fallback, so they are visible. Every dynamic route — the whole catalogue — is still
an empty root to these crawlers. That remains the strongest argument for Part 2, and unlike
the classic-SEO case it has no static-host workaround.

### 3.2 `robots.txt` allows them deliberately — **decision recorded**

`public/robots.txt` explicitly allows the generative crawlers, blocks the ~30 authenticated
paths and faceted `?q=`/`?sort=` URLs, and blocks Ahrefs/Semrush/MJ12/DotBot.

Two choices worth revisiting rather than inheriting:

- **`Google-Extended`** is currently allowed. It gates AI Overviews and Gemini grounding
  *separately* from `Googlebot`; disallowing it removes goGerami from AI Overviews while
  leaving normal search untouched.
- **`GPTBot` vs `OAI-SearchBot`** are different agents — training corpus versus the live
  retrieval that powers ChatGPT citations. Both are allowed. To decline training use while
  keeping citations, set `Disallow: /` for `GPTBot` only.

### 3.3 Content is in the DOM — **fixed**

`forceMount` was used nowhere, so Radix left inactive tab content out of the DOM entirely.
Product specs, delivery terms and the vendor About panel are now mounted (Radix still sets
`hidden`, so nothing changed visually). The `shipping` tab, which had a trigger and no
`TabsContent` at all, now renders — its copy is quoted from `/terms` rather than restated,
so there is one source of truth for what the business promises.

Rule going forward: anything a buyer would ask about — specs, materials, delivery window,
returns, price, availability — belongs in the initial HTML, not behind a click.

### 3.4 Reviews are still the biggest GEO gap

Ratings and review text are what generative shopping answers quote. `ProductReviewsSection`
fetches client-side, so none of it reaches a generative crawler. When the public routes gain
server-side loaders, the review summary and the top few review bodies should be in that
first response.

### 3.5 Structured data — **shipped**

`src/lib/seo.ts` emits Product + Offer + AggregateRating, Event, Service, LocalBusiness,
BreadcrumbList, Organization and WebSite + SearchAction.

One rule is enforced by test: an `Offer` is emitted **only** when price and currency are
both known, because the backend converts prices per visitor via `X-Currency`. An assistant
quoting a wrong price from stale structured data is a support ticket, not a ranking change.

Still worth adding: `sameAs` on `Organization`, pointing at the real social profiles. That
is how an engine resolves "goGerami" to a single entity rather than an unknown string.

### 3.6 Write for extraction, not keywords

Generative engines lift **statements**, not keyword-optimised phrasing.

- "goGerami delivers gifts to Addis Ababa, Bahir Dar and Hawassa, typically within 48 hours"
  is quotable. "Fast delivery!" is not. (Only publish such a sentence if it is true —
  the shipping panel deliberately quotes `/terms` rather than inventing a number.)
- Every fact should stand alone without its surrounding paragraph; engines retrieve
  fragments, not pages.
- Specifications belong in a real `<table>`. Prices, delivery windows and coverage areas
  belong in text, never baked into an image.
- One canonical page per answerable question. Splitting "how does delivery to Ethiopia work"
  across a landing section, an FAQ and a help page gives an engine three weak candidates
  instead of one strong one.

### 3.7 `llms.txt` — shipped

Emitted by `scripts/generate-sitemap.mjs` alongside the sitemap. Adoption is not broad and
the payoff is unproven; it cost a few lines and deserves no further attention.

### 3.8 What GEO does not get from code

Generative engines cite what the wider web corroborates. Consistent NAP data, real
third-party mentions, and matching descriptions across the site, Google Business Profile and
social profiles do more for citation rate than anything in this repo.

---

## What's left, in order

1. Confirm the production API origin, then enforce CSP (§1.1) — one word, blocked on one fact.
2. Search Console: verify, submit the sitemap, record the baseline (§1.7).
3. Finish the CDN rollout on landing sections and detail pages (§1.2).
4. Self-host the Google faces; leave Gotham alone (§1.4).
5. Trim the entry chunk (§1.3).
6. `sameAs` on `Organization` (§3.5).
7. **React Router framework mode** (Part 2) — the one item that closes dynamic-route
   metadata, real 404s, server-rendered reviews and WhatsApp/Facebook link previews for the
   catalogue. Not a framework change: it is the router already in `package.json`.
8. Locale URLs — only after the backend localises content (§1.9).
