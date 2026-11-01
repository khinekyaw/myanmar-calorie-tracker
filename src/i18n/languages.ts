export const LANGUAGES = ['my', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];

/** Myanmar-first: new installs start in Burmese. */
export const DEFAULT_LANGUAGE: Language = 'my';

/** Short form for compact toggles. */
export const LANGUAGE_SHORT: Record<Language, string> = {
  my: 'မြန်မာ',
  en: 'EN',
};
