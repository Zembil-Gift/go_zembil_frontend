import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { visualizer } from "rollup-plugin-visualizer";
import { VitePWA } from "vite-plugin-pwa";

const CACHE_VERSION =
  process.env.RENDER_GIT_COMMIT?.slice(0, 8) ||
  process.env.VITE_APP_VERSION ||
  process.env.npm_package_version ||
  "v1";
const CACHE_PREFIX = `gozembil-${CACHE_VERSION}`;

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false,
      manifest: false,
      workbox: {
        cacheId: CACHE_PREFIX,
        globPatterns: ["**/*.{js,css,ico,png,svg,json,webmanifest,woff2}"],
        globIgnores: ["**/attached_assets/**", "**/videos/**", "stats.html"],
        navigateFallbackDenylist: [
          /^\/\.well-known(?:\/|$)/,
          /^\/api\//,
          /^\/auth\//,
          /^\/payment\//,
        ],
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
    visualizer({ open: true }),
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
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (
            id.includes("/node_modules/react/") ||
            id.includes("/node_modules/react-dom/") ||
            id.includes("/node_modules/scheduler/")
          ) {
            return "vendor-react";
          }

          if (id.includes("react-router") || id.includes("wouter")) {
            return "vendor-router";
          }

          if (
            id.includes("@tanstack/react-query") ||
            id.includes("axios") ||
            id.includes("zod")
          ) {
            return "vendor-data";
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

          if (id.includes("@radix-ui")) {
            return "vendor-radix";
          }

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

          if (
            id.includes("@stripe") ||
            id.includes("@chapa_et") ||
            id.includes("qrcode.react")
          ) {
            return "vendor-payments";
          }
        },
      },
    },
  },
}); 
