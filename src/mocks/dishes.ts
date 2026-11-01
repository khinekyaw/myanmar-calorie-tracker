import type { Language } from '@/i18n/languages';

import calculated from '../../catalogue/calculated.json';
import { photos, type PhotoSource } from './photos';

export type LocalizedText = Record<Language, string>;

/** Local serving units (log_items.unit in the data model). */
export type Unit = 'plate' | 'bowl' | 'spoon' | 'piece' | 'cup';

export type Dish = {
  id: string;
  name: LocalizedText;
  /** Romanized spellings people type ("laphet yay", "mont hin gar"). */
  aliasesRoman: string[];
  /** Other Burmese spellings / short forms. Zawgyi variants come with the real database. */
  aliasesMy: string[];
  unit: Unit;
  /** Nutrition for ONE unit. */
  kcal: number;
  carbG: number;
  proteinG: number;
  fatG: number;
  /** Not every server dish has these yet. */
  sugarG?: number;
  sodiumMg?: number;
  /** Curries and fried food: the user can set oil less / normal / more. */
  oilSensitive?: boolean;
  /** Tea-shop drinks: ချိုစိမ့် / ပေါ့စိမ့် / ကျဆိမ့် / ပေါ့ကျ. */
  hasSweetness?: boolean;
  isVegetarian?: boolean;
  /** Set when the nutritionist has verified the numbers. */
  verified: boolean;
  /** Numbers come from a standard recipe (catalogue/), not a guess. */
  calculated?: boolean;
  /** Removed from the catalogue: old meals still show it, search doesn't. */
  retired?: boolean;
  photo?: PhotoSource;
};

export type DishId = keyof typeof calculated;

/** Bundled photos, by dish id. Dishes without one show the meal photo or none. */
const dishPhotos: Partial<Record<DishId, PhotoSource>> = {
  mohinga: photos.mohinga,
  tea: photos.tea,
  laphetThoke: photos.laphetThoke,
  palata: photos.palata,
  chickenCurry: photos.curry,
  riceCurry: photos.sharedTable,
};

/**
 * The bundled catalogue, built from the recipe calculation
 * (catalogue/calculated.json, docs/CATALOGUE.md): names, aliases, flags, unit
 * and nutrition per unit. Verified only once the nutritionist has reviewed
 * the recipe; until then the numbers are drafts.
 */
export const dishes = Object.fromEntries(
  (Object.keys(calculated) as DishId[]).map((id) => {
    const c = calculated[id];
    const dish: Dish = {
      id,
      name: c.name,
      aliasesRoman: c.aliasesRoman,
      aliasesMy: c.aliasesMy,
      unit: c.unit as Unit,
      kcal: c.kcal,
      carbG: c.carbG,
      proteinG: c.proteinG,
      fatG: c.fatG,
      sugarG: c.sugarG,
      sodiumMg: c.sodiumMg,
      ...(c.oilSensitive && { oilSensitive: true }),
      ...(c.hasSweetness && { hasSweetness: true }),
      ...(c.isVegetarian && { isVegetarian: true }),
      verified: c.status === 'reviewed',
      calculated: true,
      ...(dishPhotos[id] !== undefined && { photo: dishPhotos[id] }),
    };
    return [id, dish];
  }),
) as Record<DishId, Dish>;

/**
 * Dishes known on this phone: the bundled list until the database copy is
 * loaded at startup (db/dishes.ts), later updated from the server.
 */
const catalogue = new Map<string, Dish>(Object.entries(dishes));

export function setCatalogue(list: Dish[]) {
  catalogue.clear();
  for (const dish of list) catalogue.set(dish.id, dish);
}

export const getDish = (id: DishId): Dish => catalogue.get(id) ?? dishes[id];

export const listDishes = (): Dish[] => [...catalogue.values()].filter((d) => !d.retired);

/** Quick re-log chips in the add sheet. */
export const quickRelog: DishId[] = ['tea', 'palata', 'riceCurry', 'mohinga'];

/** "Free" sides on a shared table, logged as on/off toggles. */
export const freeSides: DishId[] = ['clearSoup', 'ngapiYay'];
