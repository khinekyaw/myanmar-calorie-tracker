/**
 * Burmese has no spaces inside words, and iOS wraps it at any syllable, so a
 * label can end with one syllable alone on the next line ("ကယ်လို / ရီ").
 * Our copy puts a space between words, so this glues the syllables of each
 * word together with WORD JOINER (U+2060, invisible): lines then break only
 * at spaces. A word wider than the whole line still breaks, by character.
 *
 * A joiner goes only between two syllables, never inside one, so shaping is
 * untouched. A syllable starts at a consonant or independent vowel, except
 * one that is killed (followed by asat ် , maybe after dot below ့) or stacked
 * (after virama ္) — those belong to the syllable before.
 *
 * A number also stays with the Burmese word after it ("30 ရက်", "3 ပန်းကန်"):
 * that space becomes a no-break space, so the unit never starts a line alone.
 */
const JOINER = '⁠';

const isMyanmar = (c: number) => c >= 0x1000 && c <= 0x109f;
/** Consonants, independent vowels, great sa and the four symbol letters. */
const startsSyllable = (c: number) =>
  (c >= 0x1000 && c <= 0x102a) || c === 0x103f || (c >= 0x104c && c <= 0x104f);
const VIRAMA = 0x1039;
const ASAT = 0x103a;
const DOT_BELOW = 0x1037;
/** ၊ and ။ : a line may break after them. */
const isPunctuation = (c: number) => c === 0x104a || c === 0x104b;
/** 0–9, Myanmar digits and the vulgar fractions we print (½ ¼ ¾ …). */
const isNumberEnd = (c: number) =>
  (c >= 0x30 && c <= 0x39) || (c >= 0x1040 && c <= 0x1049) || (c >= 0x00bc && c <= 0x00be) || (c >= 0x2150 && c <= 0x215e);
const NBSP = '\u00A0';

export function keepBurmeseWords(text: string): string {
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c === 0x20 && i > 0 && isNumberEnd(text.charCodeAt(i - 1)) && startsSyllable(text.charCodeAt(i + 1))) {
      out += NBSP;
      continue;
    }
    if (i > 0 && startsSyllable(c)) {
      const prev = text.charCodeAt(i - 1);
      let next = text.charCodeAt(i + 1);
      if (next === DOT_BELOW) next = text.charCodeAt(i + 2);
      const killed = next === ASAT || next === VIRAMA;
      if (isMyanmar(prev) && prev !== VIRAMA && !isPunctuation(prev) && !killed) out += JOINER;
    }
    out += text[i];
  }
  return out;
}
