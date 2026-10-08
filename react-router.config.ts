import type { Config } from "@react-router/dev/config";

export default {
  // Pages, routes and root live in src/, as they did before framework mode.
  appDirectory: "src",
  // Phase 2 of MIGRATION-VPS-SSR.md: framework mode, still client-rendered.
  // The build emits build/client/index.html (root Layout + HydrateFallback)
  // and server.mjs serves it as the shell. Phase 3 turns this on.
  ssr: false,
} satisfies Config;
