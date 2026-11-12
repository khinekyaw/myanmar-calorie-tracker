import { HEALTH_LIMITS } from '@/config/health';
import { getDish } from '@/data/dishes';

import { SWEETNESS, SWEETNESS_FACTOR, type MealItem, type Sweetness } from './meal';

/**
 * Sugar and sodium for logged meals, worked out from the dish × amount like
 * calories (meals store only dish, amount, oil and sweetness). Pure, tested.
 * Thresholds are PLACEHOLDERS in config/health.ts.
 */

export type HealthFlags = { bloodSugar: boolean; bloodPressure: boolean };

export type SugarSodium = { sugarG: number; sodiumMg: number };

/**
 * One item as eaten. Sweetness scales the drink's sugar like its kcal. A food
 * not on the list has no sugar or sodium of its own: it takes its type's
 * ("Other drink", "Other curry") per kcal.
 */
export function itemSugarSodium(item: MealItem): SugarSodium {
  const dish = getDish(item.dishId);
  const sugar = dish.sugarG ?? 0;
  const sodium = dish.sodiumMg ?? 0;
  const scale = item.custom ? (dish.kcal > 0 ? item.custom.kcal / dish.kcal : 0) : 1;
  const sweet = dish.hasSweetness ? SWEETNESS_FACTOR[item.sweetness ?? 'pawSeint'] : 1;
  return { sugarG: sugar * scale * sweet * item.qty, sodiumMg: sodium * scale * item.qty };
}

export function sumSugarSodium(items: MealItem[]): SugarSodium {
  return items.reduce(
    (acc, it) => {
      const v = itemSugarSodium(it);
      return { sugarG: acc.sugarG + v.sugarG, sodiumMg: acc.sodiumMg + v.sodiumMg };
    },
    { sugarG: 0, sodiumMg: 0 },
  );
}

export const isSugarHeavy = (items: MealItem[]) => sumSugarSodium(items).sugarG >= HEALTH_LIMITS.sugarHeavyMealG;

export const isSalty = (items: MealItem[]) => sumSugarSodium(items).sodiumMg >= HEALTH_LIMITS.saltyMealMg;

/** Sweetness levels from lightest to sweetest. */
const LIGHTEST_FIRST = [...SWEETNESS].sort((a, b) => SWEETNESS_FACTOR[a] - SWEETNESS_FACTOR[b]);

/**
 * A lighter sweetness for a tea-shop drink: ပေါ့စိမ့် instead of anything
 * sweeter, ပေါ့ကျ instead of ပေါ့စိမ့်. Null when it's already the lightest.
 */
export function lighterSweetness(item: MealItem): Sweetness | null {
  if (!getDish(item.dishId).hasSweetness) return null;
  const current = item.sweetness ?? 'pawSeint';
  const lighter = LIGHTEST_FIRST.filter((s) => SWEETNESS_FACTOR[s] < SWEETNESS_FACTOR[current]);
  if (lighter.length === 0) return null;
  return lighter.includes('pawSeint') ? 'pawSeint' : lighter[0];
}

export type MealHealth = SugarSodium & {
  sugarHeavy: boolean;
  salty: boolean;
  /** Index of the item adding the most sugar / sodium (named in the flag). */
  sweetest: number;
  saltiest: number;
  /** Sweetened drinks in a sugar-heavy meal that can be made lighter. */
  swaps: { index: number; to: Sweetness }[];
};

const argMax = (values: number[]) => values.reduce((best, v, i) => (v > values[best] ? i : best), 0);

/** What the Result screen flags for one meal. */
export function mealHealth(items: MealItem[]): MealHealth {
  const each = items.map(itemSugarSodium);
  const total = sumSugarSodium(items);
  const sugarHeavy = total.sugarG >= HEALTH_LIMITS.sugarHeavyMealG;
  return {
    ...total,
    sugarHeavy,
    salty: total.sodiumMg >= HEALTH_LIMITS.saltyMealMg,
    sweetest: argMax(each.map((v) => v.sugarG)),
    saltiest: argMax(each.map((v) => v.sodiumMg)),
    swaps: sugarHeavy
      ? items.flatMap((it, index) => {
          const to = lighterSweetness(it);
          return to && it.qty > 0 ? [{ index, to }] : [];
        })
      : [],
  };
}
