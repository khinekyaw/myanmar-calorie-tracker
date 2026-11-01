/// <reference types="node" />
import { createReadStream, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';

import { NUTRIENTS, type Nutrients } from './calc.ts';

/** FoodData Central nutrient ids for the fields we keep (per 100 g). */
const FDC_NUTRIENT: Record<keyof Nutrients, string> = {
  kcal: '1008',
  carbG: '1005',
  proteinG: '1003',
  fatG: '1004',
  sugarG: '2000',
  sodiumMg: '1093',
};

/** Minimal CSV line parser: quoted fields, "" as an escaped quote. */
export function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      out.push(field);
      field = '';
    } else field += c;
  }
  out.push(field);
  return out;
}

export type UsdaFood = { description: string; per100g: Partial<Nutrients> };

/**
 * Reads the USDA SR Legacy CSV download (folder with food.csv and
 * food_nutrient.csv) and returns the foods asked for.
 */
export async function readUsdaFoods(dir: string, fdcIds: number[]): Promise<Map<number, UsdaFood>> {
  const wanted = new Set(fdcIds.map(String));
  const foods = new Map<number, UsdaFood>();

  for (const line of readFileSync(join(dir, 'food.csv'), 'utf8').split('\n').slice(1)) {
    const [fdcId, , description] = parseCsvLine(line);
    if (wanted.has(fdcId)) foods.set(Number(fdcId), { description, per100g: {} });
  }

  const field = new Map(NUTRIENTS.map((k) => [FDC_NUTRIENT[k], k]));
  const lines = createInterface({ input: createReadStream(join(dir, 'food_nutrient.csv')) });
  for await (const line of lines) {
    const [, fdcId, nutrientId, amount] = parseCsvLine(line);
    const key = field.get(nutrientId);
    const food = key && wanted.has(fdcId) ? foods.get(Number(fdcId)) : undefined;
    if (food && key) food.per100g[key] = Number(amount);
  }
  return foods;
}
