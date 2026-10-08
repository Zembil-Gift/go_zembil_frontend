// Production server for the VPS (deploy/docker-compose.yml). Replaces what
// Render's static hosting did -- render.yaml's headers and rewrites -- and adds
// the one thing Render could not do: serve a prerendered page when one exists
// and fall back to the app shell when it does not (SEO-HOSTING.md §3).
//
// Phase 2 of MIGRATION-VPS-SSR.md swaps the shell fallback at the bottom for
// React Router's request handler; everything above it stays.
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIST = path.join(path.dirname(fileURLToPath(import.meta.url)), "build", "client");
const PORT = Number(process.env.PORT) || 3000;
const SHA = process.env.GIT_SHA || "dev";
// Set on every host that is not the canonical one (frontend.gogerami-api.online
// until cutover), so it never competes with gogerami.com in the index.
const NOINDEX = process.env.ROBOTS_NOINDEX === "1";

const NO_CACHE = "no-cache";
const NO_STORE = "no-cache, no-store, must-revalidate";
const IMMUTABLE = "public, max-age=31536000, immutable";

// Carried over from render.yaml. connect-src gains https://gogerami-api.online:
// the API moved there and the Render-era list never said so, which only went
// unnoticed because this is still report-only (MIGRATION-VPS-SSR.md §6.8).
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://js.chapa.co https://accounts.google.com https://appleid.cdn-apple.com https://maps.googleapis.com https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.cdnfonts.com",
  "font-src 'self' data: https://fonts.gstatic.com https://fonts.cdnfonts.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' https:",
  "connect-src 'self' https://gogerami-api.online https://*.onrender.com https://*.gogerami.com https://maps.googleapis.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://api.stripe.com https://api.chapa.co https://*.tile.openstreetmap.org https://nominatim.openstreetmap.org",
  "frame-src https://js.stripe.com https://js.chapa.co https://accounts.google.com https://appleid.apple.com https://www.youtube.com https://www.youtube-nocookie.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
].join("; ");

const app = express();
app.disable("x-powered-by");
// Caddy is the only thing that talks to this process, from the docker network.
app.set("trust proxy", "loopback, uniquelocal");

// Liveness only. Must never call the API: Caddy pulls a colour out of rotation
// when this fails, and an API outage must not take both colours with it.
app.get("/healthz", (_req, res) => {
  res.set("Cache-Control", NO_STORE).json({ status: "ok", sha: SHA });
});

// One JSON line per request, for Loki. /healthz is skipped: Caddy polls it every
// 3s per colour, which would drown out real traffic.
app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    console.log(
      JSON.stringify({
        level: res.statusCode >= 500 ? "error" : "info",
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        ms: Number(process.hrtime.bigint() - start) / 1e6,
        ip: req.ip,
        ua: req.get("user-agent"),
      }),
    );
  });
  next();
});

app.use((_req, res, next) => {
  res.set({
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
    "Permissions-Policy":
      "camera=(self), microphone=(), geolocation=(self), payment=(self), interest-cohort=()",
    // same-origin-allow-popups: Google and Apple sign-in run in a popup that
    // must keep its handle on the opener.
    "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
    "Content-Security-Policy-Report-Only": CSP,
  });
  if (NOINDEX) res.set("X-Robots-Tag", "noindex, nofollow");
  next();
});

app.use(
  express.static(DIST, {
    // /shop must fall through to the prerendered /shop/index.html below, not
    // be 301'd to /shop/ -- the canonical URLs have no trailing slash.
    redirect: false,
    setHeaders(res, file) {
      const rel = path.relative(DIST, file);
      const base = path.basename(file);
      if (rel.startsWith(`assets${path.sep}`)) res.set("Cache-Control", IMMUTABLE);
      else if (base === "sw.js" || base === "registerSW.js" || base.startsWith("workbox-"))
        res.set("Cache-Control", NO_STORE);
      else if (base.endsWith(".html") || base.startsWith("manifest.")) res.set("Cache-Control", NO_CACHE);
    },
  }),
);

// A missing hashed bundle is a 404, never the app shell: an old tab asking for
// a chunk from the previous deploy must get an error the router can recover
// from, not HTML parsed as JavaScript.
app.use("/assets", (_req, res) => res.status(404).end());

const shell = (req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD") return next();
  // nginx's `try_files $uri/index.html /index.html`. sendFile with `root`
  // decodes the path and refuses anything that escapes it.
  res.sendFile(
    `${req.path.replace(/\/+$/, "")}/index.html`,
    { root: DIST, headers: { "Cache-Control": NO_CACHE } },
    (err) => {
      // headersSent: the client went away mid-response; nothing left to do.
      if (!err || res.headersSent) return;
      res.sendFile("index.html", { root: DIST, headers: { "Cache-Control": NO_CACHE } }, (e) => e && next(e));
    },
  );
};
app.use(shell);

const server = app.listen(PORT, () => {
  console.log(JSON.stringify({ level: "info", msg: "listening", port: PORT, sha: SHA, noindex: NOINDEX }));
});

// Compose sends SIGTERM on stop; finish in-flight requests before exiting.
process.on("SIGTERM", () => server.close(() => process.exit(0)));
