import type { Language } from '@/i18n/languages';

import { photos } from './photos';

export type LocalizedText = Record<Language, string>;

export type Dish = {
  id: string;
  name: LocalizedText;
  kcal: number;
  carbG: number;
  proteinG: number;
  fatG: number;
  photo: string;
};

/**
 * ILLUSTRATIVE numbers only — the verified dish database comes from the
 * nutritionist (see docs/DECISIONS.md → "Food data").
 */
export const dishes = {
  mohinga: {
    id: 'mohinga',
    name: { my: 'မုန့်ဟင်းခါး', en: 'Mohinga' },
    kcal: 420,
    carbG: 60,
    proteinG: 18,
    fatG: 12,
    photo: photos.mohinga,
  },
  tea: {
    id: 'tea',
    name: { my: 'လက်ဖက်ရည်', en: 'Milk tea' },
    kcal: 120,
    carbG: 18,
    proteinG: 3,
    fatG: 4,
    photo: photos.tea,
  },
  laphetThoke: {
    id: 'laphetThoke',
    name: { my: 'လက်ဖက်သုပ်', en: 'Tea leaf salad' },
    kcal: 310,
    carbG: 14,
    proteinG: 12,
    fatG: 22,
    photo: photos.laphetThoke,
  },
  palata: {
    id: 'palata',
    name: { my: 'ပလာတာ', en: 'Palata' },
    kcal: 300,
    carbG: 36,
    proteinG: 6,
    fatG: 15,
    photo: photos.palata,
  },
  riceCurry: {
    id: 'riceCurry',
    name: { my: 'ထမင်းဟင်း', en: 'Rice & curry' },
    kcal: 650,
    carbG: 85,
    proteinG: 28,
    fatG: 22,
    photo: photos.sharedTable,
  },
} satisfies Record<string, Dish>;

export type DishId = keyof typeof dishes;

/** Quick re-log chips in the add sheet. */
export const quickRelog: DishId[] = ['tea', 'palata', 'riceCurry', 'mohinga'];
