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

/** Always `digits` decimals ("150.0"), so a value's width doesn't change as it moves. */
export function formatFixed(value: number, language: Language, digits = 1) {
  const text = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
  return toNumerals(text, language);
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

const MONTHS_MY = [
  'ဇန်နဝါရီ', 'ဖေဖော်ဝါရီ', 'မတ်', 'ဧပြီ', 'မေ', 'ဇွန်',
  'ဇူလိုင်', 'ဩဂုတ်', 'စက်တင်ဘာ', 'အောက်တိုဘာ', 'နိုဝင်ဘာ', 'ဒီဇင်ဘာ',
];

/** "February 2027" / "ဖေဖော်ဝါရီ 2027". */
export function formatMonthYear(date: Date, language: Language) {
  if (language === 'my') return toNumerals(`${MONTHS_MY[date.getMonth()]} ${date.getFullYear()}`, language);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

const WEEKDAYS_MY = ['တနင်္ဂနွေ', 'တနင်္လာ', 'အင်္ဂါ', 'ဗုဒ္ဓဟူး', 'ကြာသပတေး', 'သောကြာ', 'စနေ'];

/** "Tue, Oct 27" / "အင်္ဂါ၊ အောက်တိုဘာ 27". */
export function formatDayLabel(date: Date, language: Language) {
  if (language === 'my') {
    return toNumerals(`${WEEKDAYS_MY[date.getDay()]}၊ ${MONTHS_MY[date.getMonth()]} ${date.getDate()}`, language);
  }
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

/** Short axis label: "Oct 27" / "27/10" (Burmese month names are too long for an axis). */
export function formatShortDate(date: Date, language: Language) {
  if (language === 'my') return toNumerals(`${date.getDate()}/${date.getMonth() + 1}`, language);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
