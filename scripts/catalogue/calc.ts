/**
 * Recipe calculation for the dish catalogue: standard recipe + ingredient table
 * → nutrition per serving. Pure: no I/O, so it runs in Node scripts and Jest.
 * How the pipeline works: docs/CATALOGUE.md.
 */

export const NUTRIENTS = ['kcal', 'carbG', 'proteinG', 'fatG', 'sugarG', 'sodiumMg'] as const;
export type Nutrient = (typeof NUTRIENTS)[number];
export type Nutrients = Record<Nutrient, number>;

/** Same as `Unit` in src/data/dishes.ts (the test checks they match). */
export type Unit = 'plate' | 'bowl' | 'spoon' | 'piece' | 'cup';

export type Ingredient = {
  name: string;
  /** USDA FoodData Central id. `per100g` is filled in by scripts/catalogue/ingredients.ts. */
  fdcId?: number;
  /** USDA's description of `fdcId`, written by the same script. */
  usdaName?: string;
  /** Where hand-entered values come from (food label, paper, other table). */
  source?: string;
  /** Rough stand-in values with no source yet; every dish using it is flagged. */
  placeholder?: boolean;
  /** null = the source has no value for this nutrient. */
  per100g: Record<Nutrient, number | null>;
};

export type RecipeLine =
  /** Raw ingredient. `kept` = share left in the food (deep-frying oil, discarded lemongrass). */
  | { ing: string; g: number; kept?: number; note?: string }
  /** Grams of another recipe's cooked food (a curry on a rice plate, a broth). */
  | { dish: string; g: number; note?: string };

export type Recipe = {
  /** The app's dish id. Components (broths, fried beans) start with "_" and never ship. */
  id: string;
  name: { en: string; my: string };
  /** Other spellings people type or say: romanized, and other Burmese spellings. */
  aliases?: { roman: string[]; my: string[] };
  /** Curries and fried food: the user can set oil less / normal / more. */
  oilSensitive?: boolean;
  /** Tea-shop drinks: the user picks the sweetness. */
  hasSweetness?: boolean;
  isVegetarian?: boolean;
  unit?: Unit;
  /** Grams of cooked food in one unit. */
  servingG?: number;
  servingWeighed: boolean;
  /** Weight of the whole batch after cooking. Leave out when nothing is lost (salads, plates). */
  yieldG?: number;
  yieldWeighed: boolean;
  lines: RecipeLine[];
  method?: string;
  /** Recipes this standard recipe was written from (URLs, books). */
  sources: string[];
  /** draft = written but not checked; reviewed = the nutritionist signed it off. */
  status: 'draft' | 'reviewed';
  reviewedBy?: string;
  reviewedAt?: string;
  notes?: string;
};

export type LineResult = { label: string; g: number; kept: number; batch: Nutrients };

export type DishResult = {
  recipe: Recipe;
  massInG: number;
  yieldG: number;
  batch: Nutrients;
  per100g: Nutrients;
  /** null for components and for dishes with errors. */
  perServing: Nutrients | null;
  lines: LineResult[];
  /** Placeholder ingredients used, directly or through a component. */
  placeholders: string[];
  /** Nutrients with no value for an ingredient making up ≥ 5 % of the batch. */
  missing: string[];
  warnings: string[];
  errors: string[];
};

const zero = (): Nutrients => ({ kcal: 0, carbG: 0, proteinG: 0, fatG: 0, sugarG: 0, sodiumMg: 0 });

const scale = (n: Nutrients, f: number): Nutrients => {
  const out = zero();
  for (const k of NUTRIENTS) out[k] = n[k] * f;
  return out;
};

const add = (a: Nutrients, b: Nutrients) => {
  for (const k of NUTRIENTS) a[k] += b[k];
};

export const isComponent = (r: Recipe) => r.id.startsWith('_');

export function roundNutrients(n: Nutrients): Nutrients {
  const one = (x: number) => Math.round(x * 10) / 10;
  return {
    kcal: Math.round(n.kcal),
    carbG: one(n.carbG),
    proteinG: one(n.proteinG),
    fatG: one(n.fatG),
    sugarG: one(n.sugarG),
    sodiumMg: Math.round(n.sodiumMg),
  };
}

/** Energy from macros (4/4/9) differs from the stated kcal by more than this → warn. */
const ATWATER_TOLERANCE = 0.15;
/** Pure fat is ~900 kcal per 100 g; anything above is a typo. */
const MAX_KCAL_PER_100G = 900;
const MISSING_SHARE = 0.05;

