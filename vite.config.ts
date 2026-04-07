import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { visualizer } from "rollup-plugin-visualizer";
import { VitePWA } from "vite-plugin-pwa";



export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      injectRegister: false,
      manifest: false,
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,json,webmanifest,woff2}"],
        globIgnores: ["**/attached_assets/**", "**/videos/**", "stats.html"],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern:
              /^https?:\/\/[^/]+\/(?:shop|shops|events|service|services|my-custom-order(?:s)?|my-ticket(?:s)?|my-order(?:s)?|my-service-order(?:s)?)(?:\/.*)?(?:\?.*)?$/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "native-route-shell-cache",
              networkTimeoutSeconds: 3,
              cacheableResponse: {
                statuses: [0, 200],
              },
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },
            },
          },
          {
            urlPattern: /^https?:\/\/[^/]+\/api\/orders(?:\?.*)?$/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "native-my-orders-cache",
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
              cacheName: "native-my-event-orders-cache",
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
              cacheName: "native-my-service-orders-cache",
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
              cacheName: "native-my-custom-orders-cache",
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
              cacheName: "public-api-cache",
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
              cacheName: "font-stylesheets",
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
              cacheName: "map-tiles",
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
              cacheName: "app-images",
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
