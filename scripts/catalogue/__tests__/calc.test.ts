import type { Unit as AppUnit } from '@/data/dishes';

import { calculate, reviewCsv, type Ingredient, type Recipe, type Unit } from '../calc.ts';
import { parseCsvLine } from '../usda.ts';

// The catalogue's units must be the app's units.
type Same = [Unit] extends [AppUnit] ? ([AppUnit] extends [Unit] ? true : false) : false;
const unitsMatch: Same = true;

const ing = (kcal: number, fatG = 0, extra: Partial<Ingredient> = {}): Ingredient => ({
  name: 'x',
  per100g: { kcal, carbG: (kcal - fatG * 9) / 4, proteinG: 0, fatG, sugarG: 0, sodiumMg: 0 },
  ...extra,
});

const ingredients: Record<string, Ingredient> = {
  flour: ing(360),
  oil: ing(900, 100),
  water: ing(0),
  leaf: ing(40, 0, { placeholder: true }),
  noSugar: { name: 'x', per100g: { kcal: 0, carbG: 0, proteinG: 0, fatG: 0, sugarG: null, sodiumMg: 0 } },
};

const recipe = (r: Partial<Recipe> & Pick<Recipe, 'id' | 'lines'>): Recipe => ({
  name: { en: r.id, my: r.id },
  aliases: { roman: [], my: [] },
  unit: r.id.startsWith('_') ? undefined : 'piece',
  servingG: r.id.startsWith('_') ? undefined : 100,
  servingWeighed: false,
  yieldWeighed: false,
  sources: ['test'],
  status: 'draft',
  ...r,
});

const run = (...list: Recipe[]) => calculate(ingredients, Object.fromEntries(list.map((r) => [r.id, r])));

describe('calculate', () => {
  it('divides the batch by the cooked weight', () => {
    // 100 g flour (360 kcal) + 100 g water, baked down to 150 g → 240 kcal per 100 g.
    const r = run(recipe({ id: 'bread', yieldG: 150, lines: [{ ing: 'flour', g: 100 }, { ing: 'water', g: 100 }] })).get('bread')!;
    expect(r.per100g.kcal).toBeCloseTo(240);
    expect(r.perServing?.kcal).toBeCloseTo(240);
    expect(r.errors).toEqual([]);
  });

  it('counts only the oil that stays in the food', () => {
    const r = run(
      recipe({ id: 'fried', yieldG: 110, lines: [{ ing: 'flour', g: 100 }, { ing: 'oil', g: 100, kept: 0.1 }] }),
    ).get('fried')!;
    expect(r.batch.kcal).toBeCloseTo(360 + 90);
    expect(r.massInG).toBeCloseTo(110);
  });

  it('uses other recipes by cooked weight and passes placeholders up', () => {
    const results = run(
      recipe({ id: '_paste', yieldG: 50, lines: [{ ing: 'oil', g: 10 }, { ing: 'leaf', g: 100 }] }),
      recipe({ id: 'plate', servingG: 75, lines: [{ dish: '_paste', g: 25 }, { ing: 'flour', g: 50 }] }),
    );
    const plate = results.get('plate')!;
    // Half the paste: (90 + 40) / 2 = 65 kcal, plus 180 kcal of flour.
    expect(plate.perServing?.kcal).toBeCloseTo(245);
    expect(plate.placeholders).toEqual(['leaf']);
    expect(results.get('_paste')!.perServing).toBeNull();
  });

  it('reports bad recipes instead of throwing', () => {
    const results = run(
      recipe({ id: 'a', lines: [{ dish: 'b', g: 10 }] }),
      recipe({ id: 'b', lines: [{ dish: 'a', g: 10 }] }),
      recipe({ id: 'c', lines: [{ ing: 'nope', g: 10 }, { ing: 'flour', g: 0 }] }),
      recipe({ id: 'd', yieldG: 500, lines: [{ ing: 'flour', g: 100 }] }),
      recipe({ id: 'e', status: 'reviewed', lines: [{ ing: 'leaf', g: 10 }] }),
      recipe({ id: 'f', unit: undefined, lines: [{ ing: 'flour', g: 10 }] }),
    );
    expect(results.get('a')!.errors.join()).toMatch(/inside itself|which has errors/);
    expect(results.get('c')!.errors).toEqual(['unknown ingredient "nope"', 'flour: grams must be above 0']);
    expect(results.get('d')!.errors.join()).toMatch(/add the water/);
    expect(results.get('e')!.errors).toEqual(['reviewed needs reviewedBy', 'cannot be reviewed while it uses placeholder ingredients']);
    expect(results.get('f')!.errors).toEqual(['needs a unit and servingG']);
    expect(results.get('f')!.perServing).toBeNull();
  });

  it('flags missing values only for a real share of the batch', () => {
    const big = run(recipe({ id: 'x', lines: [{ ing: 'flour', g: 90 }, { ing: 'noSugar', g: 10 }] })).get('x')!;
    const small = run(recipe({ id: 'y', lines: [{ ing: 'flour', g: 99 }, { ing: 'noSugar', g: 1 }] })).get('y')!;
    expect(big.missing).toEqual(['sugarG (noSugar)']);
    expect(small.missing).toEqual([]);
  });

  it('warns when kcal and macros disagree', () => {
    const odd = { odd: { name: 'x', per100g: { kcal: 500, carbG: 10, proteinG: 0, fatG: 0, sugarG: 0, sodiumMg: 0 } } };
    const r = calculate(odd, { x: recipe({ id: 'x', lines: [{ ing: 'odd', g: 100 }] }) }).get('x')!;
    expect(r.warnings.join()).toMatch(/disagree/);
  });
});

describe('CSV', () => {
  it('starts with a BOM and quotes commas', () => {
    const csv = reviewCsv(run(recipe({ id: 'z', notes: 'salt, pepper', lines: [{ ing: 'flour', g: 100 }] })));
    expect(csv.startsWith('﻿Dish id,')).toBe(true);
    expect(csv).toContain('"salt, pepper"');
  });

  it('parses quoted USDA lines', () => {
    expect(parseCsvLine('"1","Fish, raw ""wild""","",2')).toEqual(['1', 'Fish, raw "wild"', '', '2']);
  });
});

it('uses the same units as the app', () => {
  expect(unitsMatch).toBe(true);
});
