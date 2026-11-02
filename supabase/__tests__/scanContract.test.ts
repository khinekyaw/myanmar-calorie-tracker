import { catalogueLines, parseScanOutput, ScanContractError, type CatalogueDish } from '../functions/_shared/scanContract';

const catalogue = new Map<string, CatalogueDish>(
  [
    { id: 'rice', name_my: 'ထမင်း', name_en: 'Rice', unit: 'plate' },
    { id: 'chickenCurry', name_my: 'ကြက်သားဆီပြန်', name_en: 'Chicken curry', unit: 'spoon' },
    { id: 'porkCurry', name_my: 'ဝက်သားဆီပြန်', name_en: 'Pork curry', unit: 'spoon' },
    { id: 'mohinga', name_my: 'မုန့်ဟင်းခါး', name_en: 'Mohinga', unit: 'bowl' },
    { id: 'otherMeatCurry', name_my: 'တခြား အသားဟင်း', name_en: 'Other meat curry', unit: 'spoon', generic: true },
    { id: 'otherSweet', name_my: 'တခြား မုန့်', name_en: 'Other snack or sweet', unit: 'piece', generic: true },
  ].map((d) => [d.id, d as CatalogueDish]),
);

const item = (over: Record<string, unknown>) => ({ dish_id: 'mohinga', name: 'Mohinga', qty: 1, unit: 'bowl', confidence: 0.9, ...over });

describe('parseScanOutput', () => {
  it('passes a good answer through', () => {
    expect(parseScanOutput({ shared_table: false, items: [item({})], candidates: [] }, catalogue)).toEqual({
      shared_table: false,
      items: [{ dish_id: 'mohinga', qty: 1, unit: 'bowl', confidence: 0.9 }],
    });
  });

  it('turns unknown dishes into named estimates', () => {
    const res = parseScanOutput({ shared_table: false, items: [item({ dish_id: 'pizza', name: 'Pizza', unit: 'piece' })] }, catalogue);
    expect(res.items).toEqual([{ dish_id: null, name: 'Pizza', closest: 'otherSweet', qty: 1, unit: 'piece', confidence: 0.9 }]);
  });

  it('keeps the closest type and the estimate, in that type’s unit', () => {
    const estimate = { kcal: 95, carb_g: 2, protein_g: 7.04, fat_g: 6.5 };
    const res = parseScanOutput(
      {
        shared_table: false,
        items: [item({ dish_id: null, name: 'Pork leg stew', name_my: 'ဝက်ခြေထောက်ဟင်း', closest: 'otherMeatCurry', estimate, qty: 2, unit: 'bowl' })],
      },
      catalogue,
    );
    expect(res.items[0]).toEqual({
      dish_id: null,
      name: 'Pork leg stew',
      name_my: 'ဝက်ခြေထောက်ဟင်း',
      closest: 'otherMeatCurry',
      estimate: { kcal: 95, carb_g: 2, protein_g: 7, fat_g: 6.5 },
      qty: 2,
      unit: 'spoon',
      confidence: 0.9,
    });
  });

  it('treats an "Other …" type given as the dish as an unknown food', () => {
    const res = parseScanOutput({ shared_table: false, items: [item({ dish_id: 'otherMeatCurry', name: 'Frog curry', unit: 'spoon' })] }, catalogue);
    expect(res.items[0]).toMatchObject({ dish_id: null, name: 'Frog curry', closest: 'otherMeatCurry' });
  });

  it('clamps wild estimates and drops empty ones', () => {
    const wild = { kcal: 99999, carb_g: -5, protein_g: 10, fat_g: 10 };
    const zero = { kcal: 0, carb_g: 0, protein_g: 0, fat_g: 0 };
    const res = parseScanOutput(
      {
        shared_table: true,
        items: [
          item({ dish_id: null, name: 'Cake', closest: 'nope', estimate: wild, unit: 'piece' }),
          item({ dish_id: null, name: 'Water', closest: 'otherSweet', estimate: zero, unit: 'piece' }),
        ],
      },
      catalogue,
    );
    expect(res.items[0]).toMatchObject({ closest: 'otherSweet', estimate: { kcal: 1500, carb_g: 0 } });
    expect(res.items[1].estimate).toBeUndefined();
  });

  it('uses the catalogue unit, not the model’s', () => {
    expect(parseScanOutput({ shared_table: false, items: [item({ unit: 'cup' })] }, catalogue).items[0].unit).toBe('bowl');
  });

  it('rounds quantities to halves and clamps numbers', () => {
    const res = parseScanOutput(
      { shared_table: true, items: [item({ dish_id: 'rice', qty: 1.4, confidence: 1.7 }), item({ dish_id: 'chickenCurry', qty: 999, confidence: -1 })] },
      catalogue,
    );
    expect(res.items.map((i) => [i.qty, i.confidence])).toEqual([
      [1.5, 1],
      [20, 0],
    ]);
  });

  it('drops broken items and duplicates', () => {
    const res = parseScanOutput(
      {
        shared_table: false,
        items: [item({}), item({ confidence: 0.5 }), item({ qty: 'lots' }), null, item({ dish_id: null, name: '' })],
      },
      catalogue,
    );
    expect(res.items).toHaveLength(1);
    expect(res.items[0].confidence).toBe(0.9);
  });

  it('keeps up to 3 known runner-ups', () => {
    const res = parseScanOutput(
      {
        shared_table: false,
        items: [item({ dish_id: 'chickenCurry', confidence: 0.4 })],
        candidates: [
          { dish_id: 'chickenCurry', confidence: 0.4 },
          { dish_id: 'nope', confidence: 0.35 },
          { dish_id: 'porkCurry', confidence: 0.3 },
          { dish_id: 'porkCurry', confidence: 0.3 },
          { dish_id: 'mohinga', confidence: 0.2 },
          { dish_id: 'rice', confidence: 0.1 },
        ],
      },
      catalogue,
    );
    expect(res.candidates?.map((c) => c.dish_id)).toEqual(['chickenCurry', 'porkCurry', 'mohinga']);
  });

  it('only calls it a shared table when there is more than one dish', () => {
    expect(parseScanOutput({ shared_table: true, items: [item({})] }, catalogue).shared_table).toBe(false);
  });

  it('accepts an empty photo', () => {
    expect(parseScanOutput({ shared_table: false, items: [], candidates: [] }, catalogue).items).toEqual([]);
  });

  it.each([null, 'text', { items: [] }, { shared_table: false, items: 'x' }])('rejects %p', (raw) => {
    expect(() => parseScanOutput(raw, catalogue)).toThrow(ScanContractError);
  });
});

describe('catalogueLines', () => {
  it('lists dishes in a stable order for prompt caching', () => {
    const lines = catalogueLines([...catalogue.values()].reverse());
    expect(lines.split('\n')[0]).toBe('chickenCurry | ကြက်သားဆီပြန် | Chicken curry | spoon');
    expect(lines).toBe(catalogueLines([...catalogue.values()]));
    const [dishes, types] = lines.split('Types for food not in the catalogue');
    expect(dishes).not.toContain('otherMeatCurry');
    expect(types).toContain('otherMeatCurry | တခြား အသားဟင်း | Other meat curry | spoon');
  });
});
