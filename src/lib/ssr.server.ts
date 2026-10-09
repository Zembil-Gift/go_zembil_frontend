import { AsyncLocalStorage } from "node:async_hooks";
import axios, { type AxiosAdapter, type AxiosResponse } from "axios";
import { data, isRouteErrorResponse } from "react-router";
import { resolvePrefs, type Prefs } from "@/lib/prefs";

// Server-side API access for route loaders. Server only (the .server suffix
// keeps it out of the browser bundle).
//
// Loaders call the same service functions the pages do, so the data -- and the
// React Query cache it seeds -- has exactly the shape the components expect.
// Those services share one axios instance whose interceptor normally reads the
// browser's globals (token, guest currency). On the server those globals would
// be shared by every concurrent request, so each loader instead runs inside a
// per-request context that src/services/api.ts reads through globalThis: it is
// browser code too and cannot import node:async_hooks itself.

export interface SsrApiContext {
  baseURL: string;
  currency: string;
  lang: string;
  adapter: AxiosAdapter;
}

const context = new AsyncLocalStorage<SsrApiContext>();
(globalThis as { __ssrApiContext?: AsyncLocalStorage<SsrApiContext> }).__ssrApiContext = context;

// Inside the box this is Caddy's internal listener (http://caddy:8080), so a
// render never leaves the machine to reach the API.
const API_URL = (
  process.env.API_INTERNAL_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:8080"
).replace(/\/$/, "");

// --- Response cache (MIGRATION-VPS-SSR.md §6.5) -----------------------------
// Public GETs only (loaders never send a token), keyed by URL + currency +
// language because the API converts prices per X-Currency. ponytail: a Map in
// one process, oldest-first eviction, one TTL. Per colour and cold after a
// deploy, which is fine; upgrade to per-route TTLs or a shared store only if
// stale prices or a cold cache actually show up.
const TTL_MS = 60_000;
const MAX_ENTRIES = 2000;
type Cached = { at: number; res: Pick<AxiosResponse, "data" | "status" | "statusText" | "headers"> };
const cache = new Map<string, Cached>();
// server.mjs reaches it here for POST /internal/purge.
(globalThis as { __ssrApiCache?: Map<string, Cached> }).__ssrApiCache = cache;

const http = axios.getAdapter(axios.defaults.adapter);

const cachedAdapter: AxiosAdapter = async (config) => {
  if ((config.method || "get").toLowerCase() !== "get") return http(config);
  const key = `${axios.getUri(config)}|${config.headers["X-Currency"]}|${config.headers["Accept-Language"]}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return { ...hit.res, config, request: undefined };

  // The http adapter rejects non-2xx, so only successful responses get here.
  const res = await http(config);
  cache.delete(key); // re-insert so the newest is last in eviction order
  cache.set(key, { at: Date.now(), res: { data: res.data, status: res.status, statusText: res.statusText, headers: res.headers } });
  if (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value!);
  return res;
};

/** Run a loader's API calls with this request's currency and language. */
export function withApi<T>(request: Request, fn: (prefs: Prefs) => Promise<T>): Promise<T> {
  const prefs = resolvePrefs(request);
  return context.run(
    { baseURL: API_URL, currency: prefs.currency, lang: prefs.lang, adapter: cachedAdapter },
    () => fn(prefs),
  );
}

/**
 * The entity a page is about. A real 404 when the API says it does not exist;
 * a 503 for anything else -- a backend outage must never tell a crawler that
 * the catalogue is gone.
 */
export async function fetchEntity<T>(fn: () => Promise<T | null | undefined> | null | undefined): Promise<T> {
  let value: T | null | undefined;
  try {
    value = await fn();
  } catch (error) {
    if (isRouteErrorResponse(error)) throw error;
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (status === 404 || status === 400) throw data(null, { status: 404 });
    console.error(JSON.stringify({ level: "error", msg: "loader upstream failure", status, error: String(error) }));
    throw data(null, { status: 503, headers: { "Retry-After": "120" } });
  }
  if (value == null) throw data(null, { status: 404 });
  return value;
}

/** Secondary data (ratings, reviews, vendor): the page renders without it. */
export async function optional<T>(fn: () => Promise<T>): Promise<T | undefined> {
  try {
    return await fn();
  } catch {
    return undefined;
  }
}
