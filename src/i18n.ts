import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslations from './locales/english.json';

// ponytail: keys are the English source string ("Add to Cart"), so a missing
// translation falls back to readable English instead of a raw key path. That
// means keySeparator/nsSeparator must be off, or periods and colons inside a
// sentence get parsed as nested paths. The pre-existing nested keys
// ({ common: { loading } }) are flattened to "common.loading" here so the files
// already calling t('common.loading') keep working unchanged.
const flatten = (obj: Record<string, unknown>, prefix = ''): Record<string, string> =>
  Object.entries(obj).reduce<Record<string, string>>((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object') Object.assign(acc, flatten(value as Record<string, unknown>, path));
    else acc[path] = String(value);
    return acc;
  }, {});

// ponytail: amharic.json is 300 KB. Bundling it alongside English put that
// download *and* a full flatten() pass in front of first paint for every
// visitor, English ones included. Non-default languages are now their own
// chunk, fetched only when actually selected.
const lazyBundles: Record<string, () => Promise<{ default: Record<string, unknown> }>> = {
  am: () => import('./locales/amharic.json'),
};

const inFlight = new Map<string, Promise<void>>();

function loadBundle(lng?: string): Promise<void> {
  const load = lng ? lazyBundles[lng] : undefined;
  if (!lng || !load) return Promise.resolve();

  let pending = inFlight.get(lng);
  if (!pending) {
    pending = load()
      .then((mod) => {
        i18n.addResourceBundle(lng, 'translation', flatten(mod.default), true, true);
      })
      .catch(() => {
        // Falls back to English rather than blanking the UI.
        inFlight.delete(lng);
      });
    inFlight.set(lng, pending);
  }
  return pending;
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: flatten(enTranslations) },
    },
    partialBundledLanguages: true,
    fallbackLng: 'en',
    supportedLngs: ['en', 'am'],
    load: 'languageOnly', // "en-US" from the browser resolves to "en"
    debug: process.env.NODE_ENV === 'development',

    keySeparator: false,
    nsSeparator: false,

    interpolation: {
      escapeValue: false, // React already escapes values
    },

    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },

    // Re-render once a lazily fetched bundle lands.
    react: {
      bindI18nStore: 'added',
    },
  });

i18n.on('languageChanged', (lng) => {
  void loadBundle(lng);
});

/** Resolves once the initial language's translations are in place. */
export const i18nReady = loadBundle(i18n.resolvedLanguage);

export default i18n;
