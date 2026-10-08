# Frontend migration: Render static → VPS with React Router v7 SSR

Scope: `go_zembil_frontend`, plus the small changes it needs in `reverse-proxy`,
`zembil-observability` and the backend's `.env`. Written 2026-10-08.

Read with: `SEO-HOSTING.md` (why SSR), `SEO.md` §2 (framework-mode detail),
`zembil-observability/DEPLOYMENT.md` (how the box works — this plan follows its rules).

1. [Decisions](#1-decisions)
2. [What the box looks like today](#2-what-the-box-looks-like-today)
3. [Fix before anything else: two live production bugs](#3-fix-before-anything-else-two-live-production-bugs)
4. [Target architecture](#4-target-architecture)
5. [Phases](#5-phases)
6. [SSR design details](#6-ssr-design-details)
7. [Observability](#7-observability)
8. [New features](#8-new-features)
9. [Cloudflare: questions for you, then settings](#9-cloudflare-questions-for-you-then-settings)
10. [Cutover and rollback](#10-cutover-and-rollback)
11. [Risks](#11-risks)
12. [Still open](#12-still-open)

---

## 1. Decisions

Settled during planning. Don't relitigate without a reason.

| Topic | Decision |
|---|---|
| Host | Hostinger KVM 2 (`62.72.16.76`, 2 vCPU, 7.7 GiB, Ubuntu 26.04), same box as the backend |
| Runtime | Docker Compose, image built in GitHub Actions → GHCR → pulled on the box (same as backend/bot) |
| Deploy | Blue/green (`web-blue` / `web-green`), Caddy `lb_policy first` + health check, same as backend. Deploys on push to **`serdesiyon`** (same branch as the backend) |
| Framework | React Router v7 **framework mode**, still Vite, **stay on React 18** |
| What renders on the server | Public/catalogue routes only. Every authenticated route stays client-only (`clientLoader` + `HydrateFallback`). **Authenticated SSR is dropped** — crawlers never log in, and the refresh cookie lives on `gogerami-api.online`, which a `gogerami.com` server never receives |
| Currency on the server | `currency` cookie → else Cloudflare `CF-IPCountry` → else **USD**. After hydration, if the currency was *not* from a cookie, the browser checks its timezone and, if it disagrees, switches, converts and writes the cookie. Logged-in users: their preferred currency is written to the cookie |
| Language | `lang` cookie read by the server now; `/am/` URLs later, only once the API returns translated catalogue content |
| Caching | **In the SSR server**, not Cloudflare: short-lived in-memory cache of public API responses keyed by URL + currency + language, plus an internal purge endpoint. (Cloudflare can't key its cache on a cookie below the Enterprise plan, and ignores `Vary`) |
| Hostname for now | `frontend.gogerami-api.online` (DNS-only, Let's Encrypt via Caddy like the other subdomains). `gogerami.com` moves later via §9 |
| Staging | **Deferred.** Not part of this migration; `frontend.gogerami-api.online` acts as the pre-cutover test host. When added later: same image, separate container, basic-auth + `noindex` |
| Browser errors | Extend the existing `src/lib/telemetry.ts` → `/api/telemetry/fe` → `frontend_event_total` path. No new containers |
| Header flicker (UX) | User-specific header bits render as fixed-size placeholders on the server |
| Plan location | This file |

---

## 2. What the box looks like today

Measured over SSH on 2026-10-08.

- **Resources:** 2 vCPU, 7.7 GiB RAM, **0 B swap**, 87 GB disk free, load ~0.3.
- **17 containers:** `zembil` (app-green ~960 MiB with `-Xmx1g`, Postgres), `zembil-bot`,
  `zembil-edge` (Caddy), `zembil-monitoring` (9 services, hard `mem_limit`s), **and two
  Afrodebab APIs with their own Postgres** (~930 MiB together).
- **Free:** ~4.5 GiB available. During a backend deploy a second JVM takes ~1 GiB of it.
- Caddy on the box matches `reverse-proxy/Caddyfile`. Its internal `:8080` listener
  (API, unpublished, on the `zembil` network) already exists — the SSR server uses it.
- `gogerami.com` → Cloudflare (proxied) → Render. `gogerami-api.online` → the box directly,
  not proxied.
- Node isn't installed on the host and doesn't need to be.

**Memory budget for the frontend:** `mem_limit: 384m` per colour,
`NODE_OPTIONS=--max-old-space-size=256`. Peak during a frontend deploy is ~770 MiB. Fits,
but with no swap a coincident backend deploy + traffic spike is an OOM kill waiting to
happen — Phase 0 adds a swap file.

---

## 3. Fix before anything else: two live production bugs

Found while reading `/opt/zembil/.env`. Neither is caused by the migration; both affect
customers now.

1. **Password-reset and email links are broken.** `FRONTEND_URL=https://gogerami.com/,http://localhost:3000/`.
   `SendGridEmailService` uses it as one string and only strips trailing slashes, so the reset
   link becomes `https://gogerami.com/,http://localhost:3000/reset-password?token=…`. Same for
   the logo URL and vendor-dashboard links in emails.
   **Fix:** `FRONTEND_URL=https://gogerami.com`, redeploy the backend.
2. **Telebirr payment notifications go to a dead host.**
   `TELEBIRR_NOTIFY_URL=https://zembil-gift-backend-service-yw65.onrender.com/api/webhooks/telebirr`
   returns **503**. Unless something else reconciles Telebirr payments, they never get
   confirmed. **Fix:** `https://gogerami-api.online/api/webhooks/telebirr` (and update it in
   the Telebirr merchant portal if it's registered there too).

Also, not urgent: the CSP in `render.yaml` doesn't list `https://gogerami-api.online` in
`connect-src`. It works only because the CSP is report-only. Fixed when headers move (§6.8).

---

## 4. Target architecture

```
                         Cloudflare (gogerami.com, after cutover)
                                       │
   frontend.gogerami-api.online ───────┤  (DNS-only until cutover)
                                       ▼
   ┌─────────────────────── zembil-edge: caddy :80/:443 ────────────────────────┐
   │  frontend.* / gogerami.com ──► web-blue:3000 | web-green:3000 (lb first)   │
   │  gogerami-api.online       ──► app-blue:8080 | app-green:8080 (unchanged)  │
   │  :8080 (internal only)     ──► app-blue | app-green                        │
   └────────────────────────────────────────────────────────────────────────────┘
          │ network: zembil
   ┌──────▼──────────── zembil-web (/opt/zembil-web, new) ──────────────────────┐
   │  web-blue / web-green  (profiles, one live)                                │
   │  Node 22 · Express · React Router request handler                          │
   │  loaders → http://caddy:8080/api/...  (never leaves the box)               │
   │  in-memory API cache · /healthz · /internal/purge                          │
   └────────────────────────────────────────────────────────────────────────────┘
```

- **New compose project `zembil-web`** at `/opt/zembil-web`, joining the external `zembil`
  network, deployed by this repo only. It follows the `DEPLOYMENT.md` rules: the network is
  external, only Caddy publishes ports, and `.env` stays on the box.
- **Runtime env, not rebuilds, for per-host behaviour.** `VITE_*` values are baked at build
  time; anything that differs per host is server env: `ROBOTS_NOINDEX=1` on `frontend.*`
  until cutover. Canonical URLs stay `https://gogerami.com` everywhere, which is what you
  want on a non-canonical host. (A future staging container reuses the same image.)
- **Static assets** are served by the same Node process (`build/client`, `immutable` for
  hashed files). No shared volume with Caddy. Cloudflare caches them after cutover.
- **Security headers move from `render.yaml` into the Node server.** The frontend repo keeps
  owning its own headers, and CSP needs a per-request nonce (§6.8).

---

## 5. Phases

Each phase ships on its own and changes one variable, so if something breaks you know
which change did it (`SEO.md` §2.8). Estimates assume one engineer who knows the codebase.

### Phase 0 — Prep and baseline (≈1–2 days)

- [ ] Fix the two bugs in §3.
- [ ] **Search Console baseline** (it's verified): export the last 3 months of performance
      (queries, pages), indexed page count, Core Web Vitals per template, and
      crawl stats. Save as CSV next to this file. Every later phase is judged against it.
- [x] Root tasks on the box — see §5.1. *(done 2026-10-08: 4 GiB swap, swappiness 10, `/opt/zembil-web`; ufw allows only 22/80/443)*
- [x] DNS A record at the `gogerami-api.online` DNS host: `frontend` → `62.72.16.76`,
      **before** the Caddy block is deployed (Let's Encrypt rate limits:
      5 failures/hostname/week).
- [ ] Backend `.env`: add `https://frontend.gogerami-api.online` to `ALLOWED_ORIGINS`. Leave
      `COOKIE_SAMESITE` at its prod default (`None`).
- [ ] Google OAuth client: add the origin to *Authorized JavaScript origins*. Apple
      Services ID: add the domain + return URL. Stripe: add it to *Payment method
      domains* if Apple Pay / Google Pay buttons are used.
- [x] Repo hygiene that blocks the migration:
  - Move the 5 `wouter` files (`CartButton`, `VoiceSearchButton`, `Search.tsx`,
    `SuccessAnimation`, `HeroAnimation`) to react-router, drop `wouter`.
  - Delete `.github/workflows/github-pages.yml` (it can't serve an SSR app, and the site
    isn't on Pages).
  - `node.js.yml`: drop Node 18/20 (the build already needs Node ≥22.6 for
    `--experimental-strip-types`) and replace `npm test` (no such script) with
    `type-check` + `lint` + `build`. Update the "Node 18+" line in `AGENTS.md`.
  - `visualizer({ open: true })` → `open: false`, or a CI/Docker build tries to launch a browser.
  - Make CI green for the first time: 21 type errors (an unused import of the uninstalled
    v3 `react-query` package; v4 `keepPreviousData: true` on three admin tables, which v5
    silently ignored — now `placeholderData: keepPreviousData`; an optional SKU array in
    `package-detail.tsx`) and 5 stale `eslint-disable` comments.

### Phase 1 — The current SPA on the VPS (≈2–3 days)

Proves the infrastructure (image, CI, blue/green, Caddy, monitoring) with the app as it is
today, so Phase 2/3 failures can only be code.

- [ ] `server.mjs` (Express): `express.static(dist)` with the cache headers from
      `render.yaml`; a fallback that behaves like nginx `try_files $uri $uri/index.html /index.html`.
      That fallback already **serves the prerendered product/service/event/package pages that
      Render can't serve** (`SEO-HOSTING.md` §3). Plus `/healthz` (200, build SHA, never calls
      the API) and the security headers.
- [ ] `Dockerfile` (multi-stage, `node:22-alpine`): `npm ci` → `npm run build` with `VITE_*`
      as build args → runtime stage with only production deps + `dist` + `server.mjs`.
      Non-root user, `HEALTHCHECK` on `/healthz`.
- [ ] `deploy/docker-compose.yml`: `x-web` anchor, `web-blue`/`web-green` with profiles,
      `mem_limit: 384m`, `stop_grace_period: 20s`, external `zembil` network.
- [ ] `.github/workflows/deploy.yml`, copied in shape from the backend's: type-check/lint/build
      on every branch; on the deploy branch build + push `ghcr.io/zembil-gift/go-zembil-frontend:<sha>`
      and `:latest`, rsync `deploy/` (no `--delete`), rewrite `IMAGE_TAG`, ensure the
      network, swap colours with `--wait`, stop (don't remove) the old colour. `concurrency`
      group. Deploy branch: `serdesiyon`.
      `VITE_*` values come from GitHub Actions *variables* — they're public by nature
      (inlined in the JS) and Render's dashboard has the current production values.
- [ ] `reverse-proxy`: `frontend.{$DOMAIN}` block (§6.9), `encode zstd gzip`, and the Caddy `metrics` global option.
- [ ] `zembil-observability`: probes and alerts (§7).
- [ ] Verify on `frontend.gogerami-api.online`: sign-in (Google/Apple/password), cart, a full
      Stripe + Chapa checkout, vendor/admin dashboards, PWA install/update, and
      `curl -A WhatsApp https://frontend…/product/<slug>` returns the prerendered page.

> Shortcut, if the Cloudflare work (§9) is ready early: cut `gogerami.com` over **after this
> phase**. You'd immediately get catalogue link previews and AI-crawler visibility from
> the prerendered files, and SSR would then roll out on the live host with nothing else
> changing at the same time.

### Phase 2 — Framework mode, still client-rendered (≈4–6 days)

The big refactor, with rendering behaviour unchanged (`ssr: false`).

- [ ] Add `@react-router/dev` (Vite plugin) and `@react-router/node`; keep `react-router-dom`
      imports (v7 re-exports `react-router`). `react-router.config.ts` with
      `appDirectory: "src"`, `ssr: false`.
- [ ] `src/root.tsx`: replaces `index.html` + `main.tsx` + `App.tsx`. Move the `<head>` content
      (fonts, preconnects, manifest, theme-color) into `Layout`/`links`/`meta`; providers
      (QueryClient, Auth, Tooltip, Toaster, PWA prompt, LanguageProvider) wrap `<Outlet/>`.
- [ ] `src/routes.ts`: transcribe `src/components/Router.tsx` (138 routes). Keep the layout
      nesting (`Layout`, `/vendor`, `/admin`, `/delivery` shells) as `layout()`/`prefix()`.
      `ProtectedRoute` stays as a layout-route component, so every guarded page keeps exactly
      today's behaviour. The `React.lazy` wrappers go away (framework mode splits per route
      module).
- [ ] Every authenticated route module: `export async function clientLoader() { return null }`
      plus `export function HydrateFallback()` (the existing loading skeleton). This keeps
      them client-only forever.
- [ ] `vite.config.ts`: becomes `defineConfig(({ isSsrBuild }) => …)`; apply `manualChunks`
      only when `!isSsrBuild` (it breaks or bloats the server build otherwise).
      `CACHE_VERSION` reads `GIT_SHA` instead of `RENDER_GIT_COMMIT`.
- [ ] PWA: keep `vite-plugin-pwa` and the `runtimeCaching` rules, point it at `build/client`,
      and confirm `sw.js` is still emitted and registered. Verify early — this is the one
      plugin with no first-class framework-mode story.
- [ ] `server.mjs`: swap the static fallback for `createRequestHandler` from
      `@react-router/express`.
- [ ] Deploy to `frontend.*`. Same verification list as Phase 1.

### Phase 3 — SSR for public routes (≈5–7 days)

- [ ] `ssr: true`. Public route modules get `loader` + `meta`; details in §6.
- [ ] Currency and language from cookies (§6.2, §6.3); UX fixes for the header and the
      logged-in currency (§6.4).
- [ ] Real status codes: unknown entity → **404**; old/bare-id or wrong-slug URL → **301** to
      the canonical slug (replaces the client-side `replace`); API down → **503** with
      `Retry-After`, never a 404 (a backend outage must not tell Google the catalogue is gone).
- [ ] In-memory API cache + purge (§6.5).
- [ ] Remove what SSR replaces: `scripts/prerender.mjs`, the postbuild hook, `.seo-catalogue.json`,
      the `useSeo` hook (after every route has `meta`), `render.yaml` once Render is gone.
- [ ] Load-test `frontend.*` off-peak (`autocannon` against `/`, `/shop`, a product page) to find the
      requests/s at which 2 vCPU saturate. Record it.
- [ ] Verify with `curl` (no JS): product page HTML contains the title, price in the expected
      currency, `application/ld+json` with a matching `Offer`, reviews; `/product/does-not-exist-1`
      → 404; `/product/42` → 301.

### Phase 4 — Cutover `gogerami.com` (≈1 day + 2 weeks watching)

§9 and §10.

### Phase 5 — SEO/commerce extras (≈4–6 days, any order)

§8.1.

### Phase 6 — Performance and security (≈3–4 days)

§8.2.

### Phase 7 — Decommission (after the 2-week window)

Delete the Render static site and the Render staging frontend, remove
`gogerami-staging-frontend.onrender.com` (and `frontend.*`, if no longer used) from
`ALLOWED_ORIGINS`, delete `render.yaml` and `public/_redirects`.

### 5.1 Phase 0 tasks that need root

Checked on 2026-10-08: the `deploy` user (uid 1000, in group `docker`) has no sudo, and `/opt`
is `root:root`. Docker log rotation (`10m × 3`) and unattended-upgrades are already in place,
so they aren't on this list.

```bash
# 1. Swap: 2 GiB, low swappiness, persistent across reboots.
#    The box has 0 B swap today; this is OOM insurance, not extra capacity.
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
echo 'vm.swappiness=10' > /etc/sysctl.d/99-swappiness.conf
sysctl --system

# 2. Deploy directory for the new compose project, owned by deploy (numeric on purpose,
#    see DEPLOYMENT.md "Rebuilding the box").
install -d -o 1000 -g 1000 /opt/zembil-web

# 3. Firewall state, for the plan (paste the output back; changes nothing).
ufw status verbose
```

Verify as `deploy`: `swapon --show` lists `/swapfile 2G`, `cat /proc/sys/vm/swappiness` prints
`10`, and `ls -ld /opt/zembil-web` shows `deploy deploy`.

Nothing later needs root. The Cloudflare origin certificate (Phase 4) goes in
`/opt/reverse-proxy/certs/`, which `deploy` already owns.

### 5.2 Phase 0 tasks that need other accounts (not root)

| Where | What |
|---|---|
| DNS for `gogerami-api.online` | A record `frontend` → `62.72.16.76`, DNS-only |
| `/opt/zembil/.env` + backend redeploy | Fix `FRONTEND_URL` and `TELEBIRR_NOTIFY_URL` (§3); add `https://frontend.gogerami-api.online` to `ALLOWED_ORIGINS` |
| Telebirr merchant portal | Notify URL, if it's registered there |
| Google Cloud Console | OAuth client → *Authorized JavaScript origins* + `https://frontend.gogerami-api.online` |
| Apple Developer | Services ID → domain `frontend.gogerami-api.online` + return URL |
| Stripe Dashboard | *Payment method domains* + `frontend.gogerami-api.online` (only if Apple/Google Pay buttons are used) |
| GitHub `Zembil-Gift/go_zembil_frontend` → Settings → Secrets | `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` (same values as the backend repo) |
| Same repo → *Variables* | Every `VITE_*` value from the Render dashboard's production environment, plus `VITE_SITE_URL=https://gogerami.com` |
| GHCR | After the first image push: make sure the box's `docker login ghcr.io` credential can pull `go-zembil-frontend` (org package visibility/access) |

---

## 6. SSR design details

### 6.1 Which routes render on the server

| Server-rendered + indexable | `/`, `/about`, `/contact`, `/privacy`, `/terms`, `/shop`, `/shop/:categorySlug`, `/shop/category/:subcategorySlug`, `/gifts`, `/gifts/:categorySlug`, `/occasions`, `/occasions/:categorySlug`, `/collections`, `/packages`, `/packages/:packageId`, `/services`, `/services/:id`, `/events`, `/events/:slug`, `/product/:id`, `/vendor/:id`, `/campaigns/:id`, `/gift-experiences`, `/custom-orders`, `/custom-orders/categories`, `/custom-orders/category/:categoryId` |
|---|---|
| Server-rendered shell, `noindex` | `/signin`, `/signup`, `/forgot-password`, `/reset-password`, `/verify-email`, `/vendor-signup`, `/partner-signup`, 404 |
| Client-only (`clientLoader`) | Everything behind `ProtectedRoute` and the `/vendor/*`, `/admin/*`, `/delivery/*` dashboards, plus `/cart` and `/offline` |

### 6.2 Data loading without rewriting components

Components keep their `useQuery` calls. Loaders **prefetch the same query keys** into a
per-request `QueryClient`. The root dehydrates it and wraps the app in a `HydrationBoundary`,
so on the client the queries are already filled and nothing refetches.

- Product detail already keys on currency (`["products","detail",productId,activeCurrency]`),
  and `useActiveCurrency` falls back to `'default'`. On the server the resolved code (e.g.
  `"USD"`) must be used, and the client store must be seeded with it before hydration, or the
  keys won't match and every page refetches.
- **No module-level request state on the server.** `queryClient` (`src/lib/queryClient.ts`),
  `tokenManager`, the zustand stores and the i18next instance are singletons. On a server they
  are shared by every concurrent request — one visitor's currency or language leaking into
  another's page. Create the QueryClient and the i18n instance per request
  (`i18n.cloneInstance({ lng })`), and never write to zustand on the server.
- Server-side fetches go to `API_INTERNAL_URL=http://caddy:8080` with explicit `X-Currency`
  and `Accept-Language` headers taken from the request. They don't use the axios instance
  (its interceptors read `tokenManager` and the global currency store). The public service
  functions take an optional base URL/headers argument; the browser path stays exactly as
  it is.
- `App.tsx` runs `detectCurrency()` and `initAnalytics()` at module load. Both touch browser
  APIs, so they move into a client-only effect.
- **SSR-safety pass:** 98 files touch `window`/`document`/`localStorage`/`navigator`, but only
  those imported by the routes in §6.1 matter. Render each public route on the server and fix
  what throws: guard with `typeof window`, move it into `useEffect`, or wrap it in a
  client-only boundary. Leaflet and `@react-google-maps/api` touch `window` at import time and
  must be lazy-loaded inside a client-only component.

### 6.3 Currency

```
server:  cookie `currency`  →  getCurrencyForCountry(CF-IPCountry)  →  "USD"
         (reuse src/lib/countryConfig.ts)        root loader returns { currency, source }
client:  seed store with loader currency before hydrate
         if source !== "cookie":
             tz = detectGuestCurrency()          (existing, timezone-based)
             if tz && tz !== currency: set store + cookie → queries refetch (keys include currency)
         currency toggle / logged-in preference  → write cookie
```

- Cookie: `currency=ETB; Path=/; Max-Age=31536000; SameSite=Lax; Secure`, set from JS on the
  frontend's own host.
- `source` matters: a currency someone *chose* (cookie) is never overridden by the timezone
  guess, but a server *guess* (country/default) is.
- Until cutover, `frontend.*` isn't behind Cloudflare, so there's no `CF-IPCountry`. First
  visits render USD and the client corrects. Expected, not a bug.
- JSON-LD `Offer.priceCurrency` comes from the same value as the visible price, so a page
  and its structured data always agree.

### 6.4 The two UX fixes

- **Header flicker:** the server doesn't know who's logged in. Sign-in/avatar, cart badge
  and wishlist hearts render as **fixed-size placeholders** (same box, `aria-hidden`) until
  `tokenManager` initialization completes on the client, then swap. No layout shift. The
  test is CLS ≈ 0 on `/` and a product page in Lighthouse with a logged-in session.
- **Logged-in currency:** whenever the auth user loads or `preferredCurrencyCode` changes,
  write the `currency` cookie. The next server render is already in their currency.

### 6.5 Cache and purge

- A `Map`-based cache in `server.mjs`, keyed `METHOD url | currency | lang`, holding parsed API
  JSON. TTL **60 s** for detail endpoints and **300 s** for lists/categories, max ~2,000 entries
  (oldest evicted first), so memory stays well under the 256 MB heap. Only public `GET`s are
  cached, and only 200s.
- `POST /internal/purge` with `{ "prefix": "/api/v1/products/42" }` or `{ "all": true }`,
  checked against an `INTERNAL_PURGE_TOKEN` header. Caddy returns 404 for `/internal/*` on
  every public host, so it's reachable only over the `zembil` network.
- Backend side, a later and optional change: call `http://web-blue:3000/internal/purge` and
  `web-green` (ignore the stopped one) after product/price/stock updates. With a 60 s TTL,
  ship without it first and add it only if stale prices are actually noticed.
- Each colour has its own cache, and it's cold after a deploy. That's fine.

### 6.6 Language

- i18next detector order becomes `['cookie', 'localStorage', 'navigator']` with
  `caches: ['cookie', 'localStorage']`. That's built into `i18next-browser-languagedetector`;
  no new code.
- Server: read the cookie, bundle both `english.json` and `amharic.json` into the server build,
  clone the instance per request, set `<html lang>`.
- Client: the existing `i18nReady` (lazy Amharic chunk) is awaited **before** `hydrateRoot`,
  so an Amharic visitor gets Amharic HTML and Amharic hydration with no mismatch.
- No `/am/` URLs and no hreflang yet. Pages still index in English (Googlebot sends no cookie).

### 6.7 Metadata

`meta` exports replace `useSeo`. `src/lib/seo-routes.json` (static routes) and the JSON-LD
builders in `src/lib/seo.ts` move across unchanged. `seo.check.ts` keeps running in CI.
`frontend.*` adds `X-Robots-Tag: noindex` from `ROBOTS_NOINDEX`.

### 6.8 Headers and CSP

All headers from `render.yaml` move into `server.mjs`, plus `connect-src https://gogerami-api.online`.
Phase 6 adds a per-request nonce: `<Scripts nonce>`, `<ScrollRestoration nonce>` and
`renderToPipeableStream({ nonce })`. Then `script-src 'nonce-…' 'strict-dynamic'`, in
report-only mode first, and finally **enforced**. That's the step `render.yaml` could never
take. `'unsafe-eval'` stays only if a payment SDK proves it needs it.

### 6.9 Caddy blocks (reverse-proxy repo)

```caddy
(web) {
	@internal path /internal/*
	respond @internal 404
	reverse_proxy web-blue:3000 web-green:3000 {
		health_uri /healthz
		health_interval 3s
		health_timeout 2s
		lb_policy first
	}
}

frontend.{$DOMAIN} {
	encode zstd gzip
	import web
}

# Phase 4 — gogerami.com behind Cloudflare (§9)
# gogerami.com, www.gogerami.com {
#	tls /certs/cf-origin.pem /certs/cf-origin.key   # Cloudflare Origin CA cert
#	@notcf not remote_ip <Cloudflare IPv4/IPv6 ranges>
#	abort @notcf                                    # origin reachable only via Cloudflare
#	@www host www.gogerami.com
#	redir @www https://gogerami.com{uri} 301
#	import web
# }
# global: servers { trusted_proxies static <Cloudflare ranges> } so logs and
# X-Forwarded-For carry the visitor's IP, not Cloudflare's.
```

---

## 7. Observability

Everything lands in the existing stack. No new containers.

| What | How |
|---|---|
| Is it up | Blackbox probes in `prometheus/targets` (rendered from `$DOMAIN`): `https://frontend.$DOMAIN/healthz`, and after cutover `https://gogerami.com/` |
| **Is it still SSR** | A blackbox module with `fail_if_body_not_matches_regexp: ['application/ld\+json']` against one stable product URL. Catches the silent failure where pages fall back to an empty shell and every metric stays green |
| Traffic, errors, latency | Caddy `metrics` with `per_host`; Prometheus scrapes `caddy:2019/metrics` (internal only). Per host: request rate, 5xx ratio, p95 latency |
| Logs | `server.mjs` writes one JSON line per request (`method`, `path`, `status`, `ms`, `cache: hit/miss`, `route`). Promtail already picks up every container; add a `{service=~"web-.*"}` stage that lifts `level` and `status` into labels |
| Browser errors | Add `js_error`, `hydration_mismatch` and `chunk_load_failed` to `TelemetryEvent` and to `ALLOWED_EVENTS` in the backend's `TelemetryController`. Report from `window.onerror`/`unhandledrejection`, React's `onRecoverableError` (hydration) and the router's chunk-load failure. Same once-per-page-load rule as today |
| Alerts (`rules.yml`) | `FrontendDown` (probe failing 2 min), `FrontendNotServerRendering` (SSR probe failing 10 min), `Frontend5xxHigh` (>2 % for 10 min), `FrontendSlow` (p95 >1.5 s for 15 min), `HydrationErrorsSpiking` (rate of `frontend_event_total{event="hydration_mismatch"}`) |
| Dashboard | `frontend-ssr.json` committed under `grafana/provisioning/dashboards` (files only, `allowUiUpdates: false`) |
| Containers | cAdvisor already sees `web-*`; the existing `CPU & Memory` dashboard covers them |

---

## 8. New features

### 8.1 SEO/commerce (Phase 5)

| Feature | Notes |
|---|---|
| **Live `sitemap.xml`** | A resource route that builds from the API on request, cached 1 h. New products appear without a rebuild. Replaces `generate-sitemap.mjs` (prebuild). `llms.txt` the same way |
| **Category pages in the sitemap** | `/shop/:categorySlug`, `/gifts/:categorySlug`, `/occasions/:categorySlug` from the categories API |
| **Vendor slug URLs** | `/vendor/:id` → `/vendor/<name>-<id>` with a server 301 from the bare id, via the existing `slugPath`/`idFromParam` |
| **Richer Product JSON-LD** | `brand` (vendor), `shippingDetails`, `hasMerchantReturnPolicy`, `priceValidUntil`. Only values that are true and match `/terms` |
| **Reviews in the HTML** | Product/service/event loaders include the rating summary and first N reviews. This is the biggest GEO gap (`SEO.md` §3.4) |
| **Breadcrumbs** | Category crumb points at its real category URL (`product-detail.tsx:334`) |
| **Google Merchant Center feeds** | Targets **USA and Ethiopia**: two resource routes, `/merchant-feed-us.xml` (USD, `g:shipping` country US) and `/merchant-feed-et.xml` (ETB, country ET), each fetched from the API with that currency's `X-Currency`. Prices must match what a visitor from that country sees on the landing page, which §6.3 guarantees (country → currency). Needs a Merchant Center account (none yet), linked to the verified Search Console property. Note: Google's free-listing/Shopping coverage for Ethiopia is not guaranteed — the ET feed is cheap to emit, but check eligibility in Merchant Center before relying on it |
| **Share images** | Start with the product's own photo resized to 1200×630 through the existing `cdnImage` (zero new deps). Generated branded cards (satori/resvg) only if previews still look weak — that's real CPU on a 2-vCPU box |
| **`sameAs` on Organization** | Real social profile URLs |

### 8.2 Performance and security (Phase 6)

- Enforced CSP with nonces (§6.8).
- Self-host DM Sans / Playfair / Nunito / Gotham under `/fonts` (`immutable`). That removes
  three third-party origins from the critical path and from the CSP.
- Streaming SSR for product pages: render the shell and above-the-fold content
  immediately, and stream reviews/related products behind `<Suspense>` with `defer`-style
  promises from the loader.
- Compression: Caddy `encode zstd gzip` before cutover; Cloudflare Brotli after.
- Revisit the 444 KB entry chunk once framework mode splits per route (`SEO.md` §1.3).

### 8.3 Ops

Covered by §5 Phase 0/1 and §7: swap, blue/green with one-command rollback, health checks,
probes, alerts, dashboard. Staging is deferred.

---

## 9. Cloudflare: questions for you, then settings

### 9.1 Please check and tell me (screenshots are fine)

1. **Plan** for `gogerami.com`: Free / Pro / Business? *(Dashboard → Overview, right column)*
2. **SSL/TLS encryption mode**: Off / Flexible / Full / Full (strict)? *(SSL/TLS → Overview)*
3. **DNS records** for `gogerami.com` and `www`: type and target (probably a CNAME to Render),
   and proxied (orange) or not. Also any `TXT` record starting `google-site-verification`
   — that's how Search Console is verified, and it must survive the cutover. *(DNS → Records)*
4. Is **`gogerami-api.online`** in this Cloudflare account too, or is its DNS at the
   registrar (Hostinger)? Who can add records there?
5. Any **Page Rules, Redirect Rules, Cache Rules, Transform Rules, Workers**? In particular,
   what does the `www → gogerami.com` redirect today? *(Rules → Overview; Workers Routes)*
6. **Bots:** Is *Bot Fight Mode* on? Is *Block AI bots* / *AI Crawl Control* blocking anything?
   Is *Managed robots.txt* on? *(Security → Bots; AI Crawl Control)*
7. **Scrape Shield → Email Address Obfuscation**, **Speed → Rocket Loader**: on or off?
8. **Edge Certificates:** is HSTS enabled in Cloudflare? Minimum TLS version?
9. **Network → IP Geolocation**: on? (Needed for `CF-IPCountry`.)

### 9.2 What to set (at cutover, unless noted)

| Setting | Value | Why |
|---|---|---|
| Origin certificate | *SSL/TLS → Origin Server → Create certificate*, hostnames `gogerami.com, *.gogerami.com`, 15 years, PEM. Place on the box at `/opt/reverse-proxy/certs/` (chmod 600, never in git) | Caddy can't reliably get Let's Encrypt certs for an orange-clouded hostname; Origin CA certs are free and trusted by Cloudflare |
| SSL/TLS mode | **Full (strict)** | Encrypted and verified Cloudflare → box |
| Always Use HTTPS | On | |
| Minimum TLS | 1.2; TLS 1.3 on | |
| HTTP/3, Brotli | On (defaults) | |
| **Rocket Loader** | **Off** | Rewrites `<script>` tags → breaks hydration and the CSP nonce |
| **Email Address Obfuscation** | **Off** | Rewrites HTML → hydration mismatch on any page showing an email (contact, footer) |
| **Block AI bots / AI Crawl Control** | **Allow** | `robots.txt` deliberately allows AI crawlers for GEO (`SEO.md` §3.2). Cloudflare blocks them by default on newer zones — that would silently undo the main point of SSR |
| Managed robots.txt | Off | Our `robots.txt` is the source of truth |
| Bot Fight Mode | Off (or verify WhatsApp/Facebook/LinkedIn previews and Googlebot still get 200s) | It can challenge link-preview bots, and on Free it can't be bypassed by rules |
| IP Geolocation | On | `CF-IPCountry` for currency |
| Caching | **No** "Cache Everything" rule. Default caching (static by extension) is right | HTML varies by currency/language; our cache is in the server |
| HSTS | Leave it to the origin header (already sent) or match it exactly | Two different HSTS policies are confusing; `preload` is already in the origin header |
| DNS (the switch) | `gogerami.com`: replace the Render CNAME with **A `62.72.16.76`, proxied**. `www`: CNAME `gogerami.com`, proxied | Proxied records switch instantly; no TTL wait |

No Cloudflare API token is needed. Cache purging happens in our server, not at Cloudflare.

---

## 10. Cutover and rollback

**Preconditions:** Phase 3 verified on `frontend.*` for at least a few days. §9.1 answered,
the origin cert on the box, the `gogerami.com` Caddy block deployed (the cert is local, so it
doesn't depend on DNS). `curl --resolve gogerami.com:443:62.72.16.76 https://gogerami.com/`
returns the SSR page. Backend `ALLOWED_ORIGINS` still contains `https://gogerami.com`.

**Day of** (low-traffic window; Addis Ababa night):

1. Set the Cloudflare settings in §9.2 that are safe to set before the switch (Rocket Loader,
   obfuscation, AI bots, Full (strict) — Render serves valid TLS too, so strict is safe).
2. Switch the DNS record (§9.2, last row).
3. Check immediately: home, a product page with JS disabled, sign-in, one real low-value
   Stripe payment and one Chapa payment (their return URLs already point at `gogerami.com`),
   Telebirr return, a WhatsApp link preview, `robots.txt` and `sitemap.xml` byte-compared
   with the old ones.
4. Search Console: URL-inspect 5 product URLs, resubmit the sitemap.
5. Remove `ROBOTS_NOINDEX` from the prod colours. `frontend.*` keeps serving the same app;
   its `noindex` header and `gogerami.com` canonical keep it out of the index.

**Rollback:** put the Render CNAME back in Cloudflare. That's instant, and Render is still
deployed and untouched. Keep it that way for **2 weeks**. Within the VPS, rolling back a
bad frontend deploy is the same as the backend:
`docker compose --profile <old> start web-<old>`, then stop the new one.

**First 2 weeks:** watch the Grafana frontend dashboard, the Caddy access logs for Googlebot
status codes (expect 200s, real 404s, a handful of 301s, **no 5xx**), and Search Console
crawl stats and coverage against the Phase 0 baseline. Don't change URLs during this window.

---

## 11. Risks

| Risk | Mitigation |
|---|---|
| OOM on an 8 GB box with no swap | Swap file (Phase 0), `mem_limit` + heap cap on `web-*`, measure during a backend deploy |
| 2 vCPU saturate under a crawl burst or traffic spike | API-response cache, load test in Phase 3, alert on `FrontendSlow`; Cloudflare absorbs assets. Upgrade path: KVM 4 |
| Cross-request leakage (currency/language/user) via server singletons | §6.2 rules; a test that renders two requests with different cookies concurrently and asserts each page's currency |
| Hydration mismatches (timezone, `Date.now()`, random IDs, locale formatting) | `onRecoverableError` telemetry + alert; render dates in a fixed timezone on the server; `useId` for IDs |
| Wrong currency in a cached response | Currency and language are part of the cache key; only anonymous public `GET`s are cached |
| Backend outage turns into 404s in Google | Loaders throw 503 on upstream failure, 404 only on a real "not found" from the API |
| The PWA service worker serves a stale shell after the switch | The `NetworkFirst` navigation rule already prefers the network; `skipWaiting`/`clientsClaim` on; bump `CACHE_VERSION` from the git SHA |
| A Caddyfile typo takes down the API, bot and Grafana with the site | The reverse-proxy pipeline already validates on CI and on the box; add the new blocks in their own commit |

---

## 12. Still open

Settled 2026-10-08: deploy branch `serdesiyon`; staging deferred; Merchant Center targets
USA and Ethiopia; root tasks in §5.1.

1. **Who implements**, and is there a date the cutover must happen by?
2. **Merchant Center account:** create it at the start of Phase 5.
3. **Cloudflare answers** (§9.1): needed before Phase 4, not before.