export function calculate(
  ingredients: Record<string, Ingredient>,
  recipes: Record<string, Recipe>,
): Map<string, DishResult> {
  const done = new Map<string, DishResult>();
  const visiting = new Set<string>();

  function resolve(id: string): DishResult {
    const cached = done.get(id);
    if (cached) return cached;
    const recipe = recipes[id];
    visiting.add(id);

    const errors: string[] = [];
    const warnings: string[] = [];
    const placeholders = new Set<string>();
    const missing = new Set<string>();
    const lines: LineResult[] = [];
    const gaps: { mass: number; nutrients: Nutrient[]; label: string }[] = [];
    const batch = zero();
    let massInG = 0;

    for (const line of recipe.lines) {
      if (!(line.g > 0)) errors.push(`${'ing' in line ? line.ing : line.dish}: grams must be above 0`);
      if ('ing' in line) {
        const kept = line.kept ?? 1;
        if (!(kept > 0 && kept <= 1)) errors.push(`${line.ing}: kept must be above 0 and at most 1`);
        const ing = ingredients[line.ing];
        if (!ing) {
          errors.push(`unknown ingredient "${line.ing}"`);
          continue;
        }
        const values = zero();
        const gap: Nutrient[] = [];
        for (const k of NUTRIENTS) {
          const v = ing.per100g[k];
          if (v === null || v === undefined) gap.push(k);
          else values[k] = v;
        }
        if (ing.placeholder) placeholders.add(line.ing);
        const n = scale(values, (line.g * kept) / 100);
        add(batch, n);
        massInG += line.g * kept;
        lines.push({ label: line.ing, g: line.g, kept, batch: n });
        if (gap.length) gaps.push({ mass: line.g * kept, nutrients: gap, label: line.ing });
      } else {
        if (visiting.has(line.dish)) {
          errors.push(`"${line.dish}" is used inside itself`);
          continue;
        }
        if (!recipes[line.dish]) {
          errors.push(`unknown recipe "${line.dish}"`);
          continue;
        }
        const sub = resolve(line.dish);
        if (sub.errors.length) errors.push(`uses "${line.dish}", which has errors`);
        sub.placeholders.forEach((p) => placeholders.add(p));
        sub.missing.forEach((m) => missing.add(m));
        const n = scale(sub.per100g, line.g / 100);
        add(batch, n);
        massInG += line.g;
        lines.push({ label: line.dish, g: line.g, kept: 1, batch: n });
      }
    }

    for (const gap of gaps) {
      if (gap.mass >= massInG * MISSING_SHARE) gap.nutrients.forEach((k) => missing.add(`${k} (${gap.label})`));
    }

    const yieldG = recipe.yieldG ?? massInG;
    if (yieldG > massInG * 1.02) {
      errors.push(`cooked weight ${yieldG} g is more than the ingredients (${Math.round(massInG)} g): add the water`);
    }
    const per100g = yieldG > 0 ? scale(batch, 100 / yieldG) : zero();
    if (per100g.kcal > MAX_KCAL_PER_100G) errors.push(`${Math.round(per100g.kcal)} kcal per 100 g is impossible`);

    const atwater = 4 * batch.carbG + 4 * batch.proteinG + 9 * batch.fatG;
    if (batch.kcal > 0 && Math.abs(atwater - batch.kcal) > batch.kcal * ATWATER_TOLERANCE) {
      warnings.push(`kcal (${Math.round(batch.kcal)}) and 4/4/9 from macros (${Math.round(atwater)}) disagree`);
    }

    if (isComponent(recipe)) {
      if (recipe.unit || recipe.servingG) warnings.push('components are not logged, so unit and servingG are ignored');
    } else {
      if (!recipe.unit || !(recipe.servingG && recipe.servingG > 0)) errors.push('needs a unit and servingG');
      if (!recipe.aliases) errors.push('needs aliases (roman and my)');
    }
    if (recipe.status === 'reviewed' && !recipe.reviewedBy) errors.push('reviewed needs reviewedBy');
    if (recipe.status === 'reviewed' && placeholders.size) errors.push('cannot be reviewed while it uses placeholder ingredients');
    if (!recipe.sources.length) warnings.push('no source recipe');

    const perServing =
      !isComponent(recipe) && !errors.length && recipe.servingG ? scale(per100g, recipe.servingG / 100) : null;

    const result: DishResult = {
      recipe,
      massInG,
      yieldG,
      batch,
      per100g,
      perServing,
      lines,
      placeholders: [...placeholders].sort(),
      missing: [...missing].sort(),
      warnings,
      errors,
    };
    visiting.delete(id);
    done.set(id, result);
    return result;
  }

  for (const id of Object.keys(recipes).sort()) {
    if (recipes[id].id !== id) {
      throw new Error(`recipe file "${id}" has id "${recipes[id].id}"`);
    }
    resolve(id);
  }
  return done;
}

