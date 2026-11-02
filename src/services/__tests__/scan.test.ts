import { toMealItems, type ScanResponse } from '../scan';

describe('toMealItems', () => {
  const estimate = { kcal: 95, carb_g: 2, protein_g: 7, fat_g: 6.5 };

  it('keeps foods not on the list under their closest type, with their own name and estimate', () => {
    const res: ScanResponse = {
      shared_table: true,
      items: [
        { dish_id: 'rice', qty: 1, unit: 'plate', confidence: 0.9 },
        { dish_id: null, name: 'Pork leg stew', name_my: 'ဝက်ခြေထောက်ဟင်း', closest: 'otherMeatCurry', estimate, qty: 3, unit: 'spoon', confidence: 0.7 },
      ],
    };
    expect(toMealItems(res)).toEqual([
      { dishId: 'rice', qty: 1, oil: 'normal' },
      {
        dishId: 'otherMeatCurry',
        qty: 3,
        oil: 'normal',
        custom: { name: { en: 'Pork leg stew', my: 'ဝက်ခြေထောက်ဟင်း' }, kcal: 95, carbG: 2, proteinG: 7, fatG: 6.5 },
      },
    ]);
  });

  it('uses the type’s numbers without an estimate, and drops foods without a type', () => {
    const items = toMealItems({
      shared_table: false,
      items: [
        { dish_id: null, name: 'Cake', closest: 'otherSweet', qty: 1, unit: 'piece', confidence: 0.5 },
        { dish_id: null, name: 'Mystery', qty: 1, unit: 'piece', confidence: 0.5 },
      ],
    });
    expect(items).toHaveLength(1);
    expect(items[0].custom?.name.en).toBe('Cake');
    expect(items[0].custom?.kcal).toBeGreaterThan(0);
  });
});
