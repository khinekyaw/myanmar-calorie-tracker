import type { Language } from '@/i18n/languages';

/**
 * Digits used per language. Designs use Latin digits in both languages;
 * flip `my` to 'myanmar' to show ၀၁၂၃… everywhere numbers are formatted.
 */
const NUMERALS: Record<Language, 'latin' | 'myanmar'> = {
  en: 'latin',
  my: 'latin',
};

const MYANMAR_DIGITS = ['၀', '၁', '၂', '၃', '၄', '၅', '၆', '၇', '၈', '၉'];

function toNumerals(text: string, language: Language) {
  if (NUMERALS[language] === 'latin') return text;
  return text.replace(/[0-9]/g, (d) => MYANMAR_DIGITS[Number(d)]);
}

const grouping = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

export function formatNumber(value: number, language: Language) {
  return toNumerals(grouping.format(value), language);
}

const FRACTIONS: Record<string, string> = { '0.25': '¼', '0.5': '½', '0.75': '¾' };

/** 2.5 → "2½", 3 → "3". Used for plates of rice. */
export function formatPlates(value: number, language: Language) {
  const whole = Math.floor(value);
  const frac = FRACTIONS[String(Math.round((value - whole) * 100) / 100)];
  const text = frac ? `${whole === 0 ? '' : whole}${frac}` : String(Math.round(value * 10) / 10);
  return toNumerals(text, language);
}

export function formatTime(date: Date, language: Language) {
  const text = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return toNumerals(text, language);
}