/** The catalogue the app will load: one entry per loggable dish without errors. */
export function catalogueJson(results: Map<string, DishResult>) {
  const dishes: Record<string, unknown> = {};
  for (const [id, r] of results) {
    if (!r.perServing || !r.recipe.unit) continue;
    dishes[id] = {
      name: r.recipe.name,
      aliasesRoman: r.recipe.aliases?.roman ?? [],
      aliasesMy: r.recipe.aliases?.my ?? [],
      oilSensitive: Boolean(r.recipe.oilSensitive),
      hasSweetness: Boolean(r.recipe.hasSweetness),
      isVegetarian: Boolean(r.recipe.isVegetarian),
      unit: r.recipe.unit,
      servingG: r.recipe.servingG,
      ...roundNutrients(r.perServing),
      status: r.recipe.status,
      reviewedBy: r.recipe.reviewedBy ?? null,
      placeholders: r.placeholders,
    };
  }
  return dishes;
}

const csvCell = (v: string | number | boolean | null | undefined) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** UTF-8 BOM so Excel shows the Burmese names correctly. */
const toCsv = (rows: (string | number | boolean | null | undefined)[][]) =>
  '﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\n') + '\n';

/** One row per dish, for the nutritionist (opens in Excel or Google Sheets). */
export function reviewCsv(results: Map<string, DishResult>): string {
  const rows: (string | number | boolean | null | undefined)[][] = [
    [
      'Dish id', 'English', 'Burmese', 'Status', 'Reviewed by', 'Unit', 'Serving g', 'Serving weighed',
      'kcal', 'Carbs g', 'Protein g', 'Fat g', 'Sugar g', 'Sodium mg', 'kcal per 100 g',
      'Batch g', 'Batch weighed', 'Placeholder ingredients', 'No value for', 'Errors', 'Warnings', 'Notes',
    ],
  ];
  for (const [id, r] of results) {
    const s = r.perServing ? roundNutrients(r.perServing) : null;
    rows.push([
      id,
      r.recipe.name.en,
      r.recipe.name.my,
      isComponent(r.recipe) ? 'component' : r.recipe.status,
      r.recipe.reviewedBy,
      r.recipe.unit,
      r.recipe.servingG,
      isComponent(r.recipe) ? '' : r.recipe.servingWeighed ? 'yes' : 'no',
      s?.kcal, s?.carbG, s?.proteinG, s?.fatG, s?.sugarG, s?.sodiumMg,
      Math.round(r.per100g.kcal),
      Math.round(r.yieldG),
      r.recipe.yieldG === undefined ? 'n/a' : r.recipe.yieldWeighed ? 'yes' : 'no',
      r.placeholders.join('; '),
      r.missing.join('; '),
      r.errors.join('; '),
      r.warnings.join('; '),
      r.recipe.notes,
    ]);
  }
  return toCsv(rows);
}

/** Where each dish's calories come from, line by line. */
export function linesCsv(results: Map<string, DishResult>, ingredients: Record<string, Ingredient>): string {
  const rows: (string | number | boolean | null | undefined)[][] = [
    ['Dish id', 'Line', 'Source', 'Grams in batch', 'Kept', 'kcal per serving', 'Fat g per serving', 'Share of kcal %'],
  ];
  for (const [id, r] of results) {
    const perServing = r.recipe.servingG && !isComponent(r.recipe) ? r.recipe.servingG / r.yieldG : null;
    for (const l of r.lines) {
      const ing = ingredients[l.label];
      const source = ing
        ? ing.fdcId
          ? `USDA FDC ${ing.fdcId}`
          : ing.placeholder
            ? 'PLACEHOLDER'
            : (ing.source ?? '')
        : 'recipe';
      rows.push([
        id,
        ing ? ing.name : l.label,
        source,
        l.g,
        l.kept === 1 ? '' : l.kept,
        perServing === null ? '' : Math.round(l.batch.kcal * perServing),
        perServing === null ? '' : Math.round(l.batch.fatG * perServing * 10) / 10,
        r.batch.kcal > 0 ? Math.round((l.batch.kcal / r.batch.kcal) * 100) : 0,
      ]);
    }
  }
  return toCsv(rows);
}
