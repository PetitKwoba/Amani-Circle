import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { ar } from './locales/ar';
import { en } from './locales/en';
import { fr } from './locales/fr';
import { pt } from './locales/pt';
import { sw } from './locales/sw';
import { defaultLanguage, getLanguageConfig } from './languages';

function applyDocumentLanguage(languageCode: string) {
  const language = getLanguageConfig(languageCode);
  document.documentElement.lang = language.code;
  document.documentElement.dir = language.direction;
}

i18n.use(initReactI18next).init({
  resources: {
    ar: { translation: ar },
    en: { translation: en },
    fr: { translation: fr },
    pt: { translation: pt },
    sw: { translation: sw },
  },
  lng: defaultLanguage,
  fallbackLng: defaultLanguage,
  interpolation: {
    escapeValue: false,
  },
});

i18n.on('languageChanged', applyDocumentLanguage);
applyDocumentLanguage(i18n.resolvedLanguage ?? i18n.language);

export { i18n };
