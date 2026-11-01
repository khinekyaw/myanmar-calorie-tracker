import { dishes } from '@/data/dishes';

import { itemMacros, numbersTier } from '../meal';
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
  it('use the recipe calculation', () => {
    for (const dish of Object.values(dishes)) expect(dish.calculated).toBe(true);
    // The rice-plate constant and the rice recipe must agree.
    expect(itemMacros({ dishId: 'rice', qty: 1 }).kcal).toBe(KCAL_PER_RICE_PLATE);
  });
});
