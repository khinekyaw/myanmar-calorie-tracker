export const LANGUAGES = ['my', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];

/** Myanmar-first: new installs start in Burmese. */
export const DEFAULT_LANGUAGE: Language = 'my';

/** Each language's name written in that language, for the switcher. */
export const LANGUAGE_NAMES: Record<Language, string> = {
  my: 'မြန်မာ',
  en: 'English',
};

/** Short form for compact toggles. */
export const LANGUAGE_SHORT: Record<Language, string> = {
  my: 'မြန်မာ',
  en: 'EN',
};

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}
