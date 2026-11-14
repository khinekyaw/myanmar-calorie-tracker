import { parseMeal } from '../parseMeal';
import { searchDishes } from '../search';

describe('parseMeal', () => {
  it('reads the Burmese sample sentence', () => {
    expect(parseMeal('လက်ဖက်ရည် ပေါ့စိမ့် တစ်ခွက်နဲ့ ပလာတာ တစ်ချပ်')).toEqual([
      { dishId: 'tea', qty: 1, sweetness: 'pawSeint' },
      { dishId: 'palata', qty: 1 },
    ]);
  });

  it('reads Burmese quantities after the dish', () => {
    expect(parseMeal('ပလာတာ နှစ်ချပ်')).toEqual([{ dishId: 'palata', qty: 2 }]);
  });

  it('reads English quantities before the dish', () => {
    expect(parseMeal('one less sweet milk tea and two palata')).toEqual([
      { dishId: 'tea', qty: 1, sweetness: 'pawSeint' },
      { dishId: 'palata', qty: 2 },
    ]);
  });

  it("doesn't give the next dish's number to the one before it", () => {
    expect(parseMeal('mohinga and milk tea and two samosa').map((i) => i.qty)).toEqual([1, 1, 2]);
    expect(parseMeal('palata 2, samosa')).toEqual([
      { dishId: 'palata', qty: 2 },
      { dishId: 'samusa', qty: 1 },
    ]);
    expect(parseMeal('လက်ဖက်ရည်နဲ့ ပလာတာ နှစ်ချပ်').map((i) => i.qty)).toEqual([1, 2]);
  });

  it('prefers the longer dish name', () => {
    expect(parseMeal('ထမင်းဟင်း').map((i) => i.dishId)).toEqual(['riceCurry']);
  });

  it('returns nothing for unknown food', () => {
    expect(parseMeal('pizza')).toEqual([]);
  });
});

describe('searchDishes', () => {
  it.each([
    ['laphet yay', 'tea'],
    ['lahpet ye', 'tea'],
    ['mont hin gar', 'mohinga'],
    ['mohinga', 'mohinga'],
    ['မုန့်ဟင်း', 'mohinga'],
    ['palata', 'palata'],
  ])('"%s" finds %s first', (query, id) => {
    expect(searchDishes(query)[0]?.id).toBe(id);
  });

  it('returns nothing for an empty query', () => {
    expect(searchDishes('  ')).toEqual([]);
  });
});
