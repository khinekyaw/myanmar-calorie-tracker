import { listDishes, type Dish, type DishId } from '@/data/dishes';

/**
 * Local dish search: Burmese names, romanized spellings and loose variants.
 * Prototype matcher over the in-memory catalogue. The production version
 * runs on the SQLite dish cache and also converts Zawgyi → Unicode first
 * (see docs/ARCHITECTURE.md → Data flow).
 */

/** Lowercase, drop spaces/punctuation and collapse common romanization variants. */
export function normalizeRoman(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z]/g, '')
    .replace(/ph/g, 'p')
    .replace(/hp/g, 'p')
    .replace(/th/g, 't')
    .replace(/(ay|ye|ey)$/g, 'e')
    .replace(/ay/g, 'e')
    .replace(/ar/g, 'a')
    .replace(/(.)\1+/g, '$1');
}

/** Burmese: strip spaces and zero-width characters. */
export function normalizeMy(text: string) {
  return text.replace(/[\s​-‍﻿]/g, '');
}

const MYANMAR = /[က-႟]/;

function score(dish: Dish, query: string): number {
  if (MYANMAR.test(query)) {
    const q = normalizeMy(query);
    const names = [dish.name.my, ...dish.aliasesMy].map(normalizeMy);
    if (names.some((n) => n === q)) return 3;
    if (names.some((n) => n.startsWith(q))) return 2;
    return names.some((n) => n.includes(q)) ? 1 : 0;
  }
  const q = normalizeRoman(query);
  if (!q) return 0;
  const names = [dish.name.en, ...dish.aliasesRoman].map(normalizeRoman);
  if (names.some((n) => n === q)) return 3;
  if (names.some((n) => n.startsWith(q))) return 2;
  // A name inside a longer query ("mohinga bowl") counts only when the name is
  // long enough: "3 in 1" normalizes to "in", which is inside "mohin".
  return names.some((n) => n.includes(q) || (q.length >= 4 && n.length >= 4 && q.includes(n))) ? 1 : 0;
}

export function searchDishes(query: string, limit = 20): Dish[] {
  if (!query.trim()) return [];
  return listDishes()
    .filter((dish) => !dish.generic)
    .map((dish) => ({ dish, s: score(dish, query.trim()) }))
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((r) => r.dish);
}

/** Dishes shown before the user types. */
export const popularDishes: DishId[] = ['laphetThoke', 'palata', 'samusa', 'nanbyaPePyote', 'mohinga', 'tea'];
