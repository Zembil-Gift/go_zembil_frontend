import type { Config } from "@react-router/dev/config";

export default {
  // Pages, routes and root live in src/, as they did before framework mode.
  appDirectory: "src",
  // Server rendering (MIGRATION-VPS-SSR.md Phase 3). Public pages render on
  // the server; everything behind a login opts out with a clientLoader +
  // HydrateFallback in its layout route (src/routes/protected.tsx and the
  // admin/vendor/delivery modules), exactly as it rendered before.
  ssr: true,
} satisfies Config;
