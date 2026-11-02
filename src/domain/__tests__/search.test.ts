import { fallbackDishes } from '@/data/dishes';

import { searchDishes } from '../search';

const ids = (q: string) => searchDishes(q).map((d) => d.id);

describe('searchDishes', () => {
  it('finds dishes by romanized spelling, best match first', () => {
    expect(ids('mohin')[0]).toBe('mohinga');
    expect(ids('laphet yay')[0]).toBe('tea');
  });

  it('does not match a very short spelling inside a longer query', () => {
    // "3 in 1" (3-in-1 coffee) normalizes to "in".
    expect(ids('mohin')).not.toContain('coffeeMix');
    expect(ids('3 in 1')).toContain('coffeeMix');
  });

  it('still finds a full dish name inside a longer query', () => {
    expect(ids('mohinga bowl')).toContain('mohinga');
  });

  it('leaves the "Other …" types out of results; search lists them separately', () => {
    expect(ids('other curry')).not.toContain('otherMeatCurry');
    expect(ids('ဟင်း').some((id) => id.startsWith('other'))).toBe(false);
    expect(fallbackDishes().map((d) => d.id)).toContain('otherMeatCurry');
  });
});
