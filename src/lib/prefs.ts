import { LOCALE_COUNTRY_TO_CURRENCY } from "@/lib/detectGuestCurrency";

// What the server needs to know about a visitor before it renders a page, and
// how it finds out. The server cannot see localStorage or the browser's
// timezone, so these live in cookies on the frontend's own host -- set by the
// browser (PrefsSync in root.tsx), read here. MIGRATION-VPS-SSR.md §6.3, §6.6.

export const CURRENCY_COOKIE = "currency";
export const LANG_COOKIE = "lang";
// Not a credential: "this browser was signed in last time". It only lets the
// server draw the signed-in header's shape so nothing shifts when auth resolves.
export const AUTH_HINT_COOKIE = "auth_hint";

export const LANGUAGES = ["en", "am"] as const;
export type Lang = (typeof LANGUAGES)[number];

/** Where the currency came from. Only a cookie is a choice; the rest are guesses. */
export type CurrencySource = "cookie" | "country" | "default";

export interface Prefs {
  currency: string;
  currencySource: CurrencySource;
  lang: Lang;
  authHint: boolean;
}

export function readCookie(header: string | null | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq > 0 && part.slice(0, eq).trim() === name) {
      try {
        return decodeURIComponent(part.slice(eq + 1).trim());
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

/** Browser only. A year, whole site, first-party; never sent cross-site. */
export function writeCookie(name: string, value: string | null) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie =
    value === null
      ? `${name}=; Path=/; Max-Age=0; SameSite=Lax${secure}`
      : `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
}

const CURRENCY_CODE = /^[A-Z]{3}$/;

/**
 * Currency: the visitor's cookie, else their country (Cloudflare's
 * CF-IPCountry, present once gogerami.com is proxied), else USD. Language: the
 * cookie, else Amharic when the browser asks for it first, else English.
 */
export function resolvePrefs(request: Request): Prefs {
  const cookies = request.headers.get("cookie");

  const fromCookie = readCookie(cookies, CURRENCY_COOKIE);
  const country = request.headers.get("cf-ipcountry")?.toUpperCase();
  const fromCountry = country ? LOCALE_COUNTRY_TO_CURRENCY[country] : undefined;
  const [currency, currencySource]: [string, CurrencySource] =
    fromCookie && CURRENCY_CODE.test(fromCookie)
      ? [fromCookie, "cookie"]
      : fromCountry
        ? [fromCountry, "country"]
        : ["USD", "default"];

  const langCookie = readCookie(cookies, LANG_COOKIE);
  const lang: Lang = LANGUAGES.includes(langCookie as Lang)
    ? (langCookie as Lang)
    : /^am\b/i.test(request.headers.get("accept-language") ?? "")
      ? "am"
      : "en";

  return {
    currency,
    currencySource,
    lang,
    authHint: readCookie(cookies, AUTH_HINT_COOKIE) === "1",
  };
}
