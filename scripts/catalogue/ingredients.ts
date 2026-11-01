/// <reference types="node" />
/**
 * Fills in catalogue/ingredients.json from the USDA SR Legacy download, for
 * every ingredient with an `fdcId`. Hand-entered ingredients are left alone.
 *
 *   npm run catalogue:ingredients -- <path to FoodData_Central_sr_legacy_food_csv_2018-04>
 *
 * Download (CC0, ~6 MB): https://fdc.nal.usda.gov/download-datasets → SR Legacy → CSV.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { NUTRIENTS, type Ingredient } from './calc.ts';
import { readUsdaFoods } from './usda.ts';

const FILE = join(import.meta.dirname, '../../catalogue/ingredients.json');

const dir = process.argv[2];
if (!dir) {
  console.error('Usage: npm run catalogue:ingredients -- <SR Legacy CSV folder>');
  process.exit(1);
}

const ingredients: Record<string, Ingredient> = JSON.parse(readFileSync(FILE, 'utf8'));
const ids = Object.values(ingredients).flatMap((i) => (i.fdcId ? [i.fdcId] : []));
const foods = await readUsdaFoods(dir, ids);

let failed = false;
for (const [id, ing] of Object.entries(ingredients)) {
  if (!ing.fdcId) continue;
  const food = foods.get(ing.fdcId);
  if (!food) {
    console.error(`${id}: FDC ${ing.fdcId} is not in SR Legacy`);
    failed = true;
    continue;
  }
  ing.usdaName = food.description;
  for (const k of NUTRIENTS) ing.per100g[k] = food.per100g[k] ?? null;
}

const sorted = Object.fromEntries(Object.entries(ingredients).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(FILE, JSON.stringify(sorted, null, 2) + '\n');
console.log(`${ids.length} USDA ingredients updated in catalogue/ingredients.json`);
if (failed) process.exit(1);
