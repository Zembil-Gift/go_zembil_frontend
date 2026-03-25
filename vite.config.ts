import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { visualizer } from "rollup-plugin-visualizer";



export default defineConfig({
  plugins: [react(), visualizer({ open: true })],
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

          if (
            id.includes("recharts") ||
            id.includes("framer-motion") ||
            id.includes("embla-carousel")
          ) {
            return "vendor-ui-heavy";
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
