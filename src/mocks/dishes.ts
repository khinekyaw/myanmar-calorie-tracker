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

const d = (dish: Dish) => dish;

type CalculatedId = keyof typeof calculated;

/**
 * Unit and nutrition from the recipe calculation (catalogue/calculated.json,
 * docs/CATALOGUE.md). Verified only once the nutritionist has reviewed the recipe.
 */
function fromRecipe(id: CalculatedId) {
  const c = calculated[id];
  return {
    unit: c.unit as Unit,
    kcal: c.kcal,
    carbG: c.carbG,
    proteinG: c.proteinG,
    fatG: c.fatG,
    sugarG: c.sugarG,
    sodiumMg: c.sodiumMg,
    verified: c.status === 'reviewed',
    calculated: true,
  };
}

/**
 * The bundled catalogue: names, aliases and photos here; numbers from the
 * recipe calculation. The recipes are drafts until the nutritionist reviews them.
 */
export const dishes = {
  mohinga: d({
    id: 'mohinga',
    name: { my: 'မုန့်ဟင်းခါး', en: 'Mohinga' },
    aliasesRoman: ['mohinga', 'mont hin gar', 'mohinkha', 'mote hin khar'],
    aliasesMy: ['မုန့်ဟင်းခါး'],
    ...fromRecipe('mohinga'),
    photo: photos.mohinga,
  }),
  tea: d({
    id: 'tea',
    name: { my: 'လက်ဖက်ရည်', en: 'Milk tea' },
    aliasesRoman: ['laphet yay', 'lahpet yay', 'lephet ye', 'laphet ye', 'tea', 'milk tea'],
    aliasesMy: ['လက်ဖက်ရည်', 'လဘက်ရည်'],
    ...fromRecipe('tea'),
    hasSweetness: true,
    isVegetarian: true,
    photo: photos.tea,
  }),
  laphetThoke: d({
    id: 'laphetThoke',
    name: { my: 'လက်ဖက်သုပ်', en: 'Tea leaf salad' },
    aliasesRoman: ['laphet thoke', 'lahpet thoke', 'laphet thote', 'tea leaf salad'],
    aliasesMy: ['လက်ဖက်သုပ်', 'လဘက်သုပ်'],
    ...fromRecipe('laphetThoke'),
    oilSensitive: true,
    isVegetarian: true,
    photo: photos.laphetThoke,
  }),
  palata: d({
    id: 'palata',
    name: { my: 'ပလာတာ', en: 'Palata' },
    aliasesRoman: ['palata', 'paratha', 'palatha'],
    aliasesMy: ['ပလာတာ'],
    ...fromRecipe('palata'),
    oilSensitive: true,
    isVegetarian: true,
    photo: photos.palata,
  }),
  samusa: d({
    id: 'samusa',
    name: { my: 'စမူဆာ', en: 'Samosa' },
    aliasesRoman: ['samusa', 'samosa', 'sa mu sa'],
    aliasesMy: ['စမူဆာ'],
    ...fromRecipe('samusa'),
    oilSensitive: true,
    isVegetarian: true,
  }),
  nanbyaPePyote: d({
    id: 'nanbyaPePyote',
    name: { my: 'နံပြား + ပဲပြုတ်', en: 'Naan & boiled peas' },
    aliasesRoman: ['nan bya', 'naan bya', 'nanbya', 'pe byoke', 'pe pyote', 'naan'],
    aliasesMy: ['နံပြား', 'ပဲပြုတ်'],
    ...fromRecipe('nanbyaPePyote'),
    isVegetarian: true,
  }),
  rice: d({
    id: 'rice',
    name: { my: 'ထမင်း', en: 'Rice' },
    aliasesRoman: ['htamin', 'hta min', 'rice'],
    aliasesMy: ['ထမင်း'],
    ...fromRecipe('rice'),
    isVegetarian: true,
  }),
  chickenCurry: d({
    id: 'chickenCurry',
    name: { my: 'ကြက်သားဆီပြန်', en: 'Chicken curry' },
    aliasesRoman: ['kyet thar hin', 'chicken curry', 'kyat thar see pyan'],
    aliasesMy: ['ကြက်သားဟင်း', 'ကြက်သားဆီပြန်'],
    ...fromRecipe('chickenCurry'),
    oilSensitive: true,
    photo: photos.curry,
  }),
  porkCurry: d({
    id: 'porkCurry',
    name: { my: 'ဝက်သားဆီပြန်', en: 'Pork curry' },
    aliasesRoman: ['wet thar hin', 'pork curry', 'wet thar see pyan'],
    aliasesMy: ['ဝက်သားဟင်း', 'ဝက်သားဆီပြန်'],
    ...fromRecipe('porkCurry'),
    oilSensitive: true,
  }),
  fishCurry: d({
    id: 'fishCurry',
    name: { my: 'ငါးဆီပြန်', en: 'Fish curry' },
    aliasesRoman: ['nga hin', 'fish curry', 'nga see pyan'],
    aliasesMy: ['ငါးဟင်း', 'ငါးဆီပြန်'],
    ...fromRecipe('fishCurry'),
    oilSensitive: true,
  }),
  gourdFritter: d({
    id: 'gourdFritter',
    name: { my: 'ဘူးသီးကြော်', en: 'Gourd fritter' },
    aliasesRoman: ['bu thee kyaw', 'gourd fritter', 'buthi kyaw'],
    aliasesMy: ['ဘူးသီးကြော်'],
    ...fromRecipe('gourdFritter'),
    oilSensitive: true,
    isVegetarian: true,
  }),
  driedFish: d({
    id: 'driedFish',
    name: { my: 'ငါးခြောက်ကြော်', en: 'Fried dried fish' },
    aliasesRoman: ['nga chauk kyaw', 'dried fish'],
    aliasesMy: ['ငါးခြောက်ကြော်'],
    ...fromRecipe('driedFish'),
    oilSensitive: true,
  }),
  clearSoup: d({
    id: 'clearSoup',
    name: { my: 'ဟင်းချို', en: 'Clear soup' },
    aliasesRoman: ['hin cho', 'clear soup', 'soup'],
    aliasesMy: ['ဟင်းချို'],
    ...fromRecipe('clearSoup'),
    isVegetarian: true,
  }),
  ngapiYay: d({
    id: 'ngapiYay',
    name: { my: 'ငါးပိရည်', en: 'Fish paste dip' },
    aliasesRoman: ['ngapi yay', 'nga pi ye', 'ngapi'],
    aliasesMy: ['ငါးပိရည်'],
    ...fromRecipe('ngapiYay'),
  }),
  riceCurry: d({
    id: 'riceCurry',
    name: { my: 'ထမင်းဟင်း', en: 'Rice & curry' },
    aliasesRoman: ['htamin hin', 'rice and curry', 'rice curry'],
    aliasesMy: ['ထမင်းဟင်း'],
    ...fromRecipe('riceCurry'),
    oilSensitive: true,
    photo: photos.sharedTable,
  }),
} satisfies Record<string, Dish>;

export type DishId = keyof typeof dishes;

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
