import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { useSettings } from '@/store/settings';

import { type Language } from './languages';
import en from './locales/en';
import my from './locales/my';

export const resources = {
  en: { translation: en },
  my: { translation: my },
} as const;

i18n.use(initReactI18next).init({
  resources,
  // The settings store hydrates synchronously, so the saved language is
  // known before the first render (no flash of the wrong language).
  lng: useSettings.getState().language,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
});

// Keep i18next in sync with the single source of truth (settings store).
useSettings.subscribe((state, prev) => {
  if (state.language !== prev.language) {
    void i18n.changeLanguage(state.language);
  }
});

export function setLanguage(language: Language) {
  useSettings.getState().setLanguage(language);
}

export default i18n;
