import type { TFunction } from 'i18next';

import type { Dish } from '@/data/dishes';
import type { Language } from '@/i18n/languages';
import { formatNumber } from '@/lib/format';

/**
 * "serving spoons · 60 g": the unit for `qty`, plus its cooked weight when the
 * dish has one, so a serving spoon isn't read as a tablespoon.
 */
export function amountLabel(t: TFunction, dish: Dish, qty: number, language: Language) {
  const unit = t(`units.${dish.unit}`, { count: qty });
  if (!dish.servingG || !qty) return unit;
  return `${unit} · ${formatNumber(Math.round(dish.servingG * qty), language)} ${t('common.g')}`;
}
