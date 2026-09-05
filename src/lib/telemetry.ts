const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

/**
 * The only names the backend counts. Anything else is dropped there, so adding
 * one here without adding it to TelemetryController is a silent no-op.
 */
export type TelemetryEvent =
  | "maps_loaded"
  | "maps_load_failed"
  | "maps_geolocation_denied";

/**
 * Reported once per event name per page load. These answer "did the map work
 * for this visitor", not "how many times did a component mount" -- the map
 * mounts again every time the shipping step is revisited, and counting those
 * would let one user with a flaky connection dominate the failure ratio.
 */
const reported = new Set<TelemetryEvent>();

/**
 * Tells the backend something happened in the browser, so it becomes a metric
 * Prometheus can alert on.
 *
 * <p>This is not analytics -- GA4 already does that, and does it better. It
 * exists because the checkout map failing is invisible to every server-side
 * metric while it stops orders outright, and GA4's latency makes it useless as
 * an alarm.</p>
 *
 * Deliberately `fetch` and not the shared axios instance: that one carries auth
 * interceptors that refresh tokens and redirect on 401, and a fire-and-forget
 * beacon must never be able to bounce someone out of checkout. Failures are
 * swallowed for the same reason -- telemetry that breaks the page it measures
 * is worse than no telemetry.
 */
export function reportEvent(event: TelemetryEvent): void {
  if (reported.has(event)) return;
  reported.add(event);

  void fetch(`${API_URL}/api/telemetry/fe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event }),
    // Survives the page being navigated away from mid-request.
    keepalive: true,
  }).catch(() => {
    /* never surfaces to the user */
  });
}
