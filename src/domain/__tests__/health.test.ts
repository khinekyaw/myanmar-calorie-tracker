import { HEALTH_LIMITS } from '@/config/health';
import { dishes } from '@/data/dishes';

import { isSalty, isSugarHeavy, itemSugarSodium, lighterSweetness, mealHealth, sumSugarSodium } from '../health';
import type { MealItem } from '../meal';

describe('itemSugarSodium', () => {
  it('scales the dish by amount', () => {
    const one = itemSugarSodium({ dishId: 'mohinga', qty: 1 });
    expect(one.sodiumMg).toBe(dishes.mohinga.sodiumMg);
    expect(itemSugarSodium({ dishId: 'mohinga', qty: 1.5 }).sodiumMg).toBeCloseTo(one.sodiumMg * 1.5);
  });

  it('scales a drink\'s sugar by its sweetness, not its sodium', () => {
    const plain = itemSugarSodium({ dishId: 'tea', qty: 1, sweetness: 'pawSeint' });
    const sweet = itemSugarSodium({ dishId: 'tea', qty: 1, sweetness: 'choSeint' });
    expect(plain.sugarG).toBe(dishes.tea.sugarG);
    expect(sweet.sugarG).toBeCloseTo(plain.sugarG * 1.25);
    // A tea with no sweetness saved counts as ပေါ့စိမ့်.
    expect(itemSugarSodium({ dishId: 'tea', qty: 1 }).sugarG).toBe(plain.sugarG);
  });

  it('gives a food not on the list its type\'s values per kcal', () => {
    const type = dishes.otherDrink;
    const v = itemSugarSodium({
      dishId: 'otherDrink',
      qty: 2,
      custom: { name: { en: 'Bubble tea', my: '' }, kcal: type.kcal * 2, carbG: 60, proteinG: 2, fatG: 5 },
    });
    expect(v.sugarG).toBeCloseTo((type.sugarG ?? 0) * 4);
    expect(v.sodiumMg).toBeCloseTo((type.sodiumMg ?? 0) * 4);
  });

  it('adds up a meal', () => {
    const items: MealItem[] = [
      { dishId: 'mohinga', qty: 1 },
      { dishId: 'tea', qty: 1 },
    ];
    expect(sumSugarSodium(items).sodiumMg).toBeCloseTo((dishes.mohinga.sodiumMg ?? 0) + (dishes.tea.sodiumMg ?? 0));
  });
});

describe('flags (PLACEHOLDER thresholds)', () => {
  it('a sweet milk tea is sugar-heavy, a ပေါ့စိမ့် one is not', () => {
    expect(isSugarHeavy([{ dishId: 'tea', qty: 1, sweetness: 'choSeint' }])).toBe(true);
    expect(isSugarHeavy([{ dishId: 'tea', qty: 1, sweetness: 'pawSeint' }])).toBe(false);
    expect(isSugarHeavy([{ dishId: 'faluda', qty: 1 }])).toBe(true);
    expect(isSugarHeavy([{ dishId: 'rice', qty: 2 }])).toBe(false);
  });

  it('mohinga is salty, plain rice is not', () => {
    expect(isSalty([{ dishId: 'mohinga', qty: 1 }])).toBe(true);
    expect(isSalty([{ dishId: 'rice', qty: 2 }])).toBe(false);
    expect(HEALTH_LIMITS.saltyMealMg).toBeLessThan(HEALTH_LIMITS.sodiumBudgetMg);
  });
});

describe('lighterSweetness', () => {
  it('suggests ပေါ့စိမ့် instead of sweeter, ပေါ့ကျ instead of ပေါ့စိမ့်', () => {
    expect(lighterSweetness({ dishId: 'tea', qty: 1, sweetness: 'choSeint' })).toBe('pawSeint');
    expect(lighterSweetness({ dishId: 'tea', qty: 1, sweetness: 'kyaSeint' })).toBe('pawSeint');
    expect(lighterSweetness({ dishId: 'coffee', qty: 1, sweetness: 'pawSeint' })).toBe('pawKya');
    expect(lighterSweetness({ dishId: 'tea', qty: 1, sweetness: 'pawKya' })).toBeNull();
    expect(lighterSweetness({ dishId: 'faluda', qty: 1 })).toBeNull();
  });
});

describe('mealHealth', () => {
  it('names the sweetest and saltiest items and offers swaps only when sugar-heavy', () => {
    const items: MealItem[] = [
      { dishId: 'mohinga', qty: 1 },
      { dishId: 'tea', qty: 1, sweetness: 'choSeint' },
    ];
    const h = mealHealth(items);
    expect(h).toMatchObject({ sugarHeavy: true, salty: true, sweetest: 1, saltiest: 0 });
    expect(h.swaps).toEqual([{ index: 1, to: 'pawSeint' }]);

    const light = mealHealth([{ dishId: 'tea', qty: 1, sweetness: 'pawSeint' }]);
    expect(light.sugarHeavy).toBe(false);
    expect(light.swaps).toEqual([]);
  });
});
