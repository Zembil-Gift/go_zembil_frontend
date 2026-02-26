/**
 * Detects the most appropriate currency for unauthenticated (guest) users
 * based on their browser timezone and language — no API calls, no permission prompts.
 *
 * Detection strategy:
 *   1. IANA timezone → country → currency  (most reliable, ~90%+ accuracy)
 *   2. navigator.language locale → country → currency (fallback)
 *   3. null  (let backend use system default)
 */

const TIMEZONE_TO_CURRENCY: Record<string, string> = {
  // ── Ethiopia ──────────────────────────────────────────
  'Africa/Addis_Ababa': 'ETB',

  // ── United States ─────────────────────────────────────
  'America/New_York':       'USD',
  'America/Chicago':        'USD',
  'America/Denver':         'USD',
  'America/Los_Angeles':    'USD',
  'America/Phoenix':        'USD',
  'America/Anchorage':      'USD',
  'Pacific/Honolulu':       'USD',
  'America/Boise':          'USD',
  'America/Detroit':        'USD',
  'America/Indiana/Indianapolis': 'USD',
  'America/Kentucky/Louisville':  'USD',
  'America/Menominee':      'USD',

  // ── Canada ────────────────────────────────────────────
  'America/Toronto':        'CAD',
  'America/Vancouver':      'CAD',
  'America/Edmonton':       'CAD',
  'America/Winnipeg':       'CAD',
  'America/Halifax':        'CAD',
  'America/St_Johns':       'CAD',
  'America/Regina':         'CAD',

  // ── United Kingdom ────────────────────────────────────
  'Europe/London':          'GBP',

  // ── Europe (EUR zone) ────────────────────────────────
  'Europe/Paris':           'EUR',
  'Europe/Berlin':          'EUR',
  'Europe/Madrid':          'EUR',
  'Europe/Rome':            'EUR',
  'Europe/Amsterdam':       'EUR',
  'Europe/Brussels':        'EUR',
  'Europe/Vienna':          'EUR',
  'Europe/Dublin':          'EUR',
  'Europe/Lisbon':          'EUR',
  'Europe/Helsinki':        'EUR',
  'Europe/Athens':          'EUR',
  'Europe/Luxembourg':      'EUR',

  // ── Australia ─────────────────────────────────────────
  'Australia/Sydney':       'AUD',
  'Australia/Melbourne':    'AUD',
  'Australia/Brisbane':     'AUD',
  'Australia/Perth':        'AUD',
  'Australia/Adelaide':     'AUD',
  'Australia/Hobart':       'AUD',
  'Australia/Darwin':       'AUD',

  // ── Middle East (mapped to USD per SUPPORTED_COUNTRIES) ─
  'Asia/Dubai':             'USD',
  'Asia/Riyadh':            'USD',
  'Asia/Qatar':             'USD',
  'Asia/Bahrain':           'USD',
  'Asia/Kuwait':            'USD',
  'Asia/Muscat':            'USD',
};


const LOCALE_COUNTRY_TO_CURRENCY: Record<string, string> = {
  US: 'USD',
  CA: 'CAD',
  GB: 'GBP',
  AU: 'AUD',
  ET: 'ETB',
  DE: 'EUR', FR: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR',
  BE: 'EUR', AT: 'EUR', IE: 'EUR', PT: 'EUR', FI: 'EUR',
  GR: 'EUR', LU: 'EUR',
  AE: 'USD', SA: 'USD', QA: 'USD', BH: 'USD', KW: 'USD', OM: 'USD',
};


function detectFromTimezone(): string | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && TIMEZONE_TO_CURRENCY[tz]) {
      return TIMEZONE_TO_CURRENCY[tz];
    }

    if (tz?.startsWith('Africa/'))    return 'ETB';
    if (tz?.startsWith('Australia/')) return 'AUD';
  } catch {
  }
  return null;
}

/**
 * Tier 2: Detect currency from navigator.language (e.g. "en-US" → US → USD).
 * Less reliable because a user in Ethiopia might have their browser set to "en-US",
 * but still useful as a last resort.
 */
function detectFromLocale(): string | null {
  try {
    const lang = navigator.language || (navigator as any).userLanguage;
    if (!lang) return null;

    const parts = lang.split('-');
    if (parts.length >= 2) {
      const country = parts[parts.length - 1].toUpperCase();
      if (LOCALE_COUNTRY_TO_CURRENCY[country]) {
        return LOCALE_COUNTRY_TO_CURRENCY[country];
      }
    }
  } catch {
  }
  return null;
}

export function detectGuestCurrency(): string | null {
  return detectFromTimezone() ?? detectFromLocale() ?? null;
}
