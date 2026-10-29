import type { Language } from '@/i18n/languages';

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
  /** Curries and fried food: the user can set oil less / normal / more. */
  oilSensitive?: boolean;
  /** Tea-shop drinks: ချိုစိမ့် / ပေါ့စိမ့် / ကျဆိမ့် / ပေါ့ကျ. */
  hasSweetness?: boolean;
  isVegetarian?: boolean;
  /** Set when the nutritionist has verified the numbers. */
  verified: boolean;
  /** Removed from the catalogue: old meals still show it, search doesn't. */
  retired?: boolean;
  photo?: PhotoSource;
};

const d = (dish: Dish) => dish;

/**
 * ILLUSTRATIVE numbers only. The verified dish database (200–300 dishes)
 * comes from the nutritionist — see docs/DECISIONS.md → "Food data".
 * `verified: true` here only demonstrates the badge in the UI.
 */
export const dishes = {
  mohinga: d({
    id: 'mohinga',
    name: { my: 'မုန့်ဟင်းခါး', en: 'Mohinga' },
    aliasesRoman: ['mohinga', 'mont hin gar', 'mohinkha', 'mote hin khar'],
    aliasesMy: ['မုန့်ဟင်းခါး'],
    unit: 'bowl',
    kcal: 420,
    carbG: 62,
    proteinG: 18,
    fatG: 11,
    verified: true,
    photo: photos.mohinga,
  }),
  tea: d({
    id: 'tea',
    name: { my: 'လက်ဖက်ရည်', en: 'Milk tea' },
    aliasesRoman: ['laphet yay', 'lahpet yay', 'lephet ye', 'laphet ye', 'tea', 'milk tea'],
    aliasesMy: ['လက်ဖက်ရည်', 'လဘက်ရည်'],
    unit: 'cup',
    kcal: 120,
    carbG: 18,
    proteinG: 3,
    fatG: 4,
    hasSweetness: true,
    isVegetarian: true,
    verified: true,
    photo: photos.tea,
  }),
  laphetThoke: d({
    id: 'laphetThoke',
    name: { my: 'လက်ဖက်သုပ်', en: 'Tea leaf salad' },
    aliasesRoman: ['laphet thoke', 'lahpet thoke', 'laphet thote', 'tea leaf salad'],
    aliasesMy: ['လက်ဖက်သုပ်', 'လဘက်သုပ်'],
    unit: 'plate',
    kcal: 310,
    carbG: 14,
    proteinG: 12,
    fatG: 22,
    oilSensitive: true,
    isVegetarian: true,
    verified: true,
    photo: photos.laphetThoke,
  }),
  palata: d({
    id: 'palata',
    name: { my: 'ပလာတာ', en: 'Palata' },
    aliasesRoman: ['palata', 'paratha', 'palatha'],
    aliasesMy: ['ပလာတာ'],
    unit: 'piece',
    kcal: 300,
    carbG: 36,
    proteinG: 6,
    fatG: 15,
    oilSensitive: true,
    isVegetarian: true,
    verified: true,
    photo: photos.palata,
  }),
  samusa: d({
    id: 'samusa',
    name: { my: 'စမူဆာ', en: 'Samosa' },
    aliasesRoman: ['samusa', 'samosa', 'sa mu sa'],
    aliasesMy: ['စမူဆာ'],
    unit: 'piece',
    kcal: 150,
    carbG: 17,
    proteinG: 3,
    fatG: 8,
    oilSensitive: true,
    isVegetarian: true,
    verified: false,
  }),
  nanbyaPePyote: d({
    id: 'nanbyaPePyote',
    name: { my: 'နံပြား + ပဲပြုတ်', en: 'Naan & boiled peas' },
    aliasesRoman: ['nan bya', 'naan bya', 'nanbya', 'pe byoke', 'pe pyote', 'naan'],
    aliasesMy: ['နံပြား', 'ပဲပြုတ်'],
    unit: 'plate',
    kcal: 330,
    carbG: 55,
    proteinG: 12,
    fatG: 7,
    isVegetarian: true,
    verified: false,
  }),
  rice: d({
    id: 'rice',
    name: { my: 'ထမင်း', en: 'Rice' },
    aliasesRoman: ['htamin', 'hta min', 'rice'],
    aliasesMy: ['ထမင်း'],
    unit: 'plate',
    // PLACEHOLDER: ~200 g cooked rice; see KCAL_PER_RICE_PLATE.
    kcal: 260,
    carbG: 57,
    proteinG: 5,
    fatG: 0.5,
    isVegetarian: true,
    verified: false,
  }),
  chickenCurry: d({
    id: 'chickenCurry',
    name: { my: 'ကြက်သားဆီပြန်', en: 'Chicken curry' },
    aliasesRoman: ['kyet thar hin', 'chicken curry', 'kyat thar see pyan'],
    aliasesMy: ['ကြက်သားဟင်း', 'ကြက်သားဆီပြန်'],
    unit: 'spoon',
    kcal: 45,
    carbG: 1,
    proteinG: 4,
    fatG: 3,
    oilSensitive: true,
    verified: false,
    photo: photos.curry,
  }),
  porkCurry: d({
    id: 'porkCurry',
    name: { my: 'ဝက်သားဆီပြန်', en: 'Pork curry' },
    aliasesRoman: ['wet thar hin', 'pork curry', 'wet thar see pyan'],
    aliasesMy: ['ဝက်သားဟင်း', 'ဝက်သားဆီပြန်'],
    unit: 'spoon',
    kcal: 55,
    carbG: 1,
    proteinG: 3.5,
    fatG: 4.5,
    oilSensitive: true,
    verified: false,
  }),
  fishCurry: d({
    id: 'fishCurry',
    name: { my: 'ငါးဆီပြန်', en: 'Fish curry' },
    aliasesRoman: ['nga hin', 'fish curry', 'nga see pyan'],
    aliasesMy: ['ငါးဟင်း', 'ငါးဆီပြန်'],
    unit: 'spoon',
    kcal: 40,
    carbG: 1,
    proteinG: 4,
    fatG: 2.5,
    oilSensitive: true,
    verified: false,
  }),
  gourdFritter: d({
    id: 'gourdFritter',
    name: { my: 'ဘူးသီးကြော်', en: 'Gourd fritter' },
    aliasesRoman: ['bu thee kyaw', 'gourd fritter', 'buthi kyaw'],
    aliasesMy: ['ဘူးသီးကြော်'],
    unit: 'spoon',
    kcal: 35,
    carbG: 4,
    proteinG: 0.5,
    fatG: 2,
    oilSensitive: true,
    isVegetarian: true,
    verified: false,
  }),
  driedFish: d({
    id: 'driedFish',
    name: { my: 'ငါးခြောက်ကြော်', en: 'Fried dried fish' },
    aliasesRoman: ['nga chauk kyaw', 'dried fish'],
    aliasesMy: ['ငါးခြောက်ကြော်'],
    unit: 'spoon',
    kcal: 50,
    carbG: 0,
    proteinG: 6,
    fatG: 3,
    oilSensitive: true,
    verified: false,
  }),
  clearSoup: d({
    id: 'clearSoup',
    name: { my: 'ဟင်းချို', en: 'Clear soup' },
    aliasesRoman: ['hin cho', 'clear soup', 'soup'],
    aliasesMy: ['ဟင်းချို'],
    unit: 'bowl',
    kcal: 20,
    carbG: 3,
    proteinG: 1,
    fatG: 0.5,
    isVegetarian: true,
    verified: false,
  }),
  ngapiYay: d({
    id: 'ngapiYay',
    name: { my: 'ငါးပိရည်', en: 'Fish paste dip' },
    aliasesRoman: ['ngapi yay', 'nga pi ye', 'ngapi'],
    aliasesMy: ['ငါးပိရည်'],
    unit: 'spoon',
    kcal: 10,
    carbG: 0.5,
    proteinG: 1.5,
    fatG: 0,
    verified: false,
  }),
  riceCurry: d({
    id: 'riceCurry',
    name: { my: 'ထမင်းဟင်း', en: 'Rice & curry' },
    aliasesRoman: ['htamin hin', 'rice and curry', 'rice curry'],
    aliasesMy: ['ထမင်းဟင်း'],
    unit: 'plate',
    kcal: 650,
    carbG: 85,
    proteinG: 28,
    fatG: 22,
    oilSensitive: true,
    verified: false,
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
