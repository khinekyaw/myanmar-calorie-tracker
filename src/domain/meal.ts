import { getDish, type Dish, type DishId } from '@/data/dishes';

import { KCAL_PER_RICE_PLATE } from './nutrition';

/** Oil level for oil-sensitive dishes (curries default to "normal"). */
export type OilLevel = 'less' | 'normal' | 'more';
export const OIL_LEVELS: OilLevel[] = ['less', 'normal', 'more'];

/** Tea-shop sweetness: ချိုစိမ့် / ပေါ့စိမ့် / ကျဆိမ့် / ပေါ့ကျ. */
export type Sweetness = 'choSeint' | 'pawSeint' | 'kyaSeint' | 'pawKya';
export const SWEETNESS: Sweetness[] = ['choSeint', 'pawSeint', 'kyaSeint', 'pawKya'];

/** PLACEHOLDER multipliers until the nutritionist provides per-dish values. */
const OIL_FAT_FACTOR: Record<OilLevel, number> = { less: 0.6, normal: 1, more: 1.4 };
const SWEETNESS_FACTOR: Record<Sweetness, number> = {
  choSeint: 1.25,
  pawSeint: 1,
  kyaSeint: 1.1,
  pawKya: 0.85,
};

export type MealItem = {
  dishId: DishId;
  qty: number;
  oil?: OilLevel;
  sweetness?: Sweetness;
};

export type Macros = { kcal: number; carbG: number; proteinG: number; fatG: number };

export const ZERO: Macros = { kcal: 0, carbG: 0, proteinG: 0, fatG: 0 };

export function itemMacros(item: MealItem): Macros {
  const dish = getDish(item.dishId);
  const sweet = dish.hasSweetness ? SWEETNESS_FACTOR[item.sweetness ?? 'pawSeint'] : 1;
  const oil = dish.oilSensitive ? OIL_FAT_FACTOR[item.oil ?? 'normal'] : 1;
  const fatG = dish.fatG * oil * sweet;
  const carbG = dish.carbG * sweet;
  const proteinG = dish.proteinG * sweet;
  return {
    kcal: (dish.kcal * sweet + (fatG - dish.fatG * sweet) * 9) * item.qty,
    carbG: carbG * item.qty,
    proteinG: proteinG * item.qty,
    fatG: fatG * item.qty,
  };
}

export function sumMacros(items: MealItem[]): Macros {
  return items.reduce((acc, it) => {
    const m = itemMacros(it);
    return {
      kcal: acc.kcal + m.kcal,
      carbG: acc.carbG + m.carbG,
      proteinG: acc.proteinG + m.proteinG,
      fatG: acc.fatG + m.fatG,
    };
  }, ZERO);
}

export const carbsToRicePlates = (carbG: number) => (carbG * 4) / KCAL_PER_RICE_PLATE;

/** How far a meal's numbers can be trusted: the weakest dish decides. */
export type NumbersTier = 'verified' | 'calculated' | 'estimate';

export function numbersTier(list: Pick<Dish, 'verified' | 'calculated'>[]): NumbersTier {
  if (list.every((d) => d.verified)) return 'verified';
  if (list.every((d) => d.verified || d.calculated)) return 'calculated';
  return 'estimate';
}
