import { defineConfig } from "vite";
import { reactRouter } from "@react-router/dev/vite";
import path from "path";
import { visualizer } from "rollup-plugin-visualizer";
import { VitePWA } from "vite-plugin-pwa";

const CACHE_VERSION =
  process.env.GIT_SHA?.slice(0, 8) ||
  process.env.RENDER_GIT_COMMIT?.slice(0, 8) ||
  process.env.VITE_APP_VERSION ||
  process.env.npm_package_version ||
  "v1";
const CACHE_PREFIX = `gozembil-${CACHE_VERSION}`;

// The React Router plugin builds twice: the client bundle and a server bundle
// (with ssr: false that one only renders the HTML shell at build time). The
// service worker, the bundle report and the chunk layout belong to the client
// build only -- in the server build they would emit a second sw.js and split
// code that is never downloaded.
export default defineConfig(({ isSsrBuild }) => ({
  plugins: [
    reactRouter(),
    VitePWA({
      // Off in the server build: no second sw.js, but `virtual:pwa-register`
      // still resolves (to a no-op) for PwaUpdatePrompt, which the root imports.
      disable: Boolean(isSsrBuild),
      registerType: "autoUpdate",
      injectRegister: false,
      manifest: false,
      workbox: {
        cacheId: CACHE_PREFIX,
        globPatterns: ["**/*.{js,css,ico,png,svg,json,webmanifest,woff2}"],
        // banner/ holds full-size campaign artwork -- several files are 4-5 MB.
        // Precaching those would push ~9 MB into every visitor's service worker
        // on first load, and workbox fails the build outright above its 2 MB
        // per-file limit. They are still built and served normally, just not
        // precached.
        globIgnores: ["**/attached_assets/**", "**/videos/**", "**/banner/**", "stats.html"],
        navigateFallbackDenylist: [
          /^\/\.well-known(?:\/|$)/,
          /^\/api\//,
          /^\/auth\//,
          /^\/payment\//,
        ],
        // Pages are rendered per request now; there is no index.html app
        // shell to fall back to. Offline navigations are served by the
        // NetworkFirst rule below from pages already visited.
        navigateFallback: null,
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: `${CACHE_PREFIX}-navigation-shell`,
              networkTimeoutSeconds: 5,
              cacheableResponse: {
                statuses: [200],
              },
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24,
              },
            },
          },
          {
            urlPattern:
              /^https?:\/\/[^/]+\/assets\/.*\.[a-f0-9]{8,}\.(?:js|css|png|jpg|jpeg|svg|webp|avif|gif|ico|woff|woff2|ttf|otf)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: `${CACHE_PREFIX}-hashed-assets`,
              cacheableResponse: {
                statuses: [0, 200],
              },
              expiration: {
                maxEntries: 300,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
          {
            urlPattern: /^https?:\/\/[^/]+\/api\/orders(?:\?.*)?$/i,
            handler: "NetworkFirst",
            options: {
              cacheName: `${CACHE_PREFIX}-native-my-orders-cache`,
              networkTimeoutSeconds: 4,
              cacheableResponse: {
                statuses: [0, 200],
              },
              expiration: {
                maxEntries: 24,
                maxAgeSeconds: 60 * 60 * 6,
              },
            },
          },
          {
            urlPattern: /^https?:\/\/[^/]+\/api\/events\/orders(?:\?.*)?$/i,
            handler: "NetworkFirst",
            options: {
              cacheName: `${CACHE_PREFIX}-native-my-event-cache`,
              networkTimeoutSeconds: 4,
              cacheableResponse: {
                statuses: [0, 200],
              },
              expiration: {
                maxEntries: 24,
                maxAgeSeconds: 60 * 60 * 6,
              },
            },
          },
          {
            urlPattern:
              /^https?:\/\/[^/]+\/api\/service-orders\/customer(?:\?.*)?$/i,
            handler: "NetworkFirst",
            options: {
              cacheName: `${CACHE_PREFIX}-native-my-services-cache`,
              networkTimeoutSeconds: 4,
              cacheableResponse: {
                statuses: [0, 200],
              },
              expiration: {
                maxEntries: 24,
                maxAgeSeconds: 60 * 60 * 6,
              },
            },
          },
          {
            urlPattern:
              /^https?:\/\/[^/]+\/api\/custom-orders\/customer(?:\?.*)?$/i,
            handler: "NetworkFirst",
            options: {
              cacheName: `${CACHE_PREFIX}-native-my-custom-orders-cache`,
              networkTimeoutSeconds: 4,
              cacheableResponse: {
                statuses: [0, 200],
              },
              expiration: {
                maxEntries: 24,
                maxAgeSeconds: 60 * 60 * 6,
              },
            },
          },
          {
            urlPattern:
              /\/api\/(?:auth|cart|orders|service-orders|events\/orders|custom-orders|admin|vendor|delivery|users\/me|order-chat|.*payments?)(?:[/?]|$)|\/auth\//i,
            handler: "NetworkOnly",
          },
          {
            urlPattern: /\/payment(?:\/|$)|\/vendor\/onboarding\//i,
            handler: "NetworkOnly",
          },
          {
            urlPattern:
              /^https?:\/\/[^/]+\/api\/(?:v1\/products(?:\/.*)?|events(?:\/.*)?|services(?:\/.*)?|categories(?:\/.*)?|campaigns(?:\/.*)?)(?:\?.*)?$/i,
            handler: "NetworkFirst",
            options: {
              cacheName: `${CACHE_PREFIX}-public-api-cache`,
              networkTimeoutSeconds: 5,
              cacheableResponse: {
                statuses: [0, 200],
              },
              expiration: {
                maxEntries: 150,
                maxAgeSeconds: 60 * 60,
              },
            },
          },
          {
            urlPattern:
              /^https?:\/\/[^/]+\/api\/v1\/reviews\/(?:events|services)\/\d+\/summary(?:\?.*)?$/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "public-rating-summaries-cache",
              cacheableResponse: {
                statuses: [0, 200],
              },
              expiration: {
                maxEntries: 300,
                maxAgeSeconds: 60 * 60,
              },
            },
          },
          {
            urlPattern:
              /^https?:\/\/[^/]+\/api\/(?:payment-methods|currencies)(?:\/.*)?(?:\?.*)?$/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "public-config-cache",
              cacheableResponse: {
                statuses: [0, 200],
              },
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60,
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              cacheableResponse: {
                statuses: [0, 200],
              },
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.(?:googleapis|cdnfonts)\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: `${CACHE_PREFIX}-font-styles`,
              cacheableResponse: {
                statuses: [0, 200],
              },
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
          {
            urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: `${CACHE_PREFIX}-map-titles`,
              cacheableResponse: {
                statuses: [0, 200],
              },
              expiration: {
                maxEntries: 120,
                maxAgeSeconds: 60 * 60 * 24 * 14,
              },
            },
          },
          {
            urlPattern:
              /\/(?:assets|attached_assets)\/.*\.(?:png|jpg|jpeg|svg|webp|avif|gif|ico)$/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: `${CACHE_PREFIX}-app-images`,
              cacheableResponse: {
                statuses: [0, 200],
              },
              expiration: {
                maxEntries: 300,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
        ],
      },
    }),
    !isSsrBuild && visualizer({ open: !process.env.CI }),
    {
      name: "exclude-public-videos",
      apply: "build",
      generateBundle(_options, bundle) {
        for (const key of Object.keys(bundle)) {
          if (key.startsWith("videos/")) {
            delete bundle[key];
          }
        }
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@shared": path.resolve(__dirname, "src/shared"),
      "@assets": path.resolve(__dirname, "public/attached_assets"),
    },
  },
  server: {
    port: 3000,
    host: true,
  },
  // Output goes to build/client and build/server (React Router's buildDirectory).
  build: {
    rollupOptions: isSsrBuild ? undefined : {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          // ponytail: these are a few hundred bytes each, but every component
          // imports cn(). Left unnamed, rollup folded them into whichever heavy
          // vendor chunk also used them -- clsx landed inside vendor-charts, so
          // the entry statically imported 440 KB of recharts on the homepage
          // just to call cn(). Naming them keeps them out of the heavy chunks.
          if (
            id.includes("/node_modules/clsx/") ||
            id.includes("/node_modules/tailwind-merge/") ||
            id.includes("/node_modules/class-variance-authority/")
          ) {
            return "vendor-cn";
          }

          if (
            id.includes("/node_modules/react/") ||
            id.includes("/node_modules/react-dom/") ||
            id.includes("/node_modules/scheduler/")
          ) {
            return "vendor-react";
          }

          if (id.includes("react-router")) {
            return "vendor-router";
          }

          if (id.includes("@tanstack/react-query") || id.includes("axios")) {
            return "vendor-data";
          }

          // zod only shows up in form/checkout pages, all of them lazy. Bundled
          // with react-query it rode along on every first paint.
          if (id.includes("/node_modules/zod/")) {
            return "vendor-zod";
          }

          if (id.includes("recharts")) {
            return "vendor-charts";
          }

          if (id.includes("framer-motion")) {
            return "vendor-motion";
          }

          if (id.includes("embla-carousel")) {
            return "vendor-carousel";
          }

          // ponytail: no blanket @radix-ui chunk. Grouping every Radix package
          // together meant the admin/vendor dashboards' primitives shipped in
          // the same chunk as the toaster, so the homepage downloaded all of
          // Radix. Rollup's default shared-chunk splitting keeps each route to
          // the primitives it actually uses.

          if (
            id.includes("leaflet") ||
            id.includes("react-leaflet") ||
            id.includes("@react-google-maps")
          ) {
            return "vendor-maps";
          }

          if (id.includes("html5-qrcode")) {
            return "vendor-qr-scanner";
          }

          // qrcode.react is deliberately not in here: the landing page shows an
          // app-download QR, and grouping it with Stripe/Chapa dragged the
          // whole payments chunk onto the homepage's critical path.
          if (id.includes("@stripe") || id.includes("@chapa_et")) {
            return "vendor-payments";
          }
        },
      },
    },
  },
}));
