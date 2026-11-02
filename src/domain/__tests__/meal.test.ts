import { dishes } from '@/data/dishes';

import { itemMacros, itemName, numbersTier, type MealItem } from '../meal';
import { KCAL_PER_RICE_PLATE } from '../nutrition';

describe('numbersTier', () => {
  const verified = { verified: true };
  const calculated = { verified: false, calculated: true };
  const guess = { verified: false };

  it('takes the weakest dish', () => {
    expect(numbersTier([verified, verified])).toBe('verified');
    expect(numbersTier([verified, calculated])).toBe('calculated');
    expect(numbersTier([calculated, guess])).toBe('estimate');
  });
});

describe('bundled dishes', () => {
  it('use the recipe calculation, except the "Other …" types', () => {
    for (const dish of Object.values(dishes)) expect(dish.calculated ?? dish.generic).toBe(true);
    expect(dishes.otherMeatCurry.generic).toBe(true);
    expect(numbersTier([dishes.rice, dishes.otherMeatCurry])).toBe('estimate');
    // The rice-plate constant and the rice recipe must agree.
    expect(itemMacros({ dishId: 'rice', qty: 1 }).kcal).toBe(KCAL_PER_RICE_PLATE);
  });
});

describe('foods not on the list', () => {
  const stew: MealItem = {
    dishId: 'otherMeatCurry',
    qty: 2,
    oil: 'more',
    custom: { name: { en: 'Pork leg stew', my: '' }, kcal: 100, carbG: 2, proteinG: 7, fatG: 6 },
  };

  it('count their own estimate, with the type\'s oil setting', () => {
    // 6 g fat × 1.4 = 8.4 g: 2.4 g more fat = 21.6 kcal more per unit.
    expect(itemMacros(stew).kcal).toBeCloseTo((100 + 21.6) * 2);
    expect(itemMacros(stew).proteinG).toBe(14);
  });

  it('show their own name, in English when there is no Burmese one', () => {
    expect(itemName(stew, 'en')).toBe('Pork leg stew');
    expect(itemName(stew, 'my')).toBe('Pork leg stew');
    expect(itemName({ dishId: 'rice', qty: 1 }, 'en')).toBe('Rice');
  });
});
