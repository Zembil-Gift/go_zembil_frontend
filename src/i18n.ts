import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enTranslations from './locales/english.json';
import amTranslations from './locales/amharic.json';

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

const resources = {
  en: {
    translation: flatten(enTranslations)
  },
  am: {
    translation: flatten(amTranslations)
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
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
  });

export default i18n;
