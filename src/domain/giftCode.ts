/**
 * Gift codes (docs/LAUNCH_CHECKLIST.md → "Gift codes"). The same rules as the
 * server's private.normalize_gift_code, so what the user sees is what the
 * server checks. No imports: the codes:make script uses this file too.
 */

/** Crockford base32: no I, L, O or U, so nothing is mistaken for 0 or 1. */
export const GIFT_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export const GIFT_CODE_LENGTH = 10;

const BURMESE_DIGITS = '၀၁၂၃၄၅၆၇၈၉';

/** Upper case, Burmese digits → 0–9, O/I/L → 0/1/1, and only 0–9 A–Z kept. */
export function normalizeGiftCode(text: string): string {
  return [...text.toUpperCase()]
    .map((ch) => {
      const digit = BURMESE_DIGITS.indexOf(ch);
      if (digit >= 0) return String(digit);
      return ch === 'O' ? '0' : ch === 'I' || ch === 'L' ? '1' : ch;
    })
    .join('')
    .replace(/[^0-9A-Z]/g, '');
}

/** As the user types: normalised and grouped by five, e.g. "K7Q2M-9XH4T". */
export function formatGiftCode(text: string): string {
  return (normalizeGiftCode(text).match(/.{1,5}/g) ?? []).join('-');
}

/** Long enough to send to the server (campaign words can be short). */
export const isGiftCodeShape = (text: string) => {
  const n = normalizeGiftCode(text).length;
  return n >= 4 && n <= 24;
};

/** A new personal code; `randomInt(n)` must be a secure random integer below n. */
export function newGiftCode(randomInt: (n: number) => number): string {
  const raw = Array.from({ length: GIFT_CODE_LENGTH }, () => GIFT_ALPHABET[randomInt(GIFT_ALPHABET.length)]).join('');
  return formatGiftCode(raw);
}
