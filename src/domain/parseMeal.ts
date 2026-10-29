import { getDish, listDishes, type DishId } from '@/mocks/dishes';

import type { MealItem, Sweetness } from './meal';
import { normalizeMy, normalizeRoman } from './search';

/**
 * Turn a spoken or typed sentence into meal items, offline.
 * "လက်ဖက်ရည် ပေါ့စိမ့် တစ်ခွက်နဲ့ ပလာတာ တစ်ချပ်" → tea (pawSeint) ×1, palata ×1.
 *
 * Prototype rules: find every dish name/alias in the text, read a number
 * word right after it, and pick up tea sweetness words. The production
 * parser will use the same dish aliases from the database.
 */

const MY_NUMBERS: Record<string, number> = {
  'တစ်': 1, 'နှစ်': 2, 'သုံး': 3, 'လေး': 4, 'ငါး': 5, 'ခြောက်': 6, 'ခုနစ်': 7, 'ရှစ်': 8, 'ကိုး': 9, 'ဆယ်': 10,
  '၁': 1, '၂': 2, '၃': 3, '၄': 4, '၅': 5, '၆': 6, '၇': 7, '၈': 8, '၉': 9,
};
const EN_NUMBERS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, a: 1, an: 1 };

const SWEETNESS_WORDS: Record<Sweetness, string[]> = {
  choSeint: ['ချိုစိမ့်', 'cho seint', 'sweet'],
  pawSeint: ['ပေါ့စိမ့်', 'paw seint', 'less sweet'],
  kyaSeint: ['ကျဆိမ့်', 'kya seint', 'strong'],
  pawKya: ['ပေါ့ကျ', 'paw kya'],
};

type Hit = { dishId: DishId; index: number; end: number };

function findHits(text: string): Hit[] {
  const lower = text.toLowerCase();
  const hits: Hit[] = [];
  for (const dish of listDishes()) {
    const names = [dish.name.my, ...dish.aliasesMy, dish.name.en.toLowerCase(), ...dish.aliasesRoman];
    // Longest alias first so "laphet yay" wins over "laphet".
    for (const name of [...names].sort((a, b) => b.length - a.length)) {
      const index = lower.indexOf(name.toLowerCase());
      if (index >= 0) {
        hits.push({ dishId: dish.id as DishId, index, end: index + name.length });
        break;
      }
    }
  }
  // Drop hits fully inside a longer hit (e.g. "ထမင်း" inside "ထမင်းဟင်း").
  return hits
    .filter((h) => !hits.some((o) => o !== h && o.index <= h.index && o.end >= h.end && o.end - o.index > h.end - h.index))
    .sort((a, b) => a.index - b.index);
}

function quantityIn(window: string): number | null {
  const digit = window.match(/\d+(\.\d+)?/);
  if (digit) return Number(digit[0]);
  const my = normalizeMy(window);
  for (const [word, n] of Object.entries(MY_NUMBERS)) if (my.includes(word)) return n;
  for (const word of window.toLowerCase().split(/\s+/)) if (EN_NUMBERS[word]) return EN_NUMBERS[word];
  return null;
}

const LATIN = /[a-z]/i;

function sweetnessIn(window: string): Sweetness | undefined {
  const lower = window.toLowerCase();
  const roman = normalizeRoman(window);
  // Longest phrase first so "less sweet" beats "sweet".
  const candidates = (Object.keys(SWEETNESS_WORDS) as Sweetness[])
    .flatMap((k) => SWEETNESS_WORDS[k].map((w) => ({ k, w })))
    .sort((a, b) => b.w.length - a.w.length);
  return candidates.find(({ w }) => (LATIN.test(w) ? roman.includes(normalizeRoman(w)) : lower.includes(w)))?.k;
}

export function parseMeal(text: string): MealItem[] {
  const hits = findHits(text);
  const burmese = /[\u1000-\u109F]/.test(text);
  return hits.map((hit, i) => {
    const nextStart = hits[i + 1]?.index ?? text.length;
    const after = text.slice(hit.end, nextStart);
    const before = text.slice(hits[i - 1]?.end ?? 0, hit.index);
    // Burmese puts the number after the dish ("ပလာတာ နှစ်ချပ်"); English before ("two palata").
    const [first, second] = burmese ? [after, before] : [before, after];
    const qty = quantityIn(first) ?? quantityIn(second) ?? 1;
    const sweetness = getDish(hit.dishId).hasSweetness ? (sweetnessIn(first) ?? sweetnessIn(second)) : undefined;
    return { dishId: hit.dishId, qty, ...(sweetness && { sweetness }) };
  });
}
