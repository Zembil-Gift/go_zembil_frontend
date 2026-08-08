/**
 * Build-time feature flags. Vite inlines these at build, so flipping one
 * needs a rebuild/redeploy, not just an env change on a running container.
 */

// ponytail: unset => shown, so existing deploys keep current behaviour untouched.
// Only the literal string "false" hides it (Vite env values are always strings).
export const SHOW_APP_DOWNLOAD =
  import.meta.env.VITE_SHOW_APP_DOWNLOAD !== 'false';
